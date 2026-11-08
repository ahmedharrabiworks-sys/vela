-- migration_v41.sql
-- "Suggested knowledge": facts noticed in conversations, calls or the owner
-- assistant chat, waiting for the owner to approve or reject them. Nothing
-- reaches the knowledge base without approval. The unique key keeps a
-- rejected fact from being suggested again.
-- Same owner-scoped RLS pattern as pending_service_requests.

CREATE TABLE IF NOT EXISTS knowledge_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'price')),
  fact          TEXT NOT NULL,
  fact_key      TEXT NOT NULL,
  service_name  TEXT,
  price         TEXT,
  source        TEXT NOT NULL CHECK (source IN ('conversation', 'call', 'assistant')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_suggestions_unique_fact
  ON knowledge_suggestions (tenant_id, fact_key);

CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_tenant_status
  ON knowledge_suggestions (tenant_id, status);

ALTER TABLE knowledge_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_suggestions_owner" ON knowledge_suggestions;
CREATE POLICY "knowledge_suggestions_owner" ON knowledge_suggestions
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
