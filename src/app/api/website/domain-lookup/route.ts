import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// GET /api/website/domain-lookup?hostname=www.example.com
// Returns { slug } for a custom domain so middleware can rewrite to /site/[slug].
// Called by middleware — no auth required (read-only, slug is non-sensitive).
// Looks up websites.domain directly (source of truth for custom domains).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hostname = searchParams.get("hostname")?.toLowerCase().trim();

  if (!hostname) {
    return NextResponse.json({ error: "hostname required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  // Find a published site whose custom domain matches the request hostname.
  // No domain_status filter: if DNS physically routes here, serve the site.
  const { data: site } = await admin
    .from("websites")
    .select("slug, id")
    .eq("domain", hostname)
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const slug = (site as { slug: string | null; id: string }).slug || site.id;
  return NextResponse.json({ slug }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
