-- ============================================================
-- VELA — Migration v6: AI Agent columns + agent_calls table
-- Safe to run multiple times (IF NOT EXISTS guards throughout)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Add all missing AI Agent columns to tenant_config
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS knowledge_base       JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS agent_settings       JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assistant_settings   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vapi_assistant_id    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number    TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT  DEFAULT NULL;

-- 2. Call history table (training + live calls)
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

CREATE INDEX IF NOT EXISTS idx_agent_calls_tenant  ON agent_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_created ON agent_calls(created_at DESC);

-- 3. Row-level security for agent_calls
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
