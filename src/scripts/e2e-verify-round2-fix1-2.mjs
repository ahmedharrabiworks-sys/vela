import { chromium } from "playwright";
const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); console.log(`${cond ? "PASS" : "FAIL"} - ${label}`); };

  async function callGenerate(body) {
    return page.evaluate(async (b) => {
      const r = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const data = await r.json().catch(() => null);
      return { status: r.status, data };
    }, body);
  }

  // Turn 1: full business description in one message
  const r1 = await callGenerate({
    message: "A modern dental clinic called Round2 Test Clinic in Dubai, offering checkups, whitening and braces, phone +971509998888, open Mon-Sat 9-6",
    language: "English", languageChosen: true, embedAiAssistant: true,
  });
  console.log("Turn 1 status:", r1.status, "keys:", r1.data ? Object.keys(r1.data) : null);

  let chat = [
    { role: "user", content: "A modern dental clinic called Round2 Test Clinic in Dubai, offering checkups, whitening and braces, phone +971509998888, open Mon-Sat 9-6" },
  ];
  if (r1.data?.question) {
    chat.push({ role: "ai", content: r1.data.question });
  }

  // Turn 2: decline photos explicitly
  const r2 = await callGenerate({
    message: "No photos, please just build it",
    language: "English", languageChosen: true, embedAiAssistant: true, chat,
  });
  console.log("Turn 2 status:", r2.status, "keys:", r2.data ? Object.keys(r2.data) : null);

  let html = r2.data?.html;
  let websiteId = r2.data?.websiteId;

  if (!html && r2.data?.question) {
    // one more round if a second question was asked
    chat.push({ role: "ai", content: r2.data.question });
    const r2b = await callGenerate({
      message: "no", language: "English", languageChosen: true, embedAiAssistant: true, chat,
    });
    console.log("Turn 2b status:", r2b.status, "keys:", r2b.data ? Object.keys(r2b.data) : null);
    html = r2b.data?.html;
    websiteId = r2b.data?.websiteId;
    if (r2b.data?.question) chat.push({ role: "ai", content: r2b.data.question });
  }

  check("Initial generation succeeded with real HTML", !!html && html.length > 1000);
  check("websiteId returned", !!websiteId);

  if (html) {
    const unsplashCount = (html.match(/images\.unsplash\.com/g) || []).length;
    console.log("Unsplash image URLs found in initial HTML:", unsplashCount);
    check("FIX 1: zero stock images in initial generation", unsplashCount === 0);

    const heroMinimal = html.includes("ws-hero--minimal");
    console.log("Hero uses ws-hero--minimal:", heroMinimal);
    check("FIX 2: hero uses minimal-stacked (typography-led) layout", heroMinimal);

    // Scope this check to the hero section's own markup, not the full page --
    // the shared stylesheet defines CSS classes for EVERY hero variant regardless
    // of which one is actually selected, so a full-page substring search always
    // finds these class names and false-positives every time (confirmed via
    // direct hero markup extraction: the actual rendered hero was always clean
    // ws-hero--minimal output with no image, just this check was too broad).
    const heroSectionMatch = html.match(/<section[^>]*id="hero"[\s\S]*?<\/section>/);
    const heroSectionHtml = heroSectionMatch ? heroSectionMatch[0] : "";
    const heroSplitMedia = heroSectionHtml.includes("ws-hero-split-media") || heroSectionHtml.includes("ws-hero-cprem-photo") || heroSectionHtml.includes("ws-hero-cind-bg") || /<img/.test(heroSectionHtml);
    check("FIX 2: hero does NOT use a large-graphic split/photo layout", !heroSplitMedia);
  }

  // Turn 3: REVISION request to add a gallery -- this is the exact scenario
  // that was broken (buildReviseSystem had no noPhotoMode awareness)
  if (html && websiteId) {
    chat.push({ role: "user", content: "No photos, please just build it" }, { role: "ai", content: "Built" });
    const r3 = await callGenerate({
      message: "Can you add a gallery section showcasing our work",
      currentHtml: html,
      websiteId,
      language: "English", languageChosen: true, embedAiAssistant: true, chat,
    });
    console.log("Turn 3 (revision: add gallery) status:", r3.status);
    const revisedHtml = r3.data?.html;
    if (revisedHtml) {
      const unsplashCountRev = (revisedHtml.match(/images\.unsplash\.com/g) || []).length;
      console.log("Unsplash image URLs found AFTER revision (add gallery):", unsplashCountRev);
      check("FIX 1: zero stock images after a REVISION request (the actual reported bug)", unsplashCountRev === 0);
    } else {
      console.log("Revision response:", JSON.stringify(r3.data));
      check("FIX 1: revision returned html to check", false);
    }
  }

  console.log("\n=== RESULTS ===");
  const failed = results.filter(r => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
