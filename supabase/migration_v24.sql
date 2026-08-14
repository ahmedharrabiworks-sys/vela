-- migration_v24.sql
-- Real in-app notifications: new lead, new appointment booked, missed call.
-- Same owner-scoped RLS pattern as leads/conversations/appointments. Inserts
-- always come from service-role routes (bypasses RLS); RLS here is
-- defense-in-depth plus what the client-side realtime subscription relies on.

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('lead', 'appointment', 'missed_call')),
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON notifications (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread
  ON notifications (tenant_id) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner" ON notifications;
CREATE POLICY "notifications_owner" ON notifications
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
