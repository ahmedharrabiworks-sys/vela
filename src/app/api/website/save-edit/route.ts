import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

/**
 * Extracts the ImageMap from existing rendered HTML by matching img src attributes
 * to the section indices encoded in the spec. Used to re-render HTML after a text
 * edit without re-fetching images from Unsplash.
 */
function extractImageMap(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};

  const SINGLE_IMG = new Set([
    "hero", "hero-fullbleed", "hero-split", "hero-minimal",
    "about", "about-story",
  ]);
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

    // Use a generous slice starting from the section anchor
    const slice = html.slice(anchorIdx, anchorIdx + 30_000);

    if (MULTI_IMG.has(s.type)) {
      const imgRe = /<img[^>]+src="(https?:\/\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      let j = 0;
      while ((m = imgRe.exec(slice)) !== null) {
        images[`${i}_${j++}`] = m[1];
      }
    } else if (SINGLE_IMG.has(s.type)) {
      const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
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
