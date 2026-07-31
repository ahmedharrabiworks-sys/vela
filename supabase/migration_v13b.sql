-- ============================================================
-- VELA — Migration v13b: agent_calls creation + schema repair
-- Safe to run multiple times (all IF NOT EXISTS / idempotent guards)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================
--
-- DIAGNOSTIC CONTRADICTION (July 31, 2026):
--
--   An earlier REST-layer diagnostic script reported agent_calls as
--   "EXISTS" (no PGRST205/42P01 on a HEAD/count query). This conflicted
--   with the authoritative signal: Supabase SQL Editor threw a raw
--   Postgres 42P01 "relation does not exist" when running a statement
--   that references the table directly.
--
--   Rather than spending more time resolving the false-positive in the
--   REST check, this migration is written to be IDEMPOTENT AND
--   SELF-HEALING: the leading CREATE TABLE IF NOT EXISTS is a no-op if
--   the table already exists, and correctly creates it if it doesn't.
--   The migration is correct and safe in either state.
--
--   The HEAD/count check returning no error when the table doesn't
--   exist is a known-unknown (possibly a PostgREST quirk with count-only
--   queries that bypass schema cache validation). Not worth chasing
--   further — the fix works regardless.
--
-- WHAT THIS MIGRATION REPAIRS:
--
--   1. agent_calls table was never reliably in production.
--      migration_v6.sql was supposed to create it, but either never ran
--      or produced a state inconsistent with what the routes expect.
--      This migration creates it correctly, idempotently.
--
--   2. migration_v6.sql has NO "NOTIFY pgrst, 'reload schema'" — so
--      even if the table existed at the Postgres level, PostgREST's
--      schema cache would never have registered it (PGRST205 on all
--      API-layer queries). This migration notifies PostgREST twice
--      (before and after DDL) to ensure the cache is current.
--
--   3. migration_v13.sql was run in Supabase SQL Editor and ROLLED BACK
--      in full: the Editor wraps each run in a transaction, so when
--      CREATE INDEX hit 42P01, the preceding ALTER TABLE that added
--      knowledge_base_updated_at was also lost. Both are re-applied here.
--
--   4. migration_v6.sql's tenant_config ALTER TABLE additions are
--      missing from production: vapi_phone_number_id, vapi_phone_number,
--      vapi_assistant_id, and assistant_settings. Added here safely.
--
-- REAL-WORLD IMPACT (silently broken since phone agent launch):
--
--   • End-of-call records → silently discarded (PGRST205 caught in
--     call-webhook try/catch; Vapi always got { ok: true })
--   • AI Agent Calls page → always empty (error → graceful [])
--   • AI Agent Overview call stats → always 0 calls, 0 minutes
--   • Voice-minute usage display → always 0
--   • Phone routing by vapi_phone_number_id → broken (col missing)
--
-- ============================================================

-- ── STEP 1: Create agent_calls if it doesn't exist ────────────
-- This is the leading statement — idempotent and self-healing.
-- Column list matches migration_v6.sql exactly (13 columns):
--   id, tenant_id, call_type, ended_at, duration_seconds, language,
--   caller_number, transcript, summary, outcome, appointment_booked,
--   kb_extracted, created_at
CREATE TABLE IF NOT EXISTS agent_calls (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_type          TEXT        NOT NULL DEFAULT 'live' CHECK (call_type IN ('live', 'training')),
  ended_at           TIMESTAMPTZ DEFAULT now(),
  duration_seconds   INTEGER     DEFAULT NULL,
  language           TEXT        DEFAULT 'en',
  caller_number      TEXT        DEFAULT NULL,
  transcript         JSONB       DEFAULT '[]'::jsonb,
  summary            TEXT        DEFAULT NULL,
  outcome            TEXT        DEFAULT 'completed',
  appointment_booked JSONB       DEFAULT NULL,
  kb_extracted       JSONB       DEFAULT NULL,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ── STEP 2: Notify PostgREST (early) ─────────────────────────
-- Reload immediately so the table is visible to the API layer
-- even before indexes and RLS are added below.
NOTIFY pgrst, 'reload schema';

-- ── STEP 3: Restore migration_v6.sql tenant_config columns ───
-- knowledge_base + agent_settings exist (pre-v6 ad-hoc adds — no-ops).
-- These four were never applied to production.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS assistant_settings   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vapi_assistant_id    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT  DEFAULT NULL;

-- ── STEP 4: Restore migration_v6.sql agent_calls indexes ─────
CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant  ON agent_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_created ON agent_calls(created_at DESC);

-- ── STEP 5: Restore migration_v6.sql agent_calls RLS ─────────
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

-- ── STEP 6: migration_v13.sql additions (rolled back) ────────
-- The original migration_v13.sql transaction rolled back fully.
-- agent_calls now exists (STEP 1), so the CREATE INDEX cannot fail.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS knowledge_base_updated_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant_period
  ON agent_calls(tenant_id, created_at);

-- ── STEP 7: Final schema cache reload ────────────────────────
-- Reload after all DDL commits so PostgREST picks up every change.
NOTIFY pgrst, 'reload schema';
