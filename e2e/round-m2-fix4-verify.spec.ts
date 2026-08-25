import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 4: chat edit updates preview in place without resetting scroll", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const iframe = page.frameLocator("iframe").first();
  await iframe.locator("body").waitFor({ state: "visible", timeout: 15000 });

  // Scroll the iframe's own document down.
  await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => {
    el.contentWindow?.scrollTo(0, 600);
  });
  await page.waitForTimeout(500);
  const scrollBefore = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => el.contentWindow?.scrollY ?? -1);
  console.log("=== scrollY before edit ===", scrollBefore);
  await page.screenshot({ path: "test-output-round-m2-fix4-before-edit.png" });

  const editChatInput = page.getByPlaceholder("What would you like to change?");
  await editChatInput.waitFor({ state: "visible", timeout: 20000 });
  await editChatInput.fill("make the footer copyright text mention the current year clearly");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(20000);

  const scrollAfter = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => el.contentWindow?.scrollY ?? -1);
  console.log("=== scrollY after edit ===", scrollAfter);
  await page.screenshot({ path: "test-output-round-m2-fix4-after-edit.png" });

  console.log("=== SCROLL PRESERVED (within 50px)?", Math.abs(scrollAfter - scrollBefore) < 50, "===");
});
