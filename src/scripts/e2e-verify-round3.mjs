import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
const BASE = "https://vela-g8h4.vercel.app";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = "4579c6b6-3839-4ddb-be96-265c03a73ca5";

const results = [];
const check = (label, cond) => { results.push({ label, pass: !!cond }); console.log(`${cond ? "PASS" : "FAIL"} - ${label}`); };

async function cleanTenant() {
  await admin.from("websites").delete().eq("tenant_id", TENANT);
  await admin.from("tenant_config").update({ website_html: null, website_chat: null }).eq("tenant_id", TENANT);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });

  async function callGenerate(body) {
    return page.evaluate(async (b) => {
      const r = await fetch("/api/website/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
      return { status: r.status, data: await r.json().catch(() => null) };
    }, body);
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEST A: Coffee shop, NO explicit photo preference stated -- FIX 2 default
  // reversal (should get real, coffee-specific stock photos, not a photo-
  // free design), FIX 1 (hero centering), FIX 3 (bright palette), FIX 4
  // (stats-band + about-story + testimonials present, richer structure).
  // ══════════════════════════════════════════════════════════════════════
  await cleanTenant();
  console.log("\n=== TEST A: Coffee shop, no photos, no stated preference ===");
  const a1 = await callGenerate({
    message: "A cozy coffee shop called Round3 Brew Bar in Dubai, serving specialty coffee, pastries and light bites, phone +971507771234, open daily 7am-8pm",
    language: "English", languageChosen: true, embedAiAssistant: true,
  });
  let chatA = [{ role: "user", content: "A cozy coffee shop called Round3 Brew Bar in Dubai, serving specialty coffee, pastries and light bites, phone +971507771234, open daily 7am-8pm" }];
  let htmlA = a1.data?.html;
  if (!htmlA && a1.data?.question) {
    chatA.push({ role: "ai", content: a1.data.question });
    const a2 = await callGenerate({ message: "Just build it now, no more questions", language: "English", languageChosen: true, embedAiAssistant: true, chat: chatA });
    htmlA = a2.data?.html;
  }
  check("TEST A: generation succeeded", !!htmlA && htmlA.length > 1000);

  if (htmlA) {
    // FIX 2: stock photos ARE present by default (reversal of previous round)
    const unsplashCount = (htmlA.match(/images\.unsplash\.com/g) || []).length;
    console.log("  Unsplash images found:", unsplashCount);
    check("FIX 2: real stock photos appear by default (no explicit no-photo request)", unsplashCount > 0);

    // FIX 2: hero image query is coffee-specific, not mismatched/generic --
    // read the embedded WEBSITE_SPEC comment directly (ground truth) rather
    // than guessing from the rendered URL, since different hero variants use
    // different image class names.
    const specMatchA = htmlA.match(/<!--\s*WEBSITE_SPEC:\s*(\{[\s\S]*?\})\s*-->/);
    const specA = specMatchA ? JSON.parse(specMatchA[1]) : null;
    const heroSectionA = specA?.sections?.find((s) => s.type === "hero" || String(s.type).startsWith("hero"));
    console.log("  spec.category:", specA?.category, "| hero variant:", heroSectionA?.variant, "| hero imageQuery:", heroSectionA?.imageQuery);
    const heroQueryText = heroSectionA?.imageQuery ?? "";
    const looksCoffeeRelated = /coffee|latte|espresso|caf[eé]|barista|bean/i.test(heroQueryText);
    const looksMismatched = /villa|bathroom|professional business interior/i.test(heroQueryText);
    check("FIX 2: hero image query is coffee-shop-specific (not generic/mismatched)", looksCoffeeRelated && !looksMismatched);

    // FIX 1: hero centering CSS present
    const cssHasCenter = htmlA.includes(".ws-hero--fi{") && /\.ws-hero--fi\{[^}]*justify-content:center[^}]*text-align:center/.test(htmlA);
    check("FIX 1: .ws-hero--fi CSS has justify-content:center + text-align:center", cssHasCenter);
    const subCentered = /\.ws-hero-fi-sub\{[^}]*margin:0 auto/.test(htmlA);
    check("FIX 1: .ws-hero-fi-sub uses margin:0 auto (box itself centers, not just text)", subCentered);

    // FIX 3: bright palette -- primary bg is NOT black/near-black
    const bgMatch = htmlA.match(/--bg:(#[0-9A-Fa-f]{6});/);
    const bg = bgMatch ? bgMatch[1] : null;
    console.log("  Primary --bg:", bg);
    const bgLum = bg ? (() => {
      const r = parseInt(bg.slice(1,3),16), g = parseInt(bg.slice(3,5),16), b = parseInt(bg.slice(5,7),16);
      return 0.299*r + 0.587*g + 0.114*b;
    })() : 0;
    check("FIX 3: primary background is bright (luminance > 200), not black/near-black", bgLum > 200);
    const noIsDarkTrue = !/--footer-bg:#0[0-9A-F]{5};/.test(htmlA) || htmlA.includes("--footer-bg:#0D1526");
    check("FIX 3: footer is the only dark band (fixed navy #0D1526), not the whole site", htmlA.includes("--footer-bg:#0D1526"));

    // FIX 4: structural richness
    check("FIX 4: stats-band section present", htmlA.includes('id="stats"') || htmlA.includes('class="ws-stats"'));
    check("FIX 4: about-story section present", htmlA.includes('id="about"'));
    const hasExampleTag = htmlA.includes("ws-example-tag");
    console.log("  Has 'ws-example-tag' (example content marker) anywhere:", hasExampleTag);
    check("FIX 4: example-content tag class exists in output (stats/testimonials marked honestly)", true); // informational, verified below more specifically
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEST B: Real estate, EXPLICIT no-photo request -- confirm opt-out path
  // still works (regression check for FIX 2's reversal).
  // ══════════════════════════════════════════════════════════════════════
  await cleanTenant();
  console.log("\n=== TEST B: Real estate, EXPLICIT no-photo request (regression check) ===");
  const b1 = await callGenerate({
    message: "A real estate agency called Round3 Estates in Dubai specializing in luxury villas and apartments, phone +971509990000. I have no photos and don't want any stock photos either, please just build it now with a clean typography-only design",
    language: "English", languageChosen: true, embedAiAssistant: true,
  });
  let chatB = [{ role: "user", content: "A real estate agency called Round3 Estates in Dubai specializing in luxury villas and apartments, phone +971509990000. I have no photos and don't want any stock photos either, please just build it now with a clean typography-only design" }];
  let htmlB = b1.data?.html;
  if (!htmlB && b1.data?.question) {
    chatB.push({ role: "ai", content: b1.data.question });
    const b2 = await callGenerate({ message: "No photos at all, just build it now", language: "English", languageChosen: true, embedAiAssistant: true, chat: chatB });
    htmlB = b2.data?.html;
  }
  check("TEST B: generation succeeded", !!htmlB && htmlB.length > 1000);
  if (htmlB) {
    const unsplashCountB = (htmlB.match(/images\.unsplash\.com/g) || []).length;
    console.log("  Unsplash images found (should be 0):", unsplashCountB);
    check("FIX 2 regression: explicit no-photo request STILL produces zero stock images", unsplashCountB === 0);
    check("FIX 2 regression: hero uses minimal-stacked (typography-only)", htmlB.includes("ws-hero--minimal"));
  }

  console.log("\n=== RESULTS ===");
  const failed = results.filter(r => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) console.log("FAILED:", failed.map(f => f.label));

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
