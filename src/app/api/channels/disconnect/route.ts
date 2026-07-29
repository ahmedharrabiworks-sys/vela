import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { channel?: string };
  const { channel } = body;

  if (channel !== "instagram" && channel !== "whatsapp") {
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
    await admin.from("tenant_config")
      .update({ instagram_connected: false, instagram_username: "", instagram_access_token: "", instagram_business_id: "" })
      .eq("tenant_id", tenant.id);
  } else {
    // Deactivate all active whatsapp_accounts rows for this tenant
    await admin.from("whatsapp_accounts")
      .update({ is_active: false })
      .eq("tenant_id", tenant.id)
      .eq("is_active", true);
    // Clear tenant_config WhatsApp fields
    await admin.from("tenant_config")
      .update({ whatsapp_connected: false, whatsapp_phone: "", whatsapp_waba_id: null })
      .eq("tenant_id", tenant.id);
  }

  return NextResponse.json({ success: true });
}
