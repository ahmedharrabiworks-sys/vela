-- migration_v20b.sql
-- Complete idempotent fix for both critical RLS gaps + missing website_versions table.
-- Supersedes migration_v20.sql (which failed with 42P01 because website_versions
-- did not exist in production when ALTER TABLE ENABLE ROW LEVEL SECURITY ran).
--
-- Root cause of missing table:
--   migration_v7.sql created websites + website_versions + their RLS policies.
--   websites was created successfully and is in active use. website_versions was
--   created in the same file, but the RLS DO $$ block for it apparently did not
--   execute successfully — and the table itself is also absent in production,
--   meaning that portion of migration_v7.sql never committed.
--
-- Impact while table was absent (silent failures since Website Builder launch):
--   save-edit, publish, generate: insert() failed silently — no version records written
--   restore (by versionId): select() returned null → 404 "Version not found" — always broken
--   state: select() returned null → silently fell back to tenant_config.website_versions JSONB
--   settings delete: delete() failed silently — no orphaned rows because table was never written
--
-- RLS gap 1 — webhook_logs:
--   migration_v5.sql created "service_read_webhook_logs" with USING(true) FOR ALL.
--   migration_v8.sql was intended to fix it but its transaction rolled back when the
--   marketing_generations section errored with 42710, leaving the wide-open policy live.
--
-- RLS gap 2 — website_versions: zero policies (table itself was missing).
--
-- All app routes use createSupabaseAdmin() (service-role bypasses RLS) so there is
-- zero behavioral change for existing app logic — defense-in-depth only.
-- Safe to run multiple times: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS.

-- ── Step 1: Create website_versions table (IF NOT EXISTS — safe re-run) ───────

CREATE TABLE IF NOT EXISTS website_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id  UUID        NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  spec        JSONB       NOT NULL,
  html        TEXT        NOT NULL,
  label       TEXT        NOT NULL DEFAULT 'Update',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_versions_website
  ON website_versions (website_id, created_at DESC);

-- ── Step 2: Enable RLS on website_versions ────────────────────────────────────

ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;

-- ── Step 3: Owner-scoped RLS policy for website_versions ──────────────────────
-- Route: website_versions.website_id → websites.tenant_id → tenants.owner_id
-- Same join pattern as messages (via conversation_id) and other 2nd-level FK tables.

DROP POLICY IF EXISTS "website_versions_owner" ON website_versions;

CREATE POLICY "website_versions_owner" ON website_versions
  FOR ALL USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN tenants t ON t.id = w.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );

-- ── Step 4: Fix webhook_logs permissive policy ────────────────────────────────
-- Drop both the v5 permissive policy and any stale partial attempt from v8.

DROP POLICY IF EXISTS "service_read_webhook_logs"        ON webhook_logs;
DROP POLICY IF EXISTS "tenant_read_own_webhook_logs"     ON webhook_logs;

-- SELECT only — inserts are always service-role (bypasses RLS).
-- tenant_id is nullable (ON DELETE SET NULL): NULL correctly matches nothing.
CREATE POLICY "tenant_read_own_webhook_logs" ON webhook_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
