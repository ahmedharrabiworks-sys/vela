/**
 * Phase 2c End-to-End Test
 * 8 test cases: 4 showcase categories × 2 (with real data / without data)
 * Verifies the showcase pool selection, inject, GPT fill, post-GPT verify, and render.
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase2c.ts
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "../lib/website-renderer.js";
import {
  TEMPLATE_BY_CATEGORY, OPTIONAL_SKIP_RULES,
  type SiteTemplate, type TemplateSection,
} from "../lib/website-templates.js";

// ── Test cases ────────────────────────────────────────────────────────────────

const TEST_CASES: Array<{
  id: string;
  label: string;
  expectedShowcase: string | null;
  expectedReason: string;
  description: string;
}> = [
  {
    id: "re-with-data",
    label: "real_estate WITH hasRealListings",
    expectedShowcase: "property-listings-grid",
    expectedReason: "Bedroom counts + AED prices present → hasRealListings=true",
    description: `
Marina Realty Dubai — Palm Jumeirah & Dubai Marina luxury property specialists.

Current listings:
- 3-bedroom apartment, Dubai Marina, 2,100 sqft, AED 2.8M (full sea view, pool floor)
- 4-bedroom penthouse, JBR Residences, 3,800 sqft, AED 6.5M (Burj Al Arab view)
- Studio apartment, Marina Gate 1, 650 sqft, AED 850,000 (high floor, furnished)
- 2-bedroom villa, Palm Jumeirah frond, 1,950 sqft, AED 4.2M (beachfront, private pool)
- 1-bedroom apartment, Emaar Beachfront, 900 sqft, AED 1.6M (brand new handover)

James Wilson, Senior Property Consultant, 12 years Dubai real estate experience.
Phone: +971 4 887 5500 | Email: james@marinarealty.ae
Office: DMCC Cluster A, JLT, Dubai. Open daily 9am–7pm.
`.trim(),
  },
  {
    id: "re-without-data",
    label: "real_estate WITHOUT hasRealListings",
    expectedShowcase: null,
    expectedReason: "No bedroom/price signals → hasRealListings=false → showcase suppressed",
    description: `
Sunrise Properties — Abu Dhabi property consultancy.

We help clients find their ideal homes and investment properties across UAE's
premium neighborhoods. Trusted advisors to families and investors since 2018.
Our team covers all Abu Dhabi districts with a personal service approach.

Let us handle the search while you focus on your vision.
Phone: +971 2 555 1234 | Email: hello@sunriseproperties.ae
`.trim(),
  },
  {
    id: "dental-with-services",
    label: "dental WITH real services (always eligible — post-GPT verify)",
    expectedShowcase: "treatment-gallery",
    expectedReason: "Dental always triggers treatment-gallery; post-GPT verifyShowcaseComponents checks services array",
    description: `
ClearView Dental Clinic — Canary Wharf, London.

Modern cosmetic and family dentistry in the heart of London's financial district.
Treatments we offer:
- Invisalign clear aligners (3 months from £1,999)
- Professional teeth whitening — in-chair 1 hour from £299, take-home kit from £149
- Dental implants — single tooth from £2,500; full-arch All-on-4 from £12,000
- Porcelain veneers — from £899 per tooth
- Composite bonding — from £250 per tooth
- Root canal treatment
- Periodontal (gum) therapy
- Routine checkups, scale & polish, X-rays

Dr. Sarah Mitchell BDS MOrth RCSEd (cosmetic & orthodontic specialist, 14 years).
Dr. James Chen BDS (implants & oral surgery, 10 years).

Phone: +44 20 7946 0321 | Email: hello@clearviewdental.co.uk
Address: 1 Canada Square, Canary Wharf, London E14 5AB
Hours: Monday–Saturday 8am–7pm
`.trim(),
  },
  {
    id: "dental-sparse",
    label: "dental WITHOUT real services (sparse description — tests post-GPT verify)",
    expectedShowcase: "treatment-gallery (may be removed post-GPT if no services populated)",
    expectedReason: "No services named; FABRICATION RULE should produce services:[]; verifyShowcaseComponents removes it",
    description: `
Smile Care Dental — a friendly local dental practice.
We believe everyone deserves a healthy smile and gentle care.
Our welcoming team is here to help you feel at ease.
Book a consultation today.
`.trim(),
  },
  {
    id: "id-with-projects",
    label: "interior_design WITH hasMultipleProjects",
    expectedShowcase: "portfolio-grid",
    expectedReason: "4 completion verbs (designed, delivered, transformed, renovated) → hasMultipleProjects=true",
    description: `
Studio Nomad Interior Design — Dubai & Abu Dhabi.

We transform residential and commercial spaces into considered environments.

Projects:
- Designed and delivered a 6-bedroom Palm Jumeirah villa (contemporary Arabic fusion, 2023)
- Transformed a Downtown Dubai penthouse into a minimalist Japanese retreat (4BR, 2022)
- Renovated a Jumeirah Beach Road café with an industrial-chic dining interior (120 seats, completed 2023)
- Designed a DIFC law firm boardroom (executive dark oak and smoked glass, delivered 2024)
- Renovated a Yas Island family villa with Scandinavian coastal palette (5BR, 2024)

Sophia El-Amin (founder, 16 years UAE interior design experience).
Phone: +971 50 234 5678 | Email: sophia@studionomad.ae
`.trim(),
  },
  {
    id: "id-without-projects",
    label: "interior_design WITHOUT hasMultipleProjects",
    expectedShowcase: null,
    expectedReason: "No completion verbs, no portfolio language → hasMultipleProjects=false → showcase suppressed",
    description: `
Modern Home Interiors — Dubai interior decoration studio.

We help you choose colors, furniture layouts, and soft furnishings that create
a beautiful, livable space. Whether you have a blank canvas or need a refresh,
our team brings ideas that suit your budget and lifestyle.

Call us for a free 30-minute consultation.
Phone: +971 4 211 8899
`.trim(),
  },
  {
    id: "gym-with-tiers",
    label: "gym WITH hasTierDetails",
    expectedShowcase: "membership-plans-display",
    expectedReason: "Tier names (Basic/Pro/Elite) + inclusions (classes, guest pass, locker, personal trainer) → hasTierDetails=true",
    description: `
IronCore Fitness Club — Abu Dhabi, UAE.

Premium gym facility, 2,500 sqm, state-of-the-art equipment.

Membership tiers:
- Basic (AED 199/month): access to all gym equipment, locker room, shower facilities
- Pro (AED 349/month): includes unlimited group classes, 1 personal trainer session/month,
  2 guest passes/month, locker with towel service
- Elite (AED 599/month): includes unlimited personal training sessions, nutrition counseling,
  spa access, steam room, 4 guest passes/month, valet parking

Certified trainers: Coach Khalid (strength & conditioning), Coach Priya (HIIT & yoga).
Phone: +971 2 444 7788 | Email: info@ironcore.ae
Address: Nation Towers Podium, Abu Dhabi. Open 6am–11pm daily.
`.trim(),
  },
  {
    id: "gym-without-tiers",
    label: "gym WITHOUT hasTierDetails",
    expectedShowcase: null,
    expectedReason: "No tier names or inclusion keywords → hasTierDetails=false → showcase suppressed",
    description: `
FitLife Gym — Dubai gym for all fitness levels.

Great equipment, great vibes. We have cardio machines, free weights, and
group fitness classes for all levels. Our friendly staff will help you
get started on your fitness journey.

Come try us for free — your first week is on us.
Phone: +971 4 321 9988 | Email: hello@fitlife.ae
`.trim(),
  },
];

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

type ShowcaseAvailableData = {
  hasRealListings:     boolean;
  hasMultipleProjects: boolean;
  hasTierDetails:      boolean;
};

// ── Showcase pool (Phase 2c) ──────────────────────────────────────────────────

const SHOWCASE_POOL: Record<string, string> = {
  real_estate:     "property-listings-grid",
  dental:          "treatment-gallery",
  gym:             "membership-plans-display",
  interior_design: "portfolio-grid",
};

function extractShowcaseAvailableData(description: string): ShowcaseAvailableData {
  return {
    hasRealListings:
      /\b(\d+[-\s]?(bed(?:room)?s?|BR|studio))\b/i.test(description) &&
      (/\b(AED|USD|\$|£|€|asking|priced|from|starts?\s+at)\s*[\d,]+/i.test(description) ||
       /\b(\d+[,\s]?\d+\s*(?:sqft|sq\.?\s*ft|m²|sqm|square\s+(?:feet|meters)))\b/i.test(description)),
    hasMultipleProjects:
      (description.match(
        /\b(complet(?:ed?|ing)|finish(?:ed)?|design(?:ed)?|transform(?:ed)?|renovate[d]?|built|deliver(?:ed)?)\b/gi
      ) ?? []).length >= 2 ||
      /\bportfolio\b.*\b(project|design|work|space|room)\b/i.test(description),
    hasTierDetails:
      /\b(basic|starter|standard|essential|core|pro(?:fessional)?|premium|elite|vip|gold|platinum|diamond|silver|bronze)\b/i.test(description) &&
      /\b(includ(?:es?|ing)|comes?\s+with|access\s+to|unlimited|class(?:es)?|session(?:s)?|guest\s+pass|locker|personal\s+trainer|nutrition|towel|parking|spa|sauna|pool|steam|massage|smoothie|app)\b/i.test(description),
  };
}

function selectShowcaseComponent(
  strategy: DesignStrategy | null,
  available: ShowcaseAvailableData,
): string | null {
  if (!strategy?.category) return null;
  const showcaseType = SHOWCASE_POOL[strategy.category];
  if (!showcaseType) return null;
  if (showcaseType === "property-listings-grid" && !available.hasRealListings)       return null;
  if (showcaseType === "portfolio-grid"          && !available.hasMultipleProjects)   return null;
  if (showcaseType === "membership-plans-display" && !available.hasTierDetails)       return null;
  return showcaseType;
}

function verifyShowcaseComponents(spec: WebsiteSpec): void {
  spec.sections = spec.sections.filter((s) => {
    const c = s.content as Record<string, unknown>;
    if (s.type === "property-listings-grid") {
      const ok = Array.isArray(c.listings) && (c.listings as unknown[]).length >= 1;
      if (!ok) console.warn("  ⚠ verifyShowcaseComponents: removing property-listings-grid — no listings");
      return ok;
    }
    if (s.type === "treatment-gallery") {
      const ok = Array.isArray(c.services) && (c.services as unknown[]).length >= 1;
      if (!ok) console.warn("  ⚠ verifyShowcaseComponents: removing treatment-gallery — no services");
      return ok;
    }
    if (s.type === "portfolio-grid") {
      const ok = Array.isArray(c.projects) && (c.projects as unknown[]).length >= 2;
      if (!ok) console.warn("  ⚠ verifyShowcaseComponents: removing portfolio-grid — fewer than 2 projects");
      return ok;
    }
    if (s.type === "membership-plans-display") {
      const tiers = c.tiers as unknown[];
      const ok = Array.isArray(tiers) && tiers.some((t: unknown) => {
        const tier = t as Record<string, unknown>;
        return Array.isArray(tier.features) && (tier.features as unknown[]).length >= 1;
      });
      if (!ok) console.warn("  ⚠ verifyShowcaseComponents: removing membership-plans-display — no tier feature details");
      return ok;
    }
    return true;
  });
}

// ── Hero pool ─────────────────────────────────────────────────────────────────

const HERO_POOL: Record<string, string[]> = {
  real_estate:     ["full-image", "re-split", "search-first", "editorial", "property-first"],
  dental:          ["trust-focused", "booking-focused", "clinical-premium"],
  gym:             ["cinematic-dark", "membership-focused", "energy-driven"],
  interior_design: ["luxury-showcase", "portfolio-first", "editorial"],
};

const TRUST_CONV_POOL: Record<string, { trust: string[]; conversion: string[] }> = {
  real_estate:     { trust: ["agent-card","comparison-table","press-quote-band","trust-badges-band"], conversion: ["valuation-form","multi-step-form"] },
  dental:          { trust: ["trust-badges-band","comparison-table","press-quote-band"], conversion: ["appointment-form","multi-step-form"] },
  gym:             { trust: ["trainer-showcase","trust-badges-band","press-quote-band"], conversion: ["membership-form","multi-step-form"] },
  interior_design: { trust: ["press-quote-band","comparison-table","trust-badges-band"], conversion: ["multi-step-form","appointment-form"] },
};

const HERO_VARIANT_SCHEMAS: Record<string, string> = {
  "re-split":
    `hero content for "re-split": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "stats"?: [{ "value": string, "label": string }] — ONLY real statistics; max 3; omit if none }`,
  "trust-focused":
    `hero content for "trust-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "badges"?: [{ "value": "15+", "label": "Years Experience" }] — ONLY real stats; max 4; omit if no real data }`,
  "booking-focused":
    `hero content for "booking-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary",
  "services"?: string[] — dropdown options; omit or leave [] if not specified }`,
  "membership-focused":
    `hero content for "membership-focused": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "tiers"?: [{ "name": string, "price": string, "period"?: string }] — ONLY real pricing; max 3; omit if no real prices }`,
  "property-first":
    `hero content for "property-first": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"?,
  "property"?: { "title"?: string, "price"?: string, "beds"?: string, "baths"?: string, "sqft"?: string } — ONLY real listing data }`,
  "portfolio-first":
    `hero content for "portfolio-first": { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"? }
imageQueries REQUIRED at section level (3 strings for the image grid).`,
};

const TRUST_COMPONENT_SCHEMAS: Record<string, string> = {
  "comparison-table":
    `"comparison-table" section content: { "eyebrow"?, "headline", "subheadline"?,
  "rows": [{ "feature": string, "ours": string, "theirs"?: string }] }
  RULES: Only include rows where you can state what "ours" genuinely offers. Max 6 rows. Never invent competitor data.`,
  "agent-card":
    `"agent-card" section content: { "name": string, "title"?: string, "phone"?: string, "email"?: string, "bio"?: string }
  RULES: Use only real agent name, phone, email, title stated in the description. Omit fields not provided.`,
  "press-quote-band":
    `"press-quote-band" section content: { "quote": string, "source"?: string, "publication"?: string }
  RULES: Quote must be from a real stated press mention. NEVER invent a quote or publication name.`,
  "trainer-showcase":
    `"trainer-showcase" section content: { "eyebrow"?, "headline"?,
  "trainers": [{ "name": string, "specialty"?: string, "bio"?: string }] }
  RULES: Only include trainers whose names were stated. Max 6. Never invent specialty or bio.`,
  "trust-badges-band":
    `"trust-badges-band" section content: { "eyebrow"?, "headline"?,
  "badges": [{ "value": string, "label": string }] }
  RULES: Only real statistics, years, certifications stated in the description. Never invent numbers. Max 5.`,
  "appointment-form":
    `"appointment-form" section content: { "eyebrow"?, "headline"?,
  "services": string[], "submitLabel"?: string }
  RULES: services REQUIRED. Only list services explicitly named in the description. Max 12.
  If no services named, output services: [] — section will be suppressed server-side.`,
  "valuation-form":
    `"valuation-form" section content: { "eyebrow"?, "headline"?, "subheadline"?, "submitLabel"?: string }
  RULES: Write compelling copy for eyebrow/headline/subheadline only. Do not invent property data.`,
  "membership-form":
    `"membership-form" section content: { "eyebrow"?, "headline"?,
  "tiers": [{ "name": string, "price": string, "period"?: string }], "submitLabel"?: string }
  RULES: tiers REQUIRED. Only include tiers with real prices stated. Never invent prices. If none, output tiers: [].`,
  "multi-step-form":
    `"multi-step-form" section content: { "headline"?, "step1Headline"?, "step2Headline"?,
  "services"?: string[], "submitLabel"?: string }
  RULES: services optional — only include service names actually listed. Max 12.`,
};

const SHOWCASE_COMPONENT_SCHEMAS: Record<string, string> = {
  "property-listings-grid":
    `"property-listings-grid" section content: { "eyebrow"?, "headline",
  "listings": [{ "title": string, "location"?: string, "bedrooms"?: string, "bathrooms"?: string, "area"?: string, "price"?: string, "badge"?: string }] }
  RULES: ONLY include real properties described by the owner. Max 6 listings.
  title: the property's name or identifier (e.g. "Marina View Penthouse", "3BR Villa Palm Jumeirah").
  bedrooms/bathrooms/area: only from real stated specs. price: ONLY if owner stated a real asking price.
  badge: optional label ("New Listing", "Featured") — only if meaningful and real. Never invent specs or prices.
  imageQueries REQUIRED at section level (1 per listing, e.g. ["luxury villa Dubai editorial", ...]).`,
  "treatment-gallery":
    `"treatment-gallery" section content: { "eyebrow"?, "headline"?, "subheadline"?,
  "services": [{ "title": string, "description"?: string, "duration"?: string, "price"?: string }] }
  RULES: Use real treatment/procedure names. Max 8. Description in patient-friendly language from real details.
  duration and price: ONLY from real stated data — never invent.
  If no real treatments can be listed, output services: [] — section will be suppressed server-side.
  imageQueries at section level are optional (1 per service for photo cards).`,
  "portfolio-grid":
    `"portfolio-grid" section content: { "eyebrow"?, "headline",
  "projects": [{ "title": string, "category"?: string, "description"?: string, "location"?: string, "year"?: string }] }
  RULES: ONLY include real projects the owner named or described. MINIMUM 2 required; if fewer than 2 are real, output projects: [].
  title: the project name. category: project type (e.g. "Residential", "Commercial").
  description: 1 sentence about the design approach from real stated details — never fabricate.
  location, year: only if stated.
  imageQueries REQUIRED at section level (1 per project, matching projects count).`,
  "membership-plans-display":
    `"membership-plans-display" section content: { "eyebrow"?, "headline", "subheadline"?,
  "tiers": [{ "name": string, "price": string, "period"?: string, "features": string[] × 4–8, "highlighted"?: boolean, "badge"?: string }] }
  RULES: Each tier MUST have a "features" array listing specific inclusions.
  features: list what is INCLUDED (e.g. "Unlimited group classes", "2 guest passes/month", "Locker access").
  ONLY include real stated inclusions — never invent features. price: ONLY from real stated data.
  highlighted: true for exactly ONE tier (the featured plan). badge: label for highlighted tier (default "Most Popular").
  If no real feature inclusions are stated, output features: [] for each tier — section will be suppressed server-side.`,
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

// ── Selection ─────────────────────────────────────────────────────────────────

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
    if (v === "trust-focused"    && bp === "trustworthy")        s += 2;
    if (v === "booking-focused"  && cg === "book_appointment")   s += 2;
    if (v === "clinical-premium" && positioning === "premium")   s += 2;
    if (v === "membership-focused" && cg === "sell_membership")  s += 2;
    if (v === "property-first"   && cg === "request_valuation")  s += 2;
    if (v === "full-image"       && (bp === "elegant" || bp === "minimal_luxury")) s += 2;
    if (v === "re-split"         && data.hasTrustBadges)         s += 1;
    return s;
  };
  const ranked = [...eligible].sort((a, b) => score(b) - score(a));
  return ranked[0] ?? null;
}

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
    if (t === "trust-badges-band" && data.hasTrustBadges) s += 2;
    if (t === "comparison-table"  && strategy.conversion_goal === "generate_leads") s += 1;
    return s;
  };
  const convScore = (c: string): number => {
    let s = 0;
    if (c === "appointment-form" && strategy.conversion_goal === "book_appointment") s += 3;
    if (c === "valuation-form"   && strategy.conversion_goal === "request_valuation") s += 3;
    if (c === "membership-form"  && strategy.conversion_goal === "sell_membership")  s += 3;
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

// ── Classification ────────────────────────────────────────────────────────────

async function classifyWithDesignStrategy(
  openai: OpenAI,
  description: string,
  fallbackCategory: string,
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
  const fallback: DesignStrategy = {
    category: fallbackCategory, subcategory: fallbackCategory, positioning: "premium",
    brand_personality: "trustworthy", conversion_goal: "book_appointment",
    visual_mood: "professional", target_audience: "Clients seeking professional services.",
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
      category:          String(raw.category ?? fallbackCategory),
      subcategory:       String(raw.subcategory ?? ""),
      positioning:       (["premium","mid_market","affordable"].includes(String(raw.positioning)) ? raw.positioning : "premium") as DesignStrategy["positioning"],
      brand_personality: (["elegant","bold","energetic","trustworthy","playful","minimal_luxury"].includes(String(raw.brand_personality)) ? raw.brand_personality : "trustworthy") as DesignStrategy["brand_personality"],
      conversion_goal:   (["book_appointment","generate_leads","showcase_portfolio","sell_membership","request_valuation"].includes(String(raw.conversion_goal)) ? raw.conversion_goal : "book_appointment") as DesignStrategy["conversion_goal"],
      visual_mood:       String(raw.visual_mood ?? "professional modern"),
      target_audience:   String(raw.target_audience ?? ""),
    };
    return { templateCategory: VALID_TEMPLATE_CATS.includes(tc as typeof VALID_TEMPLATE_CATS[number]) ? tc : "professional", strategy };
  } catch { return { templateCategory: "professional", strategy: fallback }; }
}

// ── buildFillSystem (Phase 2c — extended) ────────────────────────────────────

function buildFillSystem(
  template: SiteTemplate,
  contactBlock: string,
  strategy: DesignStrategy | null,
  heroVariant: string | null,
  trustComponents: string[],
  showcaseComponents: string[] | null,
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
BAD: "Quality service you can trust" / "Welcome to [Name]" / "Our Services"
GOOD: Lead with customer benefit, use specific numbers, active voice, short sentences.
Section headlines must be editorial — "Precision You Can Feel" not "About Us".

═══════════════════════════════════════════════════════
PART 2 — JSON ROOT SHAPE
═══════════════════════════════════════════════════════
{
  "businessName": string,
  "category": "saas"|"hotel"|"clinic"|"gym"|"salon"|"realestate"|"restaurant"|"ecommerce"|"agency"|"education"|"legal"|"other",
  "designDNA": {
    "mood": "editorial-luxury"|"clinical-bright"|"bold-energetic"|"warm-minimal"|"tech-sharp"|"dark-premium",
    "headingFont": "Inter",
    "bodyFont": "Inter",
    "palette": { "bg": "#RRGGBB", "text": "#RRGGBB", "accent": "#RRGGBB", "muted": "#RRGGBB" },
    "isDark": false
  },
  "sections": SectionSpec[]
}

═══════════════════════════════════════════════════════
PART 3 — DESIGN MOODS
═══════════════════════════════════════════════════════
"editorial-luxury"  — Serif headings, off-white, gold accent. Use: real estate, interior design, boutique hotel.
"clinical-bright"   — Inter, white bg, navy text, blue accent. Use: dental, medical.
"bold-energetic"    — Bold sans-serif, dark bg, vivid accent. Use: gym, fitness.
"warm-minimal"      — Warm neutrals, terracotta/sage accent. Use: spa, wellness, café.
"tech-sharp"        — Geometric sans, near-black/white, electric accent. Use: saas, agency.
"dark-premium"      — Very dark bg, gold/copper accent. Use: premium gym, nightlife, premium real estate.

═══════════════════════════════════════════════════════
PART 4 — FIXED SECTION STRUCTURE
═══════════════════════════════════════════════════════
‼ WRITE CONTENT FOR EXACTLY THESE SECTIONS IN THIS ORDER. No additions, no removals.
SECTIONS:
${templateLines}
  (last) type: "footer" (REQUIRED)

SectionSpec: { "type": string, "variant": string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }
imageQuery/imageQueries MUST be siblings of content{}, never nested inside it.

═══════════════════════════════════════════════════════
PART 5 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════
imageQuery required for: hero, about-story.
imageQueries (array) required for: gallery-grid (6 strings), portfolio-first hero (3 strings).
Format: "luxury villa Dubai Marina editorial photography" — specific, not abstract.

═══════════════════════════════════════════════════════
PART 6 — CONTENT SCHEMAS
═══════════════════════════════════════════════════════

hero: { "eyebrow"?, "headline", "subheadline", "ctaPrimary", "ctaSecondary"? }

about-story: { "eyebrow"?, "headline", "body", "bullets"?: [{ "title", "text" }] × 2–4, "ctaText"?: string }

service-list: { "eyebrow"?, "headline", "items": [{ "title", "description"?, "price"? }] × 4–10 }

process-steps: { "eyebrow"?, "headline", "steps": [{ "number": string, "title": string, "description": string }] × 3–5 }

team-grid: { "eyebrow"?, "headline", "members": [{ "name", "role", "bio"? }] } — ONLY real named staff

stats-band: { "items": [{ "value", "label" }] × 3–5 } — ONLY real statistics

faq-accordion: { "eyebrow"?, "headline", "items": [{ "q", "a" }] × 5–8 }

listings-grid: { "eyebrow"?, "headline", "items": [{ "title", "price"?, "location"?, "description"? }] }

contact-block: { "eyebrow"?, "headline", "subheadline"?,
  "phone"?: string (ONLY from real contact info),
  "email"?: string (ONLY from real contact info),
  "address"?: string (ONLY from real contact info),
  "hours"?: string (ONLY from real contact info),
  "ctaText": string }

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
` : ""}${showcaseComponents && showcaseComponents.length > 0 ? `═══════════════════════════════════════════════════════
PART 11 — SHOWCASE SECTION SCHEMA
═══════════════════════════════════════════════════════
The following category-specific showcase section has been added to the template. Write its content using EXACTLY this schema. FABRICATION RULE: this section showcases real work and real data — fabricated listings, treatments, portfolio projects, or tier inclusions are worse than a missing section. If you cannot populate required fields from real stated data, output empty arrays — the section will be suppressed server-side.
${showcaseComponents.map((type) => SHOWCASE_COMPONENT_SCHEMAS[type] ?? "").filter(Boolean).join("\n\n")}
` : ""}═══════════════════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════
1. NEVER invent phone numbers, email addresses, physical addresses, or hours.
2. NEVER include testimonials or star ratings.
3. NEVER include stats-band with invented numbers.
4. NEVER invent team member names.
5. NEVER use generic headings: "Our Services" / "About Us" / "Why Choose Us".
6. imageQuery/imageQueries MUST be siblings of content{}, NOT nested inside it.
7. NEVER invent commercial promises not stated by the owner.
8. Footer tagline must be specific to this business — never a placeholder.`;
}

// ── Unsplash image fetcher ────────────────────────────────────────────────────

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
      if (photoUrl && !usedUrls.has(photoUrl)) { usedUrls.add(photoUrl); return photoUrl; }
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
      if (url) { map[String(i)] = url; console.log(`    📷 [${i}] ${s.type} → ${url.slice(0,55)}...`); }
    }
    const qs = getImageQueries(s);
    for (let j = 0; j < qs.length; j++) {
      const url2 = await fetchUnsplashPhoto(qs[j], usedUrls);
      if (url2) { map[`${i}_${j}`] = url2; console.log(`    📷 [${i}][${j}] → ${url2.slice(0,55)}...`); }
    }
  }
  return map;
}

// ── Extract contact block ─────────────────────────────────────────────────────

function extractContactBlock(description: string): string {
  const lines: string[] = [];
  const phone = description.match(/(?:phone|tel|call)[:\s]+(\+?[\d\s\-()]{7,})/i)?.[1]?.trim();
  const email = description.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i)?.[1]?.trim();
  const address = description.match(/(?:address|located at|office)[:\s]+([^\n]+)/i)?.[1]?.trim();
  const hours = description.match(/(?:hours?|open)[:\s]+([^\n]+)/i)?.[1]?.trim();
  if (phone)   lines.push(`Phone: ${phone}`);
  if (email)   lines.push(`Email: ${email}`);
  if (address) lines.push(`Address: ${address}`);
  if (hours)   lines.push(`Hours: ${hours}`);
  return lines.join("\n");
}

// ── Run one test case ─────────────────────────────────────────────────────────

async function runTest(openai: OpenAI, tc: typeof TEST_CASES[0], index: number): Promise<void> {
  console.log(`\n${"═".repeat(66)}`);
  console.log(`  TEST ${index + 1}/8 — ${tc.id}`);
  console.log(`  ${tc.label}`);
  console.log(`${"═".repeat(66)}`);
  console.log(`  Expected: showcase=${tc.expectedShowcase ?? "NONE"}`);
  console.log(`  Reason:   ${tc.expectedReason}`);

  // Step 1: Extract showcase availability
  const showcaseData = extractShowcaseAvailableData(tc.description);
  console.log(`\n  ▶ Showcase data extraction:`);
  console.log(`    hasRealListings:     ${showcaseData.hasRealListings}`);
  console.log(`    hasMultipleProjects: ${showcaseData.hasMultipleProjects}`);
  console.log(`    hasTierDetails:      ${showcaseData.hasTierDetails}`);

  // Step 2: Classify
  console.log(`\n  ▶ Classifying...`);
  const categoryHint = tc.id.startsWith("re-") ? "real_estate"
    : tc.id.startsWith("dental-") ? "dental"
    : tc.id.startsWith("id-") ? "interior_design"
    : "gym";
  const { templateCategory, strategy } = await classifyWithDesignStrategy(openai, tc.description, categoryHint);
  console.log(`    template_category: ${templateCategory}, category: ${strategy.category}`);
  console.log(`    positioning: ${strategy.positioning}, brand: ${strategy.brand_personality}, goal: ${strategy.conversion_goal}`);

  // Step 3: Select components
  const heroData     = extractHeroAvailableData(tc.description);
  const trustData    = extractTrustConvAvailableData(tc.description);
  const heroVariant  = selectHeroVariant(strategy, heroData);
  const { trustType, conversionType } = selectTrustComponents(strategy, trustData);
  const selectedShowcase = selectShowcaseComponent(strategy, showcaseData);

  console.log(`\n  ▶ Component selection:`);
  console.log(`    heroVariant:  ${heroVariant ?? "template-default"}`);
  console.log(`    trust:        ${trustType ?? "NONE"}`);
  console.log(`    conversion:   ${conversionType ?? "NONE"}`);
  console.log(`    showcase:     ${selectedShowcase ?? "NONE (suppressed by extract gate)"}`);

  const matchesExpected = selectedShowcase === (tc.expectedShowcase ?? null);
  console.log(`    ✓ Matches expected: ${matchesExpected ? "YES" : "⚠ NO — check gate logic"}`);

  // Step 4: Build patched template
  const baseTemplate = selectTemplate(templateCategory);
  let selectedTemplate: SiteTemplate = heroVariant
    ? { ...baseTemplate, sections: baseTemplate.sections.map((s) => s.type === "hero" ? { ...s, variant: heroVariant } : s) }
    : baseTemplate;

  // Inject showcase FIRST (Phase 2c)
  if (selectedShowcase) {
    const contactIdx = selectedTemplate.sections.findIndex((s) => s.type === "contact-block");
    const insertAt = contactIdx >= 0 ? contactIdx : selectedTemplate.sections.length;
    const showcaseSection: TemplateSection = {
      type: selectedShowcase, variant: "", imageSlots: selectedShowcase === "membership-plans-display" ? 0 : 4, required: false,
    };
    const patchedSections = [...selectedTemplate.sections];
    patchedSections.splice(insertAt, 0, showcaseSection);
    selectedTemplate = { ...selectedTemplate, sections: patchedSections };
  }

  // Inject trust + conversion sections (Phase 2b)
  const selectedTrustComponents = [trustType, conversionType].filter(Boolean) as string[];
  if (selectedTrustComponents.length > 0) {
    const contactIdx = selectedTemplate.sections.findIndex((s) => s.type === "contact-block");
    const insertAt = contactIdx >= 0 ? contactIdx : selectedTemplate.sections.length;
    const tcSections: TemplateSection[] = selectedTrustComponents.map((type) => ({
      type, variant: "", imageSlots: type === "agent-card" ? 1 : 0, required: false,
    }));
    const patchedSections = [...selectedTemplate.sections];
    patchedSections.splice(insertAt, 0, ...tcSections);
    selectedTemplate = { ...selectedTemplate, sections: patchedSections };
  }

  console.log(`    template: ${selectedTemplate.id}`);
  console.log(`    sections: [${selectedTemplate.sections.map((s) => s.type + (s.required ? "" : "?")).join(", ")}]`);

  // Step 5: GPT fill
  console.log(`\n  ▶ GPT fill (gpt-4o)...`);
  const contactBlock = extractContactBlock(tc.description);
  const systemPrompt = buildFillSystem(
    selectedTemplate, contactBlock, strategy, heroVariant,
    selectedTrustComponents,
    selectedShowcase ? [selectedShowcase] : null,
  );
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Owner's description:\n${tc.description}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.5,
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec> & { designDNA?: unknown };
  let spec: WebsiteSpec = {
    businessName: parsed.businessName ?? "Business",
    category: templateCategory,
    sections: parsed.sections ?? [],
    ...(parsed.designDNA ? { designDNA: parsed.designDNA as WebsiteSpec["designDNA"] } : {}),
    accentColor: (parsed as { accentColor?: string }).accentColor,
  };
  console.log(`    GPT returned ${spec.sections.length} sections`);

  // Step 6: Enforce + verify
  enforceTemplate(spec, selectedTemplate);
  verifyTrustComponents(spec);
  verifyShowcaseComponents(spec);

  // Check post-verify showcase presence
  const hasShowcase = selectedShowcase ? spec.sections.some((s) => s.type === selectedShowcase) : false;
  const showcaseSec = spec.sections.find((s) => s.type === selectedShowcase);

  console.log(`\n  ▶ Post-verify showcase:`);
  if (!selectedShowcase) {
    console.log(`    Showcase not selected (extract gate) — section absent ✓`);
  } else if (hasShowcase) {
    const c = showcaseSec!.content as Record<string, unknown>;
    const itemsKey = selectedShowcase === "property-listings-grid" ? "listings"
      : selectedShowcase === "treatment-gallery" ? "services"
      : selectedShowcase === "portfolio-grid" ? "projects"
      : "tiers";
    const items = Array.isArray(c[itemsKey]) ? (c[itemsKey] as unknown[]).length : 0;
    console.log(`    ${selectedShowcase} present ✓ (${items} ${itemsKey})`);
    // Log first item for verification
    if (items > 0) {
      const first = (c[itemsKey] as unknown[])[0] as Record<string, unknown>;
      console.log(`    First item: ${JSON.stringify(first).slice(0, 120)}`);
    }
  } else {
    console.log(`    ${selectedShowcase} was selected but REMOVED by verifyShowcaseComponents (GPT returned empty data)`);
  }

  const sectionList = spec.sections.map((s) => {
    const v = (s as { variant?: string }).variant;
    return `${s.type}${v ? `/${v}` : ""}`;
  });
  console.log(`\n  Final sections: [${sectionList.join(", ")}]`);

  // Step 7: Images
  console.log(`\n  ▶ Fetching images...`);
  const usedUrls = new Set<string>();
  const images = await fetchSpecImages(spec, usedUrls);
  console.log(`    Fetched: ${Object.keys(images).length} images`);

  // Step 8: Render
  const html = renderWebsite(spec, images, undefined, "English");
  const outFile = `e2e-phase2c-${index + 1}-${tc.id}.html`;
  const outPath = path.join(process.cwd(), "src/scripts", outFile);
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`\n  ✓ Saved: ${outFile} (${(html.length / 1024).toFixed(1)} KB)`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  Phase 2c End-to-End Test — Showcase Pool (8 cases)            ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set — run with: npx tsx --env-file .env.local");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let i = 0; i < TEST_CASES.length; i++) {
    await runTest(openai, TEST_CASES[i], i);
  }

  console.log(`\n${"═".repeat(66)}`);
  console.log("  Phase 2c test complete.");
  console.log("  Output files: src/scripts/e2e-phase2c-*.html");
  console.log("  Open each file in a browser at 375px and 1280px to verify:");
  console.log("    • property-listings-grid: 3-col → 2-col → 1-col at 768/480px");
  console.log("    • portfolio-grid: 3-col → 2-col → 1-col at 768/480px");
  console.log("    • treatment-gallery: auto-fill grid → 1-col at 480px");
  console.log("    • membership-plans-display: flex-wrap → 100% at 480px");
  console.log(`${"═".repeat(66)}\n`);
}

main().catch((err) => {
  console.error("❌ Phase 2c test failed:", err);
  process.exit(1);
});
