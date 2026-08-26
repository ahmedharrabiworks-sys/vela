import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 2 — scroll position across a real applied edit (no Playwright auto-scroll)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("vela_last_app_route", "/app/website"));
  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const editBtn = page.getByRole("button", { name: "Edit", exact: true }).first();
  await editBtn.click();
  await page.waitForTimeout(1500);

  const frame = page.locator("iframe").first();
  await expect(frame).toBeVisible({ timeout: 15000 });
  const frameHandle = await frame.elementHandle();
  const contentFrame = await frameHandle?.contentFrame();
  if (!contentFrame) throw new Error("could not access iframe content");

  await contentFrame.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  console.log("SCROLL after manual scrollTo(900):", await contentFrame.evaluate(() => window.scrollY));

  // Native JS click (bypasses Playwright's auto-scroll-into-view actionability
  // check, which would otherwise itself move the viewport and contaminate
  // the measurement) on the headline, to open the floating text-style panel.
  await contentFrame.evaluate(() => {
    const h1 = document.querySelector("h1, h2") as HTMLElement | null;
    h1?.click();
  });
  await page.waitForTimeout(400);
  console.log("SCROLL after native click on headline (selection only):", await contentFrame.evaluate(() => window.scrollY));
  await page.screenshot({ path: "test-output-round-m7/fix2-textpanel.png" });

  // The floating text-style panel is injected BY EDIT_SCRIPT INSIDE the
  // iframe's own document (not the parent page) -- must query contentFrame.
  const spacingCount = await contentFrame.locator("button", { hasText: /^(S|M|L|XL)$/ }).count();
  console.log("spacing preset buttons found (inside iframe):", spacingCount);

  const scrollSamples: { t: number; y: number | null }[] = [];
  const start = Date.now();

  if (spacingCount > 0) {
    // Click the "L" TOP-spacing preset -- a real spec mutation
    // (window.parent.postMessage 'vela-spacing') that triggers the parent's
    // handleSaveEdit -> POST /api/website/save-edit -> setHtml() -> iframe
    // reload, exactly the "apply an edit" trigger this fix targets.
    await contentFrame.locator("button", { hasText: "L" }).first().evaluate((el: HTMLElement) => el.click());
  }

  for (let i = 0; i < 25; i++) {
    let y: number | null = null;
    try { y = await contentFrame.evaluate(() => window.scrollY); } catch { y = null; }
    scrollSamples.push({ t: Date.now() - start, y });
    await page.waitForTimeout(200);
  }
  console.log("SCROLL SAMPLES after real edit action (ms, scrollY):", JSON.stringify(scrollSamples));
  await page.screenshot({ path: "test-output-round-m7/fix2-after-edit.png" });
});
