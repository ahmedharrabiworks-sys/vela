-- migration_v19.sql
-- RPC wrapper so the Security Agent can query pg_policies via admin.rpc().
-- PostgREST cannot expose pg_catalog directly (it only exposes the 'public' and
-- 'graphql_public' schemas). A SECURITY DEFINER function in the public schema is
-- the standard Supabase bypass for system-catalog queries.
--
-- SECURITY DEFINER + explicit SET search_path prevents search-path injection
-- (the known attack vector for SECURITY DEFINER functions).
-- REVOKE/GRANT narrows execution to service_role only — anon/authenticated
-- callers cannot invoke this even if they discover the function name.

CREATE OR REPLACE FUNCTION get_rls_policies()
RETURNS TABLE (
  schemaname  TEXT,
  tablename   TEXT,
  policyname  TEXT,
  permissive  TEXT,
  cmd         TEXT,
  qual        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    schemaname::TEXT,
    tablename::TEXT,
    policyname::TEXT,
    permissive::TEXT,
    cmd::TEXT,
    qual::TEXT
  FROM pg_policies
  WHERE schemaname = 'public';
$$;

REVOKE EXECUTE ON FUNCTION get_rls_policies() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION get_rls_policies() TO service_role;

NOTIFY pgrst, 'reload schema';
