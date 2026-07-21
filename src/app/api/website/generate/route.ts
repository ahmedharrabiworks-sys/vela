import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "@/lib/website-renderer";
import type { PresetName } from "@/lib/website-design-system";

export const dynamic = "force-dynamic";
// 300s: two sequential GPT-4o calls + Unsplash fetches can exceed 60s on cold starts
export const maxDuration = 300;

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 5000;

// ── Unsplash: single query attempt ───────────────────────────────────────────
async function tryUnsplash(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: { urls?: { regular?: string } }[] };
    const results = data.results ?? [];
    if (!results.length) return null;
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))];
    return pick?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

// ── Unsplash: try primary, then fallback, then broad fallback ────────────────
// If specific query yields nothing, broaden progressively rather than
// accepting a colour block. Three-tier: specific → simplified → category.
async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.warn("[website] UNSPLASH_ACCESS_KEY not set — skipping image fetch");
    return null;
  }

  // Tier 1: exact query GPT generated
  const result1 = await tryUnsplash(query);
  if (result1) return result1;

  // Tier 2: first 3 words of the original query (strip adjectives to core nouns)
  const words = query.trim().split(/\s+/);
  if (words.length > 3) {
    const simplified = words.slice(0, 3).join(" ");
    const result2 = await tryUnsplash(simplified);
    if (result2) {
      console.warn(`[website] primary query "${query}" failed — used simplified "${simplified}"`);
      return result2;
    }
  }

  // Tier 3: last single noun/keyword (most searchable term)
  const lastWord = words[words.length - 1] ?? words[0];
  if (lastWord && lastWord !== words[0]) {
    const result3 = await tryUnsplash(lastWord);
    if (result3) {
      console.warn(`[website] simplified query failed — used single-word fallback "${lastWord}"`);
      return result3;
    }
  }

  console.warn(`[website] all fallbacks exhausted for query: "${query}"`);
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
async function fetchSpecImages(
  spec: WebsiteSpec,
  heroOverride?: string,
  uploadSlot: "hero" | "about" | "team" | "gallery" = "hero",
): Promise<ImageMap> {
  type Task = { key: string; query: string };
  const tasks: Task[] = [];

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const q = getImageQuery(s as { imageQuery?: string; content?: Record<string, unknown> });
    if (q) tasks.push({ key: String(i), query: q });

    const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
    qs.forEach((query, j) => tasks.push({ key: `${i}_${j}`, query }));
  }

  console.log(`[website] fetching ${tasks.length} images:`, tasks.map((t) => `${t.key}="${t.query}"`).join(", "));

  const settled = await Promise.all(
    tasks.map(async ({ key, query }) => ({ key, url: await fetchUnsplashPhoto(query) }))
  );

  const map: ImageMap = {};
  for (const { key, url } of settled) {
    if (url) map[key] = url;
  }

  if (heroOverride) {
    // Place in the classified slot; fall back to hero if that section type isn't in the spec
    const slotIdx = uploadSlot !== "hero"
      ? spec.sections.findIndex((s) => s.type === uploadSlot)
      : -1;
    if (slotIdx >= 0) {
      map[String(slotIdx)] = heroOverride;
      if (uploadSlot === "gallery") map[`${slotIdx}_0`] = heroOverride;
    } else {
      const heroIdx = spec.sections.findIndex((s) => s.type === "hero");
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

// ── Server-side safety net: inject imageQuery for visual sections that GPT missed
function ensureImageQueries(spec: WebsiteSpec, industry: string, city: string, msgText: string, hasOwnerPhoto: boolean): void {
  // Extract 2-3 visual keywords from the owner's message for fallback queries
  const visualHints = msgText
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !["build", "create", "make", "website", "clinic", "please", "would", "should", "their", "with"].includes(w))
    .slice(0, 3)
    .join(" ");

  const base = (visualHints || industry || "professional").trim();

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const hasQ = getImageQuery(s as { imageQuery?: string; content?: Record<string, unknown> });

    if (!hasQ) {
      if (s.type === "hero") {
        // When owner has no photos, use atmospheric/abstract queries that read as editorial
        // design choices — not photos that could be mistaken for THIS specific business.
        (s as { imageQuery?: string }).imageQuery = hasOwnerPhoto
          ? `${base} bright interior ${city}`.replace(/\s+/g, " ").trim()
          : `${base} atmospheric bokeh warm light texture abstract`.replace(/\s+/g, " ").trim();
      } else if (s.type === "about") {
        (s as { imageQuery?: string }).imageQuery = hasOwnerPhoto
          ? `${base} professional team workspace modern`.replace(/\s+/g, " ").trim()
          : `${base} lifestyle editorial warm light natural`.replace(/\s+/g, " ").trim();
      }
    }

    // Gallery sections: ensure 6 imageQueries
    if (s.type === "gallery") {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      if (!qs.length) {
        const fallbackGallery = hasOwnerPhoto
          ? [
              `${base} interior design`,
              `${base} team professional`,
              `${base} detail close up`,
              `${base} modern equipment`,
              `${base} client experience`,
              `${base} results before after`,
            ]
          : [
              // No owner photos → use texture/detail/editorial that won't be mistaken for their business
              `${base} close-up texture detail editorial`,
              `${base} product detail minimal clean`,
              `${base} material texture abstract light`,
              `${base} bokeh warm light lifestyle`,
              `${base} flat lay arrangement elegant`,
              `${base} abstract mood atmosphere`,
            ];
        (s as { imageQueries?: string[] }).imageQueries = fallbackGallery.map((q) => q.replace(/\s+/g, " ").trim());
      }
    }
  }
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
const VALID_PRESETS: PresetName[] = [
  "editorial-luxury", "minimal-warm", "saas-sharp", "estate-elegant", "clinical-bright",
  // legacy names — resolveTokens maps them to new names
  "editorial", "bold", "clean", "clinical",
];
const LEGACY_PRESET: Record<string, PresetName> = {
  editorial: "editorial-luxury",
  bold:      "saas-sharp",
  clean:     "estate-elegant",
  clinical:  "clinical-bright",
};
function coercePreset(v: unknown): PresetName {
  const s = String(v ?? "");
  if (VALID_PRESETS.includes(s as PresetName)) return (LEGACY_PRESET[s] ?? s) as PresetName;
  return "estate-elegant";
}

// ── System prompt ─────────────────────────────────────────────────────────────
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
BAD subheadline: "Netflix entertainment during dental procedures for your comfort"
REASON: this is a verbatim reword of the owner's sentence. It doesn't position the business — it transcribes it.

AFTER (good — brand copywriting):
GOOD headline: "Dentistry That Actually Doesn't Feel Like Dentistry"
GOOD subheadline: "We've redesigned every detail of the patient experience, from same-day digital scans to ceiling screens in every chair."
REASON: This speaks to the customer's emotion first (dread of dental visits), then anchors it in the specific details. Sounds like a real brand.

MORE BAD COPY PATTERNS — never write these:
✗ "Quality service you can trust" — generic cliché, means nothing
✗ "We are committed to excellence" — corporate filler
✗ "Your [service] journey starts here" — tired template phrase
✗ "Professional team with years of experience" — says nothing specific
✗ "We offer a wide range of services" — describes every business ever
✗ "Welcome to [business name]" as a headline — wasted opportunity
✗ Directly restating what the owner typed, even in different words

GOOD COPY PATTERNS — do these:
✓ Lead with the customer's problem or desire, then your solution
✓ Use specific numbers, materials, techniques — real details make copy credible
✓ Active voice. Present tense. Short sentences for headlines.
✓ Subheadlines that add information, not just repeat the headline louder
✓ Section headlines that read like editorial titles, not navigation labels
  BAD: "Our Services" / GOOD: "Precision, Start to Finish"
  BAD: "About Us" / GOOD: "Built Different From Day One"
  BAD: "Gallery" / GOOD: "The Work Speaks"

═══════════════════════════════════════════════════════
PART 2 — STYLE PRESET + ACCENT COLOR (BOTH required)
═══════════════════════════════════════════════════════

JSON ROOT:
{ "stylePreset": "editorial-luxury"|"minimal-warm"|"saas-sharp"|"estate-elegant"|"clinical-bright", "accentColor": "#HEXCODE", "businessName": string, "sections": SectionSpec[] }

You MUST set both "stylePreset" AND "accentColor". Never omit either.

FIVE DESIGN PRESETS — each produces a structurally different site:

• "editorial-luxury"
  LOOK: Dark near-black bg, oversized Cormorant Garamond (light weight), full-bleed photography with text at bottom-left, champagne-gold accent, zero chrome. Modelled on Kelly Wearstler.
  USE FOR: Luxury salons, interior design studios, boutique hotels, fine dining, jewellery, high-end photography, luxury fashion boutiques.

• "minimal-warm"
  LOOK: Warm parchment/cream bg (#F5F0E8), DM Serif Display at restrained scale, split-layout hero (text left + photo right), very generous whitespace. Modelled on Aesop.
  USE FOR: Spas, yoga studios, organic cafés, bakeries, artisan food & drink, holistic wellness, home décor, florists.

• "saas-sharp"
  LOOK: Cool near-black bg, tight Inter, centered hero with radial violet/accent glow (no full-bleed photo), feature grid cards with gradient borders. Modelled on Linear.
  USE FOR: Tech startups, SaaS products, digital agencies, co-working spaces, gyms (modern), fitness studios, sports brands, automotive.

• "estate-elegant"
  LOOK: Warm near-white bg, Cormorant Garamond at medium weight, full-bleed landscape hero with centered text overlay, gold/navy restraint. Modelled on Sotheby's Realty.
  USE FOR: Real estate agencies, law firms, financial advisors, architects, wealth management, corporate consulting, luxury property developers.

• "clinical-bright"
  LOOK: Pure white bg, bright sky-blue accent, rounded friendly cards with icon circles, split hero with photo, clear CTA hierarchy. Modelled on SmileSet dental.
  USE FOR: Dental clinics, medical practices, dermatology, physiotherapy, cosmetic clinics, opticians, veterinary clinics, health & wellness centres.

CATEGORY → PRESET MAPPING (pick from candidates; style words from the owner break ties):
  Real estate agency, property developer → "estate-elegant" (default) or "editorial-luxury" (luxury/boutique angle)
  Law firm, financial advisor, architect, consultant → "estate-elegant"
  Dental, medical, physio, dermatology, cosmetic clinic → "clinical-bright"
  Gym, CrossFit, martial arts, sports brand, fitness studio → "saas-sharp"
  Tech startup, SaaS, digital agency, co-working → "saas-sharp"
  Luxury salon, interior design, boutique hotel, fine dining, jewellery → "editorial-luxury"
  Spa, yoga, organic café, bakery, holistic wellness, florist → "minimal-warm"
  Restaurant (casual/modern) → "minimal-warm" (warm/artisanal) or "editorial-luxury" (luxury)
  Hair salon / barbershop → "editorial-luxury" (premium) or "minimal-warm" (soft/organic)

ACCENT COLOR — pick from this curated palette ONLY. Never invent a hex code outside this table.
Two different businesses must not get the same accent unless it genuinely matches both.
Match on industry specifics (e.g. a rustic restaurant ≠ same accent as a modern one):

EARTHY / WARM (spas, bakeries, warm restaurants, interior design, organic cafés, florists):
  #8B6347 terracotta  |  #A0522D sienna  |  #C4793D amber clay  |  #9C6E3F antique gold

LUXURY (high-end hotels, fine dining, premium fashion, wealth management, jewellery):
  #C4A882 champagne  |  #B8860B dark gold  |  #8D7047 champagne bronze  |  #7C5C3D warm walnut

VIVID / BOLD (gyms, martial arts, sports, automotive, nightlife, street food):
  #E8390E fire red  |  #C41E3A crimson  |  #FF4F1F coral  |  #D4380D burnt orange

SAAS / TECH / FITNESS (tech startups, SaaS, digital agencies, modern gyms, co-working):
  #7C3AED violet  |  #9333EA purple  |  #6366F1 indigo  |  #4F46E5 deep indigo

PROFESSIONAL / COOL (real estate, law, finance, consulting, architecture):
  #8D6E3F aged gold  |  #1A56DB cobalt  |  #1E3A8A deep navy  |  #2563EB primary blue

CLINICAL / HEALTH (dental, medical, dermatology, physiotherapy, health clinics):
  #0070C9 sky blue  |  #0EA5E9 bright azure  |  #0891B2 teal blue  |  #0284C7 ocean

WELLNESS / NATURE (yoga studios, holistic health, organic cafés, wellness retreats):
  #16A34A sage  |  #059669 emerald  |  #0D9488 teal  |  #15803D forest

If the owner mentions a brand color (e.g. "our logo is green"), pick the closest hex from this table.
Do NOT use any hex code not in this list.

═══════════════════════════════════════════════════════
PART 3 — SECTION STRUCTURE
═══════════════════════════════════════════════════════

REQUIRED: hero (first) + booking (contact form — always include) + footer (last)
RECOMMENDED: services, about
OPTIONAL: gallery (visual businesses), team (if staff relevant), faq (medical/legal/service), cta_banner (before footer)
NEVER: testimonials

The booking section is MANDATORY on every site — it is the contact and enquiry form.
Every visitor needs a way to reach the business. Include it even if no contact info was provided.

SectionSpec structure:
{ "type": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }

CRITICAL — imageQuery / imageQueries MUST be siblings of "content", NOT nested inside it:
✓ CORRECT:   { "type": "hero", "imageQuery": "...", "content": { "headline": "..." } }
✗ INCORRECT: { "type": "hero", "content": { "imageQuery": "...", "headline": "..." } }

═══════════════════════════════════════════════════════
PART 4 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════

ImageQuery is an Unsplash search string.

${!hasOwnerPhoto ? `⚠ NO OWNER PHOTOS UPLOADED — MANDATORY RULE FOR ALL IMAGE QUERIES:
The owner has NOT provided any business photos. Generated sites MUST NOT use photos that could be mistaken for THIS specific business — no fake "this is our café" storefront shots, no identifiable waiting rooms, no team-at-our-location photos.

FORBIDDEN (looks like a photo of their actual business):
✗ "[business type] interior with tables/chairs/equipment"
✗ "café interior" / "dental clinic room" / "gym workout floor" / "restaurant dining room"
✗ "[business type] staff smiling" / "[business type] professional team at location"
✗ Any specific storefront, reception, entrance, or branded environment

REQUIRED — atmospheric, editorial, or abstract (reads as intentional design imagery):
✓ hero: texture, ambient light, material close-up, abstract mood — the emotional world of this industry
✓ about: lifestyle editorial, conceptual — NOT "our team at our location"
✓ gallery: product/detail close-ups, textures, abstract compositions

ATMOSPHERIC QUERY EXAMPLES — use this pattern:
• café / bakery hero    → "warm coffee steam bokeh morning light close-up"
• dental hero           → "clean white minimal geometric abstract light"
• gym / fitness hero    → "motion blur dynamic light dramatic fitness abstract"
• restaurant hero       → "candlelight warm bokeh dining atmosphere evening abstract"
• hair salon / luxury   → "mirror reflection bokeh champagne abstract light"
• spa / wellness hero   → "smooth stone water ripple natural light zen texture"
• real estate / law     → "architectural window light geometric shadow abstract"
• bakery gallery        → "croissant flaky layers close-up editorial light"

SELF-TEST: Ask "Could this photo appear in a design mood-board for ANY business in this category?"
If yes → SAFE to use. If it would look like a photo of a SPECIFIC establishment → FORBIDDEN.

` : `PROCESS:
1. Extract concrete visual details from the owner's description: specific equipment, materials, ambience, unique features, activity type
2. Build a 4–6 word query from those specifics
3. Ask: "Could this photo belong to any business in this category?" If yes, make it more specific.

DENTAL CLINIC EXAMPLES:
Owner mentioned: digital scanners, ceiling screens, minimal white interiors
→ hero imageQuery: "bright minimal dental clinic digital technology white interior"  (NOT: "dentist office")
→ about imageQuery: "modern dental examination room ceiling screen patient comfort"  (NOT: "dental team smiling")

GYM EXAMPLES:
Owner mentioned: HIIT classes, warehouse space, orange lighting
→ hero imageQuery: "hiit group fitness class warehouse orange lighting dynamic"  (NOT: "gym interior")
→ about imageQuery: "group training class energetic coach industrial gym high intensity"  (NOT: "personal trainer")

RESTAURANT EXAMPLES:
Owner mentioned: open fire grill, exposed brick, intimate 40-seat dining
→ hero imageQuery: "intimate restaurant open fire grill exposed brick warm candlelight"  (NOT: "restaurant interior")
→ about imageQuery: "chef cooking open fire wood grill restaurant kitchen"  (NOT: "restaurant chef")

Rule: if the query could apply to any business in the same category, it is not specific enough. Rewrite it.
`}
GALLERY: All 6 imageQueries MUST be distinct — vary subject, angle, detail level, and moment. Never repeat the same scene or composition.

QUALITY: append one of these to every imageQuery to sharpen Unsplash results:
  hero/about  → "bright natural light" or "professional photography" or "modern interior"
  gallery     → "editorial" or "close-up detail" or "product shot clean background"
  team/about  → "professional headshot studio light" or "team natural light workspace"

═══════════════════════════════════════════════════════
PART 5 — SECTION CONTENT SCHEMAS
═══════════════════════════════════════════════════════

hero — imageQuery REQUIRED:
{
  "eyebrow": string (3–5 words, e.g. "Dubai Marina · Est. 2019"),
  "headline": string (5–8 words, punchy, brand voice — NOT "Welcome to [name]"),
  "subheadline": string (1–2 sentences, specific, human — NOT a category description),
  "ctaPrimary": string (e.g. "Book a Consultation"),
  "ctaSecondary": string (e.g. "See Our Work")
}

about — imageQuery REQUIRED:
{
  "eyebrow": string,
  "headline": string (editorial title, NOT "About Us"),
  "body": string (2 sentences, brand voice, specific details from owner's description),
  "bullets": [{ "title": string, "text": string }] × 3–4 (concrete differentiators, not generic claims),
  "ctaText": string
}

services — no imageQuery:
{
  "eyebrow": string,
  "headline": string (editorial — NOT "Our Services"),
  "subheadline": string,
  "items": [{ "icon": string, "title": string, "description": string, "price"?: string }] × 3–6
}
icon values: tooth | dumbbell | scissors | leaf | heart | star | briefcase | home | chef | shield | clock | plus

gallery — imageQueries REQUIRED (6 strings, at section level):
{
  "eyebrow": string,
  "headline": string
}
imageQueries: 6 distinct Unsplash queries, each specific to a visual aspect of this business

team — no imageQuery:
{
  "eyebrow": string,
  "headline": string,
  "members": [{ "name": string, "role": string, "bio": string }] × 3–4
}

booking — no imageQuery:
{
  "eyebrow": string,
  "headline": string,
  "subheadline": string,
  "phone": string (ONLY from REAL CONTACT INFO — else omit),
  "email": string (ONLY from REAL CONTACT INFO — else omit),
  "address": string (ONLY from REAL CONTACT INFO — else omit),
  "hours": string (ONLY from REAL CONTACT INFO — else omit),
  "ctaText": string,
  "services": string[] × 3–6
}

faq — no imageQuery:
{ "eyebrow": string, "headline": string, "items": [{ "q": string, "a": string }] × 5–6 }

cta_banner — no imageQuery:
{ "headline": string (punchy, 6–10 words), "sub": string, "ctaText": string }

footer — no imageQuery:
{
  "tagline": string (one line brand summary),
  "links": string[] × 4–5,
  "phone": string (ONLY from REAL CONTACT INFO — else omit),
  "email": string (ONLY from REAL CONTACT INFO — else omit),
  "address": string (ONLY from REAL CONTACT INFO — else omit),
  "copyright": string
}

${contactBlock
  ? `═══════════════════════════════════════════════════════
REAL CONTACT INFO — copy these values EXACTLY into booking + footer:
${contactBlock}
═══════════════════════════════════════════════════════`
  : `CONTACT INFO: None provided. DO NOT include phone, email, or address anywhere in the spec.`
}

═══════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════
1. NEVER invent phone numbers, email addresses, physical addresses, or hours.
   Use only values in "REAL CONTACT INFO". If absent, omit the field entirely.
   Never write "555-0100", "info@business.com", "123 Main St", or any placeholder.
2. NEVER include a testimonials section. No invented names, reviews, or star ratings.
3. NEVER paraphrase the owner's input as copy. Extract intent and write fresh brand copy.
4. NEVER use generic headlines: "Our Services", "About Us", "Why Choose Us", "Contact Us".
5. imageQuery MUST be a sibling of content{}, never nested inside it.

═══════════════════════════════════════════════════════
PART 6 — REQUIRED SECTION ORDER PER PRESET
═══════════════════════════════════════════════════════

The section sequence is part of the design. Follow the required order for the chosen preset.
Deviate ONLY if the business genuinely has no content for an optional section — mark it omitted, don't pad with invented content.

"clinical-bright" (dental, medical, dermatology, physio, opticians, vet clinics, health centres):
  REQUIRED:    hero → services → faq → team → booking → footer
  REASONING:   Patients need to know what's offered and have questions answered before they trust a practice.
  OPTIONAL:    about (after services), gallery (after team — before/after treatment photos)
  NEVER:       cta_banner, gallery before trust sections

"saas-sharp" (gyms, CrossFit, fitness studios, tech startups, SaaS, digital agencies, sports brands, co-working):
  REQUIRED:    hero → services → cta_banner → about → booking → footer
  REASONING:   Hook with the hero glow, show features, create urgency, give brief context, then convert.
  OPTIONAL:    team (after about), gallery (after team — action/lifestyle photos for gyms)
  NEVER:       faq (kills momentum for energy brands)

"editorial-luxury" (luxury salons, fine dining, boutique hotels, interior design, jewellery, high-end photography):
  REQUIRED:    hero → gallery → services → about → booking → footer
  REASONING:   Aesthetics sell first. Show the work before explaining it. Story comes after.
  OPTIONAL:    team (after about — stylist/chef intros), cta_banner (before booking only)
  NEVER:       faq, cta_banner at the top

"minimal-warm" (spas, yoga studios, organic cafés, bakeries, florists, holistic wellness, artisan food & drink):
  REQUIRED:    hero → services → about → gallery → booking → footer
  REASONING:   Gentle entry, calm rhythm. Let the products/offerings land, then the brand story, then visuals, then CTA.
  OPTIONAL:    team (after gallery), cta_banner (before booking only)
  NEVER:       faq, cta_banner at the top

"estate-elegant" (real estate agencies, law firms, financial advisors, architects, corporate consultants):
  REQUIRED:    hero → services → about → faq → booking → footer
  REASONING:   Credibility-first. Lead with the offer, build context, answer objections, then convert.
  OPTIONAL:    team (after about), cta_banner (before booking only), gallery (for real estate/architecture only)
  NEVER:       gallery for non-visual businesses (no gallery for law firms, finance, etc.)`;
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

2. BUSINESS NAME — "What's your [business type] called?"
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
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
        spec = { stylePreset: coercePreset(parsed.stylePreset), accentColor: parsed.accentColor, businessName: parsed.businessName ?? businessName, sections: parsed.sections ?? [] };
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
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
        spec = { ...existing, ...parsed, stylePreset: coercePreset(parsed.stylePreset ?? existing.stylePreset), sections: parsed.sections ?? existing.sections };
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

      // If the user stated language verbally (e.g. replied "Arabic" to the intake
      // question) instead of clicking the UI chip, detect it from the conversation.
      // This overrides the client default of "English".
      const conversationLanguage = extractLanguageFromConversation(priorChat, msgText);
      effectiveLanguage = conversationLanguage || language;

      // Extract any contact details the user mentioned across the conversation
      const chatContactBlock = extractContactFromText(fullDescription);
      const effectiveContactBlock = chatContactBlock || contactBlock;

      // Don't inject tenant-profile fields — the accumulated description already contains
      // everything the user told us. Injecting a stale account businessName/industry would
      // override what the user is actually building right now.
      const userContent = buildUserContent("", "", "", fullDescription, effectiveLanguage);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: buildSystem(effectiveContactBlock, effectiveLanguage, !!heroUpload) },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.5,
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
      spec = {
        stylePreset: coercePreset(parsed.stylePreset),
        accentColor: parsed.accentColor,
        businessName: parsed.businessName ?? businessName,
        sections: parsed.sections ?? [],
      };
    }

    // Strip any testimonials that slipped through
    spec.sections = spec.sections.filter((s) => s.type !== "testimonials");

    // Guarantee hero and footer
    if (!spec.sections.some((s) => s.type === "hero")) {
      spec.sections.unshift({
        type: "hero",
        imageQuery: heroUpload
          ? `${industry} professional interior ${city}`.trim()
          : `${industry} atmospheric light texture abstract`.trim(),
        content: { headline: businessName, subheadline: `${industry || "Professional services"} in ${city || "your city"}.`, ctaPrimary: "Book Now", ctaSecondary: "Learn More" },
      });
    }
    if (!spec.sections.some((s) => s.type === "footer")) {
      spec.sections.push({
        type: "footer",
        content: {
          tagline: `${businessName} — ${industry || "professional services"} in ${city || "your city"}.`,
          ...(contactInfo?.phone   ? { phone: contactInfo.phone }     : {}),
          ...(contactInfo?.email   ? { email: contactInfo.email }     : {}),
          ...(contactInfo?.address ? { address: contactInfo.address } : {}),
        },
      });
    }

    // Guarantee booking section exists — every site must have a contact/enquiry form
    if (!spec.sections.some((s) => s.type === "booking")) {
      // Insert before footer
      const footerIdx = spec.sections.findIndex((s) => s.type === "footer");
      const insertAt = footerIdx >= 0 ? footerIdx : spec.sections.length;
      spec.sections.splice(insertAt, 0, {
        type: "booking",
        content: {
          eyebrow: "Get In Touch",
          headline: "Start Your Project",
          subheadline: "Tell us about your vision and we'll be in touch within 24 hours.",
          ctaText: "Send Enquiry",
          services: [],
          ...(contactInfo?.phone   ? { phone:   contactInfo.phone }   : {}),
          ...(contactInfo?.email   ? { email:   contactInfo.email }   : {}),
          ...(contactInfo?.address ? { address: contactInfo.address } : {}),
          ...(contactInfo?.hours   ? { hours:   contactInfo.hours }   : {}),
        },
      });
    }

    // Server-side fallback: inject imageQuery for any visual section GPT missed
    ensureImageQueries(spec, industry, city, msgText, !!heroUpload);

    let uploadSlot: "hero" | "about" | "team" | "gallery" = "hero";
    if (heroUpload && validImages[0]) {
      uploadSlot = await classifyUploadedImage(openai, validImages[0].data, validImages[0].mimeType);
    }
    const imageMap = await fetchSpecImages(spec, heroUpload, uploadSlot);

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
        })
        .eq("id", websiteId);
      if (draftErr) console.error("[website/generate] draft save error:", draftErr.message);

      // Single upsert: html + slug + chat + intake (versions only on initial generate)
      const tcUpsert: Record<string, unknown> = {
        tenant_id:    tenant.id,
        website_html: html,
        website_slug: siteSlug || null,
      };
      if (Array.isArray(body.chat))  tcUpsert.website_chat   = body.chat;
      // Always persist the effective language (may have been verbally stated instead of UI-picked)
      tcUpsert.website_intake = { ...(body.intake ?? {}), language: effectiveLanguage };

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

    return NextResponse.json({ html, websiteId, slug: siteSlug, name: siteName, isPublished: siteIsPublished });
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
