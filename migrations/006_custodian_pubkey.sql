-- Migration 006: Add public_key to custodians for signature verification

BEGIN;

ALTER TABLE custodians
  ADD COLUMN IF NOT EXISTS public_key text;

COMMIT;
