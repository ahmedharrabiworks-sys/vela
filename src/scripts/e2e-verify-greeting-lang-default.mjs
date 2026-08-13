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

  const matchBizOption = await page.locator('option:has-text("Match business language")').count();
  check("Match business language option removed", matchBizOption === 0);

  const select = page.locator('label:has-text("Greeting Language")').locator('xpath=following-sibling::select[1]');
  const selectedValue = await select.inputValue();
  console.log("Greeting Language select current value:", selectedValue);
  check("Greeting Language dropdown defaults to English (en)", selectedValue === "en");

  const options = await select.locator('option').allTextContents();
  console.log("Options list:", options);
  check("English is first option", options[0] === "English");
  check("5 total language options (no blank)", options.length === 5);

  await page.screenshot({ path: "greeting-lang-default.png", fullPage: true });

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
