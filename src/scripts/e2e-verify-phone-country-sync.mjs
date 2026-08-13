import { chromium } from "playwright";
const BASE = "https://vela-g8h4.vercel.app";

async function selectBusinessCountry(page, name) {
  await page.locator('button').filter({ hasText: /^(United Arab Emirates|Afghanistan|Kazakhstan|France|Tunisia).*/ }).first().click();
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="Search countries…"]', name);
  await page.waitForTimeout(300);
  await page.locator('div.absolute button').first().click();
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); };

  await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', "Sync Test");
  await page.fill('input[type="email"]', `synctest${Date.now()}@example.com`);
  await page.fill('input[type="password"]', "TestPass123!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="Your business name"]', "Sync Biz");
  await page.fill('textarea', "A shop");

  // Test case 1: Afghanistan (the confirmed-broken case)
  await selectBusinessCountry(page, "Afghanistan");
  let phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After Afghanistan:", phoneTxt);
  check("Afghanistan -> phone shows +93", phoneTxt.includes("+93"));

  // Test case 2: Kazakhstan (shares +7 with Russia, real distinct country)
  await selectBusinessCountry(page, "Kazakhstan");
  phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After Kazakhstan:", phoneTxt);
  check("Kazakhstan -> phone shows +7", phoneTxt.includes("+7"));

  // Test case 3: France
  await selectBusinessCountry(page, "France");
  phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After France:", phoneTxt);
  check("France -> phone shows +33", phoneTxt.includes("+33"));

  // Test case 4: Tunisia
  await selectBusinessCountry(page, "Tunisia");
  phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After Tunisia:", phoneTxt);
  check("Tunisia -> phone shows +216", phoneTxt.includes("+216"));

  // Confirm Aland Islands is gone from the phone dropdown entirely
  await page.locator('button[aria-label="Select country code"]').click();
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="Search countries..."]', "Aland");
  await page.waitForTimeout(300);
  const alandVisible = await page.locator('text=Åland').isVisible().catch(() => false);
  check("Aland Islands no longer appears in phone country search", !alandVisible);
  await page.keyboard.press("Escape");
  await page.locator('body').click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(200);

  // Manual override test: pick Japan manually in the PHONE selector, then change
  // business country again -- Japan choice must NOT be overwritten (touched=true).
  await page.locator('button[aria-label="Select country code"]').click();
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="Search countries..."]', "Japan");
  await page.waitForTimeout(300);
  await page.locator('div.absolute button:has-text("Japan")').first().click();
  await page.waitForTimeout(300);
  phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After manually picking Japan:", phoneTxt);
  check("Manual override to Japan applied", phoneTxt.includes("+81"));

  // Now change business country to Egypt -- phone should STILL show Japan (+81),
  // not auto-jump to Egypt's +20, since the user already made a manual choice.
  await selectBusinessCountry(page, "Egypt");
  phoneTxt = await page.locator('button[aria-label="Select country code"]').textContent();
  console.log("After changing business country to Egypt post-override:", phoneTxt);
  check("Manual override respected -- still +81 after business country changes again", phoneTxt.includes("+81"));

  await page.screenshot({ path: "phone-sync-final.png" });

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
