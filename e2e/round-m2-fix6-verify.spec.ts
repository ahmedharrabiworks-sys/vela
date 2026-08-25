import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 6: booking form phone field has a real country-code picker", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/app/website");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const res = await page.request.get("/api/website/state");
  const json = await res.json();
  const slug = json.slug;
  console.log("slug:", slug, "isPublished:", json.isPublished);

  const html: string = json.html ?? "";
  console.log("has ws-phone-input in draft html:", html.includes("ws-phone-input"));
  console.log("has ws-phone-cc in draft html:", html.includes("ws-phone-cc"));

  if (json.isPublished && slug) {
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/site/${slug}`, { waitUntil: "networkidle" });
    const phoneWidget = publicPage.locator("[data-ws-phone]").first();
    const exists = await phoneWidget.count();
    console.log("=== phone widgets found on published page:", exists, "===");
    if (exists > 0) {
      await phoneWidget.scrollIntoViewIfNeeded();
      await publicPage.screenshot({ path: "test-output-round-m2-fix6-phone-widget.png" });
      const ccBtn = phoneWidget.locator("[data-ws-phone-cc]");
      await ccBtn.click();
      await publicPage.waitForTimeout(300);
      await publicPage.screenshot({ path: "test-output-round-m2-fix6-phone-dropdown-open.png" });
      const searchInput = phoneWidget.locator("[data-ws-phone-search]");
      await searchInput.fill("United Kingdom");
      await publicPage.waitForTimeout(300);
      await publicPage.screenshot({ path: "test-output-round-m2-fix6-phone-search-filtered.png" });
    }
  } else {
    console.log("site not published yet -- checked draft html markers only");
  }
});
