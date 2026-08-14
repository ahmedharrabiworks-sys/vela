-- migration_v26.sql
-- FIX 4: reopening an existing site lost its chat history and sometimes showed
-- a blank preview even though the site was genuinely published.
--
-- Root cause 1: chat history was only ever stored on tenant_config.website_chat
-- -- a single column shared across ALL of a tenant's websites, not scoped per
-- site. Switching to a different site had no per-site chat to load, so the
-- Website Builder always fell back to its initial "what language..." prompt.
-- This column lets each website keep its own chat history.
--
-- Root cause 2 (fixed in code, no schema change needed): /api/website/state
-- only ever read draft_html when a specific websiteId was requested, with no
-- fallback to published_html -- a published site whose draft_html happened to
-- be empty (e.g. from the embed_ai_assistant draft-save bug fixed in
-- migration_v25.sql) showed a blank preview even though it was live.

ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS chat JSONB DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
