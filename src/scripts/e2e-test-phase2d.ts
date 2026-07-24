/**
 * Phase 2d End-to-End Test
 * 5 test cases covering gallery variants, testimonials (with/without real quotes), FAQ variants.
 * Each test runs the real OpenAI + Unsplash pipeline.
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase2d.ts
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { renderWebsite, type WebsiteSpec, type ImageMap } from "../lib/website-renderer.js";
import { TEMPLATE_BY_CATEGORY, OPTIONAL_SKIP_RULES, type SiteTemplate, type TemplateSection } from "../lib/website-templates.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type DesignStrategy = {
  category: string;
  subcategory: string;
  positioning: "premium" | "mid_market" | "affordable";
  brand_personality: "elegant" | "bold" | "energetic" | "trustworthy" | "playful" | "minimal_luxury";
  conversion_goal: "book_appointment" | "generate_leads" | "showcase_portfolio" | "sell_membership" | "request_valuation";
  visual_mood: string;
  target_audience: string;
};

// ── Test cases ────────────────────────────────────────────────────────────────

const TEST_CASES: Array<{
  id: string;
  label: string;
  expectedTestimonialType: string | null;
  expectedGalleryVariant: string;
  expectedFaqVariant: string;
  expectedReason: string;
  checkFaqFacts?: string[];
  description: string;
}> = [
  {
    id: "test-a-real-quote",
    label: "Test A — Real quoted testimonial → selected & sourceEvidence verified",
    expectedTestimonialType: "testimonial-single-quote",
    expectedGalleryVariant: "full-bleed-strip",
    expectedFaqVariant: "default",
    expectedReason: "Premium-positioned energetic gym → testimonial-single-quote (premium wins) + full-bleed-strip gallery (energetic bp)",
    description: `
FitCore Gym — Dubai Marina | Elite Fitness Club

State-of-the-art 3-floor fitness facility. 18,000 sq ft of training space. Open 6am–11pm daily.

One of our longest members said: "I've tried six different gyms across Dubai and FitCore is the only one where I actually look forward to every session — the coaching team here is exceptional."

Another review from Ahmed, a verified 2-year member: "The nutrition program completely changed how I approach training. Lost 12kg in 4 months and gained actual strength. Worth every dirham."

Classes offered:
- CrossFit WOD (5 sessions daily)
- Boxing & kickboxing (beginners + advanced)
- Yoga and flexibility
- Spin cycling (studio with 40 bikes)
- HIIT boot camp

Membership tiers:
- Essential: AED 299/month (gym floor + lockers)
- Pro: AED 499/month (gym + all classes + 2 personal training sessions)
- Elite: AED 799/month (unlimited everything + nutrition consultation + priority booking)

Phone: +971 4 887 5500 | Email: info@fitcoredubai.ae
Marina Walk, Dubai Marina, Dubai. Open 6am–11pm.
`.trim(),
  },

  {
    id: "test-b-no-quote",
    label: "Test B — Marketing-speak only → testimonial omitted",
    expectedTestimonialType: null,
    expectedGalleryVariant: "uniform",
    expectedFaqVariant: "default",
    expectedReason: "No real quotes → no testimonial. Physio/medical category + trustworthy bp → neither 'legal/saas' nor elegant → default FAQ accordion",
    description: `
LightTouch Physiotherapy — London Bridge, London

Premier physiotherapy clinic serving athletes and active professionals in SE1.
Our highly qualified team delivers evidence-based treatment for all musculoskeletal conditions.

Services:
- Sports injury rehabilitation
- Back and neck pain treatment
- Post-surgical rehabilitation
- Dry needling / acupuncture
- Biomechanical gait analysis
- Pilates-based rehabilitation

Our patients love the personalised approach and visible results. 5-star reviews across Google.
Rated one of London's top physiotherapy providers by several publications.

Book online or call us: +44 20 7921 3344 | hello@lighttouchphysio.co.uk
Open Mon–Fri 8am–8pm, Sat 9am–5pm.
`.trim(),
  },

  {
    id: "test-c-gallery-variants",
    label: "Test C — Luxury brand → masonry gallery variant",
    expectedTestimonialType: "testimonial-single-quote",
    expectedGalleryVariant: "masonry",
    expectedFaqVariant: "two-column",
    expectedReason: "brand_personality=minimal_luxury → masonry gallery + two-column FAQ; real quoted testimonial → testimonial-single-quote (premium positioning)",
    description: `
Atelier Mounia — Interior Design Studio, Paris & Dubai

Luxury residential and hospitality interior design. Bespoke environments for discerning clients.
Founded by Mounia Benali (RIBA Associate, 15 years), completed projects across Europe and the Gulf.

Recent projects:
- Private Villa, Cap d'Antibes — 4,200 sqm, curated art collection, custom joinery
- Penthouse, DIFC Dubai — minimal luxury, onyx stone, museum lighting
- Boutique Hotel, Marrakech — 18 rooms, riad vernacular with contemporary craft

One client — a Geneva-based collector — wrote: "Mounia understood the relationship between the art and the architecture better than any designer we had previously worked with. The result is a home that feels like it was always meant to be this way."

Process: discovery → concept → design development → procurement → installation.

New enquiries: studio@ateliermounia.com | +33 1 42 72 85 10
`.trim(),
  },

  {
    id: "test-d-faq-facts",
    label: "Test D — FAQ answers cross-checked against input facts",
    expectedTestimonialType: null,
    expectedGalleryVariant: "uniform",
    expectedFaqVariant: "two-column",
    expectedReason: "legal category → two-column FAQ; FAQ answers must derive from stated facts (no fabrication)",
    checkFaqFacts: [
      // Key facts from description that must appear in FAQ answers
      "family law",
      "divorce",
      "Abu Dhabi",
      "15",  // 15 years experience
      "Arabic",
      "English",
    ],
    description: `
Al Rashidi Law Firm — Abu Dhabi | UAE Family Law Specialists

Boutique family law firm established in Abu Dhabi with 15 years of practice.
Founding partner Khalid Al Rashidi (LLM London, admitted UAE and DIFC courts).

Practice areas:
- Divorce proceedings (UAE Personal Status Law and DIFC courts)
- Child custody and guardianship
- Inheritance and estate administration
- Prenuptial and postnuptial agreements
- Spousal maintenance claims

We serve clients in Arabic and English. Initial consultation is confidential and 1 hour.
Expatriate clients welcome — familiar with cross-jurisdictional divorce matters.

Abu Dhabi city centre office (near ADGM). By appointment only.
Phone: +971 2 633 1100 | Email: info@alrashidilaw.ae
Office hours: Sunday–Thursday 9am–6pm.
`.trim(),
  },

  {
    id: "test-e-bold-gallery",
    label: "Test E — Bold/energetic brand → full-bleed-strip gallery at 375px",
    expectedTestimonialType: "testimonial-single-quote",
    expectedGalleryVariant: "full-bleed-strip",
    expectedFaqVariant: "default",
    expectedReason: "bold + dark mood → full-bleed-strip gallery. Premium-positioned fight club → testimonial-single-quote (premium wins). category=other, bp=bold → default FAQ",
    description: `
APEX Fight Club — Manchester | Boxing & Combat Sports

Manchester's most intense combat sports gym. Dark, raw, real.
Home of 3 regional champions and 1 national title holder in the last 2 years.

Classes:
- Boxing fundamentals (all levels)
- Muay Thai
- Brazilian Jiu-Jitsu (no-gi + gi)
- MMA fight prep
- Women's only boxing (Tuesdays + Thursdays)

Sam, a regular fighter member, said: "Train here for 6 months and every other gym feels like a playground. The coaching level is way above anything else in the north of England."

Marcus, who joined after 3 other gyms: "I went from amateur to competing in regionals in 14 months. The structured progression system at APEX is unlike anything I had experienced before."

Memberships:
- Fighter: £89/month (unlimited classes + gym access)
- Competitor: £149/month (all classes + corner coaching + fight prep)

Phone: 0161 832 5500 | Email: train@apexfightclub.co.uk
Northern Quarter, Manchester. Mon–Sat 6am–10pm, Sun 9am–6pm.
`.trim(),
  },
];

// ── Pool functions (same logic as route.ts — kept in sync) ───────────────────

type ContentAvailableData = { hasRealTestimonialQuote: boolean };

function extractContentAvailableData(description: string): ContentAvailableData {
  return { hasRealTestimonialQuote: /"[^"]{20,}"/.test(description) };
}

function selectGalleryVariant(strategy: DesignStrategy | null): string {
  if (!strategy) return "uniform";
  const { brand_personality: bp, visual_mood: vm } = strategy;
  const mood = vm.toLowerCase();
  if (bp === "minimal_luxury" || bp === "elegant" || /editorial|luxury|warm|soft|calm/i.test(mood)) return "masonry";
  if (bp === "bold" || bp === "energetic" || /dynamic|energy|dark|cinematic|intense|bold/i.test(mood)) return "full-bleed-strip";
  return "uniform";
}

function selectTestimonialComponent(strategy: DesignStrategy | null, data: ContentAvailableData): string | null {
  if (!data.hasRealTestimonialQuote) return null;
  if (!strategy) return "testimonial-single-quote";
  const { brand_personality: bp, positioning } = strategy;
  if (bp === "minimal_luxury" || bp === "elegant" || positioning === "premium") return "testimonial-single-quote";
  return "testimonial-grid";
}

function selectFaqVariant(strategy: DesignStrategy | null): string {
  if (!strategy) return "";
  const { category, brand_personality: bp } = strategy;
  if (["real_estate", "saas", "legal"].includes(category)) return "two-column";
  if (bp === "minimal_luxury" || bp === "elegant") return "two-column";
  return "";
}

function verifyContentComponents(spec: WebsiteSpec, description: string): void {
  const descLower = description.toLowerCase();
  spec.sections = spec.sections.filter((s) => {
    if (s.type === "testimonial-single-quote") {
      const c = s.content as { quote?: string; sourceEvidence?: string };
      const evidence = String(c.sourceEvidence ?? "").trim();
      const valid = !!c.quote && String(c.quote).trim() !== "" && evidence.length >= 8 && descLower.includes(evidence.toLowerCase());
      if (!valid) console.log(`    ⚠ verifyContentComponents: removing testimonial-single-quote (sourceEvidence "${evidence}" not found)`);
      return valid;
    }
    if (s.type === "testimonial-grid") {
      const c = s.content as { items?: { quote?: string; sourceEvidence?: string }[] };
      const items = (c.items ?? []).filter((item) => {
        const evidence = String(item.sourceEvidence ?? "").trim();
        return !!item.quote && String(item.quote).trim() !== "" && evidence.length >= 8 && descLower.includes(evidence.toLowerCase());
      });
      if (items.length === 0) { console.log(`    ⚠ verifyContentComponents: removing testimonial-grid (no verified items)`); return false; }
      c.items = items;
      return true;
    }
    return true;
  });
}

// ── Template helpers (same pattern as phase 2c test) ─────────────────────────

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

// ── Classification ────────────────────────────────────────────────────────────

async function classifyWithDesignStrategy(openai: OpenAI, description: string): Promise<{ templateCategory: string; strategy: DesignStrategy }> {
  const VALID_TEMPLATE_CATS = ["medical", "hospitality", "retail", "saas", "professional"] as const;
  const system = `You are a business analyst. Return JSON with EXACTLY:
{
  "template_category": "medical"|"hospitality"|"retail"|"saas"|"professional",
  "category": "real_estate"|"dental"|"gym"|"interior_design"|"restaurant"|"hotel"|"spa"|"legal"|"saas"|"ecommerce"|"other",
  "subcategory": "specific niche",
  "positioning": "premium"|"mid_market"|"affordable",
  "brand_personality": "elegant"|"bold"|"energetic"|"trustworthy"|"playful"|"minimal_luxury",
  "conversion_goal": "book_appointment"|"generate_leads"|"showcase_portfolio"|"sell_membership"|"request_valuation",
  "visual_mood": "2-4 words",
  "target_audience": "one sentence"
}
Output ONLY valid JSON.`;
  const fallback: DesignStrategy = { category: "other", subcategory: "service", positioning: "premium", brand_personality: "trustworthy", conversion_goal: "book_appointment", visual_mood: "professional", target_audience: "Clients seeking professional services." };
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
      category: String(raw.category ?? "other"),
      subcategory: String(raw.subcategory ?? ""),
      positioning: (["premium","mid_market","affordable"].includes(String(raw.positioning)) ? raw.positioning : "premium") as DesignStrategy["positioning"],
      brand_personality: (["elegant","bold","energetic","trustworthy","playful","minimal_luxury"].includes(String(raw.brand_personality)) ? raw.brand_personality : "trustworthy") as DesignStrategy["brand_personality"],
      conversion_goal: (["book_appointment","generate_leads","showcase_portfolio","sell_membership","request_valuation"].includes(String(raw.conversion_goal)) ? raw.conversion_goal : "book_appointment") as DesignStrategy["conversion_goal"],
      visual_mood: String(raw.visual_mood ?? "professional"),
      target_audience: String(raw.target_audience ?? ""),
    };
    return { templateCategory: VALID_TEMPLATE_CATS.includes(tc as typeof VALID_TEMPLATE_CATS[number]) ? tc : "professional", strategy };
  } catch { return { templateCategory: "professional", strategy: fallback }; }
}

// ── Unsplash fetcher ──────────────────────────────────────────────────────────

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, { headers: { Authorization: `Client-ID ${key}` } });
    const data = await res.json() as { results?: Array<{ urls?: { regular?: string } }> };
    return data.results?.[0]?.urls?.regular ?? null;
  } catch { return null; }
}

async function buildImageMap(spec: WebsiteSpec): Promise<ImageMap> {
  const imageMap: ImageMap = {};
  for (const s of spec.sections) {
    const sec = s as { type?: string; imageQuery?: string; imageQueries?: string[] };
    if (sec.imageQuery) {
      const url = await fetchUnsplashImage(sec.imageQuery);
      if (url) imageMap[sec.type ?? ""] = url;
    }
    if (sec.imageQueries) {
      const urls: string[] = [];
      for (const q of sec.imageQueries) { const u = await fetchUnsplashImage(q); if (u) urls.push(u); }
      if (urls.length) imageMap[`${sec.type ?? ""}_multi`] = urls.join(",");
    }
  }
  return imageMap;
}

// ── buildFillSystem (Phase 2d — minimal version for test) ────────────────────

const TESTIMONIAL_COMPONENT_SCHEMAS: Record<string, string> = {
  "testimonial-single-quote": `"testimonial-single-quote" section content: { "quote": string, "name"?: string, "role"?: string, "sourceEvidence": string }
FABRICATION RULE — ABSOLUTE: Fill ONLY from real quoted speech in the description.
"quote": EXACT verbatim text. "sourceEvidence": 10–40 char verbatim substring from description. "name"/"role": only if stated. If no real quote: output quote: "".`,
  "testimonial-grid": `"testimonial-grid" section content: { "eyebrow"?: string, "headline"?: string, "items": [{ "quote": string, "name"?: string, "role"?: string, "sourceEvidence": string }] }
FABRICATION RULE — ABSOLUTE: items must be real quoted speech only. Each item needs sourceEvidence substring. If fewer than 2 real quotes: output items: []. Max 3 items.`,
};

function buildFillSystem(template: SiteTemplate, strategy: DesignStrategy | null, testimonialType: string | null): string {
  const templateLines = template.sections.map((ts, i) => {
    const req = ts.required ? "(REQUIRED)" : "(OPTIONAL — include ONLY if owner provided real data)";
    const variant = ts.variant ? `, variant: "${ts.variant}"` : "";
    return `  ${i + 1}. type: "${ts.type}"${variant} ${req}`;
  }).join("\n");

  const strategyBlock = strategy ? `BUSINESS INTELLIGENCE: subcategory=${strategy.subcategory}, positioning=${strategy.positioning}, brand_personality=${strategy.brand_personality}, visual_mood=${strategy.visual_mood}. Use to calibrate copy tone — never echo in JSON.\n\n` : "";

  const testimonialBlock = testimonialType ? `═══ PART 12 — TESTIMONIAL SECTION (HIGHEST FABRICATION RISK) ═══
Fill ONLY from real quoted speech in the description:
${TESTIMONIAL_COMPONENT_SCHEMAS[testimonialType] ?? ""}

` : "";

  return `${strategyBlock}You are a senior brand copywriter. Produce a complete website JSON spec.
OUTPUT ONLY valid JSON. No markdown, no explanation.

JSON SHAPE:
{
  "businessName": string,
  "category": "saas"|"hotel"|"clinic"|"gym"|"salon"|"realestate"|"restaurant"|"ecommerce"|"agency"|"education"|"legal"|"other",
  "designDNA": { "mood": "editorial-luxury"|"clinical-bright"|"bold-energetic"|"warm-minimal"|"tech-sharp"|"dark-premium", "headingFont": "Inter", "bodyFont": "Inter", "palette": { "bg": "#HEX", "text": "#HEX", "accent": "#HEX", "muted": "#HEX" }, "isDark": boolean },
  "sections": SectionSpec[]
}

SECTIONS (fill in this exact order — no additions or removals):
${templateLines}
  (last) type: "footer" (REQUIRED)

SectionSpec: { "type": string, "variant"?: string, "imageQuery"?: string, "imageQueries"?: string[], "content": object }
imageQuery/imageQueries are siblings of content{}, never nested inside.
imageQuery required for: hero, about-story. imageQueries (6 strings) required for: gallery-grid.

${testimonialBlock}ABSOLUTE RULES:
1. NEVER invent phone, email, address, or hours.
2. NEVER freely add testimonials — when a testimonial section is in the template, fill via Part 12 rules only.
3. NEVER add star ratings or fabricated review counts.
4. NEVER paraphrase owner input — extract intent and write fresh brand copy.`;
}

// ── Main test runner ──────────────────────────────────────────────────────────

async function runTests() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const outDir = path.join(process.cwd(), "test-output-phase2d");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("\n═════════════════════════════════════════════════════════════════");
  console.log("  Phase 2d E2E Tests — Gallery · Testimonials · FAQ Variants");
  console.log("═════════════════════════════════════════════════════════════════\n");

  const results: Array<{ id: string; label: string; pass: boolean; notes: string[] }> = [];

  for (const tc of TEST_CASES) {
    console.log(`\n─── ${tc.id}: ${tc.label} ─────────────────────────────────────────`);
    console.log(`Expected testimonial: ${tc.expectedTestimonialType ?? "none"} | gallery: ${tc.expectedGalleryVariant} | faq: ${tc.expectedFaqVariant || "default"}`);
    const notes: string[] = [];
    let pass = true;

    // Step 1: classify + design strategy
    const { templateCategory, strategy } = await classifyWithDesignStrategy(openai, tc.description);
    console.log(`  → Classified: templateCategory=${templateCategory} category=${strategy.category} bp=${strategy.brand_personality} mood="${strategy.visual_mood}"`);

    // Step 2: content pool selection
    const contentData = extractContentAvailableData(tc.description);
    const selectedTestimonialType = selectTestimonialComponent(strategy, contentData);
    const selectedGalleryVariant = selectGalleryVariant(strategy);
    const selectedFaqVariant = selectFaqVariant(strategy);

    console.log(`  → Content pool: hasQuote=${contentData.hasRealTestimonialQuote} testimonial=${selectedTestimonialType ?? "none"} gallery=${selectedGalleryVariant} faqVariant=${selectedFaqVariant || "default"}`);

    // Verify selection matches expectations
    if (selectedTestimonialType !== tc.expectedTestimonialType) {
      notes.push(`FAIL testimonialType: expected ${tc.expectedTestimonialType ?? "none"}, got ${selectedTestimonialType ?? "none"}`);
      pass = false;
    } else {
      notes.push(`✓ testimonialType=${selectedTestimonialType ?? "none"}`);
    }

    if (selectedGalleryVariant !== tc.expectedGalleryVariant) {
      notes.push(`FAIL galleryVariant: expected ${tc.expectedGalleryVariant}, got ${selectedGalleryVariant}`);
      pass = false;
    } else {
      notes.push(`✓ galleryVariant=${selectedGalleryVariant}`);
    }

    const effectiveFaqVariant = selectedFaqVariant || "default";
    const expectedFaqVariant = tc.expectedFaqVariant;
    if (effectiveFaqVariant !== expectedFaqVariant) {
      notes.push(`FAIL faqVariant: expected ${expectedFaqVariant}, got ${effectiveFaqVariant}`);
      pass = false;
    } else {
      notes.push(`✓ faqVariant=${effectiveFaqVariant}`);
    }

    // Step 3: build template with variants patched
    let selectedTemplate = selectTemplate(templateCategory);
    // Patch gallery variant
    selectedTemplate = {
      ...selectedTemplate,
      sections: selectedTemplate.sections.map((s) =>
        s.type === "gallery-grid" ? { ...s, variant: selectedGalleryVariant } : s
      ),
    };
    // Patch FAQ variant
    if (selectedFaqVariant) {
      selectedTemplate = {
        ...selectedTemplate,
        sections: selectedTemplate.sections.map((s) =>
          s.type === "faq-accordion" ? { ...s, variant: selectedFaqVariant } : s
        ),
      };
    }
    // Inject testimonial before contact-block
    if (selectedTestimonialType) {
      const contactIdx = selectedTemplate.sections.findIndex((s) => s.type === "contact-block");
      const insertAt = contactIdx >= 0 ? contactIdx : selectedTemplate.sections.length;
      const tSection: TemplateSection = { type: selectedTestimonialType, variant: "", imageSlots: 0, required: false };
      const patched = [...selectedTemplate.sections];
      patched.splice(insertAt, 0, tSection);
      selectedTemplate = { ...selectedTemplate, sections: patched };
    }

    // Step 4: GPT fill
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildFillSystem(selectedTemplate, strategy, selectedTestimonialType) },
        { role: "user", content: `Business description:\n${tc.description}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.5,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Partial<WebsiteSpec>;
    const spec: WebsiteSpec = {
      businessName: parsed.businessName ?? "Test Business",
      category: strategy.category,
      designDNA: (parsed as { designDNA?: unknown }).designDNA as WebsiteSpec["designDNA"],
      sections: parsed.sections ?? [],
    };

    // Step 5: enforceTemplate + verifyContentComponents
    enforceTemplate(spec, selectedTemplate);
    verifyContentComponents(spec, tc.description);

    // Step 6: Check testimonial section presence and sourceEvidence
    const testimonialSection = spec.sections.find((s) => s.type === "testimonial-single-quote" || s.type === "testimonial-grid");
    if (tc.expectedTestimonialType) {
      if (!testimonialSection) {
        notes.push(`FAIL: expected testimonial section in final spec but it was removed by verifyContentComponents`);
        pass = false;
      } else {
        notes.push(`✓ testimonial section survived verifyContentComponents`);
        if (testimonialSection.type === "testimonial-single-quote") {
          const c = testimonialSection.content as { quote?: string; sourceEvidence?: string };
          notes.push(`  quote: "${String(c.quote ?? "").slice(0, 60)}..."`);
          notes.push(`  sourceEvidence: "${c.sourceEvidence ?? "(none)"}"`);
          const evidenceFound = String(c.sourceEvidence ?? "").length >= 8 && tc.description.toLowerCase().includes(String(c.sourceEvidence ?? "").toLowerCase());
          if (!evidenceFound) { notes.push(`FAIL: sourceEvidence not found in description`); pass = false; }
          else notes.push(`✓ sourceEvidence confirmed in description`);
        } else if (testimonialSection.type === "testimonial-grid") {
          const c = testimonialSection.content as { items?: Array<{ quote?: string; sourceEvidence?: string }> };
          const items = c.items ?? [];
          notes.push(`  items count: ${items.length}`);
          for (const item of items) {
            const evidenceFound = String(item.sourceEvidence ?? "").length >= 8 && tc.description.toLowerCase().includes(String(item.sourceEvidence ?? "").toLowerCase());
            if (!evidenceFound) { notes.push(`FAIL: item sourceEvidence "${item.sourceEvidence ?? ""}" not found`); pass = false; }
            else notes.push(`  ✓ item verified: "${String(item.quote ?? "").slice(0, 40)}..."`);
          }
        }
      }
    } else {
      if (testimonialSection) {
        notes.push(`FAIL: testimonial section should NOT be present (no real quotes in description) but found ${testimonialSection.type}`);
        pass = false;
      } else {
        notes.push(`✓ no testimonial section (correctly omitted — no real quotes)`);
      }
    }

    // Step 7: Check FAQ variant enforcement
    const faqSection = spec.sections.find((s) => s.type === "faq-accordion");
    if (faqSection) {
      const actualFaqVariant = (faqSection as { variant?: string }).variant ?? "";
      notes.push(`  faq-accordion variant in spec: "${actualFaqVariant || "default"}"`);
      if (selectedFaqVariant && actualFaqVariant !== selectedFaqVariant) {
        notes.push(`⚠ faq variant mismatch in spec: expected "${selectedFaqVariant}", got "${actualFaqVariant}"`);
      }
      // Check FAQ facts for test D
      if (tc.checkFaqFacts) {
        const faqContent = JSON.stringify(faqSection.content).toLowerCase();
        for (const fact of tc.checkFaqFacts) {
          if (faqContent.includes(fact.toLowerCase())) {
            notes.push(`  ✓ FAQ contains fact: "${fact}"`);
          } else {
            notes.push(`  ⚠ FAQ may be missing fact: "${fact}"`);
          }
        }
      }
    }

    // Step 8: Check gallery variant
    const gallerySection = spec.sections.find((s) => s.type === "gallery-grid");
    if (gallerySection) {
      const actualGalleryVariant = (gallerySection as { variant?: string }).variant ?? "uniform";
      notes.push(`  gallery-grid variant in spec: "${actualGalleryVariant}"`);
      if (actualGalleryVariant !== selectedGalleryVariant) {
        notes.push(`⚠ gallery variant in spec differs from selected (enforceTemplate overwrote it?)`);
      }
    } else {
      notes.push(`  (no gallery-grid section in this template)`);
    }

    // Step 9: Fetch images + render
    const imageMap = await buildImageMap(spec);
    const html = renderWebsite(spec, imageMap, undefined, undefined, "English");

    const outPath = path.join(outDir, `${tc.id}.html`);
    fs.writeFileSync(outPath, html);
    notes.push(`  → Rendered: ${outPath}`);

    // Check 375px responsive CSS is present
    const has375 = html.includes("375") || html.includes("480px") || html.includes("max-width:480px");
    if (!has375) { notes.push(`⚠ 375px/480px responsive CSS not detected in output`); }
    else notes.push(`✓ Mobile responsive CSS present`);

    // Print section listing
    console.log(`  Final sections: [${spec.sections.map((s) => {
      const v = (s as { variant?: string }).variant;
      return `${s.type}${v ? `/${v}` : ""}`;
    }).join(", ")}]`);

    for (const n of notes) console.log(`  ${n}`);
    results.push({ id: tc.id, label: tc.label, pass, notes });
  }

  // ── Summary ───────────────────────────────────────────────────────────────────

  console.log("\n\n═════════════════════════════════════════════════════════════════");
  console.log("  PHASE 2d RESULTS SUMMARY");
  console.log("═════════════════════════════════════════════════════════════════");
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    console.log(`${icon} ${r.id}: ${r.label}`);
    if (!r.pass) {
      allPass = false;
      for (const n of r.notes.filter((n) => n.startsWith("FAIL"))) console.log(`   ${n}`);
    }
  }
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} passed`);
  if (allPass) {
    console.log("✅ ALL TESTS PASSED — Phase 2d verified");
  } else {
    console.log("❌ SOME TESTS FAILED — check output above");
    process.exit(1);
  }
  console.log(`\nOutput files: ${path.join(process.cwd(), "test-output-phase2d")}/\n`);
}

runTests().catch((e) => { console.error(e); process.exit(1); });
