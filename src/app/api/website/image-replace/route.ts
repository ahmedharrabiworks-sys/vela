import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const SINGLE_IMG = new Set(["hero", "hero-fullbleed", "hero-split", "hero-minimal", "about", "about-story"]);
const MULTI_IMG  = new Set(["gallery", "gallery-grid", "listings-grid"]);

const SECTION_ANCHOR: Record<string, string> = {
  "hero": "hero", "hero-fullbleed": "hero", "hero-split": "hero", "hero-minimal": "hero",
  "about": "about", "about-story": "about",
  "gallery": "gallery", "gallery-grid": "gallery", "listings-grid": "listings",
};

function extractImageMap(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};
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

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: { urls: { regular?: string; raw?: string }; width: number; height: number }[] };
    const results = (data.results ?? []).filter((r) => r.width >= 1200 && r.width >= r.height);
    const pick = results[0] ?? (data.results ?? [])[0];
    if (!pick) return null;
    if (pick.urls.raw) return `${pick.urls.raw}&w=1920&q=85&fm=jpg&fit=crop`;
    return pick.urls.regular ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    websiteId?: string;
    vs?: string;
    imgIdx?: number;
    query?: string;
    imageData?: string;
    remove?: boolean;
  };

  if (!body.websiteId || body.vs === undefined) {
    return NextResponse.json({ error: "websiteId and vs required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant" }, { status: 404 });

  const { data: site } = await admin
    .from("websites")
    .select("id, draft_html, draft_spec")
    .eq("id", body.websiteId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  const spec = (site.draft_spec ?? null) as WebsiteSpec | null;
  if (!spec) return NextResponse.json({ error: "No spec found" }, { status: 404 });

  const existingHtml = (site.draft_html as string | null) ?? "";
  const imageMap = extractImageMap(spec, existingHtml);

  const vs    = body.vs;
  const idx   = body.imgIdx ?? 0;
  const secIdx = parseInt(vs, 10);
  const section = !isNaN(secIdx) && secIdx < spec.sections.length ? spec.sections[secIdx] : null;
  const imgKey  = (section && MULTI_IMG.has(section.type)) ? `${vs}_${idx}` : vs;

  if (body.remove) {
    delete imageMap[imgKey];
  } else if (body.query) {
    const newUrl = await fetchUnsplashImage(body.query);
    if (!newUrl) return NextResponse.json({ error: "No image found for that query" }, { status: 422 });
    imageMap[imgKey] = newUrl;
  } else if (body.imageData) {
    imageMap[imgKey] = body.imageData;
  } else {
    return NextResponse.json({ error: "query, imageData, or remove required" }, { status: 400 });
  }

  const html = renderWebsite(spec, imageMap, tenant.id as string);

  await admin.from("websites").update({
    draft_html: html,
    updated_at: new Date().toISOString(),
  }).eq("id", body.websiteId).eq("tenant_id", tenant.id);

  await admin.from("tenant_config").upsert(
    { tenant_id: tenant.id, website_html: html },
    { onConflict: "tenant_id" }
  );

  return NextResponse.json({ html });
}
