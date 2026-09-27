-- Auth security hardening: durable (Postgres-backed) rate limiting +
-- account-status lookup for the auth flows. Both functions are
-- SECURITY DEFINER, callable ONLY by service_role (server-side app code,
-- never the browser) -- same lockdown pattern as mission_control_access_log
-- and other privileged tables in this project.
--
-- Fail-safe by design: the server-side callers of these functions (see
-- src/lib/auth/rate-limit-db.ts) catch any error here (missing table,
-- missing function, connection issue) and fall back to the existing
-- in-memory limiter + generic messaging rather than failing open or
-- crashing the auth flow. Running this migration only makes the existing
-- protection durable across cold starts / serverless instances -- it does
-- not turn on protection that wasn't there before.

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count int NOT NULL
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- Deliberately zero policies: RLS with no policies denies all access via
-- PostgREST (anon/authenticated roles get nothing). The SECURITY DEFINER
-- function below runs as the function owner and bypasses RLS to read/write
-- this table; the service_role key also bypasses RLS entirely. App code
-- never queries this table directly except via that function.

CREATE OR REPLACE FUNCTION public.auth_rate_hit(p_key text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count int;
BEGIN
  INSERT INTO public.auth_rate_limits (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.auth_rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE public.auth_rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.auth_rate_limits.window_start <= v_now - make_interval(secs => p_window_seconds)
        THEN v_now
      ELSE public.auth_rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.auth_rate_hit(text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_rate_hit(text, int, int) TO service_role;


-- 'none'        -> no auth.users row for this email at all
-- 'unconfirmed' -> a row exists but email_confirmed_at is still null
-- 'google_only' -> confirmed, has a google identity, no email/password identity
-- 'password'    -> confirmed, has an email/password identity (default/fallback
--                  for any other confirmed shape too, so this never returns
--                  something the caller doesn't know how to handle)
CREATE OR REPLACE FUNCTION public.auth_email_status(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_confirmed_at timestamptz;
  v_has_password boolean;
  v_has_google boolean;
BEGIN
  SELECT id, email_confirmed_at
  INTO v_user_id, v_confirmed_at
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN 'none';
  END IF;

  IF v_confirmed_at IS NULL THEN
    RETURN 'unconfirmed';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'email'
  ) INTO v_has_password;

  SELECT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = v_user_id AND provider = 'google'
  ) INTO v_has_google;

  IF v_has_password THEN
    RETURN 'password';
  ELSIF v_has_google THEN
    RETURN 'google_only';
  END IF;

  RETURN 'password';
END;
$$;

REVOKE ALL ON FUNCTION public.auth_email_status(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_email_status(text) TO service_role;

NOTIFY pgrst, 'reload schema';
