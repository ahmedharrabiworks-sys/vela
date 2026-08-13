import { chromium } from "playwright";

const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/app/ai-agent/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "restructure-desktop.png", fullPage: true });

  // Measure gaps between successive card bottoms/tops using bounding boxes of key headings
  const headings = ["Identity", "Personality & Tone", "Greeting Style"];
  for (const h of headings) {
    const box = await page.locator(`h2:has-text("${h}")`).first().boundingBox();
    console.log(h, "heading box:", box);
  }

  const speedBox = await page.locator('h3:has-text("Speaking Speed")').first().boundingBox();
  const voiceListBox = await page.locator('h3:has-text("Select Voice"), h3:has-text("Voice")').first().boundingBox();
  console.log("Speaking Speed heading box:", speedBox);
  console.log("Select Voice heading box:", voiceListBox);

  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "restructure-mobile.png", fullPage: true });

  await browser.close();
})();
