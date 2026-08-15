-- migration_v27.sql
-- Distinguish an owner's manually-typed Takeover reply from a real AI-
-- generated reply. Both previously used role='assistant' with no way to
-- tell them apart -- the Conversations inbox labeled an owner's own message
-- "Vela AI", misattributing it to the assistant instead of the business.
--
-- is_owner_reply = true  -> sent by the owner via Takeover mode (api/conversations/[id]/reply)
-- is_owner_reply = false -> real AI-generated reply (default; also covers
--                           all existing rows, which are AI replies or
--                           customer messages)
--
-- NOT NULL DEFAULT FALSE: existing rows all become false immediately.
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_owner_reply BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
