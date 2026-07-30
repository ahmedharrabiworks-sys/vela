-- ============================================================
-- VELA — Migration v13: Mission Control Phase 1 schema additions
-- Safe to run multiple times (IF NOT EXISTS / DEFAULT NULL guards)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================
--
-- Step 1 audit findings (pre-migration):
--   • agent_calls.created_at is the timestamp column (NOT started_at —
--     CLAUDE.md §13 had an error; corrected here).
--   • Existing indexes on agent_calls: idx_agent_calls_tenant (tenant_id)
--     and idx_agent_calls_created (created_at DESC) — both single-column.
--   • No composite index on (tenant_id, created_at) exists — added below.
--   • knowledge_base_updated_at: confirmed absent from all prior migrations.
-- ============================================================

-- 1. KB staleness signal: tracks ONLY real knowledge_base writes.
--    Written by save-call/route.ts and ai-training/route.ts on every
--    successful KB save. Tone/language/website/channel settings writes
--    do NOT set this column — it is scoped to KB changes only.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS knowledge_base_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Composite index for efficient Phase 1 voice-minute aggregation.
--    Supports queries in the shape:
--      SELECT tenant_id, SUM(duration_seconds)
--      FROM agent_calls
--      WHERE created_at >= $period_start
--      GROUP BY tenant_id
--    The existing single-column indexes (idx_agent_calls_tenant,
--    idx_agent_calls_created) cannot satisfy this efficiently on their own.
CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant_period
  ON agent_calls(tenant_id, created_at);

NOTIFY pgrst, 'reload schema';
