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

function buildWidgetScript(tenantId: string, websiteId?: string): string {
  // The same embeddable chat widget a business can paste into an external
  // site (see /api/embed/[tenantId] + /widget/[tenantId]) -- auto-injected
  // here so a published Vela-built site has the AI assistant live with zero
  // manual setup. Skips inside an iframe (e.g. builder preview) the same
  // way the tracking script does, so the bubble never appears in the editor.
  // source=site distinguishes this auto-injected case from an externally
  // pasted embed so conversations can be tagged with the correct channel.
  //
  // CRITICAL FIX: websiteId identifies exactly which of this tenant's
  // (possibly several) websites the widget is embedded on. tenantId alone
  // was never wrong, but a tenant's own business_name/knowledge base is
  // account-level, not per-website -- a tenant who owns multiple websites
  // (Premium/Custom plans allow 2-unlimited) had the assistant on EVERY one
  // of their sites identify itself using the TENANT's own business_name,
  // regardless of which specific website it was embedded on. Confirmed live:
  // a tenant whose account business_name is "Vela dental clinning" published
  // a website named "Azure Bay Hotel" -- the widget on that hotel site
  // answered as "Vela dental clinning". Passing websiteId lets the widget
  // resolve and identify as the specific site it's actually on.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "https://app.vela.ai";
  const src = `${appUrl}/api/embed/${encodeURIComponent(tenantId)}?source=site${websiteId ? `&websiteId=${encodeURIComponent(websiteId)}` : ""}`;
  return `<script>if(window.self===window.top){var s=document.createElement('script');s.src=${JSON.stringify(src)};s.async=true;document.body.appendChild(s);}</script>`;
}

// FIX 6 (round M): real root cause of "toggling the widget off is too slow
// to take effect" -- whether the bootstrap <script> tag exists in the HTML
// at all used to be decided HERE, at generation time, and that decision got
// baked into this response's own Cache-Control (60s fresh + 300s
// stale-while-revalidate below) -- so a toggle change could take up to ~6
// minutes to reach a freshly reloaded site, and reloading DURING that
// window just served the same stale cached snapshot again. The bootstrap
// script tag is now ALWAYS included, unconditionally; the actual
// enabled/disabled decision moved to /api/embed/[tenantId] (see that route),
// which is fetched fresh by the browser on every real page load and has a
// much shorter cache -- so a toggle change now reaches the site on the very
// next reload, not whenever this page's HTML cache happens to expire.
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

  // Inject client-side analytics tracking script + the AI chat widget before </body>
  let finalHtml = html;
  const injections = [
    websiteIdForTracking ? buildTrackScript(websiteIdForTracking) : "",
    tenantIdForCount ? buildWidgetScript(tenantIdForCount, websiteIdForTracking) : "",
  ].join("");
  if (injections) {
    finalHtml = html.includes("</body>")
      ? html.replace("</body>", injections + "</body>")
      : html + injections;
  }

  return new NextResponse(finalHtml, {
    status: 200,
    headers: {
      "Content-Type":             "text/html; charset=utf-8",
      // FIX 5 (round N): discovered live while verifying Disconnect actually
      // stops a site from functioning -- with a positive max-age here, a
      // disconnected (unpublished) site kept being served straight out of
      // Vercel's edge cache for up to 60s (plus up to 300s more of
      // stale-while-revalidate) after is_published flipped to false in the
      // DB, silently failing the "same as never connected" requirement.
      // Same root cause and same fix as /api/embed/[tenantId] (FIX 2, this
      // round): Vercel's edge cache is purely time-based and cannot be
      // invalidated by a DB write, and with multiple independent edge
      // regions each caching on their own schedule, any positive max-age
      // reintroduces a real staleness window regardless of how short it is.
      "Cache-Control":            "no-store",
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
