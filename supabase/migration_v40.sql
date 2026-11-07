-- migration_v40.sql
-- Append-only audit log of plan switches (who, from, to, when).
-- Written by POST /api/plan (admin client). Safe to run more than once.
-- Run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS plan_change_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID,
  user_email  TEXT,
  from_plan   TEXT        NOT NULL,
  to_plan     TEXT        NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'free_switch',
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_change_log_tenant ON plan_change_log (tenant_id, changed_at DESC);

-- RLS on, owner may read their own history; no UPDATE/DELETE policies, so
-- rows are append-only for every non-service role.
ALTER TABLE plan_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_change_log_owner_read ON plan_change_log;
CREATE POLICY plan_change_log_owner_read ON plan_change_log
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
