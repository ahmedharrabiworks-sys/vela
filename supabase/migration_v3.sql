-- Usage events table for plan-based tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_events_tenant_id_idx ON usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS usage_events_event_type_idx  ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx  ON usage_events(created_at);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own events" ON usage_events
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert their own events" ON usage_events
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

-- Booking counter helper: count AI-created appointments this calendar month
-- Usage: SELECT count_bookings_this_month('<tenant_id>');
CREATE OR REPLACE FUNCTION count_bookings_this_month(p_tenant_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER
  FROM appointments
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', NOW())
    AND created_at <  date_trunc('month', NOW()) + INTERVAL '1 month';
$$;
