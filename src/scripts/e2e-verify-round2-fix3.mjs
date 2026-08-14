import { chromium } from "playwright";
import { readFileSync } from "fs";
const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); console.log(`${cond ? "PASS" : "FAIL"} - ${label}`); };

  const logoBase64 = readFileSync("public/logo-mark.png.png").toString("base64");

  async function callGenerate(body) {
    return page.evaluate(async (b) => {
      const r = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      return { status: r.status, data: await r.json().catch(() => null) };
    }, body);
  }

  const r1 = await callGenerate({
    message: "A gym called Round2 Logo Test in Dubai offering personal training and group classes, phone +971501112222",
    language: "English", languageChosen: true, embedAiAssistant: true,
  });
  let chat = [{ role: "user", content: "A gym called Round2 Logo Test in Dubai offering personal training and group classes, phone +971501112222" }];
  if (r1.data?.question) chat.push({ role: "ai", content: r1.data.question });

  const r2 = await callGenerate({
    message: "Here is our logo",
    images: [{ data: logoBase64, mimeType: "image/png" }],
    language: "English", languageChosen: true, embedAiAssistant: true, chat,
  });
  console.log("Generation status:", r2.status);
  let html = r2.data?.html;
  if (!html && r2.data?.question) {
    chat.push({ role: "ai", content: r2.data.question });
    const r2b = await callGenerate({
      message: "yes that's the logo", language: "English", languageChosen: true, embedAiAssistant: true, chat,
    });
    html = r2b.data?.html;
  }

  check("Generation with logo upload succeeded", !!html && html.length > 1000);

  if (html) {
    // Base64 image data inside the nav <img> can be tens of thousands of
    // characters long -- a length-capped regex between the opening <a> and
    // closing </a> will never reach the close tag and always reports NOT
    // FOUND. Match unbounded instead (still non-greedy so it stops at the
    // first </a>, just without an artificial character cap).
    const navLogoImgMatch = html.match(/<a href="#" class="ws-nav-logo">[\s\S]*?<\/a>/);
    const navLogoPreview = navLogoImgMatch
      ? navLogoImgMatch[0].replace(/(src="[^"]{0,40})[^"]*(")/, "$1...[truncated]$2")
      : "NOT FOUND";
    console.log("Nav logo markup:", navLogoPreview);
    const hasNavLogoImg = navLogoImgMatch ? navLogoImgMatch[0].includes("ws-nav-logo-img") : false;
    check("FIX 3: uploaded logo appears as <img> in the nav header", hasNavLogoImg);

    // The uploaded logo is base64 data; extract its data-URI prefix so we can
    // check the hero for the SAME bytes, rather than just "does hero have any
    // <img> at all" -- a stock hero photo is expected/valid whenever the user
    // never declined stock photos (as in this test), so presence of *an*
    // image there is not itself a failure. What matters is that it isn't
    // *this* image, misused as a hero background.
    const logoDataPrefix = `data:image/png;base64,${logoBase64}`.slice(0, 120);
    const heroMatch = html.match(/<section[^>]*id="hero"[\s\S]*?<\/section>/);
    const heroHtml = heroMatch ? heroMatch[0] : "";
    const heroHasLogoImg = heroHtml.includes(logoDataPrefix);
    console.log("Hero section contains the uploaded logo's image data:", heroHasLogoImg);
    check("FIX 3: logo is NOT also stretched into the hero as a large image", !heroHasLogoImg);

    // Check the logo image src is a real, non-empty reference (base64 data)
    const srcMatch = html.match(/class="ws-nav-logo-img"[^>]*src="([^"]*)"/) || html.match(/src="([^"]*)"[^>]*class="ws-nav-logo-img"/);
    console.log("Logo img src present:", !!srcMatch, srcMatch ? srcMatch[1].slice(0, 60) + "..." : "");
    check("FIX 3: nav logo img has a real src", !!srcMatch && srcMatch[1].length > 20);
    check("FIX 3: nav logo img src matches the actual uploaded logo bytes", !!srcMatch && srcMatch[1].startsWith(logoDataPrefix));
  }

  console.log("\n=== RESULTS ===");
  const failed = results.filter(r => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
