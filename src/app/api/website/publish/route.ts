import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function POST(req: NextRequest) {
  // Client sends the current rendered HTML so publish is not dependent on whether
  // the generate route's background upsert has completed.
  const body = await req.json().catch(() => ({})) as { html?: string };

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  const htmlToSave = typeof body.html === "string" ? body.html.trim() : "";

  if (htmlToSave) {
    // Primary path: client sent the HTML — save it now (authoritative)
    const { error } = await admin
      .from("tenant_config")
      .upsert({ tenant_id: tenant.id, website_html: htmlToSave }, { onConflict: "tenant_id" });
    if (error) {
      console.error("[website/publish] upsert error:", error.message);
      return NextResponse.json({ error: "Failed to save site — please try again." }, { status: 500 });
    }
  } else {
    // Fallback: HTML not sent — check if database already has it
    const { data: config } = await admin
      .from("tenant_config")
      .select("website_html")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!config?.website_html) {
      return NextResponse.json({ error: "No website built yet — generate a site first" }, { status: 400 });
    }
  }

  const siteUrl = `/site/${tenant.id}`;
  return NextResponse.json({ url: siteUrl });
}
