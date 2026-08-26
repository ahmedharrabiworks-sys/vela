import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 1+2 — image Remove: ghost/clickability + scroll position", async ({ page }) => {
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

  // Scroll down to the feature-showcase section (has 3 real images) before
  // clicking one, matching a real editing session (scrolled away from hero).
  await contentFrame.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  console.log("SCROLL before image click:", await contentFrame.evaluate(() => window.scrollY));

  const allImgsInfo = await contentFrame.evaluate(() =>
    Array.from(document.querySelectorAll("[data-vs] img")).map((el) => {
      const sec = el.closest("[data-vs]");
      return { vs: sec?.getAttribute("data-vs"), src: (el as HTMLImageElement).src };
    })
  );
  console.log("images in DOM before remove:", JSON.stringify(allImgsInfo));
  const targetVs = allImgsInfo.length > 2 ? allImgsInfo[2].vs : allImgsInfo[0]?.vs;
  console.log("targeting section data-vs:", targetVs);

  // Fake seeded Unsplash URLs 404 -> each <img>'s onerror already fired,
  // setting display:none (a REAL condition worth testing too: clicking a
  // broken-but-still-in-DOM <img> should still open the picker). Native JS
  // click bypasses Playwright's visibility-gated actionability entirely.
  await contentFrame.evaluate((vs) => {
    const sec = document.querySelector(`[data-vs="${vs}"]`);
    const img = sec?.querySelector("img") as HTMLElement | null;
    img?.click();
  }, targetVs);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-output-round-m7/fix1-modal-open.png" });

  const removeBtn = page.getByRole("button", { name: /remove/i }).first();
  const removeCount = await removeBtn.count();
  console.log("Remove button found:", removeCount);
  expect(removeCount).toBeGreaterThan(0);

  const scrollJustBeforeRemove = await contentFrame.evaluate(() => window.scrollY);
  console.log("SCROLL just before clicking Remove:", scrollJustBeforeRemove);

  await removeBtn.click();

  // Sample scroll + DOM state across the remove request's round trip.
  const samples: { t: number; y: number | null }[] = [];
  const start = Date.now();
  for (let i = 0; i < 15; i++) {
    let y: number | null = null;
    try { y = await contentFrame.evaluate(() => window.scrollY); } catch { y = null; }
    samples.push({ t: Date.now() - start, y });
    await page.waitForTimeout(200);
  }
  console.log("SCROLL SAMPLES after Remove (ms, scrollY):", JSON.stringify(samples));
  await page.screenshot({ path: "test-output-round-m7/fix1-after-remove.png" });

  // FIX 1 checks: is the removed slot's DOM element still a data-ws-photo
  // marker (so it's re-clickable), and does clicking it again open the
  // picker modal (not a dead click)?
  const placeholderInfo = await contentFrame.evaluate((vs) => {
    const sec = document.querySelector(`[data-vs="${vs}"]`);
    const photos = sec ? Array.from(sec.querySelectorAll("[data-ws-photo]")) : [];
    const imgs = sec ? Array.from(sec.querySelectorAll("img")) : [];
    return {
      photoSlotCount: photos.length,
      imgTagCount: imgs.length,
      tagNames: photos.map((p) => p.tagName),
    };
  }, targetVs);
  console.log("photo slots in section after remove:", JSON.stringify(placeholderInfo));

  // Try clicking the now-placeholder slot to confirm it reopens the picker
  // (this is the exact FIX 1 repro: click the emptied slot again).
  await contentFrame.evaluate((vs) => {
    const sec = document.querySelector(`[data-vs="${vs}"]`);
    const el = (sec?.querySelector("[data-ws-photo]") || sec?.querySelector("img")) as HTMLElement | null;
    el?.click();
  }, targetVs);
  await page.waitForTimeout(500);
  const modalReopened = await page.getByText(/replace image|search|remove/i).count();
  console.log("modal-related text visible after re-clicking emptied slot:", modalReopened);
  await page.screenshot({ path: "test-output-round-m7/fix1-reclick-after-remove.png" });
});
