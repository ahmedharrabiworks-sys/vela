-- Time off: holidays, vacations and partial-day closures.
CREATE TABLE IF NOT EXISTS business_time_off (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  start_time  TIME,
  end_time    TIME,
  reason      TEXT,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_time_off_dates CHECK (end_date >= start_date),
  CONSTRAINT business_time_off_times CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  ),
  CONSTRAINT business_time_off_reason CHECK (reason IS NULL OR char_length(reason) <= 120)
);

CREATE INDEX IF NOT EXISTS idx_business_time_off_tenant_end
  ON business_time_off (tenant_id, end_date);

ALTER TABLE business_time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_time_off_owner ON business_time_off;
CREATE POLICY business_time_off_owner ON business_time_off
  FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
