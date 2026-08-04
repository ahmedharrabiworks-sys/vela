-- migration_v18.sql
-- Adds needs_human_resolved_at to conversations.
-- Set when the owner marks a conversation resolved; cleared (NULL) if AI flags it again.
-- Self-healing: safe to run multiple times.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS needs_human_resolved_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
