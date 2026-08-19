-- Round F FIX 8: soft-delete + Recycle Bin for Leads, Conversations, and
-- Appointments. Deleting one of these no longer discards it immediately --
-- it's hidden from the normal view (deleted_at IS NOT NULL) and recoverable
-- from Settings -> Recycle Bin until the owner permanently deletes it.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_deleted
  ON leads (tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_deleted
  ON conversations (tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_deleted
  ON appointments (tenant_id, deleted_at);

-- Round F FIX 2: real per-channel AI-behavior config (tone + language) for
-- Instagram and WhatsApp, opened from Channels -> Manage. Falls back to the
-- existing global tenant_config.tone/language when a channel has no
-- override set, so nothing regresses for channels that never touch this.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS channel_ai_config JSONB NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
