-- Mission Control Phase 2 — extend employee_insights for Security Agent findings
-- Run in Supabase SQL Editor AFTER migration_v16.sql.
-- Adds 'security_finding' as a valid kind. Security findings intentionally store
-- supporting_signal_ids as an empty array (not signal-based — real-time checks).

ALTER TABLE employee_insights DROP CONSTRAINT IF EXISTS employee_insights_kind_check;
ALTER TABLE employee_insights ADD CONSTRAINT employee_insights_kind_check
  CHECK (kind IN ('insight', 'recommendation', 'security_finding'));

NOTIFY pgrst, 'reload schema';
