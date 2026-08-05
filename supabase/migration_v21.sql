-- migration_v21.sql
-- Add is_test flag to messages to distinguish owner "Test the AI" sends from real customer messages.
--
-- is_test = true  → sent by the owner via AI mode in Conversations (sandbox testing)
-- is_test = false → real messages from customers OR real owner replies in Takeover mode (default)
--
-- When is_test = true, the message is:
--   - Excluded from conversation preview sidebar
--   - Excluded from Dashboard recent activity
--   - Excluded from AI context history (test exchanges never pollute future AI responses)
--   - Excluded from Starter plan message cap counts
--   - Still visible in the conversation thread (owner can see how the AI responded)
--
-- NOT NULL DEFAULT FALSE: existing rows all become false (default applied immediately).
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
