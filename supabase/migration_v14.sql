-- ============================================================
-- VELA — Migration v14: Mission Control access log
-- Safe to run multiple times (all IF NOT EXISTS guards)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
--
-- This table is OUTSIDE the tenant data model:
--   - No tenant_id column
--   - No RLS policy that permits UPDATE or DELETE (append-only)
--   - Service-role client only — never exposed to tenant-facing routes
-- ============================================================

CREATE TABLE IF NOT EXISTS mission_control_access_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email        TEXT        NOT NULL,
  outcome      TEXT        NOT NULL CHECK (outcome IN ('granted', 'denied_not_allowlisted', 'denied_no_session')),
  ip_address   TEXT,
  user_agent   TEXT,
  route        TEXT
);

-- Index for efficient querying by outcome + time (e.g. recent denials)
CREATE INDEX IF NOT EXISTS idx_mc_access_log_outcome_time
  ON mission_control_access_log(outcome, attempted_at DESC);

NOTIFY pgrst, 'reload schema';
