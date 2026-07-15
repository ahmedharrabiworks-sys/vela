import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

type VersionEntry = {
  id: string;
  created_at: string;
  label: string;
  type: "generate" | "publish";
  html: string;
  structure: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    html?:      string;
    websiteId?: string;
  };

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

  // ── Resolve the website to publish ───────────────────────────────────────
  type SiteRow = { id: string; slug: string | null; name: string | null; draft_html: string | null; draft_spec: unknown };
  let site: SiteRow | null = null;

  const clientWebsiteId = typeof body.websiteId === "string" ? body.websiteId : null;

  if (clientWebsiteId) {
    const { data } = await admin
      .from("websites")
      .select("id, slug, name, draft_html, draft_spec")
      .eq("id", clientWebsiteId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    site = data as SiteRow | null;
  }

  if (!site) {
    // Fall back to most-recently-updated website for this tenant
    const { data } = await admin
      .from("websites")
      .select("id, slug, name, draft_html, draft_spec")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    site = data as SiteRow | null;
  }

  // Determine what HTML to publish: prefer draft_html from DB, fall back to body.html
  const bodyHtml     = typeof body.html === "string" ? body.html.trim() : "";
  const htmlToPublish = (site?.draft_html?.trim()) || bodyHtml || null;

  if (!htmlToPublish) {
    return NextResponse.json(
      { error: "No website draft found — generate a site first." },
      { status: 400 }
    );
  }

  // ── Promote draft → published in websites table ───────────────────────────
  if (site?.id) {
    const { error: publishErr } = await admin
      .from("websites")
      .update({
        published_html: htmlToPublish,
        published_spec: site.draft_spec,
        is_published:   true,
        published_at:   new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      })
      .eq("id", site.id);

    if (publishErr) {
      console.error("[website/publish] websites update error:", publishErr.message);
      return NextResponse.json({ error: "Failed to publish — please try again." }, { status: 500 });
    }

    // Save a publish snapshot to version history
    await admin.from("website_versions").insert({
      website_id: site.id,
      spec:       site.draft_spec ?? {},
      html:       htmlToPublish,
      label:      "Published",
    });
  }

  // ── Append "Published" version to tenant_config.website_versions ────────────
  const { data: tcData } = await admin
    .from("tenant_config")
    .select("website_versions")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const existingVersions: VersionEntry[] =
    Array.isArray((tcData as Record<string, unknown> | null)?.website_versions)
      ? ((tcData as Record<string, unknown>).website_versions as VersionEntry[])
      : [];

  const publishedVersion: VersionEntry = {
    id:         crypto.randomUUID(),
    created_at: new Date().toISOString(),
    label:      "Published",
    type:       "publish",
    html:       htmlToPublish,
    structure:  {},
  };

  const updatedVersions = [...existingVersions, publishedVersion].slice(-20);

  // ── Keep tenant_config in sync (backward compat + chat/intake preserved) ──
  const { error: configErr } = await admin
    .from("tenant_config")
    .upsert({
      tenant_id:        tenant.id,
      website_html:     htmlToPublish,
      website_versions: updatedVersions,
    }, { onConflict: "tenant_id" });
  if (configErr) {
    console.error("[website/publish] tenant_config upsert error:", configErr.message);
    return NextResponse.json({ error: "Failed to save site — please try again." }, { status: 500 });
  }

  // Derive a human-readable slug from the site name if the current slug is missing or UUID-shaped
  const slugIsUuid = (s: string | null | undefined) =>
    !s || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  let slug = site?.slug ?? null;
  if (site?.id && slugIsUuid(slug)) {
    const rawName = site.name ?? "";
    const base = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "my-site";
    const { data: conflict } = await admin
      .from("websites").select("id").eq("slug", base).neq("id", site.id).maybeSingle();
    const freshSlug = conflict
      ? `${base}-${Math.random().toString(36).slice(2, 6)}`
      : base;
    await admin.from("websites").update({ slug: freshSlug }).eq("id", site.id);
    slug = freshSlug;
  }

  const siteUrl = slug ? `/site/${slug}` : `/site/${tenant.id}`;
  return NextResponse.json({ url: siteUrl, slug });
}
