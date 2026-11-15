-- migration_v45: the online sales dashboard (sales-site/, Vercel project "vela-sales").
-- Isolated sales_* tables in the same project. Nothing here touches tenant data.
-- Access model:
--   * the laptop worker writes everything with the service role (bypasses RLS);
--   * the site uses the anon key + the signed-in user's session, so RLS decides:
--     only emails listed in sales_admins can read, and they can only INSERT jobs
--     (status 'queued'); every other write comes from the worker;
--   * anon and every other signed-in user get nothing.
-- After running it, add your admin email(s) at the bottom (same list as the
-- SALES_ADMIN_EMAILS env var of the sales site).

-- ── Admin list (read only through the function below) ──
CREATE TABLE IF NOT EXISTS sales_admins (
  email TEXT PRIMARY KEY CHECK (email = lower(email) AND position('@' in email) > 1)
);
ALTER TABLE sales_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sales_admins FROM anon, authenticated;

CREATE OR REPLACE FUNCTION is_sales_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM sales_admins
    WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) AND coalesce((auth.jwt() ->> 'role') = 'authenticated', false);
$$;
REVOKE ALL ON FUNCTION is_sales_admin() FROM public;
GRANT EXECUTE ON FUNCTION is_sales_admin() TO authenticated;

-- ── Leads (mirror of sales/data/leads.csv + messages, checks, demos, audio) ──
CREATE TABLE IF NOT EXISTS sales_leads (
  slug              TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  name              TEXT NOT NULL,
  niche             TEXT,
  area              TEXT,
  score             INT,
  score_raw         INT,
  why_fits          TEXT,
  status            TEXT NOT NULL DEFAULT 'new',
  status_note       TEXT,
  route             TEXT CHECK (route IS NULL OR route IN ('A', 'B', 'C')),
  owner_name        TEXT,
  owner_role        TEXT,
  owner_confidence  TEXT,
  owner_source      TEXT,
  direct_contact    TEXT,
  direct_type       TEXT,
  contact_url       TEXT,
  website           TEXT,
  instagram         TEXT,
  whatsapp_public   TEXT,
  phone_public      TEXT,
  google_rating     TEXT,
  google_reviews    TEXT,
  closing_time      TEXT,
  after_hours       TEXT,
  evidence          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- comments, reviews, facts, unknowns, size signals
  message           JSONB,                                -- { ar, en, route, send_lang, angle, followups: [...] }
  check_result      JSONB,                                -- after-hours check, if logged
  check_plan        JSONB,                                -- tonight's suggested check { question, from, to, closes }
  demo_url          TEXT,
  audio             JSONB NOT NULL DEFAULT '{}'::jsonb,   -- storage paths { voice_note, call }
  in_today          BOOLEAN NOT NULL DEFAULT false,
  today_rank        INT,
  followup_due      INT,                                  -- 2, 5 or 9 when due today
  contacted_at      DATE,
  last_contacted_at TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  found_at          DATE,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_leads_score_idx ON sales_leads (score DESC);
CREATE INDEX IF NOT EXISTS sales_leads_status_idx ON sales_leads (status);
CREATE INDEX IF NOT EXISTS sales_leads_today_idx ON sales_leads (in_today) WHERE in_today;

-- ── Jobs: the site queues, the laptop worker runs ──
CREATE TABLE IF NOT EXISTS sales_jobs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task         TEXT NOT NULL CHECK (task IN ('power', 'hunt', 'find', 'today', 'followups', 'rescore', 'rewrite', 'sender', 'log', 'check')),
  params       JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(params) < 2000),
  status       TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'stopped', 'failed')),
  result       TEXT,
  requested_by TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sales_jobs_queued_idx ON sales_jobs (created_at) WHERE status = 'queued';

-- ── Live log lines from the laptop ──
CREATE TABLE IF NOT EXISTS sales_logs (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id     BIGINT REFERENCES sales_jobs (id) ON DELETE SET NULL,
  line       TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_logs_created_idx ON sales_logs (created_at DESC);

-- ── Deep hunt plan (niche x area cells) ──
CREATE TABLE IF NOT EXISTS sales_hunt_progress (
  cell_id    TEXT PRIMARY KEY,
  niche      TEXT NOT NULL,
  area       TEXT NOT NULL,
  status     TEXT NOT NULL,
  found      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── The laptop worker (one row) ──
CREATE TABLE IF NOT EXISTS sales_worker (
  id            INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  heartbeat_at  TIMESTAMPTZ,
  power_on      BOOLEAN NOT NULL DEFAULT true,
  running       TEXT,
  queue         JSONB NOT NULL DEFAULT '[]'::jsonb,
  hunt          JSONB NOT NULL DEFAULT '{}'::jsonb,
  sender_status TEXT,
  today_sent    INT NOT NULL DEFAULT 0,
  daily_limit   INT NOT NULL DEFAULT 60,
  queue_left    INT NOT NULL DEFAULT 0,
  eleven_week   INT NOT NULL DEFAULT 0,
  eleven_cap    INT NOT NULL DEFAULT 15000,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO sales_worker (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Stats (security_invoker: the caller's RLS applies) ──
CREATE OR REPLACE VIEW sales_stats WITH (security_invoker = true) AS
SELECT
  count(*)                                                                   AS total_leads,
  count(*) FILTER (WHERE owner_name IS NOT NULL AND owner_name <> '')        AS owners_found,
  count(*) FILTER (WHERE status = 'new' AND route IS NOT NULL AND message IS NOT NULL) AS ready,
  count(*) FILTER (WHERE contacted_at IS NOT NULL)                           AS sent_total,
  count(*) FILTER (WHERE (last_contacted_at AT TIME ZONE 'Asia/Qatar')::date = (NOW() AT TIME ZONE 'Asia/Qatar')::date) AS sent_today,
  count(*) FILTER (WHERE status IN ('replied', 'demo-booked', 'trial', 'won'))  AS replied,
  count(*) FILTER (WHERE status IN ('demo-booked', 'trial', 'won'))         AS demos_booked,
  count(*) FILTER (WHERE status = 'won')                                     AS won,
  (SELECT count(*) FROM sales_hunt_progress WHERE status IN ('done', 'exhausted')) AS cells_done,
  (SELECT count(*) FROM sales_hunt_progress)                                 AS cells_total,
  (SELECT jsonb_object_agg(niche, n) FROM (SELECT coalesce(niche, 'other') AS niche, count(*) AS n FROM sales_leads GROUP BY 1) x) AS by_niche
FROM sales_leads;

-- ── RLS: admins read everything, insert queued jobs only ──
ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_worker ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON sales_leads, sales_jobs, sales_logs, sales_hunt_progress, sales_worker, sales_stats FROM anon;
REVOKE ALL ON sales_leads, sales_jobs, sales_logs, sales_hunt_progress, sales_worker, sales_stats FROM authenticated;
GRANT SELECT ON sales_leads, sales_jobs, sales_logs, sales_hunt_progress, sales_worker, sales_stats TO authenticated;
GRANT INSERT (task, params, requested_by) ON sales_jobs TO authenticated;

DROP POLICY IF EXISTS sales_leads_admin_read ON sales_leads;
CREATE POLICY sales_leads_admin_read ON sales_leads FOR SELECT TO authenticated USING (is_sales_admin());
DROP POLICY IF EXISTS sales_jobs_admin_read ON sales_jobs;
CREATE POLICY sales_jobs_admin_read ON sales_jobs FOR SELECT TO authenticated USING (is_sales_admin());
DROP POLICY IF EXISTS sales_jobs_admin_queue ON sales_jobs;
CREATE POLICY sales_jobs_admin_queue ON sales_jobs FOR INSERT TO authenticated
  WITH CHECK (is_sales_admin() AND status = 'queued' AND started_at IS NULL AND finished_at IS NULL);
DROP POLICY IF EXISTS sales_logs_admin_read ON sales_logs;
CREATE POLICY sales_logs_admin_read ON sales_logs FOR SELECT TO authenticated USING (is_sales_admin());
DROP POLICY IF EXISTS sales_hunt_admin_read ON sales_hunt_progress;
CREATE POLICY sales_hunt_admin_read ON sales_hunt_progress FOR SELECT TO authenticated USING (is_sales_admin());
DROP POLICY IF EXISTS sales_worker_admin_read ON sales_worker;
CREATE POLICY sales_worker_admin_read ON sales_worker FOR SELECT TO authenticated USING (is_sales_admin());

-- ── Realtime (postgres_changes respects the RLS above) ──
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sales_jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sales_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sales_worker; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── Private audio bucket: voice notes and sample calls, signed URLs only ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-audio', 'sales-audio', false)
ON CONFLICT (id) DO UPDATE SET public = false;
-- Admins may create signed URLs (needs SELECT); only the worker (service role) uploads.
DROP POLICY IF EXISTS sales_audio_admin_read ON storage.objects;
CREATE POLICY sales_audio_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sales-audio' AND is_sales_admin());

-- ── Your admin email(s): replace and run ──
-- INSERT INTO sales_admins (email) VALUES ('you@example.com') ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
