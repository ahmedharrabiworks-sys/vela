import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildTrackScript(websiteId: string): string {
  // Injected into every published site page. Fires a pageview to /api/site/track on load.
  // Skips if running inside an iframe (e.g. builder preview) so internal views aren't counted.
  const wid = JSON.stringify(websiteId);
  return `<script>(function(){if(window.self!==window.top)return;try{fetch('/api/site/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({websiteId:${wid},path:window.location.pathname,referrer:document.referrer}),keepalive:true});}catch(e){}})();</script>`;
}

function htmlResponse(html: string, tenantIdForCount?: string, admin?: AdminClient, websiteIdForTracking?: string) {
  // Increment visit counter fire-and-forget (best-effort read-modify-write)
  if (tenantIdForCount && admin) {
    (async () => {
      try {
        const { data } = await admin
          .from("tenant_config")
          .select("website_visit_count")
          .eq("tenant_id", tenantIdForCount)
          .maybeSingle();
        const next = ((data as Record<string, unknown> | null)?.website_visit_count as number ?? 0) + 1;
        await admin
          .from("tenant_config")
          .upsert({ tenant_id: tenantIdForCount, website_visit_count: next }, { onConflict: "tenant_id" });
      } catch { /* non-critical */ }
    })();
  }

  // Inject client-side analytics tracking script before </body>
  let finalHtml = html;
  if (websiteIdForTracking) {
    const script = buildTrackScript(websiteIdForTracking);
    finalHtml = html.includes("</body>")
      ? html.replace("</body>", script + "</body>")
      : html + script;
  }

  return new NextResponse(finalHtml, {
    status: 200,
    headers: {
      "Content-Type":             "text/html; charset=utf-8",
      "Cache-Control":            "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options":   "nosniff",
      "X-Frame-Options":          "SAMEORIGIN",
      "X-XSS-Protection":         "1; mode=block",
      "Referrer-Policy":          "strict-origin-when-cross-origin",
      "Permissions-Policy":       "camera=(), microphone=(), geolocation=()",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  if (!tenantId || !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  // ── 1. Slug lookup first (canonical URL path) ─────────────────────────────
  if (!UUID_RE.test(tenantId)) {
    const { data: site } = await admin
      .from("websites")
      .select("published_html, tenant_id, id")
      .eq("slug", tenantId)
      .eq("is_published", true)
      .maybeSingle();

    if (site?.published_html) {
      return htmlResponse(site.published_html as string, site.tenant_id as string | undefined, admin, site.id as string | undefined);
    }

    return new NextResponse("Site not found", { status: 404 });
  }

  // ── 2. UUID param: legacy / direct tenant-id URL ──────────────────────────
  // Look up the website by tenant_id (old URL format).
  const { data: site } = await admin
    .from("websites")
    .select("published_html, slug, tenant_id, id")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (site?.published_html) {
    // If the site has a slug, 301-redirect so the canonical URL is used.
    const siteSlug = site.slug as string | null;
    if (siteSlug && siteSlug.length > 0 && !UUID_RE.test(siteSlug)) {
      const redirectUrl = new URL(`/site/${siteSlug}`, req.url);
      return NextResponse.redirect(redirectUrl, 301);
    }
    return htmlResponse(site.published_html as string, tenantId, admin, site.id as string | undefined);
  }

  // Backward compat: sites published before websites table migration live in tenant_config.
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_html")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (config?.website_html) return htmlResponse(config.website_html as string, tenantId, admin);

  return new NextResponse("Site not found", { status: 404 });
}
