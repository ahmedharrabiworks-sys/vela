import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// FIX 6: the "Hide 'Powered by Vela' branding" toggle previously only wrote
// to the owner's own browser localStorage -- it could never reach the
// public widget, which is served to anonymous visitors on a completely
// different device/browser with no access to that localStorage. This is a
// real, tenant-scoped setting (tenant_config.hide_powered_by), read at
// serve time by the widget page the exact same way embed_ai_assistant
// already is for the Website channel's own toggle.

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  const { data: cfg } = await admin
    .from("tenant_config")
    .select("hide_powered_by")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return NextResponse.json({ hidePoweredBy: cfg?.hide_powered_by === true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { hidePoweredBy?: boolean };
  if (typeof body.hidePoweredBy !== "boolean") {
    return NextResponse.json({ error: "hidePoweredBy (boolean) is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin.from("tenants").select("id, plan").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  // Server-side plan gate -- the client already hides this behind isPro,
  // but never trust a client-only gate for a real write.
  const plan = (tenant.plan as string | undefined)?.toLowerCase();
  if (body.hidePoweredBy && plan === "starter") {
    return NextResponse.json({ error: "Upgrade to Pro to hide Vela branding." }, { status: 403 });
  }

  const { error } = await admin
    .from("tenant_config")
    .upsert({ tenant_id: tenant.id, hide_powered_by: body.hidePoweredBy }, { onConflict: "tenant_id" });

  if (error) {
    console.error("[settings/branding] save error:", error.message);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
