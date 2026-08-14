-- migration_v25.sql
-- CRITICAL FIX: websites.embed_ai_assistant column was referenced throughout
-- the app (generate/route.ts, settings/route.ts, channels/page.tsx,
-- site/[tenantId]/route.ts) but never actually added to the table.
--
-- Real impact confirmed live: the generate route's draft-save UPDATE always
-- includes embed_ai_assistant (the frontend sends it as a real boolean on
-- every request, never undefined), so that single UPDATE statement has been
-- failing with PGRST204 "column does not exist" on every website generation.
-- The error was only logged, never surfaced, so draft_html was silently
-- never persisted to the websites table (confirmed via a live row: 97KB of
-- html sitting in the legacy tenant_config.website_html, draft_html on the
-- websites row completely empty) -- which is exactly why Publish always
-- failed with "No website draft found" even right after a site rendered.
-- This also explains why the "add AI assistant" toggle never took effect:
-- the value could never reach the database at all.

ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS embed_ai_assistant BOOLEAN DEFAULT true;

NOTIFY pgrst, 'reload schema';
