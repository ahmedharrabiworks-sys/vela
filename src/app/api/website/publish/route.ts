import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Round M FIX 2: same extraction technique already used in save-edit/
// route.ts's own local extractImageMap -- lets publish re-render fresh
// from the current spec + current renderer code WITHOUT re-fetching new
// Unsplash photos for sections whose images are already resolved.
function extractImageMap(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};
  const SINGLE_IMG = new Set(["hero", "hero-fullbleed", "hero-split", "hero-minimal", "about", "about-story"]);
  const MULTI_IMG = new Set(["gallery", "gallery-grid", "listings-grid"]);
  const SECTION_ANCHOR: Record<string, string> = {
    "hero": "hero", "hero-fullbleed": "hero", "hero-split": "hero", "hero-minimal": "hero",
    "about": "about", "about-story": "about",
    "gallery": "gallery", "gallery-grid": "gallery",
    "listings-grid": "listings",
  };
  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const anchor = SECTION_ANCHOR[s.type];
    if (!anchor) continue;
    const anchorIdx = html.indexOf(`id="${anchor}"`);
    if (anchorIdx === -1) continue;
    const slice = html.slice(anchorIdx, anchorIdx + 30_000);
    if (MULTI_IMG.has(s.type)) {
      const imgRe = /<img[^>]+src="(https?:\/\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      let j = 0;
      while ((m = imgRe.exec(slice)) !== null) images[`${i}_${j++}`] = m[1];
    } else if (SINGLE_IMG.has(s.type)) {
      const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
      if (m) images[String(i)] = m[1];
    }
  }
  return images;
}

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
    websiteId?: string;
  };

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    const cookieNames = cookies().getAll().map(c => c.name)
      .filter(n => n.startsWith("sb-") || n.includes("supabase"));
    console.error(
      "[website/publish] auth failed",
      "| error:", authError?.message ?? "none",
      "| code:", authError?.code ?? "none",
      "| auth cookies:", cookieNames.length > 0 ? cookieNames.join(", ") : "NONE FOUND",
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Round M FIX 2: previously copied draft_html verbatim into
  // published_html -- if published_html was ever set from HTML rendered by
  // OLDER renderer code (e.g. before a color/contrast/token fix landed),
  // this route had no mechanism that would ever pick up current code; the
  // stale bytes were published forever, unchanged, no matter how many times
  // "Update Site" was pressed, unless the draft itself happened to also get
  // regenerated some other way first. Now re-renders fresh from
  // draft_spec using the CURRENT renderWebsite/resolveDesignDNA code on
  // every publish, so styling fixes reach a real published site the moment
  // it's next published -- not only sites edited after the fix shipped.
  // Reuses existing images (via extractImageMap, same technique save-edit/
  // route.ts already uses) and preserves the existing language/RTL
  // direction (reverse-mapped from draft_html's own <html lang="…" dir="…">
  // attributes, since language isn't a column on `websites` and is never
  // client-supplied to this route) -- both real, unchanged values, never a
  // silent reset to English/LTR for a non-English site.
  const REVERSE_LANG_CODE: Record<string, string> = {
    ar: "Arabic", fr: "French", es: "Spanish", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", en: "English",
  };
  let htmlToPublish: string | null = null;
  if (site?.draft_spec && site.draft_html) {
    try {
      const spec = site.draft_spec as WebsiteSpec;
      const imageMap = extractImageMap(spec, site.draft_html);
      const langMatch = site.draft_html.match(/<html[^>]*\slang="([a-z]{2})"/i);
      const language = langMatch ? REVERSE_LANG_CODE[langMatch[1].toLowerCase()] : undefined;
      htmlToPublish = renderWebsite(spec, imageMap, tenant.id as string, language);
    } catch (err) {
      console.error("[website/publish] fresh re-render failed, falling back to stored draft_html:", err);
      htmlToPublish = site.draft_html.trim() || null;
    }
  } else {
    // No draft_spec (a legacy site, or one whose spec is genuinely
    // unavailable) -- fall back to whatever draft_html is already there
    // rather than blocking a real publish over it.
    htmlToPublish = site?.draft_html?.trim() || null;
  }

  if (!htmlToPublish) {
    console.error("[website/publish] no draft_html for site", site?.id ?? "none", "tenant", tenant.id);
    return NextResponse.json(
      { error: "No website draft found. Generate a site first." },
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
      return NextResponse.json({ error: "Failed to publish. Please try again." }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to save site. Please try again." }, { status: 500 });
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
