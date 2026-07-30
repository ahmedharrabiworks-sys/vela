-- migration_v2_hotfix.sql
-- Applies the missing migration_v2.sql changes that were never run in production.
--
-- Root cause: migration_v2.sql existed in the repo but was never executed in the
-- production Supabase instance. This caused every new website chat visitor to
-- receive a 500 "Could not create conversation" error because /api/ai/reply
-- inserts customer_name, ai_enabled, last_message_at into conversations —
-- columns that didn't exist at the DB level.
--
-- This hotfix is idempotent (safe to run if migration_v2.sql was later also run).
-- Confirmed run: 2026-07-30. E2E verified: 16/16 checks passed.
--
-- NOTE: The ALTER PUBLICATION lines from the original migration_v2.sql are omitted
-- here because they are not idempotent — they will error if the tables are already
-- in the publication. Run them manually only if Realtime is not yet enabled on
-- these tables.

-- Tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city     TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone    TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website  TEXT DEFAULT '';

-- Conversations
ALTER TABLE conversations ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_name   TEXT        DEFAULT 'Customer';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled      BOOLEAN     DEFAULT true;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

-- Appointments
ALTER TABLE appointments ALTER COLUMN lead_id  DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN datetime DROP NOT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name     TEXT DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS conversations_last_message_idx
  ON conversations(tenant_id, last_message_at DESC);

NOTIFY pgrst, 'reload schema';
