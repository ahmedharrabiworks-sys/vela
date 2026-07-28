/**
 * Phase 4 Real-Pipeline Verification — GPT imageQuery compliance
 *
 * Static Phase 4 tests confirmed dicts and Part 7 text are correct. This test
 * closes the live-GPT gap: generates 2 real sites through gpt-4o with the new
 * Part 7 instructions and inspects whether GPT actually complied.
 *
 * Test A — Dental clinic explicitly named in Casablanca, Morocco
 * Test B — Real estate agency explicitly named in Marrakech, Morocco
 *
 * For each: print every imageQuery/imageQueries value GPT returned, then check
 * for city/country terms. Prints actual strings regardless of pass/fail.
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase4-real.ts
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const OUT_DIR = path.join(process.cwd(), "test-output-phase4-real");
fs.mkdirSync(OUT_DIR, { recursive: true });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let totalChecks = 0;
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else { failed++; console.error(`  ❌ ${label}${detail ? `\n       → ${detail}` : ""}`); }
}

// City/country terms to detect
const CITY_TERMS = [
  "casablanca","morocco","marrakech","rabat","fez","tangier",
  "tunis","tunisia","dubai","abu dhabi","uae","riyadh","saudi",
  "cairo","egypt","beirut","lebanon","istanbul","turkey",
  "paris","france","london","england","uk","berlin","germany",
  "new york","los angeles","miami","chicago",
  "qatar","doha","kuwait","bahrain","jordan","amman",
  "algiers","algeria","libya","libya","tripoli",
];

function cityInQuery(q: string): string | null {
  const lower = q.toLowerCase();
  return CITY_TERMS.find((c) => lower.includes(c)) ?? null;
}

// Recursively collect all imageQuery/imageQueries from a parsed spec
function collectQueries(obj: unknown, results: { field: string; value: string }[] = [], path = ""): { field: string; value: string }[] {
  if (typeof obj === "string") return results;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collectQueries(item, results, `${path}[${i}]`));
    return results;
  }
  if (typeof obj === "object" && obj !== null) {
    const rec = obj as Record<string, unknown>;
    if (typeof rec.imageQuery === "string") {
      results.push({ field: `${path}.imageQuery`, value: rec.imageQuery });
    }
    if (Array.isArray(rec.imageQueries)) {
      (rec.imageQueries as unknown[]).forEach((q, i) => {
        if (typeof q === "string") results.push({ field: `${path}.imageQueries[${i}]`, value: q });
      });
    }
    for (const k of Object.keys(rec)) {
      if (k !== "imageQuery" && k !== "imageQueries") {
        collectQueries(rec[k], results, path ? `${path}.${k}` : k);
      }
    }
  }
  return results;
}

// The Part 7 rules as deployed in production buildFillSystem (v2 path, !hasOwnerPhoto branch)
// These are the exact instructions GPT receives. Keep in sync with route.ts PART 7 changes.
const PART7_RULES = `
═══════════════════════════════════════════════════════
PART 7 — IMAGE QUERY RULES
═══════════════════════════════════════════════════════

imageQuery is an Unsplash search string. Required for: hero, about-story.
imageQueries (array) required for: gallery-grid (6 strings), listings-grid (3–6 strings).

BUILD SUBJECT-SPECIFIC QUERIES — describe WHAT THE PHOTO SHOWS, NOT where the business is located:

imageQuery = [VISUAL SUBJECT] [AESTHETIC/MOOD] [QUALITY SUFFIX]

ABSOLUTE RULE: NEVER include city names, country names, or region names in any image query.
The query describes what appears in the photo, not where the business operates.

VISUAL SUBJECT = the specific physical thing the photo shows:
• dental/clinic → "dental treatment room" / "modern clinic reception area" / "orthodontic equipment clean"
• gym → "weight training floor equipment" / "group fitness class studio" / "functional training area"
• real estate → "luxury villa exterior pool" / "apartment living room natural light" / "kitchen marble countertop"
• restaurant → "elegant dining room table setting" / "open kitchen chef cooking" / "dessert plating close-up"
• salon/beauty → "salon styling station interior" / "spa treatment room minimal" / "manicure station warm light"
• hotel → "luxury hotel lobby interior warm" / "hotel suite editorial light" / "pool terrace daylight minimal"
• legal → "law firm boardroom dark wood bookshelf" / "attorney office professional editorial"
• saas/agency → "modern office open workspace bright airy" / "team collaboration studio natural light"

AESTHETIC/MOOD (match to the site mood):
  editorial-luxury / warm-minimal → "warm editorial" / "natural light" / "minimal clean"
  bold-energetic / dark-premium → "dramatic lighting" / "cinematic dark" / "high contrast"
  clinical-bright → "bright white" / "clean minimal" / "professional"

EXAMPLES (zero city/country in any query):
• Dental hero      → "dental treatment room bright white clean minimal professional photography"
• Real estate hero  → "luxury villa exterior pool architecture daylight editorial"
• Gym hero          → "premium gym training floor equipment cinematic dramatic lighting editorial"
• Restaurant about  → "chef open kitchen fire cooking editorial warm dramatic"
• Real estate about → "real estate agent modern office interior bright professional"
• Dental gallery item → "teeth whitening treatment close-up clinical bright editorial"
• Property listing  → "contemporary apartment living room natural light minimal architectural"
• Gym listing       → "gym equipment dumbbell rack weight training detail editorial"

gallery-grid / listings-grid: vary subject, angle, detail — each query must be distinct.

QUALITY SUFFIX: append one of these to every imageQuery:
  hero/about-story → "bright natural light" or "professional photography" or "editorial minimal"
  gallery/listings → "editorial" or "close-up detail" or "architectural"
`.trim();

// Minimal system prompt — representative of what production buildFillSystem sends
function buildTestSystemPrompt(category: string): string {
  return `You are a senior brand copywriter. Produce a complete website JSON spec.
OUTPUT ONLY valid JSON. No markdown, no explanation.

JSON SHAPE:
{
  "businessName": string,
  "category": "${category}",
  "designDNA": {
    "mood": "editorial-luxury"|"clinical-bright"|"bold-energetic"|"warm-minimal"|"tech-sharp"|"dark-premium",
    "headingFont": string,
    "bodyFont": string,
    "palette": { "bg": "#HEX", "text": "#HEX", "accent": "#HEX", "muted": "#HEX" },
    "isDark": boolean
  },
  "sections": SectionSpec[]
}

SECTIONS (fill in this exact order):
  1. type: "hero" (REQUIRED) — imageQuery REQUIRED
  2. type: "about-story" (OPTIONAL) — imageQuery REQUIRED if included
  3. type: "contact-block" (REQUIRED)
  4. type: "footer" (REQUIRED)

SectionSpec structure (imageQuery MUST be a sibling of content, NOT nested inside it):
{ "type": string, "variant": string, "imageQuery"?: string, "content": object }

${PART7_RULES}

═══════════════════════════════════════════════════════
PART 8 — SECTION SCHEMAS
═══════════════════════════════════════════════════════

hero — imageQuery REQUIRED:
{ "eyebrow": "3–5 words", "headline": "5–8 words", "subheadline": "1–2 sentences", "ctaPrimary": "action label" }

about-story — imageQuery REQUIRED if included:
{ "eyebrow"?: string, "headline": string, "body": string }

contact-block:
{ "headline": string, "phone"?: string, "email"?: string, "address"?: string, "ctaLabel": string }

footer:
{ "tagline": string, "links": string[], "phone"?: string, "email"?: string, "address"?: string }

ABSOLUTE RULES:
1. NEVER invent phone, email, address, or hours not provided by the owner.
2. NEVER add star ratings, review counts, or fabricated statistics.
3. imageQuery/imageQueries MUST be siblings of content{}, never nested inside it.`;
}

// ── Test runner ───────────────────────────────────────────────────────────────

const TEST_CASES = [
  {
    id: "A",
    label: "Dental clinic — Casablanca, Morocco",
    category: "clinic",
    description: `
Smile Dental Clinic — Casablanca, Morocco

Modern dental clinic located in the heart of Casablanca serving patients across Morocco.

Services:
- Teeth whitening (Zoom)
- Dental implants
- Orthodontics (Invisalign and braces)
- Cosmetic veneers
- General and family dentistry

Our team of 3 specialist dentists and 2 orthodontists.
State-of-the-art digital X-ray and panoramic imaging.

Phone: +212 522 123 456 | info@smiledental.ma
Address: 45 Boulevard Mohammed V, Casablanca 20000
Hours: Mon–Fri 9am–7pm, Sat 9am–3pm
    `.trim(),
  },
  {
    id: "B",
    label: "Real estate agency — Marrakech, Morocco",
    category: "realestate",
    description: `
Palmeraie Properties — Marrakech, Morocco

Luxury real estate agency specialising in high-end riads, villas, and modern apartments in Marrakech.

Portfolio:
- Traditional riads in the Medina (from 2.5M MAD)
- Contemporary villas in the Palmeraie (from 8M MAD)
- Modern apartments in Hivernage and Gueliz
- Off-plan developments

Services: buyer representation, property management, investment advisory, relocation.

Phone: +212 524 456 789 | contact@palmeraieproperties.ma
Office: 12 Rue de la Liberté, Gueliz, Marrakech
    `.trim(),
  },
];

async function runTests() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Phase 4 Real-Pipeline GPT Compliance — imageQuery audit");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\nModel: gpt-4o  |  Tests: ${TEST_CASES.length}  |  City terms checked: ${CITY_TERMS.length}`);
  console.log("Checking whether GPT complies with new Part 7 (VISUAL SUBJECT formula,");
  console.log("ABSOLUTE RULE: no city/country/region names in any imageQuery).\n");

  for (const tc of TEST_CASES) {
    console.log(`\n─── Test ${tc.id}: ${tc.label} ${"─".repeat(50 - tc.label.length)}`);

    const systemPrompt = buildTestSystemPrompt(tc.category);
    let rawJson = "";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: tc.description },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.3,
      });
      rawJson = completion.choices[0]?.message?.content ?? "{}";
    } catch (err) {
      console.error(`  [ERROR] OpenAI call failed: ${err}`);
      failed++;
      totalChecks++;
      continue;
    }

    // Save full raw output for inspection
    const outFile = path.join(OUT_DIR, `test-${tc.id.toLowerCase()}-${tc.category}.json`);
    fs.writeFileSync(outFile, rawJson, "utf-8");
    console.log(`  Saved: ${outFile}`);

    let parsed: unknown;
    try { parsed = JSON.parse(rawJson); } catch {
      console.error("  [ERROR] Failed to parse JSON response");
      failed++; totalChecks++;
      continue;
    }

    // Collect all image queries GPT returned
    const queries = collectQueries(parsed);

    console.log(`\n  Image queries GPT produced (${queries.length} total):`);
    if (queries.length === 0) {
      console.log("  (none — GPT produced no imageQuery/imageQueries fields)");
    } else {
      for (const q of queries) {
        const city = cityInQuery(q.value);
        const flag = city ? ` ⚠️  CITY: "${city}"` : "";
        console.log(`    ${q.field}: "${q.value}"${flag}`);
      }
    }

    console.log("");

    // Checks
    check(`Test ${tc.id}: GPT produced at least 1 imageQuery`, queries.length >= 1,
      "hero section should always have imageQuery");

    const heroQuery = queries.find((q) => q.field.includes("hero") || (queries.indexOf(q) === 0 && q.field.includes("imageQuery")));
    const heroVal = heroQuery?.value ?? queries[0]?.value ?? "";
    check(`Test ${tc.id}: hero imageQuery is non-empty`, heroVal.length > 0);

    const withCity = queries.filter((q) => cityInQuery(q.value) !== null);
    check(
      `Test ${tc.id}: zero city/country terms in ALL imageQuery values (${queries.length} checked)`,
      withCity.length === 0,
      withCity.length > 0
        ? `${withCity.length} violation(s): ${withCity.map((q) => `"${q.value}"`).join(", ")}`
        : undefined
    );

    // Category-specific subject check
    if (tc.category === "clinic") {
      const hasDentalSubject = queries.some((q) =>
        /dental|clinic|treatment|tooth|teeth|reception|orthodon|implant|whitening/i.test(q.value)
      );
      check(`Test ${tc.id}: imageQuery contains dental subject term`, hasDentalSubject,
        `none of ${queries.map((q) => `"${q.value}"`).join(", ")} match dental terms`);
    }
    if (tc.category === "realestate") {
      const hasPropSubject = queries.some((q) =>
        /villa|property|apartment|riad|interior|exterior|architecture|living|kitchen|bedroom/i.test(q.value)
      );
      check(`Test ${tc.id}: imageQuery contains real estate subject term`, hasPropSubject,
        `none of ${queries.map((q) => `"${q.value}"`).join(", ")} match property terms`);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  Phase 4 Real-Pipeline Summary`);
  console.log(`  Total: ${totalChecks}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.error("\n❌ FAILURES DETECTED — see above for actual GPT-produced query strings.");
    console.error("If GPT included city names despite the new Part 7 ABSOLUTE RULE, options are:");
    console.error("  1. Stronger server-side strip: after GPT returns the spec, scan all imageQuery");
    console.error("     fields for known city/country terms and remove them before ensureImageQueries runs.");
    console.error("  2. Add a post-parse validation step that replaces any query containing a location");
    console.error("     term with the server-side HERO_PHOTO_QUERY / PRESET_GALLERY_QUERIES fallback.");
    console.error("  3. Evaluate whether gpt-4o-mini (used in the simplified test classifier) vs gpt-4o");
    console.error("     responds differently to the ABSOLUTE RULE.");
    process.exit(1);
  } else {
    console.log("\n✅ GPT complied with Part 7 on both test cases.");
    console.log("Phase 4 real-pipeline gap is closed — no city/country terms found in GPT-produced queries.");
  }
}

runTests().catch((err) => { console.error(err); process.exit(1); });
