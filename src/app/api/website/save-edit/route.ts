import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Round M3 FIX 3: getImageQuery/getImageQueries are verbatim copies of the
// same-named helpers in generate/route.ts (internal there, not exported;
// duplicated for the same reason the e2e scripts do -- see that file's
// TEST-01 comment).
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

/**
 * Extracts the ImageMap from existing rendered HTML by matching img src attributes
 * to the section indices encoded in the spec. Used to re-render HTML after a text
 * edit without re-fetching images from Unsplash.
 *
 * Round M3 FIX 3: this used to only recognize a hardcoded allowlist of older
 * section types (hero, about, gallery, listings-grid variants) via a fixed
 * id-anchor lookup. Every newer image-bearing section type added since (property-
 * listings-grid, portfolio-grid, treatment-gallery, membership-plans-
 * display, trust-badges-band, agent-card, trainer-showcase, testimonial-
 * grid, etc. -- generate/route.ts's own fetchSpecImages has never been
 * type-restricted like this) fell through this allowlist silently -- ANY
 * visual edit (a text-style/color/spacing/border/shadow change through the
 * floating panel, or an image-replace click) on a site containing one of
 * these richer components re-rendered with that section's real photos
 * silently dropped, because they were never captured into the imageMap
 * this function returns. The bug survived refresh/publish because the drop
 * happened at SAVE time, baked into the newly persisted draft_html itself --
 * this is the concrete mechanism behind "an edit not surviving a refresh/
 * publish cycle."
 * Fixed to be section-type-agnostic: every section gets a `data-vs="{i}"`
 * marker on its outer tag unconditionally (website-renderer.ts, all
 * section types, not edit-mode-gated) -- used as the boundary instead of a
 * type-specific id anchor, and whether to key single (`i`) vs multi
 * (`i_j`) is driven by whether the SPEC itself expects one image or several
 * (imageQuery vs imageQueries), not by a fixed type list.
 */
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

    // Round M3 FIX 3: matches https:// (Unsplash) AND data:image/... (an
    // owner-uploaded photo) -- the original https?://-only pattern silently
    // lost any uploaded image on the next edit too, same underlying class
    // of bug as the type-allowlist gap above.
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

/**
 * POST /api/website/save-edit
 * Body: { websiteId, spec: WebsiteSpec, language? }
 *
 * Accepts a text-edited spec, re-renders HTML (reusing existing images),
 * persists draft_html + draft_spec, records a "Manual edit" version,
 * and returns the fresh HTML.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    websiteId?: string;
    spec?:      unknown;
    language?:  string;
  };

  if (!body.websiteId || !body.spec) {
    return NextResponse.json({ error: "websiteId and spec required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant" }, { status: 404 });

  // Tenant-scoped: user can only edit their own websites
  const { data: site } = await admin
    .from("websites")
    .select("id, draft_html")
    .eq("id", body.websiteId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const spec      = body.spec as WebsiteSpec;
  const existingHtml = (site.draft_html as string | null) ?? "";
  const imageMap  = extractImageMap(spec, existingHtml);
  const language  = body.language as string | undefined;

  const html = renderWebsite(spec, imageMap, tenant.id as string, language);

  const now = new Date().toISOString();

  await admin
    .from("websites")
    .update({
      draft_html: html,
      draft_spec: spec as unknown as Record<string, unknown>,
      updated_at: now,
    })
    .eq("id", body.websiteId);

  // Record a version entry so the user can undo via version history
  await admin.from("website_versions").insert({
    website_id: body.websiteId,
    spec:       spec as unknown as Record<string, unknown>,
    html,
    label:      "Manual edit",
  });

  // Keep tenant_config.website_html in sync
  await admin.from("tenant_config").upsert(
    { tenant_id: tenant.id, website_html: html },
    { onConflict: "tenant_id" }
  );

  return NextResponse.json({ html });
}
