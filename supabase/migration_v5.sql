-- marketing_generations table
CREATE TABLE IF NOT EXISTS marketing_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('social', 'video', 'broadcast')),
  prompt TEXT NOT NULL,
  result TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_generations_tenant ON marketing_generations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_generations_created ON marketing_generations(created_at DESC);

-- webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE marketing_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS: tenants can read their own generations via service role
CREATE POLICY "tenant_read_own_generations" ON marketing_generations
  FOR SELECT USING (true);

CREATE POLICY "tenant_insert_generations" ON marketing_generations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_read_webhook_logs" ON webhook_logs
  FOR ALL USING (true);
