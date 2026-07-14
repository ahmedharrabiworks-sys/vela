import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlResponse(html: string) {
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type":           "text/html; charset=utf-8",
      "Cache-Control":          "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  if (!tenantId || !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  if (UUID_RE.test(tenantId)) {
    // UUID lookup: check websites table first (published_html), then tenant_config fallback
    const { data: site } = await admin
      .from("websites")
      .select("published_html")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (site?.published_html) return htmlResponse(site.published_html as string);

    // Backward compat: sites published before v7 migration live in tenant_config
    const { data: config } = await admin
      .from("tenant_config")
      .select("website_html")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (config?.website_html) return htmlResponse(config.website_html as string);
  } else {
    // Slug lookup
    const { data: site } = await admin
      .from("websites")
      .select("published_html")
      .eq("slug", tenantId)
      .eq("is_published", true)
      .maybeSingle();

    if (site?.published_html) return htmlResponse(site.published_html as string);
  }

  return new NextResponse("Site not found", { status: 404 });
}
