// Round M2, direct-function verification for FIX 1(regex logic)/3/5/6.
// Calls the REAL exported functions from website-renderer.ts /
// website-sections.ts directly (no Next.js runtime, no OpenAI calls).
// Run: npx tsx src/scripts/round-m2-verify-no-api.ts
import { renderWebsite, type WebsiteSpec } from "../lib/website-renderer";
import { stripMarkdownFormatting } from "../lib/text-clean";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}, ${label}`);
  if (cond) pass++; else fail++;
}

// ── FIX 1: regex-only logic from generate/route.ts, copied verbatim (these
// functions are internal to the route and not exported; route.ts itself
// can't be imported standalone since it depends on the Next.js server
// runtime -- same reasoning as the e2e scripts' documented TEST-01 pattern).
// This tests the pure string/regex logic with zero OpenAI calls. ──
{
  // Verbatim copy of the automotive detector added to DESCRIPTION_HERO_QUERY_PATTERNS
  // and ensureImageQueries (generate/route.ts:558, :682).
  const isAutomotive = (text: string) =>
    /\b(car\s*rental|auto(mobile)?\s*rental|vehicle\s*rental|exotic\s*car|luxury\s*car|car\s*hire|car\s*dealership|auto\s*dealership|\bmotors\b)/i.test(text);

  check("isAutomotive fires on the original bug-report business ('Aurelia Luxury Motors...car rental...')",
    isAutomotive("Aurelia Luxury Motors - a luxury car rental business in Dubai renting Lamborghinis, Ferraris and Rolls Royce for events and daily hire."));
  check("isAutomotive does NOT fire on an unrelated business (real estate)",
    !isAutomotive("Maison Prestige - luxury real estate agency in Dubai specialising in villas and apartments."));

  // Verbatim copy of extractNoPhotoOptOut (generate/route.ts:2683-2712).
  function extractNoPhotoOptOut(fullText: string): boolean {
    const t = fullText.toLowerCase();
    const affirmativeStockRequest = /\b(use|add|include|find|get|want|need)\b[^.!?\n]{0,25}\b(stock\s+photo|stock\s+imagery|professional\s+(stock\s+)?photograph)/;
    const negatedStockRequest = /\b(don'?t|do\s+not|no)\b[^.!?\n]{0,15}\b(use|want|need|include)\b[^.!?\n]{0,20}\b(stock\s+photo|stock\s+imagery|professional\s+photograph)/;
    if (affirmativeStockRequest.test(t) && !negatedStockRequest.test(t)) return false;
    const noPhotoOptOut = [
      /\bno\b[^.!?\n]{0,20}\b(photos?|images?|pictures?|stock\s+photo)/,
      /\bwithout\b[^.!?\n]{0,15}\b(photos?|images?|pictures?)/,
      /\bskip\b[^.!?\n]{0,15}\b(photos?|images?|the\s+photos?)/,
      /\b(don'?t|do\s+not)\s+(use|want|need|include)\b[^.!?\n]{0,20}\b(photos?|images?|pictures?|stock)/,
      /\btypography[- ]only\b/,
      /\bphoto[- ]?free\b/,
      /\btext[- ]only\b/,
      /\bno\s+stock\b/,
    ];
    return noPhotoOptOut.some((re) => re.test(t));
  }

  // The exact live-reproduced false positive that motivated this fix.
  check("FIXED: 'please use stock photography...no need for my own photos' no longer opts out of photos",
    !extractNoPhotoOptOut("Please use professional stock photography that matches the business, no need for my own photos"));
  // A second real phrasing hit live (bootstrap script's own wording).
  check("FIXED: 'use professional stock photography...no custom images needed' no longer opts out",
    !extractNoPhotoOptOut("Please use professional stock photography, no custom images needed."));
  // Genuine opt-outs must still work (regression check on the fix itself).
  check("REGRESSION GUARD: 'no, I don't want stock photos, keep it text-only' still opts out",
    extractNoPhotoOptOut("No, I don't want stock photos, keep it text-only."));
  check("REGRESSION GUARD: 'photo-free please' still opts out",
    extractNoPhotoOptOut("Just make it photo-free please."));
  check("REGRESSION GUARD: plain 'no photos' still opts out",
    extractNoPhotoOptOut("No photos."));
}

// ── FIX 3: _textStyles (per-element color edit) must be embedded into the
// server-rendered HTML via buildStyleReapplyScript, so a real visitor loading
// the published page (not just the editor's client-side EDIT_SCRIPT) sees it. ──
{
  const spec: WebsiteSpec = {
    businessName: "Test Co",
    stylePreset: "realestate",
    sections: [
      { type: "hero", variant: "centered-overlay", content: { headline: "Hello World", subheadline: "Sub" } },
      { type: "footer", content: { tagline: "Test Co" } },
    ],
    _textStyles: { "0_headline": { color: "#ff0044" } },
  };
  const html = renderWebsite(spec, {});
  check("published HTML embeds the WEBSITE_SPEC comment with _textStyles", html.includes('"_textStyles"') && html.includes("#ff0044"));
  // buildStyleReapplyScript serializes the override as `var OV={...,"textStyles":{...}}`
  // (no leading underscore -- it's a fresh object it builds, not a raw dump of spec._textStyles).
  check("published HTML includes a dedicated style-reapply <script> embedding the override color (works for a real visitor, not just the editor's EDIT_SCRIPT)", /var OV=\{[\s\S]*?"textStyles":\{"0_headline":\{"color":"#ff0044"\}/.test(html));
  check("reapply script targets data-vs section markers (works without edit-mode-only data-ve-* attrs)", html.includes("data-vs"));
}

// ── FIX 5: stray markdown/AI-tell characters must be stripped from generated copy ──
{
  const dirty = "We are the **best** in town, visit `our site` for #1 service. __Guaranteed__.";
  const clean = stripMarkdownFormatting(dirty);
  check("stripMarkdownFormatting removes ** bold markers", !clean.includes("**"));
  check("stripMarkdownFormatting removes backticks", !clean.includes("`"));
  check("stripMarkdownFormatting removes __ underline markers", !clean.includes("__"));
  console.log(`   input:  ${JSON.stringify(dirty)}`);
  console.log(`   output: ${JSON.stringify(clean)}`);
}

// ── FIX 6: contact-block / booking form phone field must render the real
// country-code picker widget, not a plain <input type=tel>. ──
{
  const spec: WebsiteSpec = {
    businessName: "Test Co",
    stylePreset: "medical",
    sections: [
      { type: "hero", variant: "centered-overlay", content: { headline: "Hi" } },
      {
        type: "contact-block",
        variant: "split-form",
        content: {
          eyebrow: "Contact", headline: "Book now", ctaText: "Send",
          phone: "+971 50 123 4567", email: "test@test.com", services: ["Checkup"],
        },
      },
      { type: "footer", content: { tagline: "Test Co" } },
    ],
  };
  const html = renderWebsite(spec, {});
  check("contact-block renders the ws-phone-input widget", html.includes("ws-phone-input"));
  check("contact-block renders the country-code toggle button (ws-phone-cc)", html.includes("ws-phone-cc"));
  check("contact-block renders the searchable dropdown (ws-phone-dropdown)", html.includes("ws-phone-dropdown"));
  check("contact-block renders a hidden phone field for real form submission", html.includes("ws-phone-hidden"));
  check("PAGE_SCRIPT includes the PHONE_COUNTRIES picker logic", html.includes("data-ws-phone"));
  check("no bare <input type=\"tel\" name=\"phone\"> leaked through (old markup fully replaced)", !/<input[^>]*type="tel"[^>]*name="phone"/.test(html));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
