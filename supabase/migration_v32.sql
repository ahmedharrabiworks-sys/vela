-- Round P FIX 3: conversations were never scoped by which specific website
-- (site) they belong to -- only tenant_id. A tenant with 2+ simultaneously
-- published sites (now genuinely possible since Round O's real multi-site
-- connect/disconnect) had every widget conversation looked up/created with
-- no website_id filter at all, and the widget's own localStorage
-- conversation-persistence key was keyed only by tenantId -- both the
-- backend and the client could reuse/return one site's conversation on a
-- different site's widget under the same tenant. website_id is nullable:
-- existing rows (and any channel with no website concept -- WhatsApp,
-- Instagram, phone, or an externally-pasted embed with no site context)
-- stay NULL and are unaffected.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_website_id
  ON conversations (website_id);

NOTIFY pgrst, 'reload schema';
