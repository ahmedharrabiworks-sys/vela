import { chromium } from "playwright";

// Round M13: real, direct static inspection of linear.app's actual computed
// CSS -- no AI generation involved, pure browser DOM/CSSOM reading, per the
// standing rule. Extracts real font-size/line-height/letter-spacing/weight,
// real spacing between elements (via bounding rects), real border/divider
// treatment, and real background-color layering.

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("https://linear.app", { waitUntil: "networkidle", timeout: 30000 });

  // 1. Base page background + any secondary surface colors actually in use.
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("body background-color:", bodyBg);

  // 2. Every distinct background-color actually rendered on-screen right now
  // (real used values, not the full CSS source) -- shows how many surface
  // layers really exist.
  const bgColors = await page.evaluate(() => {
    const set = new Set();
    document.querySelectorAll("*").forEach((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") set.add(bg);
    });
    return Array.from(set).slice(0, 30);
  });
  console.log("\nDistinct real background-colors on the page (first 30):", bgColors);

  // 3. Every distinct border seen (color + width), to characterize the
  // "almost no visible border, dividers instead" claim with real numbers.
  const borders = await page.evaluate(() => {
    const set = new Set();
    document.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      const w = cs.borderTopWidth;
      const c = cs.borderTopColor;
      if (w && w !== "0px" && c) set.add(`${w} ${c}`);
    });
    return Array.from(set).slice(0, 20);
  });
  console.log("\nDistinct real border-top values in use (first 20):", borders);

  // 4. Typography scale: font-size/line-height/font-weight/letter-spacing
  // for headings h1-h4 and paragraph text, real computed values.
  const typeScale = await page.evaluate(() => {
    const tags = ["h1", "h2", "h3", "h4", "p"];
    const out = {};
    tags.forEach((tag) => {
      const el = document.querySelector(tag);
      if (!el) { out[tag] = null; return; }
      const cs = getComputedStyle(el);
      out[tag] = {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily.split(",")[0],
      };
    });
    return out;
  });
  console.log("\nReal typography scale:", JSON.stringify(typeScale, null, 2));

  // 5. Any small-caps / uppercase-tracked labels actually rendered (a common
  // Linear pattern for eyebrow/section labels) -- find real examples.
  const upperLabels = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll("*").forEach((el) => {
      if (el.children.length > 0) return; // leaf nodes only
      const text = el.textContent?.trim();
      if (!text || text.length > 40 || text.length < 2) return;
      const cs = getComputedStyle(el);
      if (cs.textTransform === "uppercase" || (text === text.toUpperCase() && /[A-Z]/.test(text))) {
        results.push({
          text: text.slice(0, 30),
          fontSize: cs.fontSize,
          letterSpacing: cs.letterSpacing,
          fontWeight: cs.fontWeight,
          color: cs.color,
        });
      }
    });
    return results.slice(0, 10);
  });
  console.log("\nReal uppercase/small-caps label examples:", JSON.stringify(upperLabels, null, 2));

  await browser.close();
})();
