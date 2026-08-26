-- migration_v36.sql
-- Round M8 FIX 4: real per-conversation read-tracking, decoupled from
-- needs_human (an escalation-workflow flag consumed elsewhere by the AI
-- Resolution Rate metric -- auto-clearing it just by viewing would corrupt
-- that metric). last_read_at is a new, separate, honest "has the owner
-- actually opened this conversation" signal: NULL = never opened (unread);
-- a real timestamp once the owner opens it, compared against
-- last_message_at to decide whether it's unread again since.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
