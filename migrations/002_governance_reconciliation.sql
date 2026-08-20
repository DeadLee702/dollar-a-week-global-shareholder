-- Migration 002: Governance, votes, projects, and reconciliation helpers

BEGIN;

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  proposer_id uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  requested_amount numeric,
  status text DEFAULT 'PROPOSED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  seed_cell_member_id uuid REFERENCES seed_cell_members(id) ON DELETE CASCADE,
  choice text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Ensure one verified member one vote per proposal
CREATE UNIQUE INDEX IF NOT EXISTS ux_votes_proposal_user ON votes(proposal_id, user_id);

-- Projects and milestones
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES proposals(id),
  project_type text,
  name text,
  description text,
  status text DEFAULT 'PROPOSED',
  budget numeric,
  actual_cost numeric,
  completion_percentage integer DEFAULT 0,
  start_date timestamptz,
  estimated_completion_date timestamptz,
  actual_completion_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text,
  description text,
  target_date timestamptz,
  completed_at timestamptz,
  verification_status text,
  verified_by uuid,
  evidence_reference text
);

-- Ensure idempotency_keys exists (migration 001 created it but in case of partial runs)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  used boolean DEFAULT false
);

-- Function to atomically mark contribution as succeeded and produce financial event + treasury update
CREATE OR REPLACE FUNCTION fn_mark_contribution_succeeded(contrib_id uuid, settled timestamptz, provider_ref text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  c RECORD;
  ta RECORD;
BEGIN
  SELECT * INTO c FROM contributions WHERE id = contrib_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found: %', contrib_id;
  END IF;
  IF c.payment_status = 'SUCCEEDED' THEN
    RETURN; -- idempotent
  END IF;

  UPDATE contributions SET payment_status = 'SUCCEEDED', settled_at = settled, payment_reference = provider_ref WHERE id = contrib_id;

  -- Create financial event
  INSERT INTO financial_events(seed_cell_id, event_type, amount, currency, usd_equivalent, source, destination, related_transaction, actor, cryptographic_hash)
  VALUES (c.seed_cell_id, 'CONTRIBUTION_SETTLED', c.amount, c.currency, c.usd_equivalent, c.payment_provider, 'TREASURY', NULL, c.member_id, NULL);

  -- Update seed cell aggregates
  UPDATE seed_cells SET gross_contributions = COALESCE(gross_contributions,0) + c.amount, deployable_capital = COALESCE(deployable_capital,0) + c.amount WHERE id = c.seed_cell_id;

  -- Ensure treasury account exists and update balances
  SELECT * INTO ta FROM treasury_accounts WHERE seed_cell_id = c.seed_cell_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO treasury_accounts(seed_cell_id, gross_balance, deployable_balance, currency) VALUES (c.seed_cell_id, c.amount, c.amount, c.currency);
  ELSE
    UPDATE treasury_accounts SET gross_balance = COALESCE(gross_balance,0) + c.amount, deployable_balance = COALESCE(deployable_balance,0) + c.amount WHERE id = ta.id;
  END IF;

  -- Record audit
  INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, new_state) VALUES (c.member_id, 'contribution_settled', 'contribution', contrib_id, 'SUCCEEDED');
END;
$$;

COMMIT;
