-- migration_v11.sql
-- Add tenant_id to messages table — unblocks Phase B item 12 usage enforcement.
--
-- Context: messages currently has only conversation_id (FK → conversations).
-- To count per-tenant AI replies for the monthly message cap, a JOIN through
-- conversations is required, which cannot be efficiently indexed. Adding a
-- denormalised tenant_id column allows a single-table COUNT with a covering index:
--
--   SELECT COUNT(*) FROM messages
--   WHERE tenant_id = '<id>' AND role = 'assistant' AND created_at >= '<period_start>';
--
-- The backfill derives tenant_id from the conversations table for all existing rows.
-- Future rows are written with tenant_id by the application (Step 2 of 5 — see CLAUDE.md).
--
-- RLS: the existing "messages_owner" policy scopes access via:
--   conversation_id IN (SELECT c.id FROM conversations c JOIN tenants t ...)
-- It does NOT reference the messages.tenant_id column. Adding this column is purely
-- additive — zero conflict with existing RLS. All server routes use the admin client
-- (service-role, bypasses RLS), so the NULL window during backfill has no security impact.
--
-- Idempotency: safe to run twice.
--   ALTER TABLE ... ADD COLUMN IF NOT EXISTS — no-op if column already exists.
--   UPDATE ... WHERE m.tenant_id IS NULL     — no-op on second run (all rows already set).
--   CREATE INDEX IF NOT EXISTS               — no-op if index already exists.

-- Step 1: Add the column (nullable — rows backfilled in Step 2)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 2: Backfill existing rows from the conversations join
UPDATE messages m
SET tenant_id = c.tenant_id
FROM conversations c
WHERE m.conversation_id = c.id
  AND m.tenant_id IS NULL;

-- Step 3: Enforcement-query index — covers the monthly COUNT per tenant
--   WHERE role = 'assistant' partial index keeps it lean (ignores user/system rows)
CREATE INDEX IF NOT EXISTS idx_messages_tenant_period
  ON messages(tenant_id, created_at)
  WHERE role = 'assistant';

NOTIFY pgrst, 'reload schema';
