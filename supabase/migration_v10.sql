-- migration_v10.sql
-- Fix wide-open RLS policies on marketing_generations.
--
-- Context: migration_v5.sql created these policies with USING(true) / WITH CHECK(true),
-- allowing any authenticated user to read or write any tenant's generated content.
-- migration_v8.sql was intended to fix both marketing_generations and webhook_logs,
-- but errored in production with 42710 ("policy already exists") for marketing_generations,
-- leaving the v5-era USING(true) policies in place while webhook_logs was correctly fixed.
-- This migration closes that gap.
--
-- All app routes use createSupabaseAdmin() (service-role, bypasses RLS), so there is
-- zero behavioral change for the app — this is a defense-in-depth fix.

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

NOTIFY pgrst, 'reload schema';
