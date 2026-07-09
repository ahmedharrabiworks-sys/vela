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
 * Returns the tenant for userId, creating one if it doesn't exist.
 * Resilient: uses select("*") and only inserts guaranteed base columns so it
 * works even if optional columns (industry, city) from migration_v2 haven't
 * been applied yet. All Supabase errors are logged for observability.
 */
export async function ensureTenant(
  userId: string,
  userEmail?: string,
  userMeta?: Record<string, unknown>
): Promise<TenantRow> {
  const admin = createSupabaseAdmin() as AdminClient;

  // Fast path: tenant already exists.
  // select("*") avoids PostgREST 42703 errors when optional columns are absent.
  const { data: existing, error: selectErr } = await admin
    .from("tenants")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (selectErr) {
    console.error("[ensureTenant] SELECT error:", selectErr.code, selectErr.message);
  }

  if (existing) {
    return {
      id: existing.id,
      business_name: existing.business_name ?? "",
      industry: existing.industry ?? "",
      city: existing.city ?? "",
    };
  }

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

  // INSERT only the columns guaranteed in the base schema (schema.sql).
  // industry/city from migration_v2 are written separately below so an
  // un-migrated DB doesn't cause a hard failure here.
  const { data: newTenant, error: insertErr } = await admin
    .from("tenants")
    .insert({ owner_id: userId, business_name: businessName, plan: "starter" })
    .select("*")
    .single();

  if (insertErr) {
    console.error("[ensureTenant] INSERT error:", insertErr.code, insertErr.message);
  }

  if (insertErr || !newTenant) {
    // Race condition: another concurrent request created the tenant — re-fetch.
    const { data: race, error: raceErr } = await admin
      .from("tenants")
      .select("*")
      .eq("owner_id", userId)
      .single();

    if (raceErr) {
      console.error("[ensureTenant] re-fetch error:", raceErr.code, raceErr.message);
    }
    if (!race) {
      throw new Error(
        `Failed to create or fetch tenant — insert: ${insertErr?.message ?? "unknown"}`
      );
    }
    return {
      id: race.id,
      business_name: race.business_name ?? "",
      industry: race.industry ?? "",
      city: race.city ?? "",
    };
  }

  // Backfill optional columns if they exist in the schema (migration_v2).
  // Fire-and-forget — does not block or throw if columns are absent.
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
