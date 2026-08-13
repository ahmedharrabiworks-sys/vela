import { chromium } from "playwright";

const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 1400 } });
  const page = await context.newPage();

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); };

  await page.goto(`${BASE}/app/ai-agent/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // FIX 3 check: Professional greeting description updated
  const proText = await page.locator('text=Welcome to [Business], how can I assist you today?').count();
  const oldProText = await page.locator("text=Good day, you've reached").count();
  check("New Professional greeting text present", proText > 0);
  check("Old Professional greeting text gone", oldProText === 0);

  // FIX 4 check: Greeting Language selector present
  const greetLangLabel = await page.locator('text=Greeting Language').count();
  check("Greeting Language label present", greetLangLabel > 0);
  const matchBizOption = await page.locator('option:has-text("Match business language")').count();
  check("Match business language option present", matchBizOption > 0);

  // FIX 2 check: Custom textarea hidden by default
  let customTextareaVisible = await page.locator('textarea[placeholder^="Write exactly what your AI should say"]').isVisible().catch(() => false);
  check("Custom greeting textarea hidden when Custom not selected", !customTextareaVisible);

  // Click Custom greeting style option
  await page.getByText("Custom", { exact: true }).first().click();
  await page.waitForTimeout(300);
  customTextareaVisible = await page.locator('textarea[placeholder^="Write exactly what your AI should say"]').isVisible().catch(() => false);
  check("Custom greeting textarea appears when Custom selected", customTextareaVisible);

  await page.screenshot({ path: "greeting-desktop-custom-open.png", fullPage: true });

  // Switch back to Warm to confirm textarea hides again
  await page.locator('text=Warm welcome').first().click();
  await page.waitForTimeout(300);
  customTextareaVisible = await page.locator('textarea[placeholder^="Write exactly what your AI should say"]').isVisible().catch(() => false);
  check("Custom greeting textarea hides again when switching away", !customTextareaVisible);

  await page.screenshot({ path: "greeting-desktop-merged.png", fullPage: true });

  // Measure merged card columns for items-start behavior
  const greetColBox = await page.locator('text=Warm welcome').first().locator('xpath=ancestor::div[contains(@class,"space-y-4")][1]').boundingBox();
  const speedColBox = await page.locator('h3:has-text("Speaking Speed")').first().locator('xpath=ancestor::div[contains(@class,"max-w-md")][1]').boundingBox();
  console.log("Greeting column box:", greetColBox);
  console.log("Speed column box:", speedColBox);

  await page.setViewportSize({ width: 375, height: 1400 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "greeting-mobile-merged.png", fullPage: true });

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
