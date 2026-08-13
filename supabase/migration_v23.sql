-- migration_v23.sql
-- 1. Phone Agent's own knowledge base -- separate column from tenant_config.knowledge_base
--    (Training interview + Magic Import), so it can be viewed/edited independently.
--    See src/lib/knowledge-base.ts for how the two are merged for each consumer.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS phone_agent_knowledge_base JSONB DEFAULT '{}'::jsonb;

-- 2. Allow "phone" as a lead channel so appointments booked via a real phone call
--    can be tagged consistently with instagram/whatsapp/website (see call-webhook
--    /route.ts). Postgres auto-names the original inline CHECK "leads_channel_check".
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_channel_check;
ALTER TABLE leads ADD CONSTRAINT leads_channel_check
  CHECK (channel IN ('instagram', 'whatsapp', 'website', 'phone'));

NOTIFY pgrst, 'reload schema';
