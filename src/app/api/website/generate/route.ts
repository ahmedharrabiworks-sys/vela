import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "@/lib/website-renderer";
import type { PresetName } from "@/lib/website-design-system";

export const dynamic = "force-dynamic";
// Extend serverless timeout: GPT-4o + Unsplash + DB writes can exceed 10s default
export const maxDuration = 60;

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 5000;

// ── Unsplash: single query attempt ───────────────────────────────────────────
async function tryUnsplash(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`;
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
async function fetchSpecImages(spec: WebsiteSpec, heroOverride?: string): Promise<ImageMap> {
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
    const heroIdx = spec.sections.findIndex((s) => s.type === "hero");
    if (heroIdx >= 0) map[String(heroIdx)] = heroOverride;
  }

  return map;
}

// ── Server-side safety net: inject imageQuery for visual sections that GPT missed
function ensureImageQueries(spec: WebsiteSpec, industry: string, city: string, msgText: string): void {
  // Extract 2-3 visual keywords from the owner's message for fallback queries
  const visualHints = msgText
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !["build", "create", "make", "website", "clinic", "please", "would", "should", "their", "with"].includes(w))
    .slice(0, 3)
    .join(" ");

  const base = (visualHints || industry || "professional interior").trim();

  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const hasQ = getImageQuery(s as { imageQuery?: string; content?: Record<string, unknown> });

    if (!hasQ) {
      if (s.type === "hero") {
        (s as { imageQuery?: string }).imageQuery = `${base} bright interior ${city}`.replace(/\s+/g, " ").trim();
      } else if (s.type === "about") {
        (s as { imageQuery?: string }).imageQuery = `${base} professional team workspace modern`.replace(/\s+/g, " ").trim();
      }
    }

    // Gallery sections: ensure 6 imageQueries
    if (s.type === "gallery") {
      const qs = getImageQueries(s as { imageQueries?: string[]; content?: Record<string, unknown> });
      if (!qs.length) {
        const fallbackGallery = [
          `${base} interior design`,
          `${base} team professional`,
          `${base} detail close up`,
          `${base} modern equipment`,
          `${base} client experience`,
          `${base} results before after`,
        ].map((q) => q.replace(/\s+/g, " ").trim());
        (s as { imageQueries?: string[] }).imageQueries = fallbackGallery;
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
const VALID_PRESETS: PresetName[] = ["editorial", "bold", "clean", "clinical"];
function coercePreset(v: unknown): PresetName {
  return VALID_PRESETS.includes(v as PresetName) ? (v as PresetName) : "clean";
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystem(contactBlock: string): string {
  return `You are a senior brand copywriter and web strategist at a premium agency. Your job: analyze a business, then produce a complete website spec as JSON.

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
{ "stylePreset": "editorial"|"bold"|"clean"|"clinical", "accentColor": "#HEXCODE", "businessName": string, "sections": SectionSpec[] }

You MUST set both "stylePreset" AND "accentColor". Never omit either.

PRESETS:
• "editorial" → luxury salons, interior design studios, boutique hotels, high-end photography, fine dining, jewellery
• "bold"      → gyms, crossfit boxes, martial arts, fitness studios, nightclubs, automotive, sports brands
• "clean"     → real estate agencies, law firms, financial advisors, corporate services, tech startups, architects
• "clinical"  → dental clinics, medical practices, dermatology, cosmetic clinics, physiotherapy, wellness centres

ACCENT COLOR — pick from this curated palette ONLY. Never invent a hex code outside this table.
Two different businesses must not get the same accent unless it genuinely matches both.
Match on industry specifics (e.g. a rustic restaurant ≠ same accent as a modern one):

EARTHY / WARM (salons, spas, bakeries, warm restaurants, interior design, jewellery):
  #8B6347 terracotta  |  #A0522D sienna  |  #C4793D amber clay  |  #9C6E3F antique gold

LUXURY (high-end hotels, fine dining, premium fashion, wealth management):
  #B8860B dark gold  |  #6B4423 walnut  |  #8D7047 champagne bronze  |  #7C5C3D warm walnut

VIVID / BOLD (gyms, martial arts, sports, automotive, nightlife, street food):
  #E8390E fire red  |  #C41E3A crimson  |  #FF4F1F coral  |  #D4380D burnt orange

PROFESSIONAL / COOL (real estate, law, finance, consulting, tech, architecture):
  #1A56DB cobalt  |  #0F52BA royal blue  |  #1E3A8A deep navy  |  #2563EB primary blue

CLINICAL / HEALTH (dental, medical, dermatology, physiotherapy, health clinics):
  #0070C9 sky blue  |  #0EA5E9 bright azure  |  #0891B2 teal blue  |  #0284C7 ocean

WELLNESS / NATURE (yoga studios, holistic health, organic cafés, wellness retreats):
  #16A34A sage  |  #059669 emerald  |  #0D9488 teal  |  #15803D forest

CREATIVE / FRESH (co-working spaces, creative agencies, education, photography studios):
  #7C3AED violet  |  #9333EA purple  |  #0EA5E9 sky  |  #0D9488 teal

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
PART 4 — IMAGE QUERY RULES (every photo must look like it belongs to THIS business)
═══════════════════════════════════════════════════════

ImageQuery is an Unsplash search string. It must be SPECIFIC to what the owner described — not a generic category label.

PROCESS:
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
5. imageQuery MUST be a sibling of content{}, never nested inside it.`;
}

const REVISE_SYSTEM = `You are editing a website JSON spec. Apply ONLY the requested change. Return the complete updated JSON.
STRICT: Output ONLY valid JSON — no markdown, no explanation, no code fences.
ABSOLUTE: Never invent contact information. Never add testimonials. Preserve all real contact info from the existing spec.
IMAGE QUERIES: When updating sections, regenerate imageQuery values to be specific to the revised content — same rules as original generation.`;

// ── Conversational intake: DECISION only (ask vs generate) ───────────────────
// This prompt is intentionally minimal — it ONLY decides whether to ask a
// clarifying question. Actual spec generation always uses the full buildSystem
// prompt with all accumulated context, so no quality is lost.
const INTAKE_DECISION_SYSTEM = `You are deciding whether to ask one more question or proceed to build a website.
Respond with valid JSON only — two options:
  { "action": "ask", "question": "..." }  when a critical piece is missing
  { "action": "generate" }               when you have enough to build

Proceed to generate when you have: business name + what they do + (at least one of: location, phone, email) OR the brief is >30 words with concrete specifics.
Ask in this priority: business name → business type/services → location or contact detail → prices/hours.
NEVER ask about style. NEVER repeat something already answered in the conversation.
Write questions naturally: "What's the business called?" not "Please provide the business name."`;

// ── Returns a clarifying question, or null (=enough info, proceed to generate) ─
async function checkNeedsMoreInfo(
  openai: OpenAI,
  chatHistory: Array<{ role: string; content: string; isError?: boolean }>,
  currentUserMessage: string,
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  businessName: string,
  industry: string,
  city: string,
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

  const contextLines = [
    `Business name on file: ${businessName}`,
    industry ? `Industry on file: ${industry}` : "",
    city ? `City on file: ${city}` : "",
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
    history?: { role: string; content: string }[];
    images?: { data: string; mimeType: string }[];
    contactInfo?: { phone?: string; email?: string; address?: string; hours?: string };
    chat?: Array<{ role: string; content: string; isError?: boolean }>;
    intake?: { phone?: string; email?: string; address?: string; hours?: string };
  };

  const { message, currentHtml, images = [], contactInfo } = body;
  const clientWebsiteId = typeof body.websiteId === "string" ? body.websiteId : null;

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

    if (currentHtml) {
      // ── Edit mode: apply change to existing site ──────────────────────────
      const existing = extractSpec(currentHtml);

      if (!existing) {
        const userContent = buildUserContent(businessName, industry, city, msgText);
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "system", content: buildSystem(contactBlock) }, { role: "user", content: userContent }],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.5,
        });
        const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
        spec = { stylePreset: coercePreset(parsed.stylePreset), accentColor: parsed.accentColor, businessName: parsed.businessName ?? businessName, sections: parsed.sections ?? [] };
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
      // ── Initial build: ask ONE question OR generate with full context ──────
      const priorChat = (body.chat ?? []).filter((m) => !m.isError);

      const question = await checkNeedsMoreInfo(
        openai,
        priorChat,
        msgText,
        validImages[0]?.data,
        validImages[0]?.mimeType,
        businessName,
        industry,
        city,
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
      // This is the fix: the full conversational history is collapsed into one
      // rich description, then fed into buildSystem (with copywriting + image
      // rules) rather than the stripped-down INTAKE_SYSTEM.
      const fullDescription = buildAccumulatedDescription(priorChat, msgText);

      // Extract any contact details the user mentioned across the conversation
      const chatContactBlock = extractContactFromText(fullDescription);
      const effectiveContactBlock = chatContactBlock || contactBlock;

      const userContent = buildUserContent(businessName, industry, city, fullDescription);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: buildSystem(effectiveContactBlock) },
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
        imageQuery: `${industry} professional interior ${city}`.trim(),
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
    ensureImageQueries(spec, industry, city, msgText);

    const imageMap = await fetchSpecImages(spec, heroUpload);

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
        // Default: use the first/only existing site for this tenant
        const first = sites[0];
        if (first) {
          websiteId       = first.id;
          siteSlug        = first.slug;
          siteName        = first.name;
          siteIsPublished = first.is_published;
        } else {
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
    const html = renderWebsite(spec, imageMap, tenant?.id as string | undefined);

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

      // Append version to tenant_config.website_versions (capped at 20)
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

      const newVersion: VersionEntry = {
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
        label:      versionLabel,
        type:       "generate",
        html,
        structure:  spec as unknown as Record<string, unknown>,
      };

      const updatedVersions = [...existingVersions, newVersion].slice(-20);

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

      // Single upsert: html + slug + versions + chat + intake
      const tcUpsert: Record<string, unknown> = {
        tenant_id:        tenant.id,
        website_html:     html,
        website_slug:     siteSlug || null,
        website_versions: updatedVersions,
      };
      if (Array.isArray(body.chat))  tcUpsert.website_chat   = body.chat;
      if (body.intake != null)       tcUpsert.website_intake = body.intake;

      const { error: configErr } = await admin
        .from("tenant_config")
        .upsert(tcUpsert, { onConflict: "tenant_id" });
      if (configErr) console.error("[website/generate] tenant_config upsert error:", configErr.message);
    }

    return NextResponse.json({ html, websiteId, slug: siteSlug, name: siteName, isPublished: siteIsPublished });
  } catch (err) {
    const apiErr = err as { status?: number; error?: { type?: string }; message?: string };
    console.error("[website/generate] error:", apiErr.message ?? err);
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

function buildUserContent(businessName: string, industry: string, city: string, msgText: string): string {
  return [
    `Business name: ${businessName}`,
    industry ? `Industry: ${industry}` : "",
    city     ? `City: ${city}` : "",
    `Owner's description: ${msgText}`,
  ].filter(Boolean).join("\n");
}
