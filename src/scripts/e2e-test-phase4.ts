/**
 * Phase 4 Verification — Image engine rebuild
 *
 * Checks that all Unsplash query construction in route.ts is:
 *   (A) city/location-free in the server-side fallback dicts
 *   (B) city/location-free in every ensureImageQueries construction site
 *   (C) city/location-free in Phase 2c showcase fallbacks
 *   (D) Part 7 (GPT instructions) updated to forbid city/region
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase4.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROUTE_PATH = path.join(process.cwd(), "src/app/api/website/generate/route.ts");
const routeSource = fs.readFileSync(ROUTE_PATH, "utf-8");

let totalChecks = 0;
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}${detail ? `\n       → ${detail}` : ""}`);
  }
}

// Extract a dict literal from source by name → { key: value } map
function extractDict(source: string, constName: string): Record<string, string> {
  const re = new RegExp(`const ${constName}(?:\\s*:[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\};`);
  const m = source.match(re);
  if (!m) return {};
  const body = m[1];
  const result: Record<string, string> = {};
  const entryRe = /(\w+)\s*:\s*"([^"]+)"/g;
  let em: RegExpExecArray | null;
  while ((em = entryRe.exec(body)) !== null) {
    result[em[1]] = em[2];
  }
  return result;
}

// Extract a string array literal from source
function extractArray(source: string, constName: string): string[] {
  const re = new RegExp(`const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = source.match(re);
  if (!m) return [];
  const body = m[1];
  const result: string[] = [];
  const entryRe = /"([^"]+)"/g;
  let em: RegExpExecArray | null;
  while ((em = entryRe.exec(body)) !== null) {
    result.push(em[1]);
  }
  return result;
}

const CITY_TERMS = [
  "tunis", "tunisia", "dubai", "paris", "london", "marrakech", "morocco",
  "casablanca", "rabat", "riyadh", "cairo", "beirut", "istanbul", "doha",
  "qatar", "kuwait", "bahrain", "abu dhabi", "uae", "algeria", "algeria",
  "new york", "los angeles", "miami",
];

function hasCity(q: string): string | null {
  const lower = q.toLowerCase();
  return CITY_TERMS.find((c) => lower.includes(c)) ?? null;
}

// ── Case A: HERO_PHOTO_QUERY — dental clinic in Casablanca ───────────────────

console.log("\n══ A: HERO_PHOTO_QUERY — dental clinic (no city, correct subject) ══\n");

const heroDict = extractDict(routeSource, "HERO_PHOTO_QUERY");
console.log(`  Extracted ${Object.keys(heroDict).length} entries from HERO_PHOTO_QUERY`);

const clinicHero = heroDict["clinic"];
console.log(`  clinic hero query: "${clinicHero}"`);
check("HERO_PHOTO_QUERY[clinic] is defined", !!clinicHero);
check("clinic hero: no city/location term (e.g. Casablanca, Morocco)",
  !hasCity(clinicHero ?? ""), hasCity(clinicHero ?? "") ?? undefined);
check("clinic hero: contains dental subject term",
  /dental|clinic|treatment|reception|white|clean/i.test(clinicHero ?? ""),
  `got: "${clinicHero}"`);

const reHero = heroDict["realestate"];
console.log(`  realestate hero query: "${reHero}"`);
check("HERO_PHOTO_QUERY[realestate] is defined", !!reHero);
check("realestate hero: no city/location term (e.g. Marrakech, London)",
  !hasCity(reHero ?? ""), hasCity(reHero ?? "") ?? undefined);
check("realestate hero: contains property subject term",
  /villa|property|exterior|luxury|interior|architecture/i.test(reHero ?? ""),
  `got: "${reHero}"`);

// All hero dict values must be city-free
let heroAllClean = true;
let heroFailKey = "";
for (const [k, v] of Object.entries(heroDict)) {
  const hit = hasCity(v);
  if (hit) { heroAllClean = false; heroFailKey = `${k}: "${v}" (contains "${hit}")`; break; }
}
check("all HERO_PHOTO_QUERY values are city-free", heroAllClean, heroFailKey);

// ── Case A: ABOUT_PHOTO_QUERY ────────────────────────────────────────────────

console.log("\n══ A (cont): ABOUT_PHOTO_QUERY — dental clinic about section ══\n");

const aboutDict = extractDict(routeSource, "ABOUT_PHOTO_QUERY");
console.log(`  Extracted ${Object.keys(aboutDict).length} entries from ABOUT_PHOTO_QUERY`);

const clinicAbout = aboutDict["clinic"];
console.log(`  clinic about query: "${clinicAbout}"`);
check("ABOUT_PHOTO_QUERY[clinic] is defined", !!clinicAbout);
check("clinic about: no city/location term",
  !hasCity(clinicAbout ?? ""), hasCity(clinicAbout ?? "") ?? undefined);
check("clinic about: contains subject term",
  /dentist|consultation|doctor|patient|clinic|chair/i.test(clinicAbout ?? ""),
  `got: "${clinicAbout}"`);

// ── Case B: real estate in Marrakech ─────────────────────────────────────────

console.log("\n══ B: Real estate queries — no Marrakech/Morocco ══\n");

const reAbout = aboutDict["realestate"];
console.log(`  realestate about query: "${reAbout}"`);
check("ABOUT_PHOTO_QUERY[realestate] is defined", !!reAbout);
check("realestate about: no city/location term",
  !hasCity(reAbout ?? ""), hasCity(reAbout ?? "") ?? undefined);
check("realestate about: contains about subject term",
  /agent|office|professional|estate|consultant/i.test(reAbout ?? ""),
  `got: "${reAbout}"`);

let aboutAllClean = true;
let aboutFailKey = "";
for (const [k, v] of Object.entries(aboutDict)) {
  const hit = hasCity(v);
  if (hit) { aboutAllClean = false; aboutFailKey = `${k}: "${v}" (contains "${hit}")`; break; }
}
check("all ABOUT_PHOTO_QUERY values are city-free", aboutAllClean, aboutFailKey);

// ── Case C: Phase 2c showcase query arrays ────────────────────────────────────

console.log("\n══ C: Phase 2c showcase query arrays ══\n");

const propertyQueries = extractArray(routeSource, "PROPERTY_LISTING_QUERIES");
console.log(`  PROPERTY_LISTING_QUERIES: ${propertyQueries.length} entries`);
check("PROPERTY_LISTING_QUERIES has 6 entries", propertyQueries.length === 6);

let propAllClean = true;
let propFailItem = "";
for (const q of propertyQueries) {
  const hit = hasCity(q);
  if (hit) { propAllClean = false; propFailItem = `"${q}" (contains "${hit}")`; break; }
}
check("all PROPERTY_LISTING_QUERIES are city-free", propAllClean, propFailItem);
check("PROPERTY_LISTING_QUERIES contain property subjects",
  propertyQueries.every((q) => /villa|apartment|kitchen|bedroom|bathroom|garden|property|interior|exterior/i.test(q)),
  "some entries missing property subject");
propertyQueries.forEach((q, i) => console.log(`    [${i}] ${q}`));

const portfolioQueries = extractArray(routeSource, "PORTFOLIO_GRID_QUERIES");
console.log(`\n  PORTFOLIO_GRID_QUERIES: ${portfolioQueries.length} entries`);
check("PORTFOLIO_GRID_QUERIES has 6 entries", portfolioQueries.length === 6);

let portAllClean = true;
let portFailItem = "";
for (const q of portfolioQueries) {
  const hit = hasCity(q);
  if (hit) { portAllClean = false; portFailItem = `"${q}" (contains "${hit}")`; break; }
}
check("all PORTFOLIO_GRID_QUERIES are city-free", portAllClean, portFailItem);
check("PORTFOLIO_GRID_QUERIES contain interior design subjects",
  portfolioQueries.every((q) => /interior|design|room|kitchen|bathroom|dining|office/i.test(q)),
  "some entries missing interior design subject");
portfolioQueries.forEach((q, i) => console.log(`    [${i}] ${q}`));

const treatmentQueries = extractArray(routeSource, "TREATMENT_QUERIES");
console.log(`\n  TREATMENT_QUERIES: ${treatmentQueries.length} entries`);
check("TREATMENT_QUERIES has 6 entries", treatmentQueries.length === 6);
check("all TREATMENT_QUERIES are city-free",
  treatmentQueries.every((q) => !hasCity(q)));
check("TREATMENT_QUERIES contain dental subjects",
  treatmentQueries.every((q) => /dental|teeth|orthodontic|veneer|hygiene|implant|cosmetic/i.test(q)),
  "some entries missing dental subject");
treatmentQueries.forEach((q, i) => console.log(`    [${i}] ${q}`));

// ── Case D: Part 7 GPT instruction strings ────────────────────────────────────

console.log("\n══ D: Part 7 GPT instructions (both buildFillSystem variants) ══\n");

check("Part 7 no longer contains 'city or region' formula",
  !routeSource.includes("[business type] [city or region]"),
  "old formula still present");
check("Part 7 v1 contains new VISUAL SUBJECT formula",
  routeSource.includes("VISUAL SUBJECT] [AESTHETIC/MOOD]"));
check("Part 7 v2 also contains VISUAL SUBJECT formula",
  (routeSource.match(/VISUAL SUBJECT/g) ?? []).length >= 2,
  `found ${(routeSource.match(/VISUAL SUBJECT/g) ?? []).length} occurrences, expected ≥2`);
check("Part 7 ABSOLUTE RULE against city names is present",
  routeSource.includes("NEVER include city names, country names, or region names"));
check("Old city examples (Tunisia, Dubai Marina) removed from Part 7",
  !routeSource.includes('"hotel resort Tunisia Mediterranean') &&
  !routeSource.includes('"gym fitness Dubai Marina'),
  "old city examples still present");
check("New Part 7 examples are city-free (dental example check)",
  routeSource.includes('"dental treatment room bright white clean minimal professional photography"'));
check("New Part 7 examples are city-free (real estate check)",
  routeSource.includes('"luxury villa exterior pool architecture daylight editorial"'));

// ── Structural: old dict names gone, new ones present ─────────────────────────

console.log("\n══ Structural: dict rename + no businessType in queries ══\n");

check("PRESET_HERO_SUFFIX is gone", !routeSource.includes("PRESET_HERO_SUFFIX"));
check("PRESET_ABOUT_SUFFIX is gone", !routeSource.includes("PRESET_ABOUT_SUFFIX"));
check("HERO_PHOTO_QUERY is defined", routeSource.includes("const HERO_PHOTO_QUERY"));
check("ABOUT_PHOTO_QUERY is defined", routeSource.includes("const ABOUT_PHOTO_QUERY"));
check("no businessType concatenated into imageQuery strings",
  !routeSource.includes("${businessType}${locationCtx}") &&
  !routeSource.includes("${businessType}${locCtx}") &&
  !/imageQuery[^;]+\$\{businessType\}/.test(routeSource));
check("property-listings-grid fallback uses PROPERTY_LISTING_QUERIES",
  routeSource.includes("PROPERTY_LISTING_QUERIES[j % PROPERTY_LISTING_QUERIES.length]"));
check("portfolio-grid fallback uses PORTFOLIO_GRID_QUERIES",
  routeSource.includes("PORTFOLIO_GRID_QUERIES[j % PORTFOLIO_GRID_QUERIES.length]"));
check("treatment-gallery fallback uses TREATMENT_QUERIES",
  routeSource.includes("TREATMENT_QUERIES[j % TREATMENT_QUERIES.length]"));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n══ Phase 4 Verification Summary ══`);
console.log(`Total: ${totalChecks}  |  Passed: ${passed}  |  Failed: ${failed}`);
if (failed > 0) {
  console.error(`\n❌ ${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${totalChecks} checks passed.`);
}
