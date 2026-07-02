-- ============================================================
-- VELA — Migration v2
-- Run this in your Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Add extended columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry  TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city      TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone     TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website   TEXT DEFAULT '';

-- Add extended columns to conversations
ALTER TABLE conversations ALTER COLUMN lead_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_name    TEXT DEFAULT 'Customer';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled       BOOLEAN DEFAULT true;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at  TIMESTAMPTZ DEFAULT NOW();

-- Add extended columns to appointments
ALTER TABLE appointments ALTER COLUMN lead_id   DROP NOT NULL;
ALTER TABLE appointments ALTER COLUMN datetime  DROP NOT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name      TEXT DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Index for faster realtime conversation queries
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON conversations(tenant_id, last_message_at DESC);

-- Enable Supabase Realtime on messages + conversations tables
-- (run these as superuser in Supabase SQL Editor)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
