-- migration_v20.sql
-- Fix two critical RLS gaps surfaced by Security Agent get_rls_policies() audit.
--
-- GAP 1 — webhook_logs: "service_read_webhook_logs" (qual='true', FOR ALL) from
--   migration_v5.sql is still live in production. migration_v8.sql was intended to
--   fix it, but its transaction rolled back when the marketing_generations section
--   errored with 42710 ("policy already exists"), leaving the wide-open policy intact.
--
-- GAP 2 — website_versions: zero RLS policies. migration_v7.sql created the table
--   and enabled RLS, but the DO $$ block that conditionally creates the policy
--   did not execute successfully in production — the table has been unprotected
--   since the Website Builder launched.
--
-- Both tables are written exclusively by admin-client routes (service-role bypasses
-- RLS), so there is zero behavioral change for the app — this is defense-in-depth.
-- Self-healing: DROP IF EXISTS before every CREATE ensures safe re-runs.

-- ── GAP 1: webhook_logs ───────────────────────────────────────────────────────

-- Drop both the old permissive policy and any partial-fix from v8
DROP POLICY IF EXISTS "service_read_webhook_logs"        ON webhook_logs;
DROP POLICY IF EXISTS "tenant_read_own_webhook_logs"     ON webhook_logs;

-- Owner-scoped SELECT only. Inserts are service-role (bypasses RLS) — no INSERT policy needed.
-- tenant_id is nullable (ON DELETE SET NULL): NULL tenant_id correctly matches nothing
-- and is only accessible via service_role, which is the intended behavior.
CREATE POLICY "tenant_read_own_webhook_logs" ON webhook_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

-- ── GAP 2: website_versions ───────────────────────────────────────────────────

-- RLS was enabled by migration_v7.sql — re-enabling is a no-op if already on.
ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;

-- Drop any stale partial policy before creating the canonical one.
DROP POLICY IF EXISTS "website_versions_owner" ON website_versions;

-- Owner-scoped via: website_versions.website_id → websites.id → tenants.owner_id
-- Matches the join pattern used by messages (via conversation_id) and other
-- second-level FK tables throughout the schema.
CREATE POLICY "website_versions_owner" ON website_versions
  FOR ALL USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN tenants t ON t.id = w.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
