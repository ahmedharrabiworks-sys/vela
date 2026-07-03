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

  const updates =
    channel === "instagram"
      ? { instagram_connected: false, instagram_username: "", instagram_access_token: "", instagram_business_id: "" }
      : { whatsapp_connected: false, whatsapp_phone: "" };

  await admin.from("tenant_config").update(updates).eq("tenant_id", tenant.id);

  return NextResponse.json({ success: true });
}
