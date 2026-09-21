import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { channel?: string };
  const { channel } = body;

  if (channel !== "instagram" && channel !== "whatsapp" && channel !== "website") {
    return NextResponse.json({ success: false, message: "Invalid channel" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!tenant) return NextResponse.json({ success: false, message: "Tenant not found" }, { status: 404 });

  if (channel === "instagram") {
    // instagram_token_expires_at added by migration_v39.sql (Instagram
    // Business Login rebuild) -- cleared here too so a disconnect doesn't
    // leave a stale expiry sitting behind a disconnected account. Tiered
    // fallback matches the pattern used elsewhere for not-yet-migrated
    // columns (e.g. auth/instagram/callback/route.ts).
    const clearFields: Record<string, unknown> = {
      instagram_connected: false, instagram_username: "", instagram_access_token: "", instagram_business_id: "",
      instagram_token_expires_at: null,
    };
    const { error: igErr } = await admin.from("tenant_config").update(clearFields).eq("tenant_id", tenant.id);
    if (igErr?.code === "PGRST204" || igErr?.code === "42703") {
      delete clearFields.instagram_token_expires_at;
      await admin.from("tenant_config").update(clearFields).eq("tenant_id", tenant.id);
    }
  } else if (channel === "whatsapp") {
    // Deactivate all active whatsapp_accounts rows for this tenant
    await admin.from("whatsapp_accounts")
      .update({ is_active: false })
      .eq("tenant_id", tenant.id)
      .eq("is_active", true);
    // Clear tenant_config WhatsApp fields
    await admin.from("tenant_config")
      .update({ whatsapp_connected: false, whatsapp_phone: "", whatsapp_waba_id: null })
      .eq("tenant_id", tenant.id);
  } else {
    // Round M FIX 12: Website has no single tenant_config aggregate flag
    // like instagram_connected/whatsapp_connected -- "connected" is
    // computed live as ANY of this tenant's websites having is_published
    // true (see channels/page.tsx's loadStatus). This is deliberately the
    // GLOBAL/aggregate switch, not a per-site action: it unpublishes EVERY
    // one of the tenant's sites at once, mirroring what disconnecting
    // Instagram/WhatsApp does at the tenant level. Per-site reconnect still
    // happens individually in Website Builder afterward (sets is_published
    // back to true for just that one site), untouched by this route.
    await admin.from("websites")
      .update({ is_published: false })
      .eq("tenant_id", tenant.id)
      .eq("is_published", true);
  }

  return NextResponse.json({ success: true });
}
