-- ============================================================
-- VELA — Migration v7: Website Builder backend tables
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Run AFTER schema.sql + migration_v2 through v6
-- ============================================================

-- ── FIX 1: rate-limiting + extra data for website form submissions ────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ip_hash   TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT NULL;

-- ── FIX 2/3/4: website_html on tenant_config (needed by existing routes) ─────
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS website_html TEXT DEFAULT NULL;

-- ── FIX 2/3/4: Websites table (multi-site per tenant) ────────────────────────
CREATE TABLE IF NOT EXISTS websites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL DEFAULT 'My Website',
  slug            TEXT        NOT NULL,
  domain          TEXT        DEFAULT NULL,
  domain_status   TEXT        NOT NULL DEFAULT 'pending',
  draft_spec      JSONB       DEFAULT NULL,
  draft_html      TEXT        DEFAULT NULL,
  published_html  TEXT        DEFAULT NULL,
  published_spec  JSONB       DEFAULT NULL,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_websites_slug   ON websites(slug);
CREATE        INDEX IF NOT EXISTS idx_websites_tenant ON websites(tenant_id, created_at DESC);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'websites' AND policyname = 'websites_owner'
  ) THEN
    CREATE POLICY "websites_owner" ON websites
      FOR ALL USING (
        tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

-- ── FIX 4: Version history ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id  UUID        NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  spec        JSONB       NOT NULL,
  html        TEXT        NOT NULL,
  label       TEXT        NOT NULL DEFAULT 'Update',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_versions_website ON website_versions(website_id, created_at DESC);

ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'website_versions' AND policyname = 'website_versions_owner'
  ) THEN
    CREATE POLICY "website_versions_owner" ON website_versions
      FOR ALL USING (
        website_id IN (
          SELECT w.id FROM websites w
          JOIN tenants t ON t.id = w.tenant_id
          WHERE t.owner_id = auth.uid()
        )
      );
  END IF;
END $$;
