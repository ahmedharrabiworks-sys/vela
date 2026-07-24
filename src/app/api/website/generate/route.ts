import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "@/lib/website-renderer";
import type { PresetName, DesignDNA } from "@/lib/website-design-system";
import { APPROVED_FONTS } from "@/lib/website-design-system";
import {
  TEMPLATE_BY_CATEGORY, TEMPLATE_BY_ID, GPT_CATEGORY_TO_TEMPLATE, OPTIONAL_SKIP_RULES,
  type SiteTemplate,
} from "@/lib/website-templates";

export const dynamic = "force-dynamic";
// 300s: two sequential GPT-4o calls + Unsplash fetches can exceed 60s on cold starts
export const maxDuration = 300;

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 5000;

// ── Unsplash result shape ─────────────────────────────────────────────────────
interface UnsplashResult {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  urls: { regular?: string; raw?: string };
}

const HERO_SECTION_TYPES = new Set(["hero", "hero-fullbleed", "hero-split", "hero-minimal"]);

// ── Unsplash: single query with quality filtering and dedup ───────────────────
// minWidth: 1920 for heroes, 1200 for other sections.
// Uses raw URL with quality params for higher fidelity output.
async function tryUnsplash(query: string, usedUrls: Set<string>, minWidth = 1200): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&order_by=relevant&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: UnsplashResult[] };
    const results = data.results ?? [];
    if (!results.length) return null;

    // Quality filter: landscape ≥minWidth
    const qualifying = results.filter((r) => r.width >= minWidth && r.width >= r.height);
    const pool = qualifying.length ? qualifying : results;

    // Prefer results that have a description — no-description results are usually
    // abstract textures, gradients, or plain-color backgrounds
    const described = pool.filter((r) => r.description || r.alt_description);
    const finalPool = described.length >= 3 ? described : pool;

    const qParam = minWidth >= 1920 ? "w=1920&q=85&fm=jpg&fit=crop" : "w=1200&q=80&fm=jpg&fit=crop";
    const toUrl = (r: UnsplashResult) => r.urls.raw ? `${r.urls.raw}&${qParam}` : (r.urls.regular ?? null);

    // Walk top-6 to find an unused result
    const top6 = finalPool.slice(0, 6);
    const available = top6.filter((r) => { const u = toUrl(r); return u && !usedUrls.has(u); });
    const candidates = available.length ? available : top6;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    const photoUrl = pick ? toUrl(pick) : null;
    if (photoUrl) usedUrls.add(photoUrl);
    return photoUrl;
  } catch {
    return null;
  }
}

// ── Unsplash: try primary → simplified → single-word fallback ────────────────
async function fetchUnsplashPhoto(query: string, usedUrls: Set<string>, minWidth = 1200): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.warn("[website] UNSPLASH_ACCESS_KEY not set — skipping image fetch");
    return null;
  }

  const result1 = await tryUnsplash(query, usedUrls, minWidth);
  if (result1) return result1;

  const words = query.trim().split(/\s+/);
  if (words.length > 3) {
    const simplified = words.slice(0, 3).join(" ");
    const result2 = await tryUnsplash(simplified, usedUrls, minWidth);
    if (result2) {
      console.warn(`[website] primary "${query}" failed — used simplified "${simplified}"`);
      return result2;
    }
  }

  const lastWord = words[words.length - 1] ?? words[0];
  if (lastWord && lastWord !== words[0]) {
    const result3 = await tryUnsplash(lastWord, usedUrls, minWidth);
    if (result3) {
      console.warn(`[website] simplified failed — used single-word "${lastWord}"`);
      return result3;
    }
  }

  console.warn(`[website] all Unsplash fallbacks exhausted for: "${query}"`);
  return null;
}

// ── Resolve imageQuery from section (top-level OR inside content) ─────────────
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

// ── Fetch all images for a spec ───────────────────────────────────────────────
// Runs sequentially (not parallel) so the shared usedUrls set prevents
// duplicate images appearing on the same page or across sites (FIX 3).
// usedUrls is seeded from tenant_config.website_used_images before this call,
// and the caller persists it back after (cross-site dedup).
async function fetchSpecImages(
  spec: WebsiteSpec,
  heroOverride?: string,
  uploadSlot: "hero" | "about" | "team" | "gallery" = "hero",
  usedUrls: Set<string> = new Set<string>(),
): Promise<ImageMap> {
  type Task = { key: string; query: string; minWidth: number };
  const tasks: Task[] = [];

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const isHero = HERO_SECTION_TYPES.has(s.type);
    const minWidth = isHero ? 1920 : 1200;
    const q = getImageQuery(s as { imageQuery?: string; content?: Record<string, unknown> });
    if (q) tasks.push({ key: String(i), query: q, minWidth });

    const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
    qs.forEach((query, j) => tasks.push({ key: `${i}_${j}`, query, minWidth: 1200 }));
  }

  console.log(`[website] fetching ${tasks.length} images:`, tasks.map((t) => `${t.key}="${t.query}"`).join(", "));

  // Sequential to enforce the no-duplicate rule via shared usedUrls set
  const map: ImageMap = {};
  for (const { key, query, minWidth } of tasks) {
    const url = await fetchUnsplashPhoto(query, usedUrls, minWidth);
    if (url) map[key] = url;
  }

  if (heroOverride) {
    const HERO_TYPES_V2  = ["hero", "hero-fullbleed", "hero-split", "hero-minimal"];
    const ABOUT_TYPES_V2 = ["about", "about-story"];
    const GALLERY_TYPES_V2 = ["gallery", "gallery-grid"];
    // Map uploadSlot to one or more section types to search
    const slotTypes: string[] =
      uploadSlot === "about"   ? ABOUT_TYPES_V2  :
      uploadSlot === "gallery" ? GALLERY_TYPES_V2 :
      uploadSlot === "team"    ? ["team", "team-grid"] :
      [];
    const slotIdx = slotTypes.length > 0
      ? spec.sections.findIndex((s) => slotTypes.includes(s.type))
      : -1;
    if (slotIdx >= 0) {
      map[String(slotIdx)] = heroOverride;
      if (GALLERY_TYPES_V2.includes(spec.sections[slotIdx].type)) map[`${slotIdx}_0`] = heroOverride;
    } else {
      const heroIdx = spec.sections.findIndex((s) => HERO_TYPES_V2.includes(s.type));
      if (heroIdx >= 0) map[String(heroIdx)] = heroOverride;
    }
  }

  return map;
}

// ── Vision-classify uploaded image to route it to the right section ───────────
async function classifyUploadedImage(
  openai: OpenAI,
  imageBase64: string,
  mimeType: string,
): Promise<"hero" | "about" | "team" | "gallery"> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: 'Reply with ONE word — the website section this image suits best:\n"hero" = building, storefront, product, abstract scene\n"about" = single person (owner/professional portrait)\n"team" = group of people or staff\n"gallery" = food, dishes, products, work samples\nOne word only.',
          },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" } },
        ],
      }],
      max_tokens: 5,
      temperature: 0,
    });
    const word = (res.choices[0]?.message?.content ?? "").trim().toLowerCase();
    if (word === "about" || word === "team" || word === "gallery") return word;
  } catch { /* default to hero */ }
  return "hero";
}

// ── Per-category image query suffixes ─────────────────────────────────────────
// Subject-specific terms appended to industry+city for hero/about sections.
// These produce real, on-topic Unsplash photos rather than abstract textures.
const PRESET_HERO_SUFFIX: Record<string, string> = {
  hotel:      "luxury hotel exterior resort pool architecture",
  medical:    "modern clinic reception bright white professional",
  fitness:    "gym fitness training equipment dynamic interior",
  beauty:     "salon spa beauty interior elegant modern",
  realestate: "luxury property interior architecture modern",
  restaurant: "restaurant dining room elegant food atmosphere",
};
const PRESET_ABOUT_SUFFIX: Record<string, string> = {
  hotel:      "hotel lobby interior warm light elegant",
  medical:    "doctor consultation professional clinic bright",
  fitness:    "trainer coach athlete workout natural light",
  beauty:     "salon stylist consultation elegant interior",
  realestate: "agent professional modern office bright",
  restaurant: "chef kitchen cooking fire grill editorial",
};
const PRESET_GALLERY_QUERIES: Record<string, string[]> = {
  hotel: [
    "luxury hotel suite detail editorial light",
    "lobby marble texture warm bokeh minimal",
    "hotel pool outdoor serene natural light",
    "premium bed linen soft light detail",
    "spa treatment room candle water stone",
    "fine dining table setting elegant close-up",
  ],
  medical: [
    "modern clinic reception bright minimal",
    "dental chair technology equipment clean",
    "doctor consultation natural light professional",
    "medical technology equipment white abstract",
    "clean white corridor light minimal geometric",
    "patient care professional warm studio light",
  ],
  fitness: [
    "gym equipment weight training industrial",
    "group class energy motion blur dynamic",
    "athlete stretching dramatic light editorial",
    "functional training space open floor",
    "protein nutrition supplement editorial flat lay",
    "personal trainer coach energy natural light",
  ],
  beauty: [
    "botanical herb close-up natural light macro",
    "skincare product minimal flat lay editorial",
    "candle aromatherapy warm bokeh close-up",
    "spa stone towel water minimal texture",
    "floral arrangement pastel editorial soft",
    "cream texture ceramic abstract natural light",
  ],
  realestate: [
    "luxury property exterior architecture daylight",
    "interior design living room minimal modern",
    "kitchen countertop marble detail editorial",
    "bedroom natural light linen soft minimal",
    "bathroom spa stone tile architectural",
    "garden outdoor terrace minimal architectural",
  ],
  restaurant: [
    "food close-up editorial bokeh warm light",
    "dish plating artistic restaurant editorial",
    "wine glass table setting candlelight bokeh",
    "kitchen open fire chef cooking editorial",
    "fresh ingredients market vegetables editorial",
    "dessert pastry detail close-up editorial light",
  ],
};

// ── Map v2 category → gallery query preset key ────────────────────────────────
const CATEGORY_TO_PRESET: Record<string, string> = {
  hotel: "hotel", clinic: "medical", gym: "fitness", salon: "beauty",
  realestate: "realestate", restaurant: "restaurant", legal: "realestate",
  saas: "fitness", agency: "fitness", ecommerce: "beauty", education: "fitness", other: "realestate",
};

// ── Human-readable business label per category (used in image queries) ───────
const CATEGORY_TO_LABEL: Record<string, string> = {
  hotel:      "hotel resort",
  clinic:     "medical clinic",
  gym:        "gym fitness center",
  salon:      "hair salon spa",
  realestate: "real estate property",
  restaurant: "restaurant dining",
  saas:       "modern office tech",
  agency:     "creative agency studio",
  ecommerce:  "retail boutique",
  education:  "school campus education",
  legal:      "law firm office",
  other:      "professional business",
};

// ── Server-side safety net: inject imageQuery for visual sections that GPT missed
function ensureImageQueries(spec: WebsiteSpec, industry: string, city: string, fullText: string, hasOwnerPhoto: boolean): void {
  // Resolve preset key: v2 uses category, v1 uses stylePreset
  const PRESET_ALIAS: Record<string, string> = {
    "editorial-luxury": "hotel", "minimal-warm": "beauty", "saas-sharp": "fitness",
    "estate-elegant": "realestate", "clinical-bright": "medical",
    "editorial": "hotel", "bold": "fitness", "clean": "realestate", "clinical": "medical",
  };
  const rawCategory = String((spec as { category?: string }).category ?? "");
  const rawPreset   = String(spec.stylePreset ?? "");
  const preset: string =
    (rawCategory && CATEGORY_TO_PRESET[rawCategory])
      ? CATEGORY_TO_PRESET[rawCategory]!
      : (PRESET_ALIAS[rawPreset] ?? rawPreset) || "realestate";

  // Use the category label as the business type anchor for queries.
  // Falls back to industry (tenant profile field) then to a generic label.
  const businessType = (rawCategory && CATEGORY_TO_LABEL[rawCategory]) || industry || "professional business";

  // Extract city from spec content when tenant profile city is empty.
  // Priority: (1) tenant profile, (2) spec hero eyebrow, (3) contact/footer address, (4) fullText regex.
  let effectiveCity = city;
  if (!effectiveCity) {
    for (const s of spec.sections) {
      const eyebrow = s.content?.eyebrow;
      if (typeof eyebrow === "string") {
        // e.g. "Tunis, Tunisia" or "Dubai Marina · Gym" — take the first comma/dot separated location word
        const locMatch = eyebrow.match(/·\s*([A-Za-z][a-zA-Z\s]{2,24})|,\s*([A-Za-z][a-zA-Z\s]{2,24})/);
        if (locMatch) { effectiveCity = (locMatch[1] ?? locMatch[2] ?? "").trim(); break; }
      }
      const addr = s.content?.address ?? s.content?.phone;
      if (typeof addr === "string" && addr.includes(",")) {
        const parts = addr.split(",").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) { effectiveCity = parts[parts.length - 1]; break; }
      }
    }
  }
  if (!effectiveCity && fullText) {
    // Extract explicit city mentions from the conversation text
    const cityMatch = fullText.match(/\b(?:in|at|located in|based in|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
    if (cityMatch) effectiveCity = cityMatch[1];
  }

  // Hero types that need a single imageQuery
  const HERO_TYPES = new Set(["hero", "hero-fullbleed", "hero-split"]);
  // About types that need a single imageQuery
  const ABOUT_TYPES = new Set(["about", "about-story"]);
  // Multi-image types
  const MULTI_GALLERY_TYPES = new Set(["gallery", "gallery-grid"]);
  const MULTI_LISTING_TYPES = new Set(["listings-grid"]);
  const MULTI_PRODUCT_TYPES = new Set(["product-grid"]);
  const MULTI_SHOWCASE_TYPES = new Set(["feature-showcase"]);

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];

    // Hero: ALWAYS override with server-built query using the spec's actual category
    if (HERO_TYPES.has(s.type)) {
      const heroSuffix = PRESET_HERO_SUFFIX[preset] ?? "professional photography editorial";
      const locationCtx = effectiveCity ? ` ${effectiveCity}` : "";
      if (hasOwnerPhoto) {
        (s as { imageQuery?: string }).imageQuery = `${businessType}${locationCtx} bright professional photography`.replace(/\s+/g, " ").trim();
      } else {
        (s as { imageQuery?: string }).imageQuery = `${businessType}${locationCtx} ${heroSuffix}`.replace(/\s+/g, " ").trim();
      }
    }

    const hasQ = getImageQuery(s as { imageQuery?: string; content?: Record<string, unknown> });

    if (!hasQ) {
      if (ABOUT_TYPES.has(s.type)) {
        const locationCtx = effectiveCity ? ` ${effectiveCity}` : "";
        const aboutSuffix = PRESET_ABOUT_SUFFIX[preset] ?? "professional team editorial warm light";
        (s as { imageQuery?: string }).imageQuery = hasOwnerPhoto
          ? `${businessType}${locationCtx} professional team workspace`.replace(/\s+/g, " ").trim()
          : `${businessType}${locationCtx} ${aboutSuffix}`.replace(/\s+/g, " ").trim();
      }
    }

    // Gallery grid sections: ensure 6 imageQueries
    if (MULTI_GALLERY_TYPES.has(s.type)) {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      if (!qs.length) {
        const fallbackGallery = hasOwnerPhoto
          ? [
              `${businessType} interior design`,
              `${businessType} team professional`,
              `${businessType} detail close up`,
              `${businessType} modern equipment`,
              `${businessType} client experience`,
              `${businessType} atmosphere ambiance`,
            ]
          : (PRESET_GALLERY_QUERIES[preset] ?? [
              `${businessType} close-up texture detail editorial`,
              `${businessType} product detail minimal clean`,
              `${businessType} interior warm light`,
              `${businessType} lifestyle editorial`,
              `${businessType} flat lay elegant`,
              `${businessType} abstract mood atmosphere`,
            ]);
        (s as { imageQueries?: string[] }).imageQueries = fallbackGallery.map((q) => q.replace(/\s+/g, " ").trim());
      }
    }

    // Listings grid: ensure imageQueries count matches items count (min 3)
    if (MULTI_LISTING_TYPES.has(s.type)) {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      const items = Array.isArray(s.content?.items) ? (s.content.items as unknown[]) : [];
      const targetCount = Math.max(items.length || 3, 3);
      if (qs.length < targetCount) {
        const listingSuffix = PRESET_HERO_SUFFIX[preset] ?? "editorial minimal clean light";
        const filled = Array.from({ length: targetCount }, (_, j) =>
          qs[j] ?? `${businessType} ${listingSuffix} item ${j + 1}`.replace(/\s+/g, " ").trim()
        );
        (s as { imageQueries?: string[] }).imageQueries = filled;
      }
    }

    // Product grid: ensure imageQueries
    if (MULTI_PRODUCT_TYPES.has(s.type)) {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      const items = Array.isArray(s.content?.items) ? (s.content.items as unknown[]) : [];
      const targetCount = Math.max(items.length || 4, 4);
      if (qs.length < targetCount) {
        const filled = Array.from({ length: targetCount }, (_, j) =>
          qs[j] ?? `${businessType} product editorial clean background item ${j + 1}`.replace(/\s+/g, " ").trim()
        );
        (s as { imageQueries?: string[] }).imageQueries = filled;
      }
    }

    // Feature showcase: ensure imageQueries
    if (MULTI_SHOWCASE_TYPES.has(s.type)) {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      const items = Array.isArray(s.content?.items) ? (s.content.items as unknown[]) : [];
      const targetCount = Math.max(items.length || 3, 3);
      if (qs.length < targetCount) {
        const filled = Array.from({ length: targetCount }, (_, j) =>
          qs[j] ?? `${businessType} feature detail professional editorial ${j + 1}`.replace(/\s+/g, " ").trim()
        );
        (s as { imageQueries?: string[] }).imageQueries = filled;
      }
    }
  }

  // FIX 4: Ensure site has at least 4 images. If not, inject a gallery-grid before contact.
  const IMAGE_SECTION_TYPES = new Set([
    "hero", "hero-fullbleed", "hero-split", "about", "about-story",
    "gallery", "gallery-grid", "listings-grid", "product-grid", "feature-showcase",
  ]);
  let imageSlots = 0;
  for (const s of spec.sections) {
    if (["hero", "hero-fullbleed", "hero-split", "about", "about-story"].includes(s.type)) imageSlots++;
    if (MULTI_GALLERY_TYPES.has(s.type)) imageSlots += 6;
    if (MULTI_LISTING_TYPES.has(s.type)) {
      imageSlots += Math.max((Array.isArray(s.content?.items) ? s.content.items.length : 0) || 3, 3);
    }
    if (MULTI_PRODUCT_TYPES.has(s.type) || MULTI_SHOWCASE_TYPES.has(s.type)) {
      imageSlots += Math.max((Array.isArray(s.content?.items) ? s.content.items.length : 0) || 3, 3);
    }
  }
  if (imageSlots < 4) {
    const contactIdx = spec.sections.findIndex((s) => s.type === "contact-block" || s.type === "booking");
    const ctaIdx = spec.sections.findIndex((s) => s.type === "cta-band" || s.type === "cta_banner");
    const insertIdx = contactIdx >= 0 ? contactIdx : (ctaIdx >= 0 ? ctaIdx : spec.sections.length);
    // Avoid adding gallery if already exists
    const hasGallery = spec.sections.some((s) => IMAGE_SECTION_TYPES.has(s.type) && (s.type === "gallery" || s.type === "gallery-grid"));
    if (!hasGallery) {
      const galleryQueries = PRESET_GALLERY_QUERIES[preset] ?? [
        `${businessType} interior detail editorial`,
        `${businessType} atmosphere warm light`,
        `${businessType} team professional`,
        `${businessType} work detail close up`,
        `${businessType} product quality`,
        `${businessType} lifestyle editorial`,
      ];
      spec.sections.splice(insertIdx, 0, {
        type: "gallery-grid",
        imageQueries: galleryQueries.map((q) => q.replace(/\s+/g, " ").trim()),
        content: { eyebrow: "Gallery", headline: `${businessType} in Focus` },
      } as { type: string; imageQueries: string[]; content: Record<string, unknown> });
    }
  }
}

// ── Parse phone/email from a contact block string ("Phone: x\nEmail: y") ────────
function parseContactBlock(block: string): { phone?: string; email?: string } {
  const result: { phone?: string; email?: string } = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^(Phone|Email):\s*(.+)$/i);
    if (m) {
      if (m[1].toLowerCase() === "phone") result.phone = m[2].trim();
      else if (m[1].toLowerCase() === "email") result.email = m[2].trim();
    }
  }
  return result;
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

// ── Coerce and sanitize v2 designDNA from GPT response ───────────────────────
const VALID_MOODS = new Set(["editorial-luxury","clinical-bright","bold-energetic","warm-minimal","tech-sharp","dark-premium"]);
const MOOD_DEFAULT_DNA: Record<string, Partial<DesignDNA>> = {
  "editorial-luxury": { headingFont: "Playfair Display", bodyFont: "Inter", palette: { bg: "#FAF8F5", text: "#1A1A1A", accent: "#C4A882", muted: "#857D72" }, isDark: false },
  "clinical-bright":  { headingFont: "Inter",            bodyFont: "Inter", palette: { bg: "#FFFFFF",  text: "#0A2540", accent: "#0284C7", muted: "#64748B" }, isDark: false },
  "bold-energetic":   { headingFont: "Archivo",          bodyFont: "Inter", palette: { bg: "#0B0B0B",  text: "#FFFFFF", accent: "#E8390E", muted: "#6B7280" }, isDark: true  },
  "warm-minimal":     { headingFont: "Cormorant Garamond", bodyFont: "DM Sans", palette: { bg: "#F7F5F0", text: "#3A3730", accent: "#8B6347", muted: "#6B705C" }, isDark: false },
  "tech-sharp":       { headingFont: "Space Grotesk",    bodyFont: "Inter", palette: { bg: "#0A0A0F",  text: "#F1F5F9", accent: "#7C3AED", muted: "#6B7280" }, isDark: true  },
  "dark-premium":     { headingFont: "Playfair Display", bodyFont: "Inter", palette: { bg: "#080808",  text: "#F5F3EE", accent: "#B8860B", muted: "#857D72" }, isDark: true  },
};
function coerceDesignDNA(raw: unknown): DesignDNA {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const mood = (VALID_MOODS.has(String(d.mood)) ? String(d.mood) : "editorial-luxury") as DesignDNA["mood"];
  const defaults = MOOD_DEFAULT_DNA[mood]!;
  const hexOk = (h: unknown): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
  const rawPal = (typeof d.palette === "object" && d.palette !== null ? d.palette : {}) as Record<string, unknown>;
  const defPal = defaults.palette!;
  return {
    mood,
    headingFont: (typeof d.headingFont === "string" && APPROVED_FONTS[d.headingFont] ? d.headingFont : defaults.headingFont) ?? "Inter",
    bodyFont:    (typeof d.bodyFont    === "string" && APPROVED_FONTS[d.bodyFont]    ? d.bodyFont    : defaults.bodyFont)    ?? "Inter",
    palette: {
      bg:     hexOk(rawPal.bg)     ? rawPal.bg     : defPal.bg,
      text:   hexOk(rawPal.text)   ? rawPal.text   : defPal.text,
      accent: hexOk(rawPal.accent) ? rawPal.accent : defPal.accent,
      muted:  hexOk(rawPal.muted)  ? rawPal.muted  : defPal.muted,
    },
    isDark: typeof d.isDark === "boolean" ? d.isDark : (defaults.isDark ?? false),
  };
}

// ── Coerce preset ─────────────────────────────────────────────────────────────
const VALID_PRESETS: PresetName[] = [
  // Current 6-preset system
  "hotel", "medical", "fitness", "beauty", "realestate", "restaurant",
  // Legacy names — resolveTokens maps them to the 6 new presets
  "editorial-luxury", "minimal-warm", "saas-sharp", "estate-elegant", "clinical-bright",
  "editorial", "bold", "clean", "clinical",
];
const LEGACY_PRESET: Record<string, PresetName> = {
  "editorial-luxury": "hotel",
  "minimal-warm":     "beauty",
  "saas-sharp":       "fitness",
  "estate-elegant":   "realestate",
  "clinical-bright":  "medical",
  "editorial":        "hotel",
  "bold":             "fitness",
  "clean":            "realestate",
  "clinical":         "medical",
};
function coercePreset(v: unknown): PresetName {
  const s = String(v ?? "");
  if (VALID_PRESETS.includes(s as PresetName)) return (LEGACY_PRESET[s] ?? s) as PresetName;
  return "realestate";
}

// ── Design Intelligence types ─────────────────────────────────────────────────
type DesignStrategy = {
  category:          string;
  subcategory:       string;
  positioning:       "premium" | "mid_market" | "affordable";
  brand_personality: "elegant" | "bold" | "energetic" | "trustworthy" | "playful" | "minimal_luxury";
  conversion_goal:   "book_appointment" | "generate_leads" | "showcase_portfolio" | "sell_membership" | "request_valuation";
  visual_mood:       string;
  target_audience:   string;
};

// ── Hero pool — per category, ordered preferred → fallback ───────────────────
const HERO_POOL: Record<string, string[]> = {
  real_estate:     ["full-image", "re-split", "search-first", "editorial", "property-first"],
  dental:          ["trust-focused", "booking-focused", "clinical-premium"],
  gym:             ["cinematic-dark", "membership-focused", "energy-driven"],
  interior_design: ["luxury-showcase", "portfolio-first", "editorial"],
};

type HeroAvailableData = {
  hasPricingData:   boolean; // description mentions real prices / tiers
  hasPortfolioImgs: boolean; // ≥2 project portfolio images expected
  hasTrustBadges:   boolean; // real stats the badges variant can use
};

function extractHeroAvailableData(description: string): HeroAvailableData {
  return {
    hasPricingData:   /\$\d|\d+[,.]?\d*\s*(per|\/mo|\/month|\/year|membership|fee|aed|eur|gbp|usd)/i.test(description),
    hasPortfolioImgs: /portfolio|project photo|gallery|before.after|completed project|our work|case stud/i.test(description.toLowerCase()),
    hasTrustBadges:   /\d+\s*(year|patient|client|case|review|award)/i.test(description),
  };
}

function selectHeroVariant(strategy: DesignStrategy, data: HeroAvailableData): string | null {
  const pool = HERO_POOL[strategy.category];
  if (!pool) return null; // category not in pool → keep template's hero variant

  // Data-availability gates
  const gated = new Set<string>();
  if (!data.hasTrustBadges)   gated.add("trust-focused");
  if (!data.hasPricingData)   gated.add("membership-focused");
  if (!data.hasPortfolioImgs) gated.add("portfolio-first");

  const eligible = pool.filter((v) => !gated.has(v));
  if (!eligible.length) return pool[0] ?? null; // should never happen

  // Preference weighting by brand_personality + conversion_goal + positioning
  const { brand_personality: bp, conversion_goal: cg, positioning } = strategy;

  const score = (v: string): number => {
    let s = 0;
    // Real estate
    if (v === "full-image"     && (bp === "elegant" || bp === "minimal_luxury"))        s += 2;
    if (v === "editorial"      && (bp === "elegant" || bp === "minimal_luxury"))        s += 2;
    if (v === "editorial"      && positioning === "premium")                             s += 1;
    if (v === "re-split"       && cg === "generate_leads")                              s += 2;
    if (v === "search-first"   && cg === "generate_leads")                              s += 2;
    if (v === "property-first" && cg === "request_valuation")                           s += 2;
    // Dental
    if (v === "trust-focused"    && bp === "trustworthy")                               s += 2;
    if (v === "booking-focused"  && cg === "book_appointment")                          s += 2;
    if (v === "clinical-premium" && positioning === "premium")                          s += 2;
    // Gym
    if (v === "cinematic-dark"     && (bp === "bold" || bp === "energetic"))            s += 2;
    if (v === "energy-driven"      && bp === "energetic")                               s += 1;
    if (v === "membership-focused" && cg === "sell_membership" && data.hasPricingData)  s += 3;
    // Interior design — portfolio-first gets +4 when data confirmed, beating editorial's max of 3
    if (v === "luxury-showcase"  && positioning === "premium")                          s += 2;
    if (v === "portfolio-first"  && cg === "showcase_portfolio" && data.hasPortfolioImgs) s += 4;
    if (v === "portfolio-first"  && data.hasPortfolioImgs && cg !== "showcase_portfolio") s += 2;
    return s;
    // NOTE: no duplicate editorial rule here — editorial scores come only from the RE block above
  };

  const ranked = [...eligible].sort((a, b) => score(b) - score(a));
  // Among tied top candidates, pick randomly to add variety across generations
  const topScore = score(ranked[0]!);
  const tied = ranked.filter((v) => score(v) === topScore);
  return tied[Math.floor(Math.random() * tied.length)] ?? ranked[0]!;
}

// Post-GPT safety check: if the enforced hero variant requires data that GPT
// did not produce, fall back to the category's safest default.
function verifyHeroVariant(spec: WebsiteSpec, strategy: DesignStrategy): void {
  const heroSection = spec.sections.find((s) => s.type === "hero");
  if (!heroSection) return;
  const v = (heroSection as { variant?: string }).variant;
  if (!v) return;

  if (v === "membership-focused") {
    const pricingSection = spec.sections.find((s) => s.type === "pricing-tiers");
    const hasTiers = Array.isArray(pricingSection?.content?.tiers) && (pricingSection.content.tiers as unknown[]).length > 0;
    if (!hasTiers && !Array.isArray(heroSection.content?.tiers)) {
      (heroSection as { variant?: string }).variant = strategy.category === "gym" ? "cinematic-dark" : "editorial";
    }
  }
  if (v === "portfolio-first") {
    const queries = (heroSection as { imageQueries?: string[] }).imageQueries ?? [];
    if (queries.length < 2) {
      (heroSection as { variant?: string }).variant = strategy.category === "interior_design" ? "luxury-showcase" : "editorial";
    }
  }
  if (v === "trust-focused") {
    const badges = heroSection.content?.badges;
    if (!Array.isArray(badges) || (badges as unknown[]).length === 0) {
      (heroSection as { variant?: string }).variant = "clinical-premium";
    }
  }
}

// ── Template: step-1 classifier + design intelligence (single gpt-4o-mini call) ─
async function classifyWithDesignStrategy(
  openai: OpenAI,
  description: string,
): Promise<{ templateCategory: string; strategy: DesignStrategy }> {
  const VALID_TEMPLATE_CATS = ["medical", "hospitality", "retail", "saas", "professional"] as const;

  const system = `You are a business analyst and brand strategist. Analyze the business description and return a JSON object with EXACTLY these fields:

{
  "template_category": one of: medical | hospitality | retail | saas | professional,
  "category": one of: real_estate | dental | gym | interior_design | restaurant | hotel | spa | legal | saas | ecommerce | other,
    CATEGORY RULE — use "ecommerce" ONLY when the business primarily sells physical products online with a cart/checkout flow (e.g. an online clothing store, a dropshipping site). Any business that serves customers in person or provides a service — including bakeries, cafés, salons, florists, studios, clinics not in the named list — must be "other".
  "subcategory": "specific niche e.g. 'luxury residential sales', 'orthodontics', 'boutique strength studio', 'residential interior design'",
  "positioning": one of: premium | mid_market | affordable,
  "brand_personality": one of: elegant | bold | energetic | trustworthy | playful | minimal_luxury,
  "conversion_goal": one of: book_appointment | generate_leads | showcase_portfolio | sell_membership | request_valuation,
  "visual_mood": "2–4 words e.g. 'warm editorial calm', 'dark industrial intensity', 'bright clinical trust'",
  "target_audience": "1 short sentence describing who this business's site must convince"
}

template_category mapping:
  medical — dental, doctor, physio, dermatology, health, pharmacy, optician
  hospitality — hotel, restaurant, café, bar, catering, lodging, fine dining
  retail — e-commerce, shop, boutique, cosmetics, accessories, product-selling
  saas — software, SaaS, digital platform, app, tech startup, digital agency
  professional — law, real estate, accountant, consultant, architect, interior design, gym, yoga, spa, trainer

Derive EVERY field from the actual description. Never invent facts. Output ONLY valid JSON, no markdown.`;

  const fallbackStrategy: DesignStrategy = {
    category: "other", subcategory: "", positioning: "mid_market",
    brand_personality: "trustworthy", conversion_goal: "generate_leads",
    visual_mood: "clean professional trust", target_audience: "Potential customers looking for this service.",
  };

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: description.slice(0, 800) }],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0,
    });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const tc = String(raw.template_category ?? "").toLowerCase();
    const strategy: DesignStrategy = {
      category:          String(raw.category          ?? "other"),
      subcategory:       String(raw.subcategory        ?? ""),
      positioning:       (["premium","mid_market","affordable"].includes(String(raw.positioning))                                                     ? raw.positioning          : "mid_market")       as DesignStrategy["positioning"],
      brand_personality: (["elegant","bold","energetic","trustworthy","playful","minimal_luxury"].includes(String(raw.brand_personality))             ? raw.brand_personality    : "trustworthy")      as DesignStrategy["brand_personality"],
      conversion_goal:   (["book_appointment","generate_leads","showcase_portfolio","sell_membership","request_valuation"].includes(String(raw.conversion_goal)) ? raw.conversion_goal : "generate_leads") as DesignStrategy["conversion_goal"],
      visual_mood:       String(raw.visual_mood        ?? "clean professional trust"),
      target_audience:   String(raw.target_audience    ?? "Potential customers looking for this service."),
    };
    return {
      templateCategory: VALID_TEMPLATE_CATS.includes(tc as typeof VALID_TEMPLATE_CATS[number]) ? tc : "professional",
      strategy,
    };
  } catch {
    return { templateCategory: "professional", strategy: fallbackStrategy };
  }
}

// ── Template: deterministic template selection (alternates per site count) ────
function selectTemplate(category: string, siteCount: number): SiteTemplate {
  const options = TEMPLATE_BY_CATEGORY[category] ?? TEMPLATE_BY_CATEGORY["professional"]!;
  const idx = siteCount % options.length;
  return options[idx] ?? options[0]!;
}

// ── Template: server-side enforcement after GPT fill ──────────────────────────
function enforceTemplate(spec: WebsiteSpec, template: SiteTemplate): void {
  // Index GPT-returned sections by type (first-come-first-served per type)
  const byType = new Map<string, Array<WebsiteSpec["sections"][0]>>();
  for (const s of spec.sections) {
    if (!byType.has(s.type)) byType.set(s.type, []);
    byType.get(s.type)!.push(s);
  }

  const result: WebsiteSpec["sections"] = [];

  for (const ts of template.sections) {
    const pool = byType.get(ts.type) ?? [];
    const match = pool.shift();

    if (!match) {
      if (ts.required) {
        // Required section GPT omitted — add empty stub so renderer still fires
        result.push({ type: ts.type, ...(ts.variant ? { variant: ts.variant } : {}), content: {} } as WebsiteSpec["sections"][0]);
      }
      continue;
    }

    // Optional section: skip if no meaningful data
    if (!ts.required) {
      const skipRule = OPTIONAL_SKIP_RULES[ts.type];
      if (skipRule && skipRule(match.content as Record<string, unknown>)) continue;
    }

    // Apply template variant (always overwrite so GPT can't drift it)
    const enforced = { ...match } as WebsiteSpec["sections"][0] & { variant?: string };
    if (ts.variant) enforced.variant = ts.variant;
    else delete enforced.variant;
    result.push(enforced);
  }

  // Minimal safe fallback: if fewer than 2 non-footer content sections after enforcement
  const contentSections = result.filter((s) => s.type !== "footer" && s.type !== "contact-block");
  if (contentSections.length < 2) {
    const heroSpec = spec.sections.find((s) => ["hero", "hero-fullbleed", "hero-split", "hero-minimal"].includes(s.type));
    const contactSpec = spec.sections.find((s) => ["contact-block", "booking"].includes(s.type));
    const aboutSpec = spec.sections.find((s) => ["about", "about-story"].includes(s.type));
    result.splice(0, result.length,
      heroSpec    ?? { type: "hero", variant: "split-left", content: {} } as WebsiteSpec["sections"][0],
      aboutSpec   ?? { type: "about-story", content: {} } as WebsiteSpec["sections"][0],
      contactSpec ?? { type: "contact-block", variant: "split-form", content: {} } as WebsiteSpec["sections"][0],
    );
  }

  // Preserve footer at the end
  const footer = spec.sections.find((s) => s.type === "footer");
  if (footer && !result.find((s) => s.type === "footer")) result.push(footer);

  spec.sections = result;
}

// ── Hero variant extended-schema instructions ─────────────────────────────────
const HERO_VARIANT_SCHEMAS: Record<string, string> = {
  "re-split":
    `hero content for "re-split": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "stats"?: [{ "value": string, "label": string }] — ONLY real statistics the owner stated; max 3 items; omit if none }`,
  "trust-focused":
    `hero content for "trust-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "badges"?: [{ "value": "15+", "label": "Years Experience" }] — ONLY real stats (years, patients, awards); max 4; omit if no real data }`,
  "booking-focused":
    `hero content for "booking-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary",
  "services"?: string[] — service names for the dropdown; omit or leave [] if not specified }`,
  "membership-focused":
    `hero content for "membership-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "tiers"?: [{ "name": string, "price": string, "period"?: string }] — ONLY real pricing the owner stated; max 3; omit if no real prices }`,
  "property-first":
    `hero content for "property-first": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "property"?: { "title"?: string, "price"?: string, "beds"?: string, "baths"?: string, "sqft"?: string } — ONLY real listing data; omit fields not stated }`,
  "portfolio-first":
    `hero content for "portfolio-first": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"? }
imageQueries REQUIRED at section level (3 strings for the image grid).`,
};

// ── Template: system prompt for the fill (step-2) call ────────────────────────
function buildFillSystem(
  template: SiteTemplate,
  contactBlock: string,
  language = "English",
  hasOwnerPhoto = true,
  strategy?: DesignStrategy | null,
  heroVariant?: string | null,
): string {
  const langLine = language && language.toLowerCase() !== "english"
    ? `LANGUAGE: ALL website copy — every headline, subheadline, button label, body paragraph, form placeholder, and footer text — MUST be written in ${language}. Do not write a single word of content in English unless the business name itself is English.\n\n`
    : "";

  const strategyBlock = strategy ? `═══════════════════════════════════════════════════════
PART 0 — BUSINESS INTELLIGENCE (grounding context — do NOT echo this in JSON output)
═══════════════════════════════════════════════════════
Subcategory:       ${strategy.subcategory}
Positioning:       ${strategy.positioning.replace(/_/g, " ")}
Brand personality: ${strategy.brand_personality.replace(/_/g, " ")}
Conversion goal:   ${strategy.conversion_goal.replace(/_/g, " ")}
Visual mood:       ${strategy.visual_mood}
Target audience:   ${strategy.target_audience}

Use these insights to calibrate copy tone, CTA wording, and section emphasis. They are context only — never include this block or its field names in your JSON output.

` : "";

  const templateLines = template.sections.map((ts, i) => {
    const req = ts.required ? "(REQUIRED)" : "(OPTIONAL — include ONLY if owner provided real data)";
    const variant = ts.variant ? `, variant: "${ts.variant}"` : "";
    return `  ${i + 1}. type: "${ts.type}"${variant} ${req}`;
  }).join("\n");

  return `${strategyBlock}${langLine}You are a senior brand copywriter and web strategist at a premium agency. Your job: analyze a business and produce a complete website JSON spec with ALL section content.

STRICT OUTPUT RULE: Output ONLY valid JSON. No markdown, no explanation, no code fences.

═══════════════════════════════════════════════════════
PART 1 — COPYWRITING STANDARDS (read before writing a single word)
═══════════════════════════════════════════════════════

The owner's description is RAW MATERIAL. It is NEVER source text to rephrase. Extract intent and write FRESH brand copy.

BAD COPY PATTERNS — never write:
✗ "Quality service you can trust"  ✗ "We are committed to excellence"
✗ "Professional team with years of experience"  ✗ "Welcome to [business name]"
✗ Section headings: "Our Services" / "About Us" / "Why Choose Us" / "Contact Us"

GOOD COPY PATTERNS:
✓ Lead with the customer's problem or desire  ✓ Use specific numbers, materials, real details
✓ Active voice. Present tense. Short sentences for headlines.
✓ Section headlines that read like editorial titles — "Precision, Start to Finish" not "Our Services"

═══════════════════════════════════════════════════════
PART 2 — JSON ROOT SHAPE
═══════════════════════════════════════════════════════

{
  "businessName": string,
  "category": "saas"|"hotel"|"clinic"|"gym"|"salon"|"realestate"|"restaurant"|"ecommerce"|"agency"|"education"|"legal"|"other",
  "designDNA": {
    "mood": "editorial-luxury"|"clinical-bright"|"bold-energetic"|"warm-minimal"|"tech-sharp"|"dark-premium",
    "headingFont": string,
    "bodyFont": string,
    "palette": { "bg": "#RRGGBB", "text": "#RRGGBB", "accent": "#RRGGBB", "muted": "#RRGGBB" },
    "isDark": boolean
  },
  "sections": SectionSpec[]
}

═══════════════════════════════════════════════════════
PART 3 — DESIGN MOODS (choose ONE for designDNA.mood)
═══════════════════════════════════════════════════════

"editorial-luxury" — Serif headings, off-white body, gold/champagne accent, cinematic. USE: boutique hotel, luxury salon, fine dining, real estate.
  Palette: bg #FAF8F5 · text #1A1A1A · muted #857D72 · isDark: false

"clinical-bright" — All-sans heavy headings, pure white, clinical blue accent, trust-first. USE: dental clinic, medical practice, physio.
  Palette: bg #FFFFFF · text #0A2540 · muted #64748B · isDark: false

"bold-energetic" — Heavy compressed headings (uppercase), near-black bg, vivid accent. USE: gym, sports brand, nightlife, automotive.
  Palette: bg #0B0B0B · text #FFFFFF · muted #6B7280 · isDark: true

"warm-minimal" — Light-weight serif heading, warm off-white, muted earth accent, extreme whitespace. USE: spa, yoga, organic café, salon.
  Palette: bg #F7F5F0 · text #3A3730 · muted #6B705C · isDark: false

"tech-sharp" — Geometric sans heading (600-700w), very dark bg, bold violet/indigo accent. USE: SaaS, tech startup, digital agency.
  Palette: bg #0A0A0F · text #F1F5F9 · muted #6B7280 · isDark: true

"dark-premium" — Delicate serif headings (400w), ultra-dark near-black, warm gold accent. USE: premium hotel, high fashion, exclusive membership.
  Palette: bg #080808 · text #F5F3EE · muted #857D72 · isDark: true

═══════════════════════════════════════════════════════
PART 4 — FONTS (ONLY these names are valid)
═══════════════════════════════════════════════════════

headingFont and bodyFont MUST be one of:
  "Playfair Display" · "Cormorant Garamond" · "Fraunces" · "Libre Baskerville"
  "Archivo" · "Inter" · "DM Sans" · "Space Grotesk" · "Plus Jakarta Sans"

PAIRING GUIDE:
  editorial-luxury → heading: "Playfair Display", body: "Inter"
  clinical-bright  → heading: "Inter", body: "Inter"
  bold-energetic   → heading: "Archivo", body: "Inter"
  warm-minimal     → heading: "Cormorant Garamond" or "Fraunces", body: "DM Sans"
  tech-sharp       → heading: "Plus Jakarta Sans" or "Space Grotesk", body: "Inter"
  dark-premium     → heading: "Playfair Display", body: "Inter"

═══════════════════════════════════════════════════════
PART 5 — PALETTE RULES
═══════════════════════════════════════════════════════

accent MUST be from this approved list ONLY. Never invent a hex code outside this table.

EARTHY / WARM:  #8B6347 · #A0522D · #C4793D · #9C6E3F
LUXURY:         #C4A882 · #B8860B · #8D7047 · #7C5C3D
VIVID / BOLD:   #E8390E · #C41E3A · #FF4F1F · #D4380D
SAAS / TECH:    #7C3AED · #9333EA · #6366F1 · #4F46E5
PROFESSIONAL:   #8D6E3F · #1A56DB · #1E3A8A · #2563EB
CLINICAL:       #0070C9 · #0EA5E9 · #0891B2 · #0284C7
WELLNESS:       #16A34A · #059669 · #0D9488 · #15803D

═══════════════════════════════════════════════════════
PART 6 — FIXED SECTION STRUCTURE (YOU MUST FOLLOW THIS EXACTLY)
═══════════════════════════════════════════════════════

The section list, order, and variants below are FIXED. Your ONLY job is to write content for each section.

‼ DO NOT add sections not listed below.
‼ DO NOT remove REQUIRED sections.
‼ DO NOT change the order.
‼ DO NOT change the variant values — they are already set.

SECTIONS (in this exact order):
${templateLines}
  (last) type: "footer" (REQUIRED)

OPTIONAL SECTIONS — include ONLY if the owner provided real data:
  team-grid    → only if owner named real staff members
  stats-band   → only if owner stated real statistics (numbers)
  logo-strip   → only if owner named real companies or clients
  listings-grid → only if owner described real rooms, dishes, properties, or products
  product-grid → only if owner described real products with names
  pricing-tiers → only if owner provided real prices or tier names
  gallery-grid → always include; stock imagery will be supplied automatically

SectionSpec structure (imageQuery/imageQueries MUST be siblings of content, NOT nested inside it):
{ "type": string, "variant": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }

═══════════════════════════════════════════════════════
PART 7 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════

imageQuery is an Unsplash search string. Required for: hero (unless minimal-stacked variant), about-story.
imageQueries (array) required for: gallery-grid (6 strings), listings-grid (3–6), product-grid (4–8), feature-showcase (3–4).

${!hasOwnerPhoto ? `BUILD SUBJECT-SPECIFIC QUERIES:
imageQuery = [business type] [city or region] [quality context]
• Include the specific business type, city/region if known, and a quality suffix
• NEVER use abstract-texture queries for hero/about sections
• EXAMPLES:
  Hotel (Tunis) → "hotel resort Tunisia Mediterranean exterior architecture"
  Dental clinic (Dubai) → "dental clinic Dubai modern reception white professional"
  Gym → "gym fitness training equipment modern interior editorial"
  SaaS / agency → "modern office workspace team technology professional"
gallery/listings/products: vary subject, angle, detail — each query must be distinct.
` : `BUILD FROM OWNER'S SPECIFICS:
Extract visual details from description. Build 4–6 word queries using business type + location + one specific detail.`}
QUALITY SUFFIX: hero/about-story → "bright natural light" or "editorial minimal". gallery/listings → "editorial" or "close-up detail".

═══════════════════════════════════════════════════════
PART 8 — CONTENT SCHEMAS PER SECTION TYPE
═══════════════════════════════════════════════════════

hero — imageQuery REQUIRED (unless variant is "minimal-stacked"):
{ "eyebrow": "3–5 words", "headline": "5–8 words punchy", "subheadline": "1–2 sentences", "ctaPrimary": "action label", "ctaSecondary"?: string }

feature-grid:
{ "eyebrow"?: string, "headline": string, "subheadline"?: string, "items": [{ "icon": string, "title": string, "description": string }] × 3–6 }
icon values: check | star | shield | briefcase | heart | leaf | clock | plus | home | dumbbell | scissors | chef | tooth

pricing-tiers:
{ "eyebrow"?: string, "headline": string, "tiers": [{ "name": string, "price": string, "period": string, "features": string[] × 4–6, "ctaText": string, "highlighted": boolean }] × 2–4 }
Only ONE tier should have "highlighted": true.

service-list:
{ "eyebrow"?: string, "headline": string, "items": [{ "title": string, "description"?: string, "price"?: string }] × 4–10 }

gallery-grid — imageQueries REQUIRED (6 strings at section level):
{ "eyebrow"?: string, "headline": string }

listings-grid — imageQueries REQUIRED (3–6 strings at section level):
{ "eyebrow"?: string, "headline": string, "items": [{ "title": string, "subtitle"?: string, "description"?: string, "price"?: string }] }

about-story — imageQuery REQUIRED:
{ "eyebrow"?: string, "headline": string, "body": string, "bullets"?: [{ "title": string, "text": string }] × 2–4, "ctaText"?: string }

team-grid:
{ "eyebrow"?: string, "headline": string, "members": [{ "name": string, "role": string, "bio"?: string }] }
Only real staff the owner named.

stats-band:
{ "items": [{ "value": string, "label": string }] × 3–5 }
ONLY real statistics. Never invent numbers.

process-steps:
{ "eyebrow"?: string, "headline": string, "steps": [{ "title": string, "description": string }] × 3–5 }

faq-accordion:
{ "eyebrow"?: string, "headline": string, "items": [{ "q": string, "a": string }] × 5–8 }

cta-band:
{ "headline": string, "sub"?: string, "ctaText": string }

contact-block:
{ "eyebrow"?: string, "headline": string, "subheadline"?: string,
  "phone": string (ONLY from real contact info — else omit),
  "email": string (ONLY from real contact info — else omit),
  "address": string (ONLY from real contact info — else omit),
  "hours": string (ONLY from real contact info — else omit),
  "ctaText": string, "services"?: string[] × 3–6 }

logo-strip:
{ "headline"?: string, "names": string[] }

product-grid — imageQueries REQUIRED (4–8 strings at section level):
{ "eyebrow"?: string, "headline": string, "items": [{ "title": string, "description"?: string, "price"?: string, "badge"?: string }] }

feature-showcase — imageQueries REQUIRED (3–4 strings at section level):
{ "eyebrow"?: string, "headline": string, "items": [{ "title": string, "description": string, "cta"?: string }] }

footer:
{ "tagline": string, "links": string[] × 4–5,
  "phone"?: string, "email"?: string, "address"?: string, "copyright": string }

${contactBlock
  ? `═══════════════════════════════════════════════════════
REAL CONTACT INFO — copy these values EXACTLY into contact-block + footer:
${contactBlock}
═══════════════════════════════════════════════════════`
  : `CONTACT INFO: None provided. DO NOT include phone, email, address, or hours anywhere in the spec.`}

${heroVariant && HERO_VARIANT_SCHEMAS[heroVariant] ? `═══════════════════════════════════════════════════════
PART 9 — HERO VARIANT SCHEMA OVERRIDE
═══════════════════════════════════════════════════════
The hero section uses variant "${heroVariant}". Write its content using this exact schema:
${HERO_VARIANT_SCHEMAS[heroVariant]}
For all other sections use schemas from PART 8.
` : ""}═══════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════
1. NEVER invent phone numbers, email addresses, physical addresses, or hours.
2. NEVER include testimonials or star ratings.
3. NEVER include stats-band with invented numbers.
4. NEVER invent team member names.
5. NEVER paraphrase the owner's input as copy — extract intent and write fresh.
6. NEVER use generic headings: "Our Services", "About Us", "Why Choose Us", "Contact Us".
7. imageQuery / imageQueries MUST be siblings of content{}, never nested inside it.
8. NEVER invent commercial promises unless the owner explicitly stated them.
9. Footer tagline MUST be specific to this business — never a placeholder phrase.`;
}

// ── System prompt (v2: section-based composition with designDNA) ──────────────
function buildSystem(contactBlock: string, language = "English", hasOwnerPhoto = true): string {
  const langLine = language && language.toLowerCase() !== "english"
    ? `LANGUAGE: ALL website copy — every headline, subheadline, button label, body paragraph, form placeholder, and footer text — MUST be written in ${language}. Do not write a single word of content in English unless the business name itself is English.\n\n`
    : "";
  return `${langLine}You are a senior brand copywriter and web strategist at a premium agency. Your job: analyze a business, then produce a complete website spec as JSON.

STRICT OUTPUT RULE: Output ONLY valid JSON. No markdown, no explanation, no code fences.

═══════════════════════════════════════════════════════
PART 1 — COPYWRITING STANDARDS (read before writing a single word)
═══════════════════════════════════════════════════════

The owner's description is RAW MATERIAL — intelligence about their business. It is NEVER source text to rephrase.

YOUR JOB: Read the description. Understand what this business actually does, what its customers care about, and what makes it genuinely worth choosing. Then write FRESH copy that a premium brand's in-house marketing team would be proud of.

TONE MODELS — study these:
• compass.com: "Real estate, elevated." Confident, specific, human. Never corporate-speak.
• studio-mcgee.com: "Design is personal." Warm authority. Every line sounds considered, not generated.
• f45training.com: "Train. Together." Bold, direct, energetic. Sentences are short and hit hard.

BEFORE (bad — paraphrasing owner input):
Owner wrote: "every treatment room has a ceiling screen so patients can watch Netflix during procedures"
BAD headline: "Watch Your Favorite Shows During Your Treatment"
REASON: this is a verbatim reword of the owner's sentence. It doesn't position the business — it transcribes it.

AFTER (good — brand copywriting):
GOOD headline: "Dentistry That Actually Doesn't Feel Like Dentistry"
GOOD subheadline: "We've redesigned every detail of the patient experience, from same-day digital scans to ceiling screens in every chair."
REASON: Speaks to the customer's emotion first, then anchors in specific details.

BAD COPY PATTERNS — never write these:
✗ "Quality service you can trust" — generic cliché
✗ "We are committed to excellence" — corporate filler
✗ "Professional team with years of experience" — says nothing specific
✗ "We offer a wide range of services" — describes every business ever
✗ "Welcome to [business name]" as a headline — wasted opportunity
✗ Section headings like "Our Services", "About Us", "Why Choose Us", "Contact Us"

GOOD COPY PATTERNS:
✓ Lead with the customer's problem or desire, then your solution
✓ Use specific numbers, materials, techniques — real details make copy credible
✓ Active voice. Present tense. Short sentences for headlines.
✓ Section headlines that read like editorial titles:
  BAD: "Our Services" / GOOD: "Precision, Start to Finish"
  BAD: "About Us" / GOOD: "Built Different From Day One"

═══════════════════════════════════════════════════════
PART 2 — JSON ROOT SHAPE
═══════════════════════════════════════════════════════

{
  "businessName": string,
  "category": "saas"|"hotel"|"clinic"|"gym"|"salon"|"realestate"|"restaurant"|"ecommerce"|"agency"|"education"|"legal"|"other",
  "designDNA": {
    "mood": "editorial-luxury"|"clinical-bright"|"bold-energetic"|"warm-minimal"|"tech-sharp"|"dark-premium",
    "headingFont": string,
    "bodyFont": string,
    "palette": { "bg": "#RRGGBB", "text": "#RRGGBB", "accent": "#RRGGBB", "muted": "#RRGGBB" },
    "isDark": boolean
  },
  "sections": SectionSpec[]
}

═══════════════════════════════════════════════════════
PART 3 — DESIGN MOODS (choose ONE for designDNA.mood)
═══════════════════════════════════════════════════════

"editorial-luxury" — Serif headings, off-white/warm body, gold/champagne accent, zero radius, generous whitespace. Cinematic, unhurried. USE FOR: boutique hotel, luxury salon, fine dining, jewellery, fashion boutique, real estate, interior design, legal firm.
  Palette guide: bg #FAF8F5 · text #1A1A1A · muted #857D72 · isDark: false

"clinical-bright" — All-sans heavy headings, pure white, clinical blue accent, rounded corners (10px+), icon circles. Trust-first, airy. USE FOR: dental clinic, medical practice, physio, dermatology, health centre, vet.
  Palette guide: bg #FFFFFF · text #0A2540 · muted #64748B · isDark: false

"bold-energetic" — Heavy compressed headings (uppercase), near-black bg, vivid/acid accent, dark throughout. High energy. USE FOR: gym, CrossFit, martial arts, sports brand, nightlife, automotive, streetwear.
  Palette guide: bg #0B0B0B · text #FFFFFF · muted #6B7280 · isDark: true

"warm-minimal" — Light-weight serif or optical-variable heading, warm off-white, muted earth accent, extreme whitespace, no radius. Tactile, quiet luxury. USE FOR: spa, yoga studio, organic café, bakery, florist, holistic wellness, artisan food, hair salon (soft/organic).
  Palette guide: bg #F7F5F0 · text #3A3730 · muted #6B705C · isDark: false

"tech-sharp" — Geometric sans heading (600-700w), very dark or pure black bg, bold violet/indigo accent, subtle glows, tight spacing. Precise, forward-looking. USE FOR: SaaS, tech startup, digital agency, co-working, ed-tech, modern ecommerce.
  Palette guide: bg #0A0A0F · text #F1F5F9 · muted #6B7280 · isDark: true

"dark-premium" — Delicate serif headings (400w), ultra-dark near-black, warm gold accent, maximum negative space. Cinematic, nighttime luxury. USE FOR: premium hotel, fine dining (evening), high fashion, exclusive membership.
  Palette guide: bg #080808 · text #F5F3EE · muted #857D72 · isDark: true

═══════════════════════════════════════════════════════
PART 4 — FONTS (ONLY these names are valid)
═══════════════════════════════════════════════════════

headingFont and bodyFont MUST be one of:
  "Playfair Display"    ← hotel, realestate, dark-premium, editorial-luxury
  "Cormorant Garamond"  ← spa, fine dining, warm-minimal (refined)
  "Fraunces"            ← organic, artisan, warm-minimal (optical variation)
  "Libre Baskerville"   ← legal, consulting, classic
  "Archivo"             ← gym, sports, bold-energetic
  "Inter"               ← clinic, saas, all-purpose sans
  "DM Sans"             ← café, wellness, ecommerce (warm sans)
  "Space Grotesk"       ← tech, agency, co-working
  "Plus Jakarta Sans"   ← saas, digital, modern ecommerce

PAIRING GUIDE:
  editorial-luxury → heading: "Playfair Display", body: "Inter"
  clinical-bright  → heading: "Inter", body: "Inter"
  bold-energetic   → heading: "Archivo", body: "Inter"
  warm-minimal     → heading: "Cormorant Garamond" or "Fraunces", body: "DM Sans"
  tech-sharp       → heading: "Plus Jakarta Sans" or "Space Grotesk", body: "Inter"
  dark-premium     → heading: "Playfair Display", body: "Inter"

═══════════════════════════════════════════════════════
PART 5 — PALETTE RULES
═══════════════════════════════════════════════════════

accent MUST be from this list ONLY. Never invent a hex code outside this table.

EARTHY / WARM (spas, bakeries, warm restaurants, organic cafés, florists):
  #8B6347 terracotta  |  #A0522D sienna  |  #C4793D amber clay  |  #9C6E3F antique gold

LUXURY (high-end hotels, fine dining, premium fashion, wealth management, jewellery):
  #C4A882 champagne  |  #B8860B dark gold  |  #8D7047 champagne bronze  |  #7C5C3D warm walnut

VIVID / BOLD (gyms, martial arts, sports, automotive, nightlife, street food):
  #E8390E fire red  |  #C41E3A crimson  |  #FF4F1F coral  |  #D4380D burnt orange

SAAS / TECH (tech startups, SaaS, digital agencies, modern gyms, co-working):
  #7C3AED violet  |  #9333EA purple  |  #6366F1 indigo  |  #4F46E5 deep indigo

PROFESSIONAL (real estate, law, finance, consulting, architecture):
  #8D6E3F aged gold  |  #1A56DB cobalt  |  #1E3A8A deep navy  |  #2563EB primary blue

CLINICAL (dental, medical, dermatology, physiotherapy, health):
  #0070C9 sky blue  |  #0EA5E9 bright azure  |  #0891B2 teal blue  |  #0284C7 ocean

WELLNESS / NATURE (yoga, holistic health, organic cafés, wellness retreats):
  #16A34A sage  |  #059669 emerald  |  #0D9488 teal  |  #15803D forest

If the owner mentions a brand color (e.g. "our logo is green"), pick the closest hex from the table above.

═══════════════════════════════════════════════════════
PART 6 — LAYOUT VARIANTS (REQUIRED — always specify a variant)
═══════════════════════════════════════════════════════

Every section has a "variant" field. You MUST set it. Two sites in the same category MUST NOT use the same variant set. Pick variants that suit the business's personality.

hero variants (type = "hero"):
  "centered-overlay"  — full-bleed image bg, centered overlay text (cinematic; hotel, restaurant, salon, gym)
  "split-left"        — text left, real photo right, light/dark bg (trust-building; clinic, legal, education)
  "split-right"       — photo left, text right, mirrored (editorial; realestate, agency, boutique)
  "editorial-offset"  — oversized headline top-left, image bottom-right, asymmetric whitespace (luxury, fashion, design)
  "minimal-stacked"   — no image, gradient glow, dark bg (saas, tech, agency — USE "hero-minimal" type for this)

feature-grid variants:
  "three-cards"       — default icon grid (saas features, clinic services)
  "alternating-rows"  — each feature is a full-width row, alternating sides (agency, consultancy)
  "numbered-list"     — vertical numbered big figures (law, finance, process-driven)
  "asymmetric-bento"  — first card large, rest smaller (modern saas, agency)

service-list variants:
  "editorial-rows"    — horizontal lines, name left / price right (salon, restaurant, spa)
  "two-column"        — two-column grid of list items (clinic treatments, legal services)
  "bordered-cards"    — card grid with hover border (gym classes, education courses)

listings-grid variants:
  "uniform-grid"      — equal-size cards grid (hotel rooms, menu items)
  "masonry"           — varying heights, editorial feel (portfolio, boutique hotel)
  "wide-rows"         — full-width alternating image+text rows (luxury real estate, flagship products)

pricing-tiers variants:
  "cards-row"         — horizontal cards, one highlighted (saas, gym)
  "comparison-table"  — feature comparison table (saas, education plans)
  "single-highlight"  — one large featured tier, smaller secondary options (premium services)

contact-block variants:
  "split-form"        — left col = heading + contact details, right col = form (default when contact info exists)
  "centered-form"     — centered heading, horizontal contact details row, centered form (minimal info)

gallery-grid variants:
  "uniform"           — 3-col equal grid (hotel, restaurant, beauty)
  "masonry"           — varying heights, editorial (portfolio, design studio, boutique)
  "full-bleed-strip"  — horizontal scrollable strip (fashion, food, lifestyle)

VARIANT DIVERSITY RULE: If generating multiple sites in the same category, vary the variants. Never use the same combination twice for the same category.

═══════════════════════════════════════════════════════
PART 7 — SECTION TYPES + FREE COMPOSITION
═══════════════════════════════════════════════════════

You choose sections freely to fit the business. MANDATORY: one hero (first) + contact-block (last before footer) + footer.

HERO: Use type "hero" with a variant field (see Part 6). DO NOT use hero-fullbleed, hero-split, hero-minimal as types anymore — use type "hero" with the correct variant.

OTHER AVAILABLE TYPES:
  "feature-grid"      — icon+title+description cards. USE: saas features, clinic services, agency capabilities, gym benefits
  "pricing-tiers"     — pricing cards, one highlighted. USE: saas, gym membership, education plans
  "service-list"      — service rows with optional price. USE: salon menu, clinic treatments, legal services
  "gallery-grid"      — photo grid. USE: hotel, restaurant, salon, bakery, portfolio. Requires imageQueries (6 strings).
  "listings-grid"     — image cards with title/price. USE: hotel rooms, restaurant dishes, real estate. Requires imageQueries (3–6).
  "about-story"       — text + image: founding story, specific and human. USE: any business with a real story.
  "team-grid"         — team member cards. USE: clinic, law firm, agency. ONLY if owner named real staff.
  "stats-band"        — large stat numbers. ONLY if owner provided REAL statistics. NEVER invent.
  "process-steps"     — numbered steps. USE: agency workflow, legal, medical journey, buying process.
  "faq-accordion"     — Q&A. USE: clinic, legal, saas. Omit for gyms, restaurants, hotels.
  "cta-band"          — dark CTA band. USE: saas, gym, agency. Place before contact-block.
  "contact-block"     — contact form + optional details. ALWAYS last section before footer. MANDATORY.
  "logo-strip"        — "Trusted by" brand names row. ONLY if owner named real companies/clients.
  "product-grid"      — product cards with image, name, price, enquire button. USE: ecommerce, boutique. Requires imageQueries (4–8).
  "feature-showcase"  — alternating big image + text rows. USE: saas, agency, boutique. Requires imageQueries (3–4).
  "integration-grid"  — integration/tool tiles. USE: saas only.

COMPOSITION BY CATEGORY (adapt freely — these are patterns, not rules):

saas → hero (minimal-stacked or split-left) → logo-strip (if data) → feature-grid → feature-showcase → pricing-tiers → integration-grid (if relevant) → faq-accordion → cta-band → contact-block
SAAS RULES: NEVER include booking form with date/time. NEVER include address. Contact-block must use centered-form variant.

hotel → hero (centered-overlay or editorial-offset) → about-story → listings-grid → gallery-grid → contact-block
clinic → hero (split-left or split-right) → feature-grid or service-list → team-grid → faq-accordion → contact-block
gym → hero (centered-overlay or split-left) → feature-grid → service-list → stats-band (if data) → cta-band → contact-block
salon → hero (centered-overlay or editorial-offset) → service-list → gallery-grid → contact-block
restaurant → hero (centered-overlay) → about-story → listings-grid → gallery-grid → contact-block
realestate → hero (split-right or editorial-offset) → listings-grid → about-story → process-steps → contact-block
ecommerce → hero (split-left or centered-overlay) → product-grid → feature-grid → gallery-grid → cta-band → contact-block
ECOMMERCE RULES: NEVER include address (unless physical store). Use product-grid as main section. Contact-block should be simple.
agency → hero (minimal-stacked or editorial-offset) → feature-showcase → feature-grid → about-story → process-steps → contact-block
education → hero (split-left) → feature-grid → service-list → faq-accordion → contact-block
legal → hero (split-left or split-right) → service-list → about-story → team-grid → contact-block
other → hero (centered-overlay) → feature-grid → about-story → contact-block

SectionSpec structure (imageQuery/imageQueries MUST be siblings of content, NOT nested inside it):
{ "type": string, "variant": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }

═══════════════════════════════════════════════════════
PART 7 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════

imageQuery is an Unsplash search string. Required for: hero-fullbleed, hero-split, about-story, gallery-grid (6 imageQueries), listings-grid (3–6 imageQueries).

${!hasOwnerPhoto ? `BUILD SUBJECT-SPECIFIC QUERIES — do NOT use abstract textures or gradients:

imageQuery = [business type] [city or region] [quality context]

RULES:
• Include the specific business type (hotel, restaurant, dental clinic, gym…)
• Include the city or region if known
• End with a quality context: "professional photography", "editorial", "interior design", "bright natural light"
• NEVER use pure-abstract queries like "bokeh texture close-up" or "gradient glow" for hero/about sections
• The query must produce a REAL PHOTO of this type of business, not a stock texture

EXAMPLES:
• Hotel (Tunis)           → "hotel resort Tunisia Mediterranean exterior architecture"
• Dental clinic (Dubai)   → "dental clinic Dubai modern reception white professional"
• Restaurant (Tunis)      → "restaurant Tunis Mediterranean dining room elegant"
• Gym (Dubai Marina)      → "gym fitness Dubai Marina training equipment modern"
• Salon (Paris)           → "hair salon Paris elegant interior modern professional"
• SaaS / agency           → "modern office workspace team technology professional"
• Real estate (London)    → "luxury property London interior architecture modern"

gallery-grid / listings-grid: vary subject, angle, detail — each query must be distinct.

` : `PROCESS:
1. Extract concrete visual details from owner's description: equipment, materials, ambience, unique features
2. Build a 4–6 word query from specifics (business type + location + one detail)
3. Self-test: "Could this belong to any business in this category?" → If yes, make it more specific.

EXAMPLES:
• Dental clinic (ceiling screens, digital scanners) → "dental clinic Dubai digital technology modern white"
• Gym (HIIT, warehouse, orange lights) → "hiit group fitness warehouse orange lighting dynamic"
• Restaurant (open fire, exposed brick) → "restaurant open fire grill exposed brick warm dining"
`}
gallery-grid / listings-grid imageQueries: all queries MUST be distinct — vary subject, angle, detail, moment.

QUALITY SUFFIX: append one of these to every imageQuery:
  hero/about-story → "bright natural light" or "professional photography" or "editorial minimal"
  gallery/listings → "editorial" or "close-up detail" or "product shot clean background"

═══════════════════════════════════════════════════════
PART 8 — CONTENT SCHEMAS PER SECTION TYPE
═══════════════════════════════════════════════════════

hero-fullbleed / hero-split / hero-minimal — imageQuery REQUIRED (except hero-minimal):
{ "eyebrow": "3–5 words · city or tagline", "headline": "5–8 words punchy brand voice", "subheadline": "1–2 sentences specific and human", "ctaPrimary": "action label", "ctaSecondary"?: "secondary label" }

feature-grid — no imageQuery:
{ "eyebrow"?: string, "headline": string, "subheadline"?: string, "items": [{ "icon": string, "title": string, "description": string }] × 3–6 }
icon values: check | star | shield | briefcase | heart | leaf | clock | plus | home | dumbbell | scissors | chef | tooth

pricing-tiers — no imageQuery:
{ "eyebrow"?: string, "headline": string, "subheadline"?: string, "tiers": [{ "name": string, "price": string, "period": "month"|"year"|"session"|"visit", "features": string[] × 4–6, "ctaText": string, "highlighted": boolean }] × 2–4 }
Only ONE tier should have "highlighted": true.

service-list — no imageQuery:
{ "eyebrow"?: string, "headline": string, "subheadline"?: string, "items": [{ "title": string, "description"?: string, "price"?: string }] × 4–10 }
Omit price if the owner hasn't provided pricing.

gallery-grid — imageQueries REQUIRED (6 strings at section level):
{ "eyebrow"?: string, "headline": string }

listings-grid — imageQueries REQUIRED (3–6 strings at section level):
{ "eyebrow"?: string, "headline": string, "items": [{ "title": string, "subtitle"?: string, "description"?: string, "price"?: string }] × same count as imageQueries }
Omit price if not provided by owner.

about-story — imageQuery REQUIRED:
{ "eyebrow"?: string, "headline": string (editorial title), "body": string (2 sentences, brand voice, specific), "bullets"?: [{ "title": string, "text": string }] × 2–4, "ctaText"?: string }

team-grid — no imageQuery:
{ "eyebrow"?: string, "headline": string, "members": [{ "name": string, "role": string, "bio"?: string }] × 3–4 }
Only include real team members mentioned by the owner. Never invent names.

stats-band — no imageQuery:
{ "items": [{ "value": string, "label": string }] × 3–5 }
ONLY include if owner has provided REAL statistics. Never invent numbers.

process-steps — no imageQuery:
{ "eyebrow"?: string, "headline": string, "steps": [{ "title": string, "description": string }] × 3–5 }

faq-accordion — no imageQuery:
{ "eyebrow"?: string, "headline": string, "items": [{ "q": string, "a": string }] × 5–8 }

cta-band — no imageQuery:
{ "headline": string (punchy 6–10 words), "sub"?: string, "ctaText": string }

contact-block — no imageQuery:
{
  "eyebrow"?: string,
  "headline": string,
  "subheadline"?: string,
  "phone": string (ONLY from REAL CONTACT INFO — else omit entirely),
  "email": string (ONLY from REAL CONTACT INFO — else omit entirely),
  "address": string (ONLY from REAL CONTACT INFO — else omit entirely),
  "hours": string (ONLY from REAL CONTACT INFO — else omit entirely),
  "ctaText": string,
  "services"?: string[] × 3–6
}

footer — no imageQuery:
{
  "tagline": string (one-line brand summary),
  "links": string[] × 4–5,
  "phone": string (ONLY from REAL CONTACT INFO — else omit),
  "email": string (ONLY from REAL CONTACT INFO — else omit),
  "address": string (ONLY from REAL CONTACT INFO — else omit),
  "copyright": string
}

${contactBlock
  ? `═══════════════════════════════════════════════════════
REAL CONTACT INFO — copy these values EXACTLY into contact-block + footer:
${contactBlock}
═══════════════════════════════════════════════════════`
  : `CONTACT INFO: None provided. DO NOT include phone, email, address, or hours anywhere in the spec.`
}

═══════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════
1. NEVER invent phone numbers, email addresses, physical addresses, or hours. Use only "REAL CONTACT INFO". Never write "555-0100", "info@business.com", "123 Main St", or any placeholder.
2. NEVER include testimonials or star ratings. If you must mention social proof, do so abstractly in copy — never fabricate quotes or names.
3. NEVER include stats-band with invented numbers. Real statistics only, or omit the section entirely.
4. NEVER invent team member names. Only include team-grid if the owner named real staff.
5. NEVER paraphrase the owner's input as copy. Extract intent and write fresh brand copy.
6. NEVER use generic section headings: "Our Services", "About Us", "Why Choose Us", "Contact Us", "Get in Touch".
7. imageQuery / imageQueries MUST be siblings of content{}, never nested inside it.
8. NEVER invent commercial promises: no "free trial", "money-back guarantee", "risk-free", "no commitment", "cancel anytime", "discount", "% off", "limited time offer", or delivery/shipping promises unless the owner explicitly stated them.
9. Footer tagline MUST be specific to this business and its actual offerings. NEVER write generic phrases like "professional services in your city", "[category name] services", "serving [city]", or any placeholder. Write a real one-line brand summary.`;
}

// ── Classify message: revision command vs. conversational question ─────────────
// Returns a conversational reply string if the message is a question/chat,
// or null if it should be treated as a revision request.
async function classifyAndChat(
  openai: OpenAI,
  spec: WebsiteSpec,
  msgText: string,
): Promise<string | null> {
  const system = `You are an assistant in a website builder chat. The user has an existing website and sends a message.

Decide:
- If the user wants to CHANGE something on the site (redesign, update copy, change colors/fonts, add/remove sections, make it darker/lighter/more modern, etc.) → respond: { "action": "revise" }
- If the user is asking a QUESTION or having a CONVERSATION (why a color was chosen, what font was used, design suggestions, how the builder works, small talk, etc.) → respond: { "action": "chat", "reply": "YOUR REPLY" }

For "chat" replies: be warm and helpful. Reference specific aspects of the site from the spec. Keep it concise (2–4 sentences). If relevant, suggest a specific edit they could try.

Respond ONLY with valid JSON.`;

  const specSummary = {
    stylePreset: spec.stylePreset,
    accentColor: spec.accentColor,
    businessName: spec.businessName,
    sections: spec.sections.map((s) => ({ type: s.type })),
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Website spec summary: ${JSON.stringify(specSummary)}\n\nUser message: ${msgText}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.4,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as any;
  if (parsed.action === "chat" && typeof parsed.reply === "string" && parsed.reply.trim()) {
    return parsed.reply.trim();
  }
  return null;
}

function buildReviseSystem(hasOwnerPhoto: boolean): string {
  const noPhotoNote = hasOwnerPhoto ? "" :
    "\nNO OWNER PHOTOS: When regenerating imageQuery values, use atmospheric/abstract queries — never identifiable business-specific shots (no specific interiors, storefronts, or team-at-location). Use the same atmospheric-query rule as original generation.";
  return `You are editing a website JSON spec. Apply ONLY the requested change. Return the complete updated JSON.
STRICT: Output ONLY valid JSON — no markdown, no explanation, no code fences.
ABSOLUTE: Never invent contact information. Never add testimonials. Preserve all real contact info from the existing spec.
CONTENT RULES: Never invent commercial terms the owner did not state — no discount percentages, prices, "Start Free Trial", "Book Now", "24/7", "best in [city]", limited-time offers, or similar promises. Only use terms the owner explicitly provided.
IMAGE QUERIES: When updating sections, regenerate imageQuery values to be specific to the revised content — same rules as original generation.${noPhotoNote}`;
}

// ── Conversational intake: DECISION only (ask vs generate) ───────────────────
const INTAKE_DECISION_SYSTEM = `You are deciding whether to ask ONE clarifying question before building a website, or whether you already have enough to proceed.

Respond ONLY with valid JSON — exactly one of:
  { "action": "ask", "question": "..." }   ← ask ONE question when a required field is missing
  { "action": "generate" }                 ← ONLY when ALL five fields are genuinely satisfied

REQUIRED FIELDS — collect in this exact order, one question per turn:

1. LANGUAGE — "Which language should your website be in? (English, Arabic, French, Spanish…)"
   Skip ONLY if: (a) context says "LANGUAGE ALREADY SELECTED via UI", OR
                 (b) the user's messages explicitly name a language (e.g. "in Arabic", "en français"), OR
                 (c) the user is writing in a non-English language (their message language IS the answer).

2. BUSINESS NAME — Ask always: "What's your business called?" Never insert a business type into this question.
   Skip ONLY if: a specific business name (proper noun) is already stated in the conversation.

3. WHAT THEY OFFER — their specific services, menu items, specialties, or products
   Skip ONLY if: the owner has explicitly described their offerings in the conversation (e.g. listed services, menu, products).
   Do NOT skip based on business category alone — even "coffee shop", "café", "hair salon", "gym", "restaurant", or "bakery" benefit from knowing specific offerings (specialty drinks, menu, class types, treatment menu, etc.). The category name is never enough.
   The ONLY exceptions where category alone is sufficient: "dentist / dental clinic" or "pharmacy" (services are identical everywhere).

4. LOCATION + CONTACT — city or neighbourhood AND a phone number or email address
   Ask in one natural question covering BOTH: e.g. "Where are you located, and how can customers reach you? (city + a phone number or email)"
   Skip ONLY if: BOTH a location (city or neighbourhood) AND at least one contact method (phone or email) are already stated in the conversation.
   City alone without contact does NOT satisfy this — still ask.
   Phone/email alone without city does NOT satisfy this — still ask.
   Exception: if user explicitly says "skip", "no", or "I'll add it later" for either part, that satisfies this field.

5. PHOTOS (optional — ask only ONCE, after fields 1–4 are satisfied):
   Ask exactly: "Do you have any photos you'd like to use — a logo, team photo, or storefront? Or I can use professional stock photography."
   Skip if: context says "IMAGE ALREADY ATTACHED", OR photos were already discussed or offered in the conversation.
   After this question is asked once (even if unanswered), OR if user says "no" / "skip" / "just build it" / "use stock" → respond { "action": "generate" }.

ABSOLUTE RULES:
- Ask ONE question per turn in the order above. Never combine two questions.
- A long first message does NOT automatically skip fields. Each field must be explicitly present.
- ONLY respond { "action": "generate" } when all 5 fields are genuinely satisfied.
- NEVER ask about style, colors, fonts, or layout.
- NEVER repeat a question already answered.
- Write questions naturally and conversationally, not like a form ("What should we call your place?" not "Please provide the business name.").
- Example: "coffee shop website" then "Lapiazza" → fields known: language (from context), name=Lapiazza. Still missing: offerings (menu/drinks), location+contact, photos. Ask about offerings next.`;

// ── Returns a clarifying question, or null (=enough info, proceed to generate) ─
async function checkNeedsMoreInfo(
  openai: OpenAI,
  chatHistory: Array<{ role: string; content: string; isError?: boolean }>,
  currentUserMessage: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  languageChosen: boolean,
  chosenLanguage: string,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [{ role: "system", content: INTAKE_DECISION_SYSTEM }];

  for (const m of chatHistory) {
    if (m.role === "ai" || m.role === "assistant") {
      messages.push({ role: "assistant", content: m.content });
    } else if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
    }
  }

  // Tell the intake the known context flags so GPT can skip appropriately.
  const contextLines = [
    languageChosen
      ? `LANGUAGE ALREADY SELECTED via UI: "${chosenLanguage}" — skip the language question.`
      : "",
    imageBase64
      ? "IMAGE ALREADY ATTACHED by user — skip the photos question (field 5)."
      : "",
    currentUserMessage ? `User's latest message: ${currentUserMessage}` : "",
  ].filter(Boolean).join("\n");

  if (imageBase64 && imageMimeType) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: contextLines },
        { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}`, detail: "low" } },
      ],
    });
  } else {
    messages.push({ role: "user", content: contextLines });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    max_tokens: 200,
    temperature: 0.2,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as any;
  if (parsed.action === "ask" && typeof parsed.question === "string") {
    return parsed.question;
  }
  return null;
}

// ── Concatenate ALL user answers from the full conversation ───────────────────
// When intake is collected across multiple turns, this ensures the final
// generation prompt receives the complete business context, not just last msg.
function buildAccumulatedDescription(
  chatHistory: Array<{ role: string; content: string; isError?: boolean }>,
  currentMessage: string,
): string {
  const userMsgs = chatHistory
    .filter((m) => m.role === "user" && !m.isError)
    .map((m) => m.content);
  return [...userMsgs, currentMessage].filter(Boolean).join("\n\n");
}

// ── Detect language stated verbally (bypassed UI picker) ──────────────────────
// When the intake asks "Which language?" and the user types "Arabic" instead of
// clicking the chip, siteLanguage stays "" on the client and body.language = "English"
// (default). This function finds the real language from the conversation text.
function extractLanguageFromConversation(
  chatHistory: Array<{ role: string; content: string }>,
  currentMessage: string,
): string | null {
  const userText = [
    ...chatHistory.filter((m) => m.role === "user").map((m) => m.content),
    currentMessage,
  ].join(" ").toLowerCase();

  const MATCHES: [string, string][] = [
    ["arabic",     "Arabic"],
    ["عربي",       "Arabic"],
    ["بالعربي",    "Arabic"],
    ["french",     "French"],
    ["français",   "French"],
    ["en français","French"],
    ["spanish",    "Spanish"],
    ["español",    "Spanish"],
    ["german",     "German"],
    ["deutsch",    "German"],
    ["italian",    "Italian"],
    ["italiano",   "Italian"],
    ["portuguese", "Portuguese"],
    ["português",  "Portuguese"],
    ["russian",    "Russian"],
    ["русский",    "Russian"],
  ];

  for (const [keyword, lang] of MATCHES) {
    if (userText.includes(keyword)) return lang;
  }
  return null;
}

// ── Detect explicit language override in a single revision message ────────────
// Looks ONLY at the current message (not history) to avoid stale matches from
// earlier in the conversation. Requires an action verb near the language name.
function detectRevisionLanguage(msgText: string): string | null {
  const text = msgText.toLowerCase();
  if (!/(switch|translat|chang|use|to\s+|in\s+|write|make it)/.test(text)) return null;
  const LANGS: [string, string][] = [
    ["english", "English"], ["arabic", "Arabic"], ["عربي", "Arabic"],
    ["french", "French"], ["français", "French"],
    ["spanish", "Spanish"], ["español", "Spanish"],
    ["german", "German"], ["deutsch", "German"],
    ["italian", "Italian"], ["italiano", "Italian"],
    ["portuguese", "Portuguese"], ["português", "Portuguese"],
    ["russian", "Russian"],
  ];
  for (const [kw, lang] of LANGS) {
    if (text.includes(kw)) return lang;
  }
  return null;
}

// ── Extract real contact details from free-text conversation ──────────────────
// Scans the full conversation for email/phone patterns the user typed.
function extractContactFromText(text: string): string {
  const lines: string[] = [];
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (emailMatch) lines.push(`Email: ${emailMatch[0]}`);
  // Phone: digit string with optional +/spaces/dashes, at least 7 digits total
  const phoneMatch = text.match(/(?:\+|00)?[\d][\d\s\-\(\)\.]{6,}\d/);
  if (phoneMatch) {
    const p = phoneMatch[0].trim();
    if (p.replace(/\D/g, "").length >= 7) lines.push(`Phone: ${p}`);
  }
  return lines.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── Plan-level website limits (matches plans.ts PLAN_CONFIG) ─────────────────
const PLAN_WEBSITE_LIMITS: Record<string, number> = { starter: 1, pro: 2, premium: 3 };

// ── Generate a URL-safe slug unique in the websites table ─────────────────────
async function generateUniqueSlug(baseName: string, admin: AdminClient): Promise<string> {
  const base = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "my-site";

  const { data: existing } = await admin.from("websites").select("id").eq("slug", base).maybeSingle();
  if (!existing) return base;

  for (let n = 1; n <= 9; n++) {
    const candidate = `${base}-${n}`;
    const { data: taken } = await admin.from("websites").select("id").eq("slug", candidate).maybeSingle();
    if (!taken) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
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
    message?: string;
    currentHtml?: string;
    websiteId?: string;
    language?: string;
    languageChosen?: boolean;
    history?: { role: string; content: string }[];
    images?: { data: string; mimeType: string }[];
    contactInfo?: { phone?: string; email?: string; address?: string; hours?: string };
    chat?: Array<{ role: string; content: string; isError?: boolean }>;
    intake?: { phone?: string; email?: string; address?: string; hours?: string; language?: string };
  };

  const { message, currentHtml, images = [], contactInfo } = body;
  const language = (typeof body.language === "string" ? body.language.trim() : "") || "English";
  const clientWebsiteId = typeof body.websiteId === "string" ? body.websiteId : null;
  const isGenerate = !currentHtml;

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
  const industry     = (tenant?.industry as string) || "";
  const city         = (tenant?.city as string) || "";
  const msgText      = message?.trim() ?? "";

  const contactBlock = [
    contactInfo?.phone   ? `Phone: ${contactInfo.phone}`     : "",
    contactInfo?.email   ? `Email: ${contactInfo.email}`     : "",
    contactInfo?.address ? `Address: ${contactInfo.address}` : "",
    contactInfo?.hours   ? `Hours: ${contactInfo.hours}`     : "",
  ].filter(Boolean).join("\n");

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let spec: WebsiteSpec;
    let effectiveLanguage = language;
    let extractedContact: { phone?: string; email?: string } = {};
    let fullContextText = msgText; // overwritten with accumulated history in initial-generate path
    let designStrategy: DesignStrategy | null = null;

    if (currentHtml) {
      // ── Edit mode: apply change to existing site ──────────────────────────
      // Detect explicit language switch in this revision message ("switch to Arabic", "use French", etc.)
      const revisionLang = detectRevisionLanguage(msgText);
      if (revisionLang) effectiveLanguage = revisionLang;

      const existing = extractSpec(currentHtml);

      // Classify: conversational question vs. revision command.
      // Only classify when there is a parsed spec and a non-empty text message.
      if (existing && msgText && !validImages.length) {
        const chatReply = await classifyAndChat(openai, existing, msgText);
        if (chatReply) {
          return NextResponse.json({ reply: chatReply });
        }
      }

      if (!existing) {
        const userContent = buildUserContent(businessName, industry, city, msgText, effectiveLanguage);
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: buildSystem(contactBlock, effectiveLanguage, !!heroUpload) }, { role: "user", content: userContent }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.5,
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec> & { designDNA?: unknown; category?: string };
        spec = {
          ...(parsed.designDNA ? { designDNA: coerceDesignDNA(parsed.designDNA) } : {}),
          ...(parsed.category  ? { category:  parsed.category  } : {}),
          stylePreset: coercePreset(parsed.stylePreset), accentColor: parsed.accentColor, businessName: parsed.businessName ?? businessName, sections: parsed.sections ?? [],
        };
      } else {
        const langLine = effectiveLanguage && effectiveLanguage.toLowerCase() !== "english"
          ? `LANGUAGE: ALL copy must be written in ${effectiveLanguage}. Translate every text field.\n\n`
          : "";
        const revisionPrompt = `${langLine}Current spec:\n${JSON.stringify(existing, null, 2)}\n\nChange requested: ${msgText || "incorporate uploaded image as hero"}`;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: buildReviseSystem(!!heroUpload) }, { role: "user", content: revisionPrompt }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.3,
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec> & { designDNA?: unknown; category?: string };
        const incomingDNA = parsed.designDNA ? coerceDesignDNA(parsed.designDNA) : undefined;
        spec = {
          ...existing, ...parsed,
          ...(incomingDNA ? { designDNA: incomingDNA } : existing.designDNA ? { designDNA: existing.designDNA } : {}),
          ...(parsed.category ?? (existing as { category?: string }).category ? { category: parsed.category ?? (existing as { category?: string }).category } : {}),
          stylePreset: coercePreset(parsed.stylePreset ?? existing.stylePreset),
          sections: parsed.sections ?? existing.sections,
        };
      }
    } else {
      // ── Initial build: ask ONE question OR generate with full context ──────
      // Filter: remove error messages AND empty-content messages (e.g. isSeparator
      // markers that slip through client-side filtering as { role:"ai", content:"" }).
      // OpenAI rejects assistant messages with empty string content with a 400 error.
      const priorChat = (body.chat ?? []).filter((m) => !m.isError && Boolean(m.content?.trim()));

      const question = await checkNeedsMoreInfo(
        openai,
        priorChat,
        msgText,
        validImages[0]?.data,
        validImages[0]?.mimeType,
        body.languageChosen === true,
        language,
      );

      if (question) {
        // Save chat history fire-and-forget, return question to client
        const chatToSave = [
          ...priorChat.filter((m) => !m.isBuilding).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: msgText || "(image uploaded)" },
        ];
        if (tenant?.id) {
          createSupabaseAdmin().from("tenant_config").upsert(
            { tenant_id: tenant.id, website_chat: chatToSave },
            { onConflict: "tenant_id" }
          ).then(() => {}).catch(() => {});
        }
        return NextResponse.json({ question });
      }

      // ── Ready to generate — concatenate ALL user answers from every turn ───
      const fullDescription = buildAccumulatedDescription(priorChat, msgText);
      fullContextText = fullDescription; // use for image query city extraction

      // If the user stated language verbally (e.g. replied "Arabic" to the intake
      // question) instead of clicking the UI chip, detect it from the conversation.
      // This overrides the client default of "English".
      const conversationLanguage = extractLanguageFromConversation(priorChat, msgText);
      effectiveLanguage = conversationLanguage || language;

      // Extract any contact details the user mentioned across the conversation
      const chatContactBlock = extractContactFromText(fullDescription);
      const effectiveContactBlock = chatContactBlock || contactBlock;
      // Parse into structured fields so we can save them to website_intake and return to client
      if (chatContactBlock) extractedContact = parseContactBlock(chatContactBlock);

      // Step 1: classify business → design intelligence + deterministic template selection
      const { templateCategory, strategy: _strategy } = await classifyWithDesignStrategy(openai, fullDescription);
      designStrategy = _strategy;
      console.log(`[website/generate] design_strategy=${JSON.stringify(designStrategy)}`);
      const { count: _siteCount } = await admin
        .from("websites")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant?.id ?? "");

      // Hero pool selection — pick the best variant for this business before GPT runs
      const heroAvailableData = extractHeroAvailableData(fullDescription);
      const selectedHeroVariant = selectHeroVariant(designStrategy, heroAvailableData);

      const baseTemplate = selectTemplate(templateCategory, _siteCount ?? 0);
      // Patch the hero variant in the template so enforceTemplate locks it in
      const selectedTemplate: SiteTemplate = selectedHeroVariant
        ? {
            ...baseTemplate,
            sections: baseTemplate.sections.map((s) =>
              s.type === "hero" ? { ...s, variant: selectedHeroVariant } : s
            ),
          }
        : baseTemplate;
      console.log(`[website/generate] classify=${templateCategory} template=${selectedTemplate.id} heroVariant=${selectedHeroVariant ?? "template-default"} sections=[${selectedTemplate.sections.map((s) => `${s.type}/${s.variant || "–"}${s.required ? "" : "?"}`).join(", ")}]`);

      // Step 2: fill content within fixed template structure
      const userContent = buildUserContent("", "", "", fullDescription, effectiveLanguage);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: buildFillSystem(selectedTemplate, effectiveContactBlock, effectiveLanguage, !!heroUpload, designStrategy, selectedHeroVariant) },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.5,
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec> & { designDNA?: unknown; category?: string };
      spec = {
        ...(parsed.designDNA ? { designDNA: coerceDesignDNA(parsed.designDNA) } : {}),
        category: templateCategory,
        stylePreset: coercePreset(parsed.stylePreset),
        accentColor: parsed.accentColor,
        businessName: parsed.businessName ?? businessName,
        sections: parsed.sections ?? [],
      };
      // Server-side enforcement: re-sort to template order, overwrite variants, skip optional sections
      enforceTemplate(spec, selectedTemplate);
      // Post-GPT data-availability check: fall back if required content missing
      if (designStrategy) verifyHeroVariant(spec, designStrategy);
      console.log(`[website/generate] enforced sections=[${spec.sections.map((s) => `${s.type}/${(s as { variant?: string }).variant || "–"}`).join(", ")}]`);
    }

    // Strip any testimonials or stats-band with fabricated data that slipped through
    spec.sections = spec.sections.filter((s) => s.type !== "testimonials");

    // Post-process: remove placeholder contact data GPT may have invented,
    // then inject real contact info from conversation or client-side intake.
    {
      const realPhone = extractedContact.phone || contactInfo?.phone;
      const realEmail = extractedContact.email || contactInfo?.email;
      if (realPhone || realEmail) {
        // Matches common AI-invented placeholder patterns
        const PLACEHOLDER = /(\+1\s?555|\b555[- ]?\d{4}\b|000[- ]?0000|example\.com|yourname@|info@business|contact@business|name@business)/i;
        const CONTACT_SECTIONS = new Set(["booking", "contact-block", "footer"]);
        for (const s of spec.sections) {
          if (CONTACT_SECTIONS.has(s.type)) {
            if (s.content.phone && PLACEHOLDER.test(String(s.content.phone))) delete s.content.phone;
            if (s.content.email && PLACEHOLDER.test(String(s.content.email))) delete s.content.email;
            if (realPhone && !s.content.phone) s.content.phone = realPhone;
            if (realEmail && !s.content.email) s.content.email = realEmail;
          }
        }
      }
    }

    const HERO_TYPES_ALL = ["hero", "hero-fullbleed", "hero-split", "hero-minimal"];
    const CONTACT_TYPES_ALL = ["booking", "contact-block"];

    // Guarantee hero — covers both v1 and v2 hero types
    if (!spec.sections.some((s) => HERO_TYPES_ALL.includes(s.type))) {
      // Omit subheadline when we have no real data — never render placeholder text
      const heroSub = (industry && city) ? `${industry} in ${city}.` : (industry || null);
      spec.sections.unshift({
        type: "hero-fullbleed",
        imageQuery: heroUpload
          ? [industry, "professional interior", city].filter(Boolean).join(" ")
          : [industry || spec.businessName, "atmospheric editorial"].filter(Boolean).join(" "),
        content: {
          headline:    spec.businessName || businessName,
          ...(heroSub ? { subheadline: heroSub } : {}),
          ctaPrimary:  "Book Now",
          ctaSecondary: "Learn More",
        },
      });
    }
    if (!spec.sections.some((s) => s.type === "footer")) {
      const effPhone   = extractedContact.phone   || contactInfo?.phone;
      const effEmail   = extractedContact.email   || contactInfo?.email;
      const effAddress = contactInfo?.address;
      // Build a specific tagline from real data only — never use placeholder phrases
      const taglineParts = [spec.businessName || businessName, industry].filter(Boolean);
      spec.sections.push({
        type: "footer",
        content: {
          tagline: taglineParts.join(" — "),
          ...(effPhone   ? { phone:   effPhone }   : {}),
          ...(effEmail   ? { email:   effEmail }   : {}),
          ...(effAddress ? { address: effAddress } : {}),
        },
      });
    }

    // Guarantee contact section exists — covers both v1 "booking" and v2 "contact-block"
    if (!spec.sections.some((s) => CONTACT_TYPES_ALL.includes(s.type))) {
      // Insert before footer
      const footerIdx = spec.sections.findIndex((s) => s.type === "footer");
      const insertAt = footerIdx >= 0 ? footerIdx : spec.sections.length;
      const effPhone2   = extractedContact.phone   || contactInfo?.phone;
      const effEmail2   = extractedContact.email   || contactInfo?.email;
      const effAddress2 = contactInfo?.address;
      const effHours2   = contactInfo?.hours;
      spec.sections.splice(insertAt, 0, {
        type: "contact-block",
        content: {
          eyebrow: "Get In Touch",
          headline: "Start Your Journey",
          subheadline: "Tell us about your vision and we'll be in touch within 24 hours.",
          ctaText: "Send Enquiry",
          services: [],
          ...(effPhone2   ? { phone:   effPhone2 }   : {}),
          ...(effEmail2   ? { email:   effEmail2 }   : {}),
          ...(effAddress2 ? { address: effAddress2 } : {}),
          ...(effHours2   ? { hours:   effHours2 }   : {}),
        },
      });
    }

    // Server-side fallback: inject imageQuery for any visual section GPT missed.
    // Pass fullContextText (all conversation turns for initial generate) so city
    // and business-type hints are available even when tenant profile fields are empty.
    ensureImageQueries(spec, industry, city, fullContextText, !!heroUpload);

    let uploadSlot: "hero" | "about" | "team" | "gallery" = "hero";
    if (heroUpload && validImages[0]) {
      uploadSlot = await classifyUploadedImage(openai, validImages[0].data, validImages[0].mimeType);
    }

    // FIX 3: seed usedUrls from tenant_config.website_used_images for cross-site dedup
    const usedUrls = new Set<string>();
    if (tenant?.id) {
      const { data: tcDedup } = await admin
        .from("tenant_config")
        .select("website_used_images")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      const existing = Array.isArray((tcDedup as Record<string, unknown> | null)?.website_used_images)
        ? ((tcDedup as Record<string, unknown>).website_used_images as string[])
        : [];
      existing.forEach((u) => usedUrls.add(u));
    }
    const imageMap = await fetchSpecImages(spec, heroUpload, uploadSlot, usedUrls);

    // ── Resolve / create the websites record ─────────────────────────────────
    let websiteId: string | null = null;
    let siteSlug = "";
    let siteName = spec.businessName || businessName;
    let siteIsPublished = false;

    if (tenant?.id) {
      // Find existing websites for this tenant
      const { data: existingSites } = await admin
        .from("websites")
        .select("id, slug, name, is_published")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true });

      const sites = (existingSites ?? []) as { id: string; slug: string; name: string; is_published: boolean }[];

      // FIX 2: UUID slug pattern — re-derive if slug is missing or UUID-shaped
      const slugIsUuid = (slug: string) =>
        !slug || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      // Validate client-supplied websiteId belongs to this tenant
      if (clientWebsiteId) {
        const found = sites.find((s) => s.id === clientWebsiteId);
        if (found) {
          websiteId       = found.id;
          siteSlug        = found.slug;
          siteName        = found.name;
          siteIsPublished = found.is_published;
        }
      }

      if (!websiteId) {
        // For revisions without a websiteId (edge case), fall back to the existing site.
        // For new generates (isGenerate=true), always create a fresh website — never reuse.
        if (!isGenerate) {
          const first = sites[0];
          if (first) {
            websiteId       = first.id;
            siteSlug        = first.slug;
            siteName        = first.name;
            siteIsPublished = first.is_published;
          }
        }
        if (!websiteId) {
          // Creating a brand-new website — check plan limit
          const planId = (tenant?.plan as string | undefined) ?? "starter";
          const limit  = PLAN_WEBSITE_LIMITS[planId] ?? 1;
          if (sites.length >= limit) {
            return NextResponse.json({
              error: `Your ${planId} plan allows ${limit} website${limit === 1 ? "" : "s"}. Upgrade your plan or delete an existing site to create a new one.`,
            }, { status: 403 });
          }
          // Generate slug from business name
          const slug = await generateUniqueSlug(spec.businessName || businessName, admin);
          const { data: newSite, error: createErr } = await admin
            .from("websites")
            .insert({ tenant_id: tenant.id, name: siteName, slug })
            .select("id, slug, name, is_published")
            .single();
          if (createErr) {
            console.error("[website/generate] website create error:", createErr.message);
          } else if (newSite) {
            websiteId  = (newSite as { id: string }).id;
            siteSlug   = (newSite as { slug: string }).slug;
          }
        }
      }
      // FIX 2: If existing site has a UUID-shaped or missing slug, re-derive from business name
      if (websiteId && slugIsUuid(siteSlug)) {
        const freshSlug = await generateUniqueSlug(spec.businessName || businessName, admin);
        const { error: slugErr } = await admin
          .from("websites")
          .update({ slug: freshSlug, updated_at: new Date().toISOString() })
          .eq("id", websiteId);
        if (!slugErr) siteSlug = freshSlug;
      }
    }

    // Render HTML with tenantId so the booking form knows where to POST
    const html = renderWebsite(spec, imageMap, tenant?.id as string | undefined, effectiveLanguage);

    if (tenant?.id && websiteId) {
      // Save draft (not published yet)
      const { error: draftErr } = await admin
        .from("websites")
        .update({
          name:       siteName,
          draft_html: html,
          draft_spec: spec as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
          ...(designStrategy ? { design_strategy: designStrategy as unknown as Record<string, unknown> } : {}),
        })
        .eq("id", websiteId);
      if (draftErr) console.error("[website/generate] draft save error:", draftErr.message);

      // Single upsert: html + slug + chat + intake (versions only on initial generate)
      const tcUpsert: Record<string, unknown> = {
        tenant_id:           tenant.id,
        website_html:        html,
        website_slug:        siteSlug || null,
        website_used_images: Array.from(usedUrls).slice(-200),
      };
      if (Array.isArray(body.chat))  tcUpsert.website_chat   = body.chat;
      // Always persist the effective language + any phone/email extracted from conversation
      tcUpsert.website_intake = { ...(body.intake ?? {}), ...extractedContact, language: effectiveLanguage };

      // Only record a version entry on initial generate, not on revisions
      if (isGenerate) {
        const versionLabel = (msgText.slice(0, 60) || "Initial version").trim();

        const { data: tcData } = await admin
          .from("tenant_config")
          .select("website_versions")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        const existingVersions: VersionEntry[] =
          Array.isArray((tcData as Record<string, unknown> | null)?.website_versions)
            ? ((tcData as Record<string, unknown>).website_versions as VersionEntry[])
            : [];

        // Deduplication: skip if the last entry already has this label
        const lastLabel = existingVersions[existingVersions.length - 1]?.label;
        if (lastLabel !== versionLabel) {
          const newVersion: VersionEntry = {
            id:         crypto.randomUUID(),
            created_at: new Date().toISOString(),
            label:      versionLabel,
            type:       "generate",
            html,
            structure:  spec as unknown as Record<string, unknown>,
          };

          tcUpsert.website_versions = [...existingVersions, newVersion].slice(-20);

          // Also keep website_versions table for backward compat
          const { error: versionErr } = await admin
            .from("website_versions")
            .insert({
              website_id: websiteId,
              spec:       spec as unknown as Record<string, unknown>,
              html,
              label:      versionLabel,
            });
          if (versionErr) console.error("[website/generate] version save error:", versionErr.message);
        }
      }

      const { error: configErr } = await admin
        .from("tenant_config")
        .upsert(tcUpsert, { onConflict: "tenant_id" });
      if (configErr) console.error("[website/generate] tenant_config upsert error:", configErr.message);
    }

    return NextResponse.json({
      html, websiteId, slug: siteSlug, name: siteName, isPublished: siteIsPublished,
      ...(Object.keys(extractedContact).length > 0 ? { intake: extractedContact } : {}),
    });
  } catch (err) {
    // Log the full error so Vercel function logs show the real cause, not just the message
    const apiErr = err as { status?: number; error?: { type?: string; message?: string }; message?: string };
    console.error("[website/generate] FATAL ERROR", {
      message:  apiErr.message,
      status:   apiErr.status,
      errType:  apiErr.error?.type,
      errMsg:   apiErr.error?.message,
      stack:    err instanceof Error ? err.stack : undefined,
      raw:      String(err),
    });
    const errType = apiErr.error?.type ?? (
      apiErr.status === 401 ? "invalid_api_key" :
      apiErr.status === 429 ? "rate_limited" :
      apiErr.status === 402 ? "insufficient_quota" : "unknown"
    );
    const userMsg =
      errType === "invalid_api_key"    ? "AI configuration error — please contact support." :
      errType === "insufficient_quota" ? "AI quota exceeded — please top up OpenAI credits." :
      errType === "rate_limited"       ? "AI is temporarily busy — please try again in a moment." :
                                         "Website generation temporarily unavailable — please try again.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}

function buildUserContent(businessName: string, industry: string, city: string, msgText: string, language = "English"): string {
  // User's description is the authoritative source — profile fields are fallback hints only.
  // By putting the description first, GPT extracts brand/type/location from what the user
  // actually said rather than from stale account-profile metadata.
  return [
    language && language.toLowerCase() !== "english" ? `Site language: ${language}` : "",
    `Owner's description:\n${msgText}`,
    businessName ? `Business name (account profile — use only if not already clear from description): ${businessName}` : "",
    industry ? `Industry (account profile): ${industry}` : "",
    city ? `City (account profile): ${city}` : "",
  ].filter(Boolean).join("\n");
}
