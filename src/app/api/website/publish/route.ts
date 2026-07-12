import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function POST(req: NextRequest) {
  void req;

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

  const { data: config } = await admin
    .from("tenant_config")
    .select("website_html")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!config?.website_html) {
    return NextResponse.json({ error: "No website built yet — generate a site first" }, { status: 400 });
  }

  const siteUrl = `/site/${tenant.id}`;
  return NextResponse.json({ url: siteUrl });
}
