-- Mission Control Phase 2 — AI Employee Insights table
-- Run in Supabase SQL Editor. Do NOT run from Claude Code.
-- Must run AFTER migration_v15.sql (employees table must exist).

CREATE TABLE IF NOT EXISTS employee_insights (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL CHECK (kind IN ('insight','recommendation')),
  content               TEXT NOT NULL,
  supporting_signal_ids UUID[] NOT NULL, -- real employee_signals row IDs, never empty
  confidence            TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_insights_employee
  ON employee_insights(employee_id, created_at DESC);

-- Admin-client-only (service role) — same pattern as all other MC tables.
-- No RLS policies: access requires SUPABASE_SERVICE_ROLE_KEY.
ALTER TABLE employee_insights ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
