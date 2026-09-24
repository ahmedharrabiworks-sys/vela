import { createSupabaseAdmin } from "@/lib/supabase-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

interface TenantRow {
  id: string;
  business_name: string;
  industry: string;
  city: string;
}

/**
 * Tenant-duplication bugfix (found live in production -- one real account
 * had accumulated 2240+ duplicate tenant rows from this exact race):
 *
 * The old version of this function did a plain SELECT, and only INSERTed
 * if nothing came back. Two concurrent calls for the same brand-new user
 * (completely normal -- Sidebar, dashboard stats, and other components all
 * independently call routes that resolve "the current tenant" in parallel
 * on every page load) could BOTH see "no tenant yet" and BOTH insert,
 * creating two rows with nothing to stop it. Worse, once 2+ duplicate rows
 * exist for an owner, every .single()/.maybeSingle() lookup elsewhere in
 * the app (there are many) throws on "more than one row returned", which
 * various callers treat as "no tenant" and insert yet another row -- a
 * self-reinforcing runaway that is what actually produced thousands of
 * rows for the one affected account.
 *
 * Fixed with a real DB-enforced unique constraint on tenants.owner_id
 * (migration_v38.sql) plus an INSERT ... ON CONFLICT (owner_id) DO NOTHING
 * upsert here: once two concurrent callers both reach the creation step,
 * only one INSERT can ever actually land a row; the other's ON CONFLICT
 * clause makes it a genuine no-op, never a second row.
 *
 * This function is deliberately safe to deploy independently of when that
 * migration is actually run: if the unique constraint doesn't exist yet,
 * the ON CONFLICT upsert fails outright (Postgres rejects an ON CONFLICT
 * clause with no matching constraint) and this degrades to a plain insert
 * -- exactly this function's old, pre-fix behavior, never worse. The
 * moment the migration runs, this same already-deployed code starts taking
 * the race-proof path automatically, with no redeploy required.
 *
 * Also resilient to the pre-existing duplicate rows created by the old bug
 * before this fix shipped: the fast path below uses order-by-created_at +
 * limit(1) instead of .single()/.maybeSingle(), so it can never throw on
 * "more than one row" -- it deterministically returns the oldest row (the
 * one confirmed, in every duplicate group found, to be the real one with
 * actual attached data) instead of erroring and creating yet another dupe.
 */
export async function ensureTenant(
  userId: string,
  userEmail?: string,
  userMeta?: Record<string, unknown>
): Promise<TenantRow> {
  const admin = createSupabaseAdmin() as AdminClient;

  // Emergency stopgap (found live in production, 2026-09-12): a heavily
  // polled account -- NotificationBell fetches /api/notifications every
  // 30s, and that route calls this function on every single poll -- kept
  // re-triggering tenant creation even AFTER the fast path was made
  // resilient to pre-existing duplicates. Root cause: fetchExisting()
  // treated a transient SELECT error (a real Supabase/PostgREST hiccup --
  // more likely to actually occur at all simply because this account is
  // queried ~100+ times/hour from a left-open tab, not because of anything
  // wrong with the row itself) IDENTICALLY to "confirmed zero rows", and
  // fell through to creating a brand-new tenant on that uncertain signal.
  // That is exactly backwards: an unknown read must never be treated as
  // permission to create. fetchExisting() now distinguishes "confirmed
  // absent" from "errored, we don't actually know" -- only a CONFIRMED
  // absence (after one retry) is allowed to reach the creation path below.
  async function fetchExisting(): Promise<{ tenant: TenantRow | null; confirmedAbsent: boolean }> {
    const { data, error } = await admin
      .from("tenants")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("[ensureTenant] SELECT error:", error.code, error.message);
      return { tenant: null, confirmedAbsent: false };
    }
    if (!data || data.length === 0) return { tenant: null, confirmedAbsent: true };

    const t = data[0];
    return {
      tenant: {
        id: t.id,
        business_name: t.business_name ?? "",
        industry: t.industry ?? "",
        city: t.city ?? "",
      },
      confirmedAbsent: false,
    };
  }

  // Fast path: tenant already exists (the overwhelming majority of calls).
  const first = await fetchExisting();
  if (first.tenant) return first.tenant;

  if (!first.confirmedAbsent) {
    // The read itself failed -- retry once before giving up. A real,
    // confirmed "zero rows" is required before this function is allowed
    // to create anything; a second consecutive error means we genuinely
    // don't know, so this throws rather than risk another duplicate.
    const retry = await fetchExisting();
    if (retry.tenant) return retry.tenant;
    if (!retry.confirmedAbsent) {
      throw new Error(
        `ensureTenant: could not verify whether a tenant exists for user ${userId} (SELECT failed twice) -- refusing to create one on an uncertain read`
      );
    }
  }
  // Reached only after a real, confirmed "zero rows" result -- safe to create.

  // Derive sensible defaults from auth metadata
  const emailPrefix = (userEmail ?? "").split("@")[0] ?? "My Business";
  const derivedName =
    emailPrefix.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "My Business";
  const businessName =
    (userMeta?.business_name as string | undefined) ??
    (userMeta?.full_name as string | undefined) ??
    derivedName;

  const industry = (userMeta?.industry as string | undefined) ?? "Other";
  const city     = (userMeta?.city     as string | undefined) ?? "";

  // Atomic creation: INSERT ... ON CONFLICT (owner_id) DO NOTHING. Requires
  // the tenants_owner_id_key unique constraint (migration_v38.sql) -- see
  // the fallback branch below for what happens before that constraint exists.
  const { data: inserted, error: upsertErr } = await admin
    .from("tenants")
    .upsert(
      { owner_id: userId, business_name: businessName, plan: "starter" },
      { onConflict: "owner_id", ignoreDuplicates: true }
    )
    .select("*");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let newTenant: any = null;

  if (!upsertErr && inserted && inserted.length > 0) {
    // We won the race (or there was no race) -- a real new row.
    newTenant = inserted[0];
  } else if (!upsertErr) {
    // Upsert succeeded but inserted zero rows: DO NOTHING fired, meaning a
    // concurrent call won the race between our fetchExisting() above and
    // this upsert. Fetch the winner -- it is guaranteed to exist now.
    const winner = await fetchExisting();
    if (winner.tenant) return winner.tenant;
  } else {
    // Upsert itself failed -- most likely because migration_v38.sql hasn't
    // been run yet (no unique constraint for ON CONFLICT to target).
    // Fall back to this function's pre-fix behavior: a plain insert. Still
    // race-prone until the migration runs, but no worse than before.
    console.error("[ensureTenant] upsert error (falling back to legacy insert):", upsertErr.code, upsertErr.message);

    const { data: legacyTenant, error: insertErr } = await admin
      .from("tenants")
      .insert({ owner_id: userId, business_name: businessName, plan: "starter" })
      .select("*")
      .single();

    if (insertErr) {
      console.error("[ensureTenant] legacy insert error:", insertErr.code, insertErr.message);
    }
    newTenant = insertErr ? null : legacyTenant;
  }

  if (!newTenant) {
    // Last resort: someone else created it in the meantime after all.
    const winner = await fetchExisting();
    if (winner.tenant) return winner.tenant;
    throw new Error(`Failed to create or fetch tenant for user ${userId}`);
  }

  // Backfill optional columns if they exist in the schema (migration_v2).
  // Fire-and-forget, does not block or throw if columns are absent.
  void admin.from("tenants").update({ industry, city }).eq("id", newTenant.id);

  // Create the paired tenant_config row (all columns have DB defaults).
  await admin
    .from("tenant_config")
    .insert({ tenant_id: newTenant.id })
    .select("id")
    .maybeSingle();

  return {
    id: newTenant.id,
    business_name: newTenant.business_name ?? businessName,
    industry: newTenant.industry ?? industry,
    city: newTenant.city ?? city,
  };
}
