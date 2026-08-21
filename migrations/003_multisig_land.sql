-- Migration 003: Multi-signature custodians, due diligence, land proposals, resource ledger

BEGIN;

-- Custodians table: assign custodians to seed cells
CREATE TABLE IF NOT EXISTS custodians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  display_name text,
  status text DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

-- Ensure treasury_signatures uniqueness per custodian per transaction
CREATE UNIQUE INDEX IF NOT EXISTS ux_treasury_signatures_tx_custodian ON treasury_signatures(transaction_id, custodian_id);

-- Due diligence records for proposals/assets
CREATE TABLE IF NOT EXISTS due_diligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES users(id),
  file_reference text,
  file_hash text,
  file_size bigint,
  mime_type text,
  verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Land proposals table (specialization) linking to proposals
CREATE TABLE IF NOT EXISTS land_acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  location_description text,
  acreage numeric,
  purchase_price numeric,
  vendor_info text,
  status text DEFAULT 'DUE_DILIGENCE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Universal Resource Ledger: record assets (land included) and events
CREATE TABLE IF NOT EXISTS resource_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  asset_type text,
  asset_reference text,
  description text,
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- Function to execute a treasury transaction with all guards
CREATE OR REPLACE FUNCTION fn_execute_treasury_transaction(tx_id uuid, executed_by uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  tx RECORD;
  ta RECORD;
  seed RECORD;
  approvals INT;
  dd_count INT;
BEGIN
  SELECT * INTO tx FROM treasury_transactions WHERE id = tx_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', tx_id;
  END IF;

  -- Must be governance approved
  IF tx.governance_approval_reference IS NULL THEN
    RAISE EXCEPTION 'Missing governance approval';
  END IF;

  -- Ensure required signatures met
  IF tx.required_signatures > tx.collected_signatures THEN
    RAISE EXCEPTION 'Insufficient custodian signatures: required % collected %', tx.required_signatures, tx.collected_signatures;
  END IF;

  -- Check seed cell state (land transactions must be allowed depending on proposal)
  SELECT * INTO seed FROM seed_cells WHERE id = tx.seed_cell_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seed Cell not found';
  END IF;

  -- For land acquisition transactions ensure protocol state is STATE_2_LAND_GATE or STATE_3_LAND_EXECUTION
  -- Here we check related proposal to determine if it's a land purchase
  IF tx.transaction_type = 'LAND_PURCHASE' THEN
    IF seed.protocol_state <> 'STATE_2_LAND_GATE' AND seed.protocol_state <> 'STATE_3_LAND_EXECUTION' THEN
      RAISE EXCEPTION 'Seed Cell not in Land Gate state';
    END IF;

    -- Ensure due diligence exists and is verified for proposal
    SELECT COUNT(*) INTO dd_count FROM due_diligence WHERE proposal_id = tx.proposal_id AND verified = true;
    IF dd_count = 0 THEN
      RAISE EXCEPTION 'Due diligence not completed or not verified';
    END IF;
  END IF;

  -- Ensure sufficient deployable capital
  SELECT * INTO ta FROM treasury_accounts WHERE seed_cell_id = tx.seed_cell_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treasury account not found';
  END IF;
  IF COALESCE(ta.deployable_balance,0) < COALESCE(tx.amount,0) THEN
    RAISE EXCEPTION 'Insufficient deployable capital';
  END IF;

  -- Execute transaction: deduct balances and mark executed
  UPDATE treasury_accounts SET deployable_balance = deployable_balance - tx.amount, gross_balance = gross_balance - tx.amount WHERE id = ta.id;
  UPDATE treasury_transactions SET status = 'EXECUTED', executed_at = now(), execution_reference = concat('exec_', tx.id::text) WHERE id = tx.id;

  -- Create financial event
  INSERT INTO financial_events(seed_cell_id, event_type, amount, currency, source, destination, related_transaction)
  VALUES (tx.seed_cell_id, 'TREASURY_EXECUTED', tx.amount, tx.currency, 'TREASURY', tx.destination, tx.id);

  -- If land purchase, record asset in resource_ledger and transition state
  IF tx.transaction_type = 'LAND_PURCHASE' THEN
    -- find land acquisition linked to proposal
    INSERT INTO resource_ledger(seed_cell_id, asset_type, asset_reference, description, metadata)
    SELECT tx.seed_cell_id, 'LAND', la.id::text, concat('Land acquired: ', la.location_description), jsonb_build_object('proposal_id', la.proposal_id, 'price', la.purchase_price)
    FROM land_acquisitions la WHERE la.proposal_id = tx.proposal_id;

    -- Transition seed cell state to LAND_EXECUTION if current is LAND_GATE
    IF seed.protocol_state = 'STATE_2_LAND_GATE' THEN
      UPDATE seed_cells SET protocol_state = 'STATE_3_LAND_EXECUTION' WHERE id = seed.id;
    END IF;

    -- Mark land acquisition status
    UPDATE land_acquisitions SET status = 'ACQUIRED', updated_at = now() WHERE proposal_id = tx.proposal_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, new_state) VALUES (executed_by, 'execute_treasury', 'treasury_transaction', tx_id, 'EXECUTED');
END;
$$;

COMMIT;
