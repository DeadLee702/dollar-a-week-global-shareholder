-- Migration 004: Projects, infrastructure assets, protocol state log, and resource network primitives

BEGIN;

-- protocol_state_log: record authoritative state changes
CREATE TABLE IF NOT EXISTS protocol_state_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  previous_state text,
  new_state text,
  reason text,
  performed_by uuid,
  created_at timestamptz DEFAULT now()
);

-- projects table already exists (from migration 002). Add infrastructure-specific fields
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS infrastructure_type text;

-- project_milestones already exists

-- infrastructure_assets table to record deployed infrastructure (water, energy, housing, productive)
CREATE TABLE IF NOT EXISTS infrastructure_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  asset_type text,
  asset_reference text,
  capacity jsonb,
  commissioning_date timestamptz,
  status text DEFAULT 'PROPOSED',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- resource_network table for STATE_5_RESOURCE_NETWORK metadata
CREATE TABLE IF NOT EXISTS resource_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_cell_id uuid REFERENCES seed_cells(id) ON DELETE CASCADE,
  name text,
  description text,
  status text DEFAULT 'PLANNED',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index to seed_cells protocol_state for fast queries
CREATE INDEX IF NOT EXISTS idx_seed_cells_protocol_state ON seed_cells(protocol_state);

COMMIT;
