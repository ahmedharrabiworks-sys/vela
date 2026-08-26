/**
 * Round M6 FIX 1 verification -- direct function call, zero OpenAI/Unsplash
 * calls (standing rule). Proves:
 *  1. The OLD publish/route.ts extractImageMap (hardcoded per-type allowlist)
 *     drops ALL images for a feature-showcase section.
 *  2. The NEW (fixed) publish/route.ts extractImageMap correctly recovers
 *     all 3 images for the exact same section, matching save-edit/route.ts's
 *     already-working behavior.
 *
 * Run: npx tsx src/scripts/round-m6-fix1-verify.ts
 */
import { renderWebsite } from "../lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "../lib/website-renderer";

// ── OLD (stale, pre-fix) extractImageMap -- verbatim copy of what
// publish/route.ts had BEFORE this round's fix, for A/B comparison only.
function extractImageMapOLD(spec: WebsiteSpec, html: string): ImageMap {
  const images: ImageMap = {};
  const SINGLE_IMG = new Set(["hero", "hero-fullbleed", "hero-split", "hero-minimal", "about", "about-story"]);
  const MULTI_IMG = new Set(["gallery", "gallery-grid", "listings-grid"]);
  const SECTION_ANCHOR: Record<string, string> = {
    "hero": "hero", "hero-fullbleed": "hero", "hero-split": "hero", "hero-minimal": "hero",
    "about": "about", "about-story": "about",
    "gallery": "gallery", "gallery-grid": "gallery",
    "listings-grid": "listings",
  };
  for (let i = 0; i < spec.sections.length; i++) {
    const s = spec.sections[i];
    const anchor = SECTION_ANCHOR[s.type];
    if (!anchor) continue;
    const anchorIdx = html.indexOf(`id="${anchor}"`);
    if (anchorIdx === -1) continue;
    const slice = html.slice(anchorIdx, anchorIdx + 30_000);
    if (MULTI_IMG.has(s.type)) {
      const imgRe = /<img[^>]+src="(https?:\/\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      let j = 0;
      while ((m = imgRe.exec(slice)) !== null) images[`${i}_${j++}`] = m[1];
    } else if (SINGLE_IMG.has(s.type)) {
      const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
      if (m) images[String(i)] = m[1];
    }
  }
  return images;
}

// ── NEW (fixed) extractImageMap -- exact copy of what's now in
// publish/route.ts after this round's fix.
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
function extractImageMapNEW(spec: WebsiteSpec, html: string): ImageMap {
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

// ── A representative dental-clinic spec with a feature-showcase section
// ("Comprehensive Dental Care") carrying 3 items + 3 imageQueries, exactly
// matching what generate/route.ts's real prompt requires for this section
// type. Image URLs are fixed placeholder strings standing in for whatever
// Unsplash would have returned -- no live API call made.
const spec: WebsiteSpec = {
  businessName: "Ahmed Dental Clinic",
  stylePreset: "medical",
  sections: [
    { type: "hero", imageQuery: "dental clinic reception bright modern", content: { headline: "Welcome to Ahmed Dental Clinic" } },
    {
      type: "feature-showcase",
      imageQueries: ["dental checkup room", "teeth whitening treatment", "dental implant procedure"],
      content: {
        eyebrow: "Our Services",
        headline: "Comprehensive Dental Care",
        items: [
          { title: "General Checkups", description: "Routine exams and cleanings." },
          { title: "Teeth Whitening", description: "Professional whitening treatments." },
          { title: "Dental Implants", description: "Permanent tooth replacement." },
        ],
      },
    },
    { type: "footer", content: {} },
  ],
};

const initialImages: ImageMap = {
  "0": "https://images.unsplash.com/photo-hero-000",
  "1_0": "https://images.unsplash.com/photo-checkup-001",
  "1_1": "https://images.unsplash.com/photo-whitening-002",
  "1_2": "https://images.unsplash.com/photo-implant-003",
};

const draftHtml = renderWebsite(spec, initialImages, "test-tenant-id");

console.log("=== Draft HTML contains data-vs markers? ===");
console.log("data-vs=\"1\" present:", draftHtml.includes('data-vs="1"'));
console.log("id=\"features\" present:", draftHtml.includes('id="features"'));

const oldMap = extractImageMapOLD(spec, draftHtml);
const newMap = extractImageMapNEW(spec, draftHtml);

console.log("\n=== OLD extractImageMap (publish/route.ts BEFORE fix) ===");
console.log(JSON.stringify(oldMap, null, 2));
console.log("Feature-showcase images recovered (1_0, 1_1, 1_2):",
  [oldMap["1_0"], oldMap["1_1"], oldMap["1_2"]]);

console.log("\n=== NEW extractImageMap (publish/route.ts AFTER fix) ===");
console.log(JSON.stringify(newMap, null, 2));
console.log("Feature-showcase images recovered (1_0, 1_1, 1_2):",
  [newMap["1_0"], newMap["1_1"], newMap["1_2"]]);

// Now actually re-render with each map, exactly like publish/route.ts does,
// and check whether the feature-showcase section's <img> tags survive.
const republishedOLD = renderWebsite(spec, oldMap, "test-tenant-id");
const republishedNEW = renderWebsite(spec, newMap, "test-tenant-id");

function countImgTagsInFeatureSection(html: string): number {
  const start = html.indexOf('id="features"');
  if (start === -1) return -1;
  const end = html.indexOf("</section>", start);
  const slice = html.slice(start, end);
  return (slice.match(/<img /g) || []).length;
}

console.log("\n=== Re-rendered (simulating a real Publish) ===");
console.log("OLD map -> <img> tags surviving in feature-showcase section:", countImgTagsInFeatureSection(republishedOLD), "(expected 3 in a correct fix, was the live bug)");
console.log("NEW map -> <img> tags surviving in feature-showcase section:", countImgTagsInFeatureSection(republishedNEW), "(expected 3)");

const pass = countImgTagsInFeatureSection(republishedOLD) === 0 && countImgTagsInFeatureSection(republishedNEW) === 3;
console.log("\n" + (pass ? "PASS: OLD lost all 3 images, NEW recovers all 3." : "FAIL: unexpected result, needs further investigation."));
