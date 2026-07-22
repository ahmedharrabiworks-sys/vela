import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── GET /api/website/state ─────────────────────────────────────────────────────
// Returns everything needed to fully rehydrate the Website Builder on mount.
// ?websiteId=xxx → returns that specific website's html (for project switching).
export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id, plan").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ html: null, chat: null });

  const requestedWebsiteId = new URL(_req.url).searchParams.get("websiteId");

  // Fetch the target website (specific or most-recently-updated)
  let site: { id: string; name: string | null; slug: string | null; is_published: boolean; draft_html: string | null; published_at: string | null } | null = null;
  if (requestedWebsiteId) {
    const { data } = await admin
      .from("websites")
      .select("id, name, slug, is_published, draft_html, published_at")
      .eq("tenant_id", tenant.id)
      .eq("id", requestedWebsiteId)
      .maybeSingle();
    site = data as typeof site;
  } else {
    const { data } = await admin
      .from("websites")
      .select("id, name, slug, is_published, draft_html, published_at")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    site = data as typeof site;
  }

  // All websites for this tenant (project sidebar)
  const { data: allSites } = await admin
    .from("websites")
    .select("id, name, slug, is_published, updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });
  const projects = (allSites ?? []).map((s: { id: string; name: string | null; slug: string | null; is_published: boolean; updated_at: string | null }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    is_published: s.is_published,
    published_url: s.is_published ? (s.slug ? `/site/${s.slug}` : `/site/${tenant.id}`) : null,
    updated_at: s.updated_at,
  }));

  // Fetch tenant_config for chat, intake, domain
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_html, website_chat, website_intake, website_versions, website_custom_domain, website_domain_status, website_domain_records, website_visit_count")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const tc = config as Record<string, unknown> | null;
  // When fetching a specific site by ID (project switch), never fall back to the global
  // tenant_config.website_html — that field belongs to whatever site was last generated
  // and would show another site's HTML in the preview.
  const html = requestedWebsiteId
    ? (site?.draft_html as string | null) ?? null
    : (site?.draft_html as string | null) || (tc?.website_html as string | null) || null;
  const slug    = (site?.slug as string | null) ?? null;
  const name    = (site?.name as string | null) ?? null;

  // Fetch versions from website_versions TABLE for the active site (per-site, not global).
  // Falls back to the legacy tenant_config JSON column if the TABLE has no entries yet.
  let versions: unknown[] = [];
  if (site?.id) {
    const { data: vRows } = await admin
      .from("website_versions")
      .select("id, label, html, created_at")
      .eq("website_id", site.id)
      .order("created_at", { ascending: true })
      .limit(20);
    if (vRows?.length) {
      versions = (vRows as { id: string; label: string; html: string; created_at: string }[]).map((v) => ({
        id:         v.id,
        label:      v.label,
        html:       v.html,
        created_at: v.created_at,
        type:       v.label === "Published" ? "publish" : "generate",
      }));
    } else if (!requestedWebsiteId) {
      // Fallback to tenant_config only on initial page load (no specific site requested).
      // When switching between sites, never return another site's version history.
      versions = Array.isArray(tc?.website_versions) ? (tc.website_versions as unknown[]) : [];
    }
  }

  return NextResponse.json({
    websiteId:     site?.id ?? null,
    html,
    slug,
    name,
    isPublished:   site?.is_published ?? false,
    publishedUrl:  (site?.is_published ?? false)
      ? (slug ? `/site/${slug}` : `/site/${tenant.id}`)
      : null,
    projects,
    chat:          tc?.website_chat ?? null,
    intake:        tc?.website_intake ?? null,
    versions,
    customDomain:  tc?.website_custom_domain ?? null,
    domainStatus:  tc?.website_domain_status ?? null,
    domainRecords: tc?.website_domain_records ?? null,
    visitCount:    (tc?.website_visit_count as number | null) ?? 0,
    plan:          (tenant?.plan as string | null) ?? "starter",
  });
}

// ── PATCH /api/website/state ───────────────────────────────────────────────────
// Persists chat history and intake (contact info) to tenant_config.
// Called fire-and-forget from the client after each generate/settings update.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    chat?:   unknown[];
    intake?: Record<string, string>;
  };

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ ok: false });

  const updates: Record<string, unknown> = { tenant_id: tenant.id };
  if (Array.isArray(body.chat))  updates.website_chat   = body.chat;
  if (body.intake != null)       updates.website_intake = body.intake;

  await admin.from("tenant_config").upsert(updates, { onConflict: "tenant_id" });

  return NextResponse.json({ ok: true });
}
