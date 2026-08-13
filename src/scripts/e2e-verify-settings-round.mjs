import { chromium } from "playwright";

const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 1400 } });
  const page = await context.newPage();

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); };

  // FIX 1 verification: Overview subtitle text
  await page.goto(`${BASE}/app/ai-agent/overview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const newCopy = await page.locator('text=Customer calls handled by Vela').count();
  const oldCopy = await page.locator('text=Real customer calls').count();
  check("New copy 'Customer calls handled by Vela' present", newCopy > 0);
  check("Old copy 'Real customer calls' gone", oldCopy === 0);

  // FIX 2 verification: Settings page layout
  await page.goto(`${BASE}/app/ai-agent/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "settings-desktop-full.png", fullPage: true });

  // Measure Identity card vs right column heights
  const identityBox = await page.locator('h2:has-text("Identity")').first().locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]').boundingBox();
  const personalityBox = await page.locator('h2:has-text("Personality")').first().locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]').boundingBox();
  console.log("Identity card box:", identityBox);
  console.log("Personality card box:", personalityBox);

  // Voice list vs Speed column
  const voiceHeading = await page.locator('h3:has-text("Speaking Speed")').first();
  const speedCol = await voiceHeading.locator('xpath=ancestor::div[contains(@class,"lg:col-span-2")][1]').boundingBox();
  const voiceListHeading = await page.locator('h3').filter({ hasText: /select.*voice/i }).first();
  const voiceListCol = voiceListHeading.count ? await voiceListHeading.locator('xpath=ancestor::div[contains(@class,"lg:col-span-3")][1]').boundingBox() : null;
  console.log("Speed column box:", speedCol);
  console.log("Voice list column box:", voiceListCol);

  await page.setViewportSize({ width: 375, height: 1400 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "settings-mobile-full.png", fullPage: true });

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
