import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "@/lib/website-renderer";
import type { PresetName } from "@/lib/website-design-system";

export const dynamic = "force-dynamic";

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 5000;

// ── Unsplash ──────────────────────────────────────────────────────────────────
async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: { urls?: { regular?: string } }[] };
    const results = data.results ?? [];
    if (!results.length) return null;
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 5))];
    return pick?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

// ── Fetch all images for a spec ───────────────────────────────────────────────
async function fetchSpecImages(spec: WebsiteSpec, heroOverride?: string): Promise<ImageMap> {
  type Task = { key: string; query: string };
  const tasks: Task[] = [];

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    if (s.imageQuery) tasks.push({ key: String(i), query: s.imageQuery });
    if (s.imageQueries) {
      s.imageQueries.forEach((q, j) => tasks.push({ key: `${i}_${j}`, query: q }));
    }
  }

  const settled = await Promise.all(
    tasks.map(async ({ key, query }) => ({ key, url: await fetchUnsplashPhoto(query) }))
  );

  const map: ImageMap = {};
  for (const { key, url } of settled) {
    if (url) map[key] = url;
  }

  if (heroOverride) {
    const heroIdx = spec.sections.findIndex((s) => s.type === "hero");
    if (heroIdx >= 0) map[String(heroIdx)] = heroOverride;
  }

  return map;
}

// ── Extract embedded spec from generated HTML ─────────────────────────────────
function extractSpec(html: string): WebsiteSpec | null {
  try {
    const match = html.match(/<!--\s*WEBSITE_SPEC:\s*(\{[\s\S]*?\})\s*-->/);
    if (!match) return null;
    return JSON.parse(match[1]) as WebsiteSpec;
  } catch {
    return null;
  }
}

// ── Coerce preset ─────────────────────────────────────────────────────────────
const VALID_PRESETS: PresetName[] = ["editorial", "bold", "clean", "clinical"];
function coercePreset(v: unknown): PresetName {
  return VALID_PRESETS.includes(v as PresetName) ? (v as PresetName) : "clean";
}

// ── System prompts ────────────────────────────────────────────────────────────
const BUILD_SYSTEM = `You are a website content strategist. Generate a website spec as JSON.

STRICT OUTPUT RULE: Output ONLY valid JSON — no markdown, no explanation, no code fences.

JSON ROOT SCHEMA:
{
  "stylePreset": "editorial"|"bold"|"clean"|"clinical",
  "businessName": string,
  "sections": SectionSpec[]
}

STYLE PRESET GUIDE:
- "editorial": Luxury studios, high-end salons, boutique hotels, interior design, fine dining, photography
- "bold": Gyms, fitness studios, crossfit, martial arts, nightlife, sports, automotive
- "clean": Real estate agencies, law firms, accounting, general professional, tech, corporate
- "clinical": Dental clinics, medical clinics, dermatology, medical spa, wellness, healthcare

REQUIRED: hero (always first), footer (always last).
RECOMMENDED: services, about, testimonials, booking.
OPTIONAL: gallery (visual businesses), team (if staff relevant), faq (medical/legal), cta_banner (before footer).

SectionSpec: { "type": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }

SECTION CONTENT SCHEMAS — include ALL fields:

hero (imageQuery required):
{ "eyebrow": string, "headline": string, "subheadline": string, "ctaPrimary": string, "ctaSecondary": string }
imageQuery: vivid Unsplash query, e.g. "modern dental clinic interior white clean"

about (imageQuery required):
{ "eyebrow": string, "headline": string, "body": string (2 sentences), "bullets": [{title, text}] (3-4), "ctaText": string }
imageQuery: e.g. "dental team professional smiling clinic"

services (no imageQuery):
{ "eyebrow": string, "headline": string, "subheadline": string, "items": [{icon, title, description, price?}] (3-6) }
icon choices: tooth | dumbbell | scissors | leaf | heart | star | briefcase | home | chef | shield | clock | plus

gallery (imageQueries required — 6 strings):
{ "eyebrow": string, "headline": string }
imageQueries: array of 6 distinct Unsplash queries

testimonials (no imageQuery):
{ "eyebrow": string, "headline": string, "items": [{quote, name, role}] (3) }
Use realistic first+last names for the city/region.

team (no imageQuery):
{ "eyebrow": string, "headline": string, "members": [{name, role, bio}] (3-4) }

booking (no imageQuery):
{ "eyebrow": string, "headline": string, "subheadline": string, "phone": string, "email": string, "address": string, "hours": string, "ctaText": string, "services": string[] (3-6) }
Use plausible placeholder contact info for the city if none given.

faq (no imageQuery):
{ "eyebrow": string, "headline": string, "items": [{q, a}] (5-6) }

cta_banner (no imageQuery):
{ "headline": string, "sub": string, "ctaText": string }

footer (no imageQuery):
{ "tagline": string, "links": string[] (4-5), "phone": string, "email": string, "address": string, "copyright": string }

COPY RULES:
- Specific and compelling — never generic filler, never "Lorem ipsum", never "My Business"
- Weave business name + city into copy (hero subheadline, about body, testimonials)
- Testimonial names sound like real locals for the city
- Services reflect the actual industry with plausible prices in local currency`;

const REVISE_SYSTEM = `You are editing a website JSON spec. Apply ONLY the requested change. Return the complete updated JSON.
STRICT: Output ONLY valid JSON — no markdown, no explanation, no code fences.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    currentHtml?: string;
    history?: { role: string; content: string }[];
    images?: { data: string; mimeType: string }[];
  };

  const { message, currentHtml, images = [] } = body;

  if (!message?.trim() && images.length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message && message.length > MAX_MSG_LEN) {
    return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const validImages = images
    .slice(0, 1)
    .filter((img) => img?.data && img?.mimeType && ALLOWED_IMG_TYPES.has(img.mimeType) && img.data.length <= MAX_IMG_B64);
  const heroUpload = validImages[0]
    ? `data:${validImages[0].mimeType};base64,${validImages[0].data}`
    : undefined;

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin
    .from("tenants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  const businessName = (tenant?.business_name as string) || "My Business";
  const industry = (tenant?.industry as string) || "";
  const city = (tenant?.city as string) || "";
  const msgText = message?.trim() ?? "";

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let spec: WebsiteSpec;

    if (currentHtml) {
      // ── Revision ─────────────────────────────────────────────────────────
      const existing = extractSpec(currentHtml);

      if (!existing) {
        // No embedded spec (old HTML) — regenerate fresh with context
        const userContent = [`Business name: ${businessName}`, `Industry: ${industry || "service business"}`, `City: ${city || ""}`, `User instruction: ${msgText}`].join("\n");
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: BUILD_SYSTEM }, { role: "user", content: userContent }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.5,
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
        spec = { stylePreset: coercePreset(parsed.stylePreset), businessName: parsed.businessName ?? businessName, sections: parsed.sections ?? [] };
      } else {
        const revisionPrompt = `Current spec:\n${JSON.stringify(existing, null, 2)}\n\nChange requested: ${msgText || "incorporate uploaded image as hero"}`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: REVISE_SYSTEM }, { role: "user", content: revisionPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.3,
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
        spec = { ...existing, ...parsed, stylePreset: coercePreset(parsed.stylePreset ?? existing.stylePreset), sections: parsed.sections ?? existing.sections };
      }
    } else {
      // ── Initial generation ────────────────────────────────────────────────
      const userContent = [
        `Business name: ${businessName}`,
        `Industry: ${industry || "service business"}`,
        `City: ${city || ""}`,
        `User instruction: ${msgText}`,
      ].join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: BUILD_SYSTEM }, { role: "user", content: userContent }],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.5,
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
      spec = {
        stylePreset: coercePreset(parsed.stylePreset),
        businessName: parsed.businessName ?? businessName,
        sections: parsed.sections ?? [],
      };
    }

    // Guarantee hero and footer exist
    if (!spec.sections.some((s) => s.type === "hero")) {
      spec.sections.unshift({
        type: "hero",
        imageQuery: `${industry} professional interior ${city}`.trim(),
        content: { headline: businessName, subheadline: `Professional ${industry || "services"}`, ctaPrimary: "Book Now", ctaSecondary: "Learn More" },
      });
    }
    if (!spec.sections.some((s) => s.type === "footer")) {
      spec.sections.push({
        type: "footer",
        content: { tagline: `Professional ${industry || "services"} in ${city || "your city"}.` },
      });
    }

    const imageMap = await fetchSpecImages(spec, heroUpload);
    const html = renderWebsite(spec, imageMap);

    if (tenant?.id) {
      void admin.from("tenant_config").upsert({ tenant_id: tenant.id, website_html: html }, { onConflict: "tenant_id" });
    }

    return NextResponse.json({ html });
  } catch (err) {
    const apiErr = err as { status?: number; error?: { type?: string }; message?: string };
    console.error("[website/generate] error:", apiErr.message ?? err);
    const errType = apiErr.error?.type ?? (apiErr.status === 401 ? "invalid_api_key" : apiErr.status === 429 ? "rate_limited" : apiErr.status === 402 ? "insufficient_quota" : "unknown");
    const userMsg =
      errType === "invalid_api_key"    ? "AI configuration error — please contact support." :
      errType === "insufficient_quota" ? "AI quota exceeded — please top up OpenAI credits." :
      errType === "rate_limited"       ? "AI is temporarily busy — please try again in a moment." :
                                         "Website generation temporarily unavailable — please try again.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
