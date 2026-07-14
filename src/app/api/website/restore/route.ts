import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// POST /api/website/restore — restore a specific version as the current draft.
// Accepts either:
//   { websiteId, versionId } — looks up by website_versions table (server-side IDs)
//   { websiteId, html }      — restores directly from client-provided HTML
//                              (used for client-generated version cards whose IDs
//                               are crypto.randomUUID() and don't exist in the table)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    websiteId?: string;
    versionId?: string;
    html?:      string;
  };

  if (!body.websiteId) {
    return NextResponse.json({ error: "websiteId required" }, { status: 400 });
  }
  if (!body.versionId && !body.html) {
    return NextResponse.json({ error: "versionId or html required" }, { status: 400 });
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

  // Resolve HTML — try DB lookup first, fall back to body.html
  let htmlToRestore: string | null = null;

  if (body.versionId) {
    const { data: version } = await admin
      .from("website_versions")
      .select("html, spec")
      .eq("id", body.versionId)
      .eq("website_id", body.websiteId)
      .maybeSingle();

    if (version) {
      htmlToRestore = (version as { html: string }).html;
    }
  }

  // Fall back to client-supplied HTML (for client-generated version records)
  if (!htmlToRestore && body.html) {
    htmlToRestore = body.html;
  }

  if (!htmlToRestore) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const finalHtml = htmlToRestore;

  // Restore: set this version as the current draft
  const { error: restoreErr } = await admin
    .from("websites")
    .update({
      draft_html: finalHtml,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.websiteId);

  if (restoreErr) {
    console.error("[website/restore] error:", restoreErr.message);
    return NextResponse.json({ error: "Restore failed — please try again." }, { status: 500 });
  }

  // Record a restore snapshot in website_versions table
  await admin.from("website_versions").insert({
    website_id: body.websiteId,
    spec:       {},
    html:       finalHtml,
    label:      "Restored",
  });

  // Keep tenant_config in sync
  await admin.from("tenant_config").upsert(
    { tenant_id: tenant.id, website_html: finalHtml },
    { onConflict: "tenant_id" }
  );

  return NextResponse.json({ html: finalHtml });
}
