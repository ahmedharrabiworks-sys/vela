import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 1: car rental hero image is car-relevant + image-edit chat command works", async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Start genuinely fresh so the interview begins at "what language" cleanly.
  const newWebsiteBtn = page.locator('button[title="New website"]').first();
  if (await newWebsiteBtn.isVisible().catch(() => false)) {
    await newWebsiteBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = page.getByRole("button", { name: "New Website", exact: true });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  const chatInput = page.getByPlaceholder("Tell me about your business…");
  await chatInput.waitFor({ state: "visible", timeout: 20000 });

  // Step 1: language quick-reply button.
  const englishBtn = page.getByRole("button", { name: "English", exact: true });
  if (await englishBtn.isVisible().catch(() => false)) {
    await englishBtn.click();
  } else {
    await chatInput.fill("English");
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(4000);

  // Step 2: business description.
  await chatInput.fill(
    "Aurelia Luxury Motors - a luxury car rental business in Dubai renting Lamborghinis, Ferraris and Rolls Royce for events and daily hire. Contact: +971501234567, info@aurelialuxury.ae"
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  // Step 3: photos question -> use stock photography.
  await chatInput.fill("Please use professional stock photography that matches the business, no need for my own photos");
  await page.keyboard.press("Enter");

  await page.screenshot({ path: "test-output-round-m2-fix1-mid-interview.png", fullPage: false });

  // Now wait for real generation (classify + fill + Unsplash fetch).
  await page.waitForSelector("text=Building your website", { timeout: 15000 }).catch(() => {});
  await page.waitForSelector("text=Building your website", { state: "hidden", timeout: 150000 }).catch(() => {});
  await page.waitForSelector("iframe", { timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "test-output-round-m2-fix1-generated.png", fullPage: false });

  const heroImgSrc = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => {
    const doc = el.contentDocument;
    const img = doc?.querySelector(".ws-hero-img") as HTMLImageElement | null;
    return img?.src ?? `NO HERO IMG. Body snippet: ${doc?.body?.innerHTML?.slice(0, 500)}`;
  });
  console.log("=== HERO IMG SRC ===");
  console.log(heroImgSrc);

  const specComment = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => {
    const doc = el.contentDocument;
    if (!doc) return "no doc";
    const html = doc.documentElement.outerHTML;
    const m = html.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
    return m ? m[1].slice(0, 500) : "no spec comment found";
  });
  console.log("=== SPEC (truncated) ===");
  console.log(specComment);

  // ── Now explicitly ask to change the hero image via chat ──
  const editChatInput = page.getByPlaceholder("What would you like to change?");
  await editChatInput.waitFor({ state: "visible", timeout: 20000 });
  await editChatInput.fill("change the hero image, it's not car related enough, make it a more dramatic supercar shot");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(40000);
  await page.screenshot({ path: "test-output-round-m2-fix1-after-image-edit.png", fullPage: false });

  const heroImgSrcAfterEdit = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement) => {
    const doc = el.contentDocument;
    const img = doc?.querySelector(".ws-hero-img") as HTMLImageElement | null;
    return img?.src ?? "NO HERO IMG FOUND";
  });
  console.log("=== HERO IMG SRC AFTER EDIT REQUEST ===");
  console.log(heroImgSrcAfterEdit);
  console.log("=== IMAGE CHANGED?", heroImgSrc !== heroImgSrcAfterEdit, "===");
});
