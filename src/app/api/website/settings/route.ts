import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const SLUG_RE    = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;  // 3–50 chars
const DOMAIN_RE  = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;

// ── GET /api/website/settings?websiteId=xxx ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const websiteId = searchParams.get("websiteId");

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  const query = admin
    .from("websites")
    .select("id, name, slug, domain, domain_status, is_published, published_at")
    .eq("tenant_id", tenant.id);

  const { data: site } = websiteId
    ? await query.eq("id", websiteId).maybeSingle()
    : await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (!site) return NextResponse.json({ error: "No website found" }, { status: 404 });

  return NextResponse.json(site);
}

// ── PUT /api/website/settings ─────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    websiteId?: string;
    name?:      string;
    slug?:      string;
    domain?:    string;
  };

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  // Resolve website
  const { data: site } = await admin
    .from("websites")
    .select("id, slug")
    .eq("tenant_id", tenant.id)
    .eq("id", body.websiteId ?? "")
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Name
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 100);
    if (name) updates.name = name;
  }

  // Slug
  if (typeof body.slug === "string") {
    const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be 3–50 characters: lowercase letters, numbers, and hyphens only." },
        { status: 400 }
      );
    }
    if (slug !== (site as { slug: string }).slug) {
      // Uniqueness check
      const { data: conflict } = await admin
        .from("websites").select("id").eq("slug", slug).maybeSingle();
      if (conflict) {
        return NextResponse.json(
          { error: "This URL slug is already taken — try another." },
          { status: 409 }
        );
      }
    }
    updates.slug = slug;
  }

  // Custom domain (saved as-is; actual DNS wiring is a manual/future step)
  if (typeof body.domain === "string") {
    const domain = body.domain.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (domain && !DOMAIN_RE.test(domain)) {
      return NextResponse.json({ error: "Please enter a valid domain (e.g. www.yourbusiness.com)." }, { status: 400 });
    }
    updates.domain        = domain || null;
    updates.domain_status = domain ? "pending" : null;
  }

  const { data: updated, error: updateErr } = await admin
    .from("websites")
    .update(updates)
    .eq("id", (site as { id: string }).id)
    .select("id, name, slug, domain, domain_status")
    .single();

  if (updateErr) {
    console.error("[website/settings] update error:", updateErr.message);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }

  return NextResponse.json(updated);
}
