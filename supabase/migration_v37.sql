-- migration_v37.sql
-- Round M9 FIX 4: real, confirmed cause of the Conversations unread badge
-- never updating live -- a direct test (subscribe to conversations table
-- changes, then perform a real UPDATE, wait for the event) proved
-- Supabase Realtime never broadcasts changes on this table at all. It was
-- never added to the supabase_realtime publication (nothing in this
-- codebase ever subscribed to `conversations` before Round M8's FIX 4).
-- Application code (PATCH /api/conversations/[id]/read, the Sidebar's
-- subscription) is already correct -- this is the missing piece.

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
