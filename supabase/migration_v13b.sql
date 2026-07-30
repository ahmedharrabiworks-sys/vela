-- ============================================================
-- VELA — Migration v13b: agent_calls PostgREST fix + schema repair
-- Safe to run multiple times (all IF NOT EXISTS / idempotent guards)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================
--
-- WHAT HAPPENED (diagnostic findings, July 31, 2026):
--
--   1. agent_calls EXISTS in Postgres but has NEVER been accessible
--      via the PostgREST/Supabase JS API layer.
--      Root cause: migration_v6.sql created the table but has NO
--      "NOTIFY pgrst, 'reload schema'" — PostgREST's schema cache
--      never registered it. Every api-layer query since the table
--      was created has returned PGRST205 ("Could not find the table
--      in the schema cache"). All routes catch or swallow this error
--      so it was invisible to users.
--
--   2. migration_v13.sql was run but ROLLED BACK.
--      Supabase SQL Editor wraps each run in a transaction.
--      The CREATE INDEX failed with 42P01 (agent_calls missing from
--      Postgres at that moment — BEFORE Oussama ran v6 to fix it).
--      The rollback also undid the ALTER TABLE that added
--      knowledge_base_updated_at, so that column is still missing.
--
--   3. migration_v6.sql's ALTER TABLE (tenant_config) partially
--      missing: knowledge_base and agent_settings are present
--      (added by an earlier ad-hoc change), but vapi_phone_number_id,
--      vapi_phone_number, vapi_assistant_id, and assistant_settings
--      are absent. This migration_v13b adds them all safely.
--
-- REAL-WORLD IMPACT (what has silently not worked):
--
--   • End-of-call records from the phone agent → silently discarded
--     (PGRST205 caught in call-webhook try/catch since table existed)
--   • AI Agent "Calls" page → always empty (error → graceful [])
--   • AI Agent Overview call stats → always 0 calls, 0 minutes
--   • Voice-minute usage display → always 0
--   • Phone routing by vapi_phone_number_id → broken (column missing)
--
-- ============================================================

-- ── STEP 1: Notify PostgREST immediately ─────────────────────
-- This is the most critical fix. Without it, agent_calls remains
-- invisible to the API layer even after all SQL below succeeds.
NOTIFY pgrst, 'reload schema';

-- ── STEP 2: Restore migration_v6.sql tenant_config columns ───
-- knowledge_base + agent_settings already exist (pre-v6 ad-hoc adds).
-- These four are the ones that never made it into production.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS assistant_settings   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vapi_assistant_id    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT  DEFAULT NULL;

-- ── STEP 3: Restore migration_v6.sql agent_calls indexes ─────
-- Safe to re-run: IF NOT EXISTS guards.
CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant  ON agent_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_created ON agent_calls(created_at DESC);

-- ── STEP 4: Restore migration_v6.sql agent_calls RLS ─────────
-- ENABLE ROW LEVEL SECURITY is idempotent.
ALTER TABLE agent_calls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_calls' AND policyname = 'agent_calls_owner'
  ) THEN
    CREATE POLICY "agent_calls_owner" ON agent_calls
      FOR ALL USING (
        tenant_id IN (
          SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── STEP 5: migration_v13.sql additions (rolled back) ────────
-- The original migration_v13.sql transaction rolled back due to the
-- 42P01 error on CREATE INDEX. These statements are the content of
-- that rolled-back migration. They are placed here after agent_calls
-- is confirmed to exist so the CREATE INDEX cannot fail.

ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS knowledge_base_updated_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant_period
  ON agent_calls(tenant_id, created_at);

-- ── STEP 6: Final schema cache reload ────────────────────────
-- Reload again after all DDL is committed so PostgREST picks up
-- every change in one shot.
NOTIFY pgrst, 'reload schema';
