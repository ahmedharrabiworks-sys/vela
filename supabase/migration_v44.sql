-- migration_v44: private sales demo pages (/demo/<token>).
-- Not tied to any tenant. Read only by the server, by exact token, with the
-- service role. RLS is on with NO policies and no grants, so the anon and
-- authenticated roles cannot select, list or write a single row.

CREATE TABLE IF NOT EXISTS demo_pages (
  token            TEXT        PRIMARY KEY CHECK (char_length(token) >= 32 AND token ~ '^[A-Za-z0-9_-]+$'),
  business_name    TEXT        NOT NULL CHECK (char_length(business_name) <= 120),
  business_name_ar TEXT        CHECK (business_name_ar IS NULL OR char_length(business_name_ar) <= 120),
  data             JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

ALTER TABLE demo_pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON demo_pages FROM anon, authenticated;

-- Sample call audio: a private bucket, served only through short signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-audio', 'demo-audio', false)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
