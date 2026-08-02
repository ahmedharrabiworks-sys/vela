-- ============================================================
-- VELA — Migration v15: Mission Control AI-Employee tables
-- Safe to run multiple times (IF NOT EXISTS guards)
-- Run AFTER migration_v14.sql
-- ⚠️  Give to Oussama to run manually in Supabase SQL Editor.
--    DO NOT execute from Claude Code.
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL UNIQUE,
  is_staffed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id       UUID REFERENCES departments(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  role_description    TEXT NOT NULL,
  domain_description  TEXT NOT NULL,
  reports_to          UUID REFERENCES employees(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'idle'
                        CHECK (status IN ('active','idle','blocked','error','dormant')),
  safe_default_action TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_signals (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID      NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  signal_name  TEXT      NOT NULL,
  real_description TEXT  NOT NULL,
  value        NUMERIC,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_signals_employee
  ON employee_signals(employee_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS learning_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_ref    TEXT,
  outcome     TEXT NOT NULL CHECK (outcome IN ('success','failure','neutral')),
  conclusion  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_log_employee
  ON learning_log(employee_id, created_at DESC);

ALTER TABLE departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_log     ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
