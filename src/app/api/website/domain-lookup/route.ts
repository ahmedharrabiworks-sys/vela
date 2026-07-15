import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// GET /api/website/domain-lookup?hostname=www.example.com
// Returns { slug } for a verified custom domain so middleware can rewrite /site/[slug].
// Called by middleware — no auth required (read-only, public slug is non-sensitive).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hostname = searchParams.get("hostname")?.toLowerCase().trim();

  if (!hostname) {
    return NextResponse.json({ error: "hostname required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  // Find tenant whose verified custom domain matches
  const { data: config } = await admin
    .from("tenant_config")
    .select("tenant_id")
    .eq("website_custom_domain", hostname)
    .eq("website_domain_status", "verified")
    .maybeSingle();

  if (!config?.tenant_id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Get the most-recently-published website for this tenant
  const { data: site } = await admin
    .from("websites")
    .select("slug, id")
    .eq("tenant_id", config.tenant_id)
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "no published site" }, { status: 404 });
  }

  const slug = (site as { slug: string | null; id: string }).slug || site.id;
  return NextResponse.json({ slug }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
