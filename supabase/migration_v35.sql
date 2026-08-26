-- migration_v35.sql
-- Round M6 FIX 6(b): queue of customer-requested services that are NOT yet
-- trained in the business's knowledge base, so an owner can dismiss the
-- request or confirm it (adding it as a real service, with a real price).
-- Same owner-scoped RLS pattern as notifications/leads/appointments.

CREATE TABLE IF NOT EXISTS pending_service_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_name  TEXT NOT NULL,
  lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'added')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_service_requests_tenant_status
  ON pending_service_requests (tenant_id, status);

ALTER TABLE pending_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_service_requests_owner" ON pending_service_requests;
CREATE POLICY "pending_service_requests_owner" ON pending_service_requests
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
