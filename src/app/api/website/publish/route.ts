import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Round M3 FIX 3 (retroactively applied here -- see FIX 1, round M6): this
// function was a STALE, pre-fix duplicate of the extraction technique also
// used in save-edit/route.ts and image-replace/route.ts. Those two files
// already got a fix that made extraction section-type-agnostic (matching
// via the unconditional `data-vs="{i}"` marker + spec-driven single/multi
// detection), but this copy in publish/route.ts was never updated -- it
// still used a hardcoded per-type allowlist (SINGLE_IMG/MULTI_IMG/
// SECTION_ANCHOR) that never recognized feature-showcase, treatment-
// gallery, property-listings-grid, portfolio-grid, membership-plans-
// display, trust-badges-band, agent-card, trainer-showcase, or any other
// image-bearing section type added after the original hero/about/gallery/
// listings-grid set. Any of those section types had their real photos
// silently dropped every time Publish was pressed, even though the exact
// same draft correctly showed those photos in the editor (which reads
// save-edit's already-fixed extraction). Now identical logic to the other
// two files -- single source of truth for the underlying algorithm, still
// duplicated per-file consistent with the existing pattern in this repo.
function getImageQuery(s: { imageQuery?: string; content?: Record<string, unknown> }): string | null {
  if (typeof s.imageQuery === "string" && s.imageQuery.trim()) return s.imageQuery.trim();
  if (s.content && typeof s.content.imageQuery === "string" && (s.content.imageQuery as string).trim()) {
    return (s.content.imageQuery as string).trim();
  }
  return null;
}
function getImageQueries(s: { imageQueries?: string[]; content?: Record<string, unknown> }): string[] {
  if (Array.isArray(s.imageQueries) && s.imageQueries.length) return s.imageQueries;
  if (s.content && Array.isArray(s.content.imageQueries)) return s.content.imageQueries as string[];
  return [];
}
function extractImageMap(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};
  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i] as { imageQuery?: string; imageQueries?: string[]; content?: Record<string, unknown> };
    const isMulti = getImageQueries(s).length > 0;
    const isSingle = !isMulti && !!getImageQuery(s);
    if (!isMulti && !isSingle) continue; // this section never had images to begin with

    const secStart = html.indexOf(`data-vs="${i}"`);
    if (secStart === -1) continue;
    const nextStart = html.indexOf(`data-vs="${i + 1}"`, secStart + 1);
    const slice = nextStart === -1 ? html.slice(secStart) : html.slice(secStart, nextStart);

    // Matches https:// (Unsplash) AND data:image/... (an owner-uploaded photo).
    if (isMulti) {
      const imgRe = /<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      let j = 0;
      while ((m = imgRe.exec(slice)) !== null) {
        images[`${i}_${j++}`] = m[1];
      }
    } else {
      const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/);
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
