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
 * Never returns null — any authenticated user gets a tenant.
 */
export async function ensureTenant(
  userId: string,
  userEmail?: string,
  userMeta?: Record<string, unknown>
): Promise<TenantRow> {
  const admin = createSupabaseAdmin() as AdminClient;

  // Fast path: tenant already exists
  const { data: existing } = await admin
    .from("tenants")
    .select("id, business_name, industry, city")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existing) return existing as TenantRow;

  // Derive sensible defaults
  const emailPrefix = (userEmail ?? "").split("@")[0] ?? "My Business";
  const derivedName = emailPrefix.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "My Business";
  const businessName =
    (userMeta?.business_name as string | undefined) ??
    (userMeta?.full_name as string | undefined) ??
    derivedName;

  const industry = (userMeta?.industry as string | undefined) ?? "Other";
  const city     = (userMeta?.city     as string | undefined) ?? "";
  const plan     = "starter";

  const { data: newTenant, error: insertErr } = await admin
    .from("tenants")
    .insert({ owner_id: userId, business_name: businessName, industry, city, plan })
    .select("id, business_name, industry, city")
    .single();

  if (insertErr || !newTenant) {
    // Race condition: someone else created it just now — re-fetch
    const { data: race } = await admin
      .from("tenants")
      .select("id, business_name, industry, city")
      .eq("owner_id", userId)
      .single();
    if (!race) throw new Error("Failed to create or fetch tenant");
    return race as TenantRow;
  }

  // Also create tenant_config row
  await admin
    .from("tenant_config")
    .insert({ tenant_id: newTenant.id })
    .select("id")
    .maybeSingle();

  return newTenant as TenantRow;
}
