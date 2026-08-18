-- migration_v28.sql
-- CRITICAL FIX found during Analytics redesign: src/app/api/site/track/route.ts
-- has been inserting into a `site_visits` table on every real published-site
-- page view since it was written -- but the table was never created in
-- production (confirmed live: PGRST205 "Could not find the table
-- 'public.site_visits' in the schema cache"). The insert's result was never
-- captured/checked, so this has failed silently for every visit, always.
-- tenant_config.website_visit_count (a separate, simple cumulative counter
-- incremented in src/app/site/[tenantId]/route.ts) is unaffected and has
-- been working correctly this whole time -- this migration only fixes the
-- detailed per-visit table used for the new "Website Visits over time"
-- chart + full-history detail view on the Analytics page.

CREATE TABLE IF NOT EXISTS site_visits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id    UUID REFERENCES websites(id) ON DELETE CASCADE NOT NULL,
  path          TEXT DEFAULT '',
  referrer      TEXT DEFAULT '',
  country       TEXT DEFAULT '',
  device        TEXT DEFAULT '',
  visitor_hash  TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_website_created
  ON site_visits (website_id, created_at);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

-- Owner-scoped read via websites -> tenants join. All writes come from the
-- service-role client in api/site/track/route.ts (bypasses RLS) -- this
-- policy is defense-in-depth plus what any future client-side read relies on.
DROP POLICY IF EXISTS "site_visits_owner" ON site_visits;
CREATE POLICY "site_visits_owner" ON site_visits
  FOR SELECT
  USING (
    website_id IN (
      SELECT w.id FROM websites w
      JOIN tenants t ON t.id = w.tenant_id
      WHERE t.owner_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
