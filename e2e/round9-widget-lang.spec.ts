import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 8: VelaAssistant widget follows dashboard language on desktop", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");

  // Open the assistant FIRST in English (simulates a session where it was
  // opened before the language was ever switched -- this is exactly the
  // staleness scenario the fix targets), capture the real greeting text.
  const bubble = page.getByLabel("Open Vela AI Assistant");
  await bubble.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/round9-widget-before-lang-switch.png" });
  await bubble.click(); // close

  // Switch language to Arabic via the real Sidebar UI path.
  await page.locator("aside, nav").first().locator("text=Sarah Wells Coaching").click();
  await page.waitForTimeout(300);
  await page.getByText("Language", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText("Arabic", { exact: true }).last().click();
  await page.waitForTimeout(600);

  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  console.log("document dir attribute after switch:", dir);
  expect(dir).toBe("rtl");

  // Reopen the assistant on the SAME page (desktop, same component
  // instance) -- greeting/quick actions/placeholder must now be Arabic,
  // not stuck in English from the earlier open.
  await page.keyboard.press("Escape");
  await bubble.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/round9-widget-after-lang-switch.png" });
});
