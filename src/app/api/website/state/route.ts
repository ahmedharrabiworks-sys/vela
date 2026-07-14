import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── GET /api/website/state ─────────────────────────────────────────────────────
// Returns everything needed to fully rehydrate the Website Builder on mount.
export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id, plan").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ html: null, chat: null });

  // Fetch the most-recently-updated website for this tenant
  const { data: site } = await admin
    .from("websites")
    .select("id, name, slug, is_published, draft_html, published_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch tenant_config for chat, intake, versions, domain
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_html, website_chat, website_intake, website_versions, website_custom_domain, website_domain_status, website_domain_records, website_visit_count")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const tc = config as Record<string, unknown> | null;
  const html    = (site?.draft_html as string | null) || (tc?.website_html as string | null) || null;
  const slug    = (site?.slug as string | null) ?? null;
  const name    = (site?.name as string | null) ?? null;

  return NextResponse.json({
    websiteId:     site?.id ?? null,
    html,
    slug,
    name,
    isPublished:   site?.is_published ?? false,
    publishedUrl:  slug ? `/site/${slug}` : (site?.id ? `/site/${site.id}` : null),
    chat:          tc?.website_chat ?? null,
    intake:        tc?.website_intake ?? null,
    versions:      tc?.website_versions ?? [],
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
