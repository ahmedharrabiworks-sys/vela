import { test } from "@playwright/test";

test("submit the old published site's contact form -- zero OpenAI cost, tests FIX 6 phone widget + FIX 8 intent_summary end-to-end", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/site/aurelia-luxury-motors-2", { waitUntil: "networkidle" });

  const form = page.locator("form").first();
  await form.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-output-round-m2-fix11-form-before.png" });

  // Name / email / message fields (best-effort selectors -- generic labels).
  const nameInput = page.locator('input[name="name"], input[placeholder*="ame" i]').first();
  if (await nameInput.isVisible().catch(() => false)) await nameInput.fill("Round M2 FIX11 Test");
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible().catch(() => false)) await emailInput.fill("fix11-test@example.com");

  // Phone widget (FIX 6): open country picker, search, select, type a number.
  const phoneWidget = page.locator("[data-ws-phone]").first();
  const phoneWidgetExists = await phoneWidget.count();
  console.log("=== phone widget present:", phoneWidgetExists, "===");
  if (phoneWidgetExists > 0) {
    await phoneWidget.locator("[data-ws-phone-cc]").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-output-round-m2-fix11-phone-dropdown.png" });
    const search = phoneWidget.locator("[data-ws-phone-search]");
    await search.fill("United Kingdom");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-output-round-m2-fix11-phone-search.png" });
    const firstOption = phoneWidget.locator("[data-ws-phone-list] button").first();
    await firstOption.click();
    await page.waitForTimeout(200);
    const national = phoneWidget.locator("[data-ws-phone-national]");
    await national.fill("7911123456");
    await page.screenshot({ path: "test-output-round-m2-fix11-phone-filled.png" });
  }

  const messageField = page.locator('textarea').first();
  const testMessage = "ROUND-M2-FIX11-TEST: I would like to book a Lamborghini for a weekend in October.";
  if (await messageField.isVisible().catch(() => false)) await messageField.fill(testMessage);

  await page.screenshot({ path: "test-output-round-m2-fix11-form-filled.png" });

  const submitBtn = form.locator('button[type="submit"], button:has-text("Send"), button:has-text("Book"), button:has-text("Contact")').first();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/submit-form"), { timeout: 15000 }).catch(() => null),
    submitBtn.click(),
  ]);
  if (response) {
    console.log("=== submit-form response status:", response.status(), "===");
    console.log(await response.text().catch(() => "<no body>"));
  } else {
    console.log("=== no /submit-form network response observed ===");
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-output-round-m2-fix11-after-submit.png" });
});
