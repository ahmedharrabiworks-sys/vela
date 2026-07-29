-- migration_v8.sql
-- Fix wide-open RLS policies on marketing_generations and webhook_logs.
-- Created in migration_v5.sql with USING(true) / WITH CHECK(true) which allows
-- any authenticated user to read or write any tenant's data.
-- Replacement: same owner-scoped pattern as leads, conversations, agent_calls, etc.
-- All app routes already use createSupabaseAdmin() (bypasses RLS), so zero
-- behavioral change for the app — this is a defense-in-depth fix.

-- ── marketing_generations ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_read_own_generations" ON marketing_generations;
DROP POLICY IF EXISTS "tenant_insert_generations"   ON marketing_generations;

CREATE POLICY "tenant_read_own_generations" ON marketing_generations
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "tenant_insert_generations" ON marketing_generations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

-- ── webhook_logs ──────────────────────────────────────────────────────────────
-- Inserts always come from service-role webhook handlers (bypasses RLS).
-- This SELECT policy ensures only the owning tenant can query their own logs
-- if a future feature ever adds an anon-key path to this table.
DROP POLICY IF EXISTS "service_read_webhook_logs" ON webhook_logs;

CREATE POLICY "tenant_read_own_webhook_logs" ON webhook_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
