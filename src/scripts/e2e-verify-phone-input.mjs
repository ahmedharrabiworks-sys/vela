import { chromium } from "playwright";

const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); };

  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Step 1: fill and continue
  await page.fill('input[type="text"]', "Test Owner");
  await page.fill('input[type="email"]', `phonetest${Date.now()}@example.com`);
  await page.fill('input[type="password"]', "TestPass123!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);

  check("Step 2 reached", await page.locator('text=Tell us about your business').isVisible().catch(() => false));

  // Fill company + description
  await page.fill('input[placeholder="Your business name"]', "Test Biz");
  await page.fill('textarea', "A dental clinic in Tunis");

  // Change business country to Tunisia
  await page.locator('button:has-text("United Arab Emirates")').first().click();
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="Search countries…"]', "Tunisia");
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Tunisia")').first().click();
  await page.waitForTimeout(300);

  // Check phone country selector auto-defaulted to Tunisia (+216)
  const phoneCountryBtn = page.locator('button[aria-label="Select country code"]');
  const phoneCountryText = await phoneCountryBtn.textContent();
  console.log("Phone country selector text after picking Tunisia as business country:", phoneCountryText);
  check("Phone country auto-defaulted to +216 (Tunisia)", phoneCountryText.includes("+216"));

  await page.fill('input[placeholder="Dubai"]', "Tunis");

  // Enter an invalid phone number and try to submit
  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.fill("123");
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(400);

  const errorVisible = await page.locator('text=Enter a valid phone number').isVisible().catch(() => false);
  check("Invalid phone blocks submission with inline error", errorVisible);
  check("Still on step 2 (did not advance)", await page.locator('text=Tell us about your business').isVisible().catch(() => false));

  await page.screenshot({ path: "phone-signup-invalid.png" });

  // Now enter a valid Tunisian mobile number
  await phoneInput.fill("");
  await phoneInput.fill("20123456");
  await page.waitForTimeout(300);
  const errorGone = !(await page.locator('text=Enter a valid phone number').isVisible().catch(() => false));
  check("Error clears once a valid number is entered", errorGone);

  await page.screenshot({ path: "phone-signup-valid.png" });

  // Mobile check
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "phone-signup-mobile.png" });

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
