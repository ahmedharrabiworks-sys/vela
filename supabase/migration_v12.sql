-- migration_v12.sql
-- Adds instagram_page_id column to tenant_config.
-- Required for Instagram DM replies: the send-message endpoint is
-- POST /{PAGE_ID}/messages — the Facebook Page ID, not the Instagram Business ID.
-- Existing connected tenants will have instagram_page_id = '' until they reconnect.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query):

ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS instagram_page_id TEXT DEFAULT '';

NOTIFY pgrst, 'reload schema';
