import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 3: text element color edit via the per-element Colors panel survives Done + Publish", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Enter edit mode.
  const editBtn = page.getByRole("button", { name: "Edit", exact: true }).first();
  await editBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-output-round-m2-fix3-edit-mode.png" });

  // Click the hero headline inside the iframe to select it and open the
  // per-element floating panel (labeled data-ve-f by EDIT_SCRIPT).
  const iframe = page.frameLocator("iframe").first();
  const headline = iframe.locator('[data-ve-f="headline"]').first();
  await headline.waitFor({ state: "visible", timeout: 15000 });
  await headline.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-output-round-m2-fix3-panel-open.png" });

  // Set the color input's value directly (native <input type=color> can't be
  // filled via keyboard) and dispatch input+change so the panel's listener fires.
  const newColor = "#ff0044";
  const setColor = await page.locator("iframe").first().evaluate((el: HTMLIFrameElement, color: string) => {
    const doc = el.contentDocument;
    if (!doc) return "no doc";
    const inputs = Array.from(doc.querySelectorAll('input[type="color"]')) as HTMLInputElement[];
    if (inputs.length === 0) return "no color inputs found";
    const clrInp = inputs[0];
    clrInp.value = color;
    clrInp.dispatchEvent(new Event("input", { bubbles: true }));
    clrInp.dispatchEvent(new Event("change", { bubbles: true }));
    return `set to ${clrInp.value}`;
  }, newColor);
  console.log("=== set color result:", setColor, "===");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-output-round-m2-fix3-color-set.png" });

  // Give the 800ms-debounced save time to fire, then exit edit mode (Done).
  await page.waitForTimeout(1500);
  const doneBtn = page.getByRole("button", { name: "Done", exact: true }).first();
  if (await doneBtn.isVisible().catch(() => false)) {
    await doneBtn.click();
  } else {
    // Toggle edit mode off via the same Edit/Preview button if no explicit Done exists.
    const previewBtn = page.getByRole("button", { name: "Preview", exact: true }).first();
    if (await previewBtn.isVisible().catch(() => false)) await previewBtn.click();
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-output-round-m2-fix3-after-done.png" });

  // Check draft spec has _textStyles recorded.
  let res = await page.request.get("/api/website/state");
  let json = await res.json();
  let html: string = json.html ?? "";
  let m = html.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
  let spec = m ? JSON.parse(m[1]) : null;
  console.log("=== _textStyles after Done ===", JSON.stringify(spec?._textStyles ?? null));

  // Publish and check the real public page's rendered color.
  const publishBtn = page.getByRole("button", { name: /Publish/ }).first();
  await publishBtn.click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) {
    const continueBtn = page.getByRole("button", { name: /Continue|Go Live|Publish now|^Publish$/i }).last();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(2500);
    } else break;
  }
  await page.waitForTimeout(2000);

  res = await page.request.get("/api/website/state");
  json = await res.json();
  console.log("slug:", json.slug, "isPublished:", json.isPublished);

  if (json.slug) {
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/site/${json.slug}`, { waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1500);
    const publicHtml = await publicPage.content();
    const pm = publicHtml.match(/WEBSITE_SPEC: (\{[\s\S]*?\})\s*-->/);
    const publicSpec = pm ? JSON.parse(pm[1]) : null;
    console.log("=== PUBLISHED _textStyles ===", JSON.stringify(publicSpec?._textStyles ?? null));

    const headlineColor = await publicPage.evaluate(() => {
      const h1 = document.querySelector(".ws-hero-headline, h1");
      return h1 ? getComputedStyle(h1).color : "NO HEADLINE FOUND";
    });
    console.log("=== PUBLISHED headline computed color ===", headlineColor);
    await publicPage.screenshot({ path: "test-output-round-m2-fix3-PUBLIC-SITE.png" });
  }
});
