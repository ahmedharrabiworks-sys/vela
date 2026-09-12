-- ============================================================
-- VELA — Migration v38: unique constraint on tenants.owner_id
-- ============================================================
-- Root cause fix for the tenant-duplication bug (ensureTenant's
-- select-then-insert race, see src/lib/ensure-tenant.ts). This constraint
-- is what src/lib/ensure-tenant.ts's rewritten atomic upsert
-- (INSERT ... ON CONFLICT (owner_id) DO UPDATE ... RETURNING) depends on --
-- without it, that ON CONFLICT clause has no matching constraint to target
-- and every call would fail outright.
--
-- ⚠️ DO NOT RUN THIS until the one-time data consolidation described in the
-- "tenant duplication cleanup" task has been completed and verified
-- (every owner_id must already have at most one tenants row, confirmed via
-- a real query, before this ALTER TABLE can succeed at all -- a UNIQUE
-- constraint cannot be added over existing duplicate values; the ALTER
-- TABLE will simply fail with a constraint-violation error until then,
-- which is itself a safe, non-destructive way to confirm consolidation
-- actually finished before this runs).
--
-- Safe to run multiple times after that point (IF NOT EXISTS guard).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_owner_id_key'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_owner_id_key UNIQUE (owner_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
