import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// POST /api/website/restore — restore a specific version as the current draft
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    websiteId?: string;
    versionId?: string;
  };

  if (!body.websiteId || !body.versionId) {
    return NextResponse.json({ error: "websiteId and versionId required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  // Verify ownership
  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  const { data: site } = await admin
    .from("websites")
    .select("id")
    .eq("id", body.websiteId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  // Fetch the requested version
  const { data: version } = await admin
    .from("website_versions")
    .select("id, html, spec")
    .eq("id", body.versionId)
    .eq("website_id", body.websiteId)
    .maybeSingle();
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Restore: set this version as the current draft + save a "Restored" version entry
  const { error: restoreErr } = await admin
    .from("websites")
    .update({
      draft_html: (version as { html: string }).html,
      draft_spec: (version as { spec: unknown }).spec,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.websiteId);

  if (restoreErr) {
    console.error("[website/restore] error:", restoreErr.message);
    return NextResponse.json({ error: "Restore failed — please try again." }, { status: 500 });
  }

  await admin.from("website_versions").insert({
    website_id: body.websiteId,
    spec:       (version as { spec: unknown }).spec,
    html:       (version as { html: string }).html,
    label:      "Restored",
  });

  // Also update tenant_config draft for backward compat
  await admin.from("tenant_config").upsert(
    { tenant_id: tenant.id, website_html: (version as { html: string }).html },
    { onConflict: "tenant_id" }
  );

  return NextResponse.json({ html: (version as { html: string }).html });
}
