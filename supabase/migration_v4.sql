-- ============================================================
-- VELA — Migration v4
-- Run in Supabase SQL Editor AFTER schema.sql, v2, v3
-- ============================================================

-- Add channel connection columns to tenant_config
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS instagram_connected     BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS instagram_username      TEXT     DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_access_token  TEXT     DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_business_id   TEXT     DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_connected      BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_phone          TEXT     DEFAULT '';

-- Add human-handoff flag to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS needs_human BOOLEAN DEFAULT FALSE;

-- Index for finding tenants by WhatsApp number quickly (webhook lookup)
CREATE INDEX IF NOT EXISTS tenant_config_whatsapp_idx
  ON tenant_config(whatsapp_connected, whatsapp_phone)
  WHERE whatsapp_connected = TRUE;

-- Ensure tenant_config RLS also covers the new columns (inherits existing policy)
-- No policy changes needed — existing "tenant_config_owner" covers all columns.
