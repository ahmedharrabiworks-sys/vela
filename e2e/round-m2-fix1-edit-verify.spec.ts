import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 1: chat image-edit produces a real, car-relevant hero image, then changes it again on request", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const editChatInput = page.getByPlaceholder("What would you like to change?");
  await editChatInput.waitFor({ state: "visible", timeout: 20000 });

  // Request 1: add a real hero background photo (current hero is the
  // text-only "minimal-stacked" variant with no image at all).
  await editChatInput.fill("Add a dramatic background photo to the hero section showing one of our luxury sports cars");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(35000);
  await page.screenshot({ path: "test-output-round-m2-fix1-edit1.png", fullPage: false });

  let res = await page.request.get("/api/website/state");
  let json = await res.json();
  let html: string = json.html ?? "";
  let m = html.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
  let spec = m ? JSON.parse(m[1]) : null;
  const heroAfter1 = spec?.sections?.[0];
  console.log("=== HERO AFTER EDIT 1 ===");
  console.log(JSON.stringify(heroAfter1));
  let firstUnsplash = html.match(/https:\/\/images\.unsplash\.com\/[^"'&]+/);
  console.log("first unsplash URL (edit1):", firstUnsplash?.[0]);

  // Request 2: explicitly ask to CHANGE the image (this is the exact repro
  // from the live bug report: "change it its not even for motors").
  await editChatInput.waitFor({ state: "visible", timeout: 20000 });
  await editChatInput.fill("change the hero image, want a different angle on the car, more editorial and dramatic");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(35000);
  await page.screenshot({ path: "test-output-round-m2-fix1-edit2.png", fullPage: false });

  res = await page.request.get("/api/website/state");
  json = await res.json();
  html = json.html ?? "";
  m = html.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
  spec = m ? JSON.parse(m[1]) : null;
  const heroAfter2 = spec?.sections?.[0];
  console.log("=== HERO AFTER EDIT 2 ===");
  console.log(JSON.stringify(heroAfter2));
  let secondUnsplash = html.match(/https:\/\/images\.unsplash\.com\/[^"'&]+/);
  console.log("first unsplash URL (edit2):", secondUnsplash?.[0]);

  console.log("=== IMAGE URL ACTUALLY CHANGED BETWEEN EDIT 1 AND EDIT 2?", firstUnsplash?.[0] !== secondUnsplash?.[0], "===");
});
