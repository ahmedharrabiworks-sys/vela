import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite } from "@/lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "@/lib/website-renderer";
import { isRealImage } from "@/lib/file-signature";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Round M3 FIX 3: getImageQuery/getImageQueries are verbatim copies of the
// same-named helpers in generate/route.ts (internal there, not exported).
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

// Round M3 FIX 3: was restricted to a hardcoded allowlist of older section
// types via a fixed id anchor (SECTION_ANCHOR/SINGLE_IMG/MULTI_IMG) -- every
// newer image-bearing section type (property-listings-grid, portfolio-grid,
// treatment-gallery, membership-plans-display, trust-badges-band,
// agent-card, trainer-showcase, testimonial-grid, etc.) fell through
// silently, so replacing ONE image on a site containing any of these richer
// components dropped their real photos from the freshly-saved draft_html --
// same root cause and fix as save-edit/route.ts's extractImageMap. Now
// section-type-agnostic: `data-vs="{i}"` (unconditional on every section,
// all types) is the boundary, and single-vs-multi keying is driven by
// whether the spec itself expects one image or several.
function extractImageMap(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};
  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i] as { imageQuery?: string; imageQueries?: string[]; content?: Record<string, unknown> };
    const isMulti = getImageQueries(s).length > 0;
    const isSingle = !isMulti && !!getImageQuery(s);
    if (!isMulti && !isSingle) continue;

    const secStart = html.indexOf(`data-vs="${i}"`);
    if (secStart === -1) continue;
    const nextStart = html.indexOf(`data-vs="${i + 1}"`, secStart + 1);
    const slice = nextStart === -1 ? html.slice(secStart) : html.slice(secStart, nextStart);

    if (isMulti) {
      const imgRe = /<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      let j = 0;
      while ((m = imgRe.exec(slice)) !== null) images[`${i}_${j++}`] = m[1];
    } else {
      const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/);
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

// Round M4 FIX 2: this route had zero validation on body.imageData -- any
// size or content could be POSTed directly.
// Round M5 FIX 2 (correction): the cap set last round (5MB raw * 4/3 =~
// 6.7MB base64) was itself ABOVE Vercel Serverless Functions' real hard
// request-body ceiling (~4.5MB, a platform limit -- not configurable via
// maxDuration or any route setting). That meant this "validation" could
// never actually reject the failure case before the platform itself did --
// a real phone photo close to that old "under 5MB raw" guidance was always
// going to be rejected at the platform level, invisibly, regardless of this
// check. The real fix is client-side compression before upload (see
// compressImageForUpload in website/page.tsx, which now keeps the encoded
// result comfortably under this same real ceiling); this is the server-side
// backstop for that, set BELOW the actual ~4.5MB platform limit with
// headroom for the JSON wrapper (websiteId/vs/imgIdx are negligible, but
// the data: URI prefix and any proxy overhead are not).
const ALLOWED_IMG_TYPES = new Set(["jpeg", "jpg", "png", "webp"]);
const MAX_IMG_DATA_URL_LEN = 4 * 1024 * 1024; // ~4MB base64 text, safely under the real ~4.5MB platform body cap

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

  if (body.imageData) {
    const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/s.exec(body.imageData);
    if (!m || !ALLOWED_IMG_TYPES.has(m[1])) {
      return NextResponse.json({ error: "Unsupported image format. Use JPEG, PNG, or WEBP." }, { status: 400 });
    }
    if (body.imageData.length > MAX_IMG_DATA_URL_LEN) {
      return NextResponse.json({ error: "Image too large. Please use a photo under 5MB." }, { status: 413 });
    }
    // Security audit Part 4: the data: URI's "image/png" label is written by
    // the CALLER, not by anything that inspected the actual bytes -- this is
    // the highest-priority upload path in the app to check for real, since
    // whatever passes here gets embedded straight into a real customer's
    // published website HTML. Decode just enough to check the real magic
    // bytes before accepting it.
    let realBytes: Buffer;
    try {
      realBytes = Buffer.from(m[2], "base64");
    } catch {
      return NextResponse.json({ error: "Unsupported image format. Use JPEG, PNG, or WEBP." }, { status: 400 });
    }
    if (!isRealImage(realBytes, ["jpeg", "png", "webp"])) {
      return NextResponse.json({ error: "That file isn't a real, readable image." }, { status: 400 });
    }
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

  // Round M6 FIX 2: this whole block previously ran uncaught. The REAL bug
  // (confirmed via a real request against production, no OpenAI/Unsplash
  // call involved): `imgKey` referenced a `MULTI_IMG` set that no longer
  // exists in this file -- it was removed from extractImageMap by the
  // earlier Round M3 FIX 3 refactor (which made extraction section-type-
  // agnostic), but this SEPARATE usage of the same now-deleted constant,
  // a few lines below extractImageMap, was missed. Every image replace
  // request that reached this line threw `ReferenceError: MULTI_IMG is not
  // defined`, uncaught, producing a bare Vercel 500 with an EMPTY body and
  // no content-type (confirmed live: status 500, content-type null, empty
  // body) -- not our route's JSON error shape at all. The client's
  // `res.json().catch(() => ({}))` swallowed the unparseable empty body
  // into `{}`, `data.error` came back undefined, and the generic "Couldn't
  // update the image" fallback showed -- with NOTHING about size, storage,
  // or format, because the real failure was a dead variable reference that
  // had nothing to do with any of last round's hypotheses. This is why
  // `next.config.mjs`'s `typescript.ignoreBuildErrors: true` matters here:
  // `npm run build` never caught this at compile time despite it being a
  // hard "Cannot find name 'MULTI_IMG'" TypeScript error.
  // Fixed: imgKey now uses the same isMulti/isSingle spec-driven check as
  // extractImageMap itself (getImageQueries/getImageQuery, defined above),
  // no more reference to a type-hardcoded set. Also wrapped in try/catch so
  // any future unexpected failure here logs a real, specific server-side
  // error and returns real JSON instead of silently degrading into this
  // exact opaque-500 pattern again.
  try {
    const existingHtml = (site.draft_html as string | null) ?? "";
    const imageMap = extractImageMap(spec, existingHtml);

    const vs    = body.vs;
    const idx   = body.imgIdx ?? 0;
    const secIdx = parseInt(vs, 10);
    const section = !isNaN(secIdx) && secIdx < spec.sections.length
      ? (spec.sections[secIdx] as { imageQuery?: string; imageQueries?: string[]; content?: Record<string, unknown> })
      : null;
    const isMulti = !!section && getImageQueries(section).length > 0;
    const imgKey  = isMulti ? `${vs}_${idx}` : vs;

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
  } catch (err) {
    console.error("[website/image-replace] unexpected failure:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Couldn't update the image. Please try again." }, { status: 500 });
  }
}
