-- Round J FIX 4: persist the internal owner-facing AI assistant's
-- conversation history server-side (tenant-scoped), so it survives a
-- refresh/navigation instead of living only in React state. "Clear" soft-
-- deletes the whole current conversation (all messages get the same
-- deleted_at timestamp, forming one restorable batch) into the same
-- Recycle Bin used by Leads/Conversations/Appointments, instead of
-- discarding it immediately.
CREATE TABLE IF NOT EXISTS assistant_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  images      JSONB,
  is_error    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_tenant
  ON assistant_messages (tenant_id, deleted_at, created_at);

ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assistant_messages_owner" ON assistant_messages;
CREATE POLICY "assistant_messages_owner" ON assistant_messages
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
