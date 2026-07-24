/**
 * Phase 2b End-to-End Test
 * Runs the complete generation pipeline (classify → template patch → GPT fill → render)
 * without auth/DB. Uses the real OpenAI + Unsplash APIs.
 *
 * Run: node --env-file .env.local --import tsx/esm src/scripts/e2e-test.ts
 *  or: npx tsx --env-file .env.local src/scripts/e2e-test.ts
 */

/**
 * KNOWN GAP — Route parity drift risk
 *
 * This script reimplements the generation pipeline (classify, buildFillSystem,
 * selectHeroVariant, selectTrustComponents, enforceTemplate, etc.) rather than
 * calling the real /api/website/generate route directly, because the route
 * requires an authenticated session that wasn't available to this test runner.
 *
 * This means future changes to the production route's logic could silently drift
 * from this test's copy without being caught — e.g. a new scoring rule added to
 * selectHeroVariant in route.ts would not be reflected here unless manually kept
 * in sync.
 *
 * TODO: once an automated-test auth strategy exists (e.g. a test service account,
 * a bypass token for CI, or a session-mocking approach), migrate this script to
 * call the real endpoint instead of duplicating its logic.
 */

/**
 * KNOWN GAP — Mobile screenshot coverage
 *
 * This test verified desktop rendering + trust/conversion data integrity through
 * the real OpenAI/Unsplash pipeline, but did NOT capture a real 375px mobile
 * screenshot of an end-to-end generated site.
 *
 * TODO: a future validation pass should generate one complete website through the
 * real pipeline and capture both a desktop screenshot and a 375px mobile
 * screenshot, specifically checking responsive behavior of showcase-type sections
 * (galleries, grids, listings) and image loading — not just the form/hero sections
 * already covered in Phase 2a/2b.
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "../lib/website-renderer.js";
import {
  TEMPLATE_BY_CATEGORY, OPTIONAL_SKIP_RULES,
  type SiteTemplate, type TemplateSection,
} from "../lib/website-templates.js";

// ── Test business: rich dental clinic ────────────────────────────────────────
const TEST_DESCRIPTION = `
BrightSmile Dental Clinic — Abu Dhabi, UAE

Premium family and cosmetic dental clinic with 18 years of practice. Over 12,000 patients treated.
5-star rated with 480+ Google reviews. Board-certified by the UAE Dental Association.
Winner of the Abu Dhabi Health Excellence Award 2023.

Services we offer:
- Teeth whitening (in-chair and take-home kits)
- Invisalign clear aligners
- Dental implants (single and full arch)
- Root canal treatment
- Pediatric dentistry
- Periodontal (gum) treatment
- Emergency dental care

Led by Dr. Yasmine Al-Rashid (specialist in cosmetic dentistry, 15 years experience).

Open Monday–Saturday, 9:00 AM – 7:00 PM.
Phone: +971 2 673 8899
Email: info@brightsmile.ae
Address: Khalidiyah Mall, Level 1, Abu Dhabi
`.trim();

// ── Replicated types (from route.ts) ─────────────────────────────────────────
type DesignStrategy = {
  category: string;
  subcategory: string;
  positioning: "premium" | "mid_market" | "affordable";
  brand_personality: "elegant" | "bold" | "energetic" | "trustworthy" | "playful" | "minimal_luxury";
  conversion_goal: "book_appointment" | "generate_leads" | "showcase_portfolio" | "sell_membership" | "request_valuation";
  visual_mood: string;
  target_audience: string;
};

type HeroAvailableData = {
  hasPricingData:   boolean;
  hasPortfolioImgs: boolean;
  hasTrustBadges:   boolean;
};

type TrustConvAvailableData = HeroAvailableData & {
  hasAgentContact: boolean;
  hasPressQuote:   boolean;
  hasTrainerData:  boolean;
  hasServiceList:  boolean;
};

// ── Hero pool ─────────────────────────────────────────────────────────────────
const HERO_POOL: Record<string, string[]> = {
  real_estate:     ["full-image", "re-split", "search-first", "editorial", "property-first"],
  dental:          ["trust-focused", "booking-focused", "clinical-premium"],
  gym:             ["cinematic-dark", "membership-focused", "energy-driven"],
  interior_design: ["luxury-showcase", "portfolio-first", "editorial"],
};

const TRUST_CONV_POOL: Record<string, { trust: string[]; conversion: string[] }> = {
  real_estate: { trust: ["agent-card","comparison-table","press-quote-band","trust-badges-band"], conversion: ["valuation-form","multi-step-form"] },
  dental:      { trust: ["trust-badges-band","comparison-table","press-quote-band"], conversion: ["appointment-form","multi-step-form"] },
  gym:         { trust: ["trainer-showcase","trust-badges-band","press-quote-band"], conversion: ["membership-form","multi-step-form"] },
  interior_design: { trust: ["press-quote-band","comparison-table","trust-badges-band"], conversion: ["multi-step-form","appointment-form"] },
};

const HERO_VARIANT_SCHEMAS: Record<string, string> = {
  "re-split":        `hero: { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?, "stats"?: [{ "value": string, "label": string }] }`,
  "trust-focused":   `hero: { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?, "badges"?: [{ "value": "15+", "label": "Years Experience" }] — ONLY real stats; max 4; omit if no real data }`,
  "booking-focused": `hero: { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "services"?: string[] }`,
};

const TRUST_COMPONENT_SCHEMAS: Record<string, string> = {
  "trust-badges-band":
    `"trust-badges-band" section content: { "eyebrow"?, "headline"?,
  "badges": [{ "value": string, "label": string }] }
  RULES: Only use real statistics, years, certifications, or counts stated in the description.
  Prefer numeric values when available — e.g. "18+" / "Years in Practice", "12,000+" / "Patients Treated", "480+" / "Google Reviews".
  Use certification/award names only when no numeric alternative exists.
  Never invent numbers. Each badge must be independently verifiable from the input. Max 5.`,
  "appointment-form":
    `"appointment-form" section content: { "eyebrow"?, "headline"?,
  "services": string[], "submitLabel"?: string }
  RULES: services array is REQUIRED. Only list services explicitly named in the description. Max 12.
  If no services are named, output services: [] — the section will be suppressed server-side.`,
  "comparison-table":
    `"comparison-table" section content: { "eyebrow"?, "headline", "subheadline"?,
  "rows": [{ "feature": string, "ours": string, "theirs"?: string }] }
  RULES: Only include rows where you can state what "ours" genuinely offers. Max 6 rows. Never invent competitor data.`,
  "multi-step-form":
    `"multi-step-form" section content: { "headline"?, "step1Headline"?, "step2Headline"?,
  "services"?: string[], "submitLabel"?: string }`,
};

// ── Data extraction ───────────────────────────────────────────────────────────
function extractHeroAvailableData(description: string): HeroAvailableData {
  return {
    hasPricingData:   /\$\d|\d+[,.]?\d*\s*(per|\/mo|\/month|\/year|membership|fee|aed|eur|gbp|usd)/i.test(description),
    hasPortfolioImgs: /portfolio|project photo|gallery|before.after|completed project|our work|case stud/i.test(description.toLowerCase()),
    hasTrustBadges:   /\d+\s*(year|patient|client|case|review|award)/i.test(description),
  };
}

function extractTrustConvAvailableData(description: string): TrustConvAvailableData {
  const hero = extractHeroAvailableData(description);
  return {
    ...hero,
    hasAgentContact: /\b(agent|broker|realtor)\b.*\b(call|phone|email|contact|whatsapp|\+\d|@)/i.test(description),
    hasPressQuote:   /\b(featured in|as seen in|press|award|quoted|magazine|newspaper|article|review by)\b/i.test(description),
    hasTrainerData:  /\b(trainer|coach|instructor|staff)\b.*\b(name|certified|specialist|years|level|expert)\b/i.test(description) ||
                     /\b(meet our|our team of)\b.*\b(trainer|coach|instructor)\b/i.test(description),
    hasServiceList:  /\b(services?|offer|specializ|treatment|program|class|package)\b/i.test(description) &&
                     /\b(include|offer|provide|list)\b/i.test(description),
  };
}

// ── Hero selection ────────────────────────────────────────────────────────────
function selectHeroVariant(strategy: DesignStrategy, data: HeroAvailableData): string | null {
  const pool = HERO_POOL[strategy.category];
  if (!pool) return null;
  const gated = new Set<string>();
  if (!data.hasTrustBadges)   gated.add("trust-focused");
  if (!data.hasPricingData)   gated.add("membership-focused");
  if (!data.hasPortfolioImgs) gated.add("portfolio-first");
  const eligible = pool.filter((v) => !gated.has(v));
  if (!eligible.length) return pool[0] ?? null;
  const { brand_personality: bp, conversion_goal: cg, positioning } = strategy;
  const score = (v: string): number => {
    let s = 0;
    if (v === "trust-focused"    && bp === "trustworthy")          s += 2;
    if (v === "booking-focused"  && cg === "book_appointment")     s += 2;
    if (v === "clinical-premium" && positioning === "premium")     s += 2;
    if (v === "full-image"       && (bp === "elegant" || bp === "minimal_luxury")) s += 2;
    return s;
  };
  const ranked = [...eligible].sort((a, b) => score(b) - score(a));
  return ranked[0] ?? null;
}

// ── Trust + conversion selection ──────────────────────────────────────────────
function selectTrustComponents(
  strategy: DesignStrategy | null,
  data: TrustConvAvailableData,
): { trustType: string | null; conversionType: string | null } {
  if (!strategy) return { trustType: null, conversionType: null };
  const pool = TRUST_CONV_POOL[strategy.category];
  if (!pool) return { trustType: null, conversionType: null };

  const trustGated = new Set<string>();
  if (!data.hasAgentContact) trustGated.add("agent-card");
  if (!data.hasPressQuote)   trustGated.add("press-quote-band");
  if (!data.hasTrainerData)  trustGated.add("trainer-showcase");
  if (!data.hasTrustBadges)  trustGated.add("trust-badges-band");
  const convGated = new Set<string>();
  if (!data.hasServiceList)  convGated.add("appointment-form");
  if (!data.hasPricingData)  convGated.add("membership-form");

  const eligibleTrust = pool.trust.filter((t) => !trustGated.has(t));
  const eligibleConv  = pool.conversion.filter((c) => !convGated.has(c));

  const trustScore = (t: string): number => {
    let s = 0;
    if (t === "trust-badges-band" && data.hasTrustBadges)  s += 2;
    if (t === "comparison-table"  && strategy.conversion_goal === "generate_leads") s += 1;
    return s;
  };
  const convScore = (c: string): number => {
    let s = 0;
    if (c === "appointment-form" && strategy.conversion_goal === "book_appointment") s += 3;
    return s;
  };

  const rankedTrust = [...eligibleTrust].sort((a, b) => trustScore(b) - trustScore(a));
  const rankedConv  = [...eligibleConv].sort((a, b) => convScore(b) - convScore(a));
  return { trustType: rankedTrust[0] ?? null, conversionType: rankedConv[0] ?? null };
}

// ── Template helpers ──────────────────────────────────────────────────────────
function selectTemplate(category: string): SiteTemplate {
  const options = TEMPLATE_BY_CATEGORY[category] ?? TEMPLATE_BY_CATEGORY["professional"]!;
  return options[0]!;
}

function enforceTemplate(spec: WebsiteSpec, template: SiteTemplate): void {
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
      if (ts.required) result.push({ type: ts.type, ...(ts.variant ? { variant: ts.variant } : {}), content: {} } as WebsiteSpec["sections"][0]);
      continue;
    }
    if (!ts.required) {
      const skipRule = OPTIONAL_SKIP_RULES[ts.type];
      if (skipRule && skipRule(match.content as Record<string, unknown>)) continue;
    }
    const enforced = { ...match } as WebsiteSpec["sections"][0] & { variant?: string };
    if (ts.variant) enforced.variant = ts.variant;
    else delete enforced.variant;
    result.push(enforced);
  }
  spec.sections = result;
}

function verifyTrustComponents(spec: WebsiteSpec): void {
  spec.sections = spec.sections.filter((s) => {
    const rule = OPTIONAL_SKIP_RULES[s.type];
    if (!rule) return true;
    const skip = rule(s.content as Record<string, unknown>);
    if (skip) console.warn(`  ⚠ verifyTrustComponents: removing ${s.type} — required data missing`);
    return !skip;
  });
}

// ── Classification (step 1 GPT call) ─────────────────────────────────────────
async function classifyWithDesignStrategy(
  openai: OpenAI,
  description: string,
): Promise<{ templateCategory: string; strategy: DesignStrategy }> {
  const VALID_TEMPLATE_CATS = ["medical","hospitality","retail","saas","professional"] as const;
  const system = `You are a business analyst and brand strategist. Analyze the business description and return a JSON object with EXACTLY these fields:
{
  "template_category": one of: medical | hospitality | retail | saas | professional,
  "category": one of: real_estate | dental | gym | interior_design | restaurant | hotel | spa | legal | saas | ecommerce | other,
  "subcategory": "specific niche",
  "positioning": one of: premium | mid_market | affordable,
  "brand_personality": one of: elegant | bold | energetic | trustworthy | playful | minimal_luxury,
  "conversion_goal": one of: book_appointment | generate_leads | showcase_portfolio | sell_membership | request_valuation,
  "visual_mood": "2–4 words",
  "target_audience": "1 short sentence"
}
template_category mapping: medical — dental, doctor, physio; hospitality — hotel, restaurant; retail — e-commerce; saas — software; professional — law, real estate, gym, interior design.
Output ONLY valid JSON.`;
  const fallback: DesignStrategy = { category: "dental", subcategory: "cosmetic dentistry", positioning: "premium", brand_personality: "trustworthy", conversion_goal: "book_appointment", visual_mood: "bright clinical trust", target_audience: "Patients seeking premium dental care in Abu Dhabi." };
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
      category:          String(raw.category ?? "dental"),
      subcategory:       String(raw.subcategory ?? ""),
      positioning:       (["premium","mid_market","affordable"].includes(String(raw.positioning)) ? raw.positioning : "premium") as DesignStrategy["positioning"],
      brand_personality: (["elegant","bold","energetic","trustworthy","playful","minimal_luxury"].includes(String(raw.brand_personality)) ? raw.brand_personality : "trustworthy") as DesignStrategy["brand_personality"],
      conversion_goal:   (["book_appointment","generate_leads","showcase_portfolio","sell_membership","request_valuation"].includes(String(raw.conversion_goal)) ? raw.conversion_goal : "book_appointment") as DesignStrategy["conversion_goal"],
      visual_mood:       String(raw.visual_mood ?? "bright clinical trust"),
      target_audience:   String(raw.target_audience ?? "Patients seeking dental care."),
    };
    return { templateCategory: VALID_TEMPLATE_CATS.includes(tc as typeof VALID_TEMPLATE_CATS[number]) ? tc : "medical", strategy };
  } catch { return { templateCategory: "medical", strategy: fallback }; }
}

// ── buildFillSystem ───────────────────────────────────────────────────────────
function buildFillSystem(
  template: SiteTemplate,
  contactBlock: string,
  strategy: DesignStrategy | null,
  heroVariant: string | null,
  trustComponents: string[],
): string {
  const templateLines = template.sections.map((ts, i) => {
    const req = ts.required ? "(REQUIRED)" : "(OPTIONAL — include ONLY if owner provided real data)";
    const variant = ts.variant ? `, variant: "${ts.variant}"` : "";
    return `  ${i + 1}. type: "${ts.type}"${variant} ${req}`;
  }).join("\n");

  const strategyBlock = strategy ? `═══════════════════════════════════════════════════════
PART 0 — BUSINESS INTELLIGENCE
═══════════════════════════════════════════════════════
Subcategory:       ${strategy.subcategory}
Positioning:       ${strategy.positioning.replace(/_/g, " ")}
Brand personality: ${strategy.brand_personality.replace(/_/g, " ")}
Conversion goal:   ${strategy.conversion_goal.replace(/_/g, " ")}
Visual mood:       ${strategy.visual_mood}
Target audience:   ${strategy.target_audience}
Use these to calibrate copy tone. Never echo in JSON output.

` : "";

  return `${strategyBlock}You are a senior brand copywriter and web strategist. Analyze a business and produce a complete website JSON spec.

STRICT OUTPUT RULE: Output ONLY valid JSON. No markdown, no explanation, no code fences.

═══════════════════════════════════════════════════════
PART 1 — COPYWRITING STANDARDS
═══════════════════════════════════════════════════════
Write FRESH brand copy — not paraphrases of the owner's input.
BAD: "Quality service you can trust" / "Welcome to BrightSmile" / "Our Services"
GOOD: Lead with patient benefit, use specific numbers, active voice, short sentences.
Section headlines must be editorial — "Precision You Can Feel" not "About Us".

═══════════════════════════════════════════════════════
PART 2 — JSON ROOT SHAPE
═══════════════════════════════════════════════════════
{
  "businessName": string,
  "category": "clinic",
  "designDNA": {
    "mood": "clinical-bright",
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "palette": { "bg": "#FFFFFF", "text": "#0A2540", "accent": "#0070C9", "muted": "#64748B" },
    "isDark": false
  },
  "sections": SectionSpec[]
}

═══════════════════════════════════════════════════════
PART 3 — DESIGN (use clinical-bright for dental)
═══════════════════════════════════════════════════════
"clinical-bright": bg #FFFFFF · text #0A2540 · muted #64748B · accent #0070C9 · isDark: false
headingFont: "Inter", bodyFont: "Inter"

═══════════════════════════════════════════════════════
PART 4 — FIXED SECTION STRUCTURE
═══════════════════════════════════════════════════════
‼ WRITE CONTENT FOR EXACTLY THESE SECTIONS IN THIS ORDER. No additions, no removals.
SECTIONS:
${templateLines}
  (last) type: "footer" (REQUIRED)

OPTIONAL SECTIONS: stats-band (only if owner gave real numbers), team-grid (only named staff).

SectionSpec: { "type": string, "variant": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }
imageQuery/imageQueries MUST be siblings of content{}, never nested inside it.

═══════════════════════════════════════════════════════
PART 5 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════
imageQuery required for: hero, about-story.
imageQueries (array) required for: gallery-grid (6 strings).
Format: "dental clinic Abu Dhabi bright clean professional reception" — specific, not abstract.

═══════════════════════════════════════════════════════
PART 6 — CONTENT SCHEMAS
═══════════════════════════════════════════════════════

hero: { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"? }

about-story: { "eyebrow"?, "headline", "body", "bullets"?: [{ "title", "text" }] × 2–4, "ctaText"?: string }

service-list: { "eyebrow"?, "headline", "items": [{ "title", "description"?, "price"? }] × 4–10 }

team-grid: { "eyebrow"?, "headline", "members": [{ "name", "role", "bio"? }] } — ONLY real named staff

stats-band: { "items": [{ "value", "label" }] × 3–5 } — ONLY real statistics

faq-accordion: { "eyebrow"?, "headline", "items": [{ "q", "a" }] × 5–8 }

contact-block: { "eyebrow"?, "headline", "subheadline"?,
  "phone": string (ONLY from real contact info — else omit),
  "email": string (ONLY from real contact info — else omit),
  "address": string (ONLY from real contact info — else omit),
  "hours": string (ONLY from real contact info — else omit),
  "ctaText", "services"?: string[] × 3–6 }

footer: { "tagline", "links": string[] × 4–5, "phone"?, "email"?, "address"?, "copyright" }

${contactBlock ? `═══════════════════════════════════════════════════════
REAL CONTACT INFO — copy these values EXACTLY:
${contactBlock}
═══════════════════════════════════════════════════════` : "CONTACT INFO: None provided. Omit phone/email/address/hours."}

${heroVariant && HERO_VARIANT_SCHEMAS[heroVariant] ? `═══════════════════════════════════════════════════════
PART 7 — HERO VARIANT SCHEMA OVERRIDE
═══════════════════════════════════════════════════════
Hero uses variant "${heroVariant}". Use this exact schema:
${HERO_VARIANT_SCHEMAS[heroVariant]}
` : ""}${trustComponents.length > 0 ? `═══════════════════════════════════════════════════════
PART 8 — TRUST + CONVERSION SECTION SCHEMAS
═══════════════════════════════════════════════════════
These trust/conversion sections appear in the template. Write their content using EXACTLY these schemas.
FABRICATION RULE: these build trust — fabricated signals are worse than missing ones. Use empty arrays if real data absent.
${trustComponents.map((type) => TRUST_COMPONENT_SCHEMAS[type] ?? "").filter(Boolean).join("\n\n")}
` : ""}═══════════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════════
1. NEVER invent phone numbers, emails, addresses, or hours.
2. NEVER include testimonials or star ratings.
3. NEVER include stats-band with invented numbers.
4. NEVER invent team member names (Dr. Yasmine Al-Rashid was named — include her).
5. NEVER use generic headings: "Our Services" / "About Us" / "Why Choose Us".
6. imageQuery/imageQueries MUST be siblings of content{}, NOT nested inside it.
7. NEVER invent commercial promises not stated by the owner.
8. Footer tagline must be specific to BrightSmile — never a placeholder.`;
}

// ── Unsplash image fetcher (simplified) ──────────────────────────────────────
async function fetchUnsplashPhoto(query: string, usedUrls: Set<string>): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ width: number; height: number; urls: { raw?: string; regular?: string }; description?: string | null }> };
    const results = (data.results ?? []).filter((r) => r.width >= 1200 && r.width >= r.height);
    const described = results.filter((r) => r.description);
    const pool = described.length >= 2 ? described : results;
    for (const r of pool.slice(0, 6)) {
      const photoUrl = r.urls.raw ? `${r.urls.raw}&w=1200&q=80&fm=jpg&fit=crop` : r.urls.regular ?? null;
      if (photoUrl && !usedUrls.has(photoUrl)) {
        usedUrls.add(photoUrl);
        return photoUrl;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function getImageQuery(s: WebsiteSpec["sections"][0]): string | null {
  const top = (s as { imageQuery?: string }).imageQuery;
  if (typeof top === "string" && top.trim()) return top.trim();
  const nested = (s.content as { imageQuery?: string }).imageQuery;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  return null;
}

function getImageQueries(s: WebsiteSpec["sections"][0]): string[] {
  const top = (s as { imageQueries?: string[] }).imageQueries;
  if (Array.isArray(top) && top.length) return top;
  const nested = (s.content as { imageQueries?: string[] }).imageQueries;
  if (Array.isArray(nested)) return nested;
  return [];
}

async function fetchSpecImages(spec: WebsiteSpec, usedUrls: Set<string>): Promise<ImageMap> {
  const map: ImageMap = {};
  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const q = getImageQuery(s);
    if (q) {
      const url = await fetchUnsplashPhoto(q, usedUrls);
      if (url) {
        map[String(i)] = url;
        console.log(`  📷 section[${i}] "${s.type}" → ${url.slice(0, 60)}...`);
      }
    }
    const qs = getImageQueries(s);
    for (let j = 0; j < qs.length; j++) {
      const url2 = await fetchUnsplashPhoto(qs[j], usedUrls);
      if (url2) {
        map[`${i}_${j}`] = url2;
        console.log(`  📷 section[${i}][${j}] → ${url2.slice(0, 60)}...`);
      }
    }
  }
  return map;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Phase 2b End-to-End Test — BrightSmile Dental Clinic       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set — run with: node --env-file .env.local");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ── Step 1: Classify ────────────────────────────────────────────────────────
  console.log("▶ Step 1: Classify business...");
  const { templateCategory, strategy } = await classifyWithDesignStrategy(openai, TEST_DESCRIPTION);
  console.log(`  template_category: ${templateCategory}`);
  console.log(`  category: ${strategy.category}`);
  console.log(`  positioning: ${strategy.positioning}`);
  console.log(`  brand_personality: ${strategy.brand_personality}`);
  console.log(`  conversion_goal: ${strategy.conversion_goal}`);
  console.log(`  visual_mood: ${strategy.visual_mood}`);

  // ── Step 2: Select hero + trust/conversion components ─────────────────────
  console.log("\n▶ Step 2: Component pool selection...");
  const heroData = extractHeroAvailableData(TEST_DESCRIPTION);
  const trustData = extractTrustConvAvailableData(TEST_DESCRIPTION);
  const heroVariant = selectHeroVariant(strategy, heroData);
  const { trustType, conversionType } = selectTrustComponents(strategy, trustData);

  console.log(`  hasTrustBadges:  ${trustData.hasTrustBadges}`);
  console.log(`  hasServiceList:  ${trustData.hasServiceList}`);
  console.log(`  hasPressQuote:   ${trustData.hasPressQuote}`);
  console.log(`  heroVariant:     ${heroVariant ?? "template-default"}`);
  console.log(`  trust:           ${trustType ?? "NONE"}`);
  console.log(`  conversion:      ${conversionType ?? "NONE"}`);

  // ── Step 3: Build patched template ─────────────────────────────────────────
  const baseTemplate = selectTemplate(templateCategory);
  const selectedTrustComponents = [trustType, conversionType].filter(Boolean) as string[];

  let selectedTemplate: SiteTemplate = heroVariant
    ? { ...baseTemplate, sections: baseTemplate.sections.map((s) => s.type === "hero" ? { ...s, variant: heroVariant } : s) }
    : baseTemplate;

  if (selectedTrustComponents.length > 0) {
    const contactIdx = selectedTemplate.sections.findIndex((s) => s.type === "contact-block");
    const insertAt = contactIdx >= 0 ? contactIdx : selectedTemplate.sections.length;
    const tcSections: TemplateSection[] = selectedTrustComponents.map((type) => ({
      type, variant: "", imageSlots: 0, required: false,
    }));
    const patchedSections = [...selectedTemplate.sections];
    patchedSections.splice(insertAt, 0, ...tcSections);
    selectedTemplate = { ...selectedTemplate, sections: patchedSections };
  }

  console.log(`\n  template: ${selectedTemplate.id}`);
  console.log(`  sections: ${selectedTemplate.sections.map((s) => s.type + (s.required ? "" : "?")).join(", ")}`);

  // ── Step 4: GPT fill ────────────────────────────────────────────────────────
  console.log("\n▶ Step 3: GPT fill call (gpt-4o)...");
  const contactBlock = "Phone: +971 2 673 8899\nEmail: info@brightsmile.ae\nAddress: Khalidiyah Mall, Level 1, Abu Dhabi\nHours: Monday–Saturday, 9:00 AM – 7:00 PM";
  const systemPrompt = buildFillSystem(selectedTemplate, contactBlock, strategy, heroVariant, selectedTrustComponents);
  const userMsg = `Owner's description:\n${TEST_DESCRIPTION}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.5,
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec> & { designDNA?: unknown };
  let spec: WebsiteSpec = {
    businessName: parsed.businessName ?? "BrightSmile Dental",
    category: "clinic",
    sections: parsed.sections ?? [],
    ...(parsed.designDNA ? { designDNA: parsed.designDNA as WebsiteSpec["designDNA"] } : {}),
    accentColor: (parsed as { accentColor?: string }).accentColor,
  };

  console.log(`  GPT returned ${spec.sections.length} sections`);

  // ── Step 5: Enforce template ────────────────────────────────────────────────
  console.log("\n▶ Step 4: Server-side enforcement...");
  enforceTemplate(spec, selectedTemplate);
  verifyTrustComponents(spec);

  const sectionList = spec.sections.map((s) => `${s.type}${(s as { variant?: string }).variant ? "/" + (s as { variant?: string }).variant : ""}`);
  console.log(`  Enforced sections: [${sectionList.join(", ")}]`);

  // Verify trust/conversion components are present
  const hasTrust = spec.sections.some((s) => s.type === trustType);
  const hasConv  = spec.sections.some((s) => s.type === conversionType);
  console.log(`\n  ✓ trust-badges-band present: ${hasTrust}`);
  console.log(`  ✓ appointment-form present:  ${hasConv}`);

  if (trustType && !hasTrust) {
    console.warn(`  ⚠ WARN: trust-badges-band was selected but is missing after enforcement`);
    console.log("  trust-badges-band content from GPT:", JSON.stringify(parsed.sections?.find((s: { type: string }) => s.type === "trust-badges-band"), null, 2));
  }
  if (conversionType && !hasConv) {
    console.warn(`  ⚠ WARN: appointment-form was selected but is missing after enforcement`);
  }

  // ── Step 6: Fetch images ────────────────────────────────────────────────────
  console.log("\n▶ Step 5: Fetching Unsplash images...");
  const usedUrls = new Set<string>();
  const images = await fetchSpecImages(spec, usedUrls);
  console.log(`  Fetched ${Object.keys(images).length} images`);

  // ── Step 7: Render ──────────────────────────────────────────────────────────
  console.log("\n▶ Step 6: Rendering HTML...");
  const html = renderWebsite(spec, images, undefined, "English");

  // Save output
  const outPath = path.join(process.cwd(), "src/scripts/e2e-output.html");
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`  ✓ Saved to: ${outPath}`);
  console.log(`  HTML size: ${(html.length / 1024).toFixed(1)} KB`);

  // Section audit
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("SECTION AUDIT:");
  spec.sections.forEach((s, i) => {
    const v = (s as { variant?: string }).variant;
    const keys = Object.keys(s.content).join(", ");
    console.log(`  [${i}] ${s.type}${v ? `/${v}` : ""} — content keys: ${keys || "(empty)"}`);
  });

  // Trust/conversion content audit
  const badgesSection = spec.sections.find((s) => s.type === "trust-badges-band");
  if (badgesSection) {
    const badges = (badgesSection.content as { badges?: Array<{value: string; label: string}> }).badges ?? [];
    console.log(`\n  trust-badges-band has ${badges.length} badges:`);
    badges.forEach((b) => console.log(`    • "${b.value}" — ${b.label}`));
  }

  const apptSection = spec.sections.find((s) => s.type === "appointment-form");
  if (apptSection) {
    const services = (apptSection.content as { services?: string[] }).services ?? [];
    console.log(`\n  appointment-form has ${services.length} services:`);
    services.forEach((s) => console.log(`    • ${s}`));
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✓ E2E test complete. Open src/scripts/e2e-output.html to inspect the result.");
}

main().catch((err) => {
  console.error("❌ E2E test failed:", err);
  process.exit(1);
});
