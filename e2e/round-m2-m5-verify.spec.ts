import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX 3 — lead detail modal backdrop covers full viewport including navbar", async ({ page }) => {
  await page.goto("/app/leads");
  await page.waitForLoadState("networkidle");

  // Seeded test lead from earlier this round (id 7cdaac7a-eb85-4ef5-99f9-182b0d1ba889)
  const card = page.locator('[class*="border-l-"]', { has: page.locator("p.font-semibold") }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();

  const overlay = page.locator("div.fixed.inset-0").first();
  await expect(overlay).toBeVisible();

  const box = await overlay.boundingBox();
  const marginTop = await overlay.evaluate((el) => getComputedStyle(el).marginTop);
  console.log("OVERLAY_BOX", JSON.stringify(box));
  console.log("OVERLAY_MARGIN_TOP", marginTop);

  expect(marginTop).toBe("0px");
  expect(box?.y).toBeLessThanOrEqual(1);
});

for (const [name, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
})) {
  test(`Dashboard redesign renders clean at ${name} (${viewport.width}px), light + dark`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // ResumeLastAppRoute (src/lib/last-route.tsx) bounces a fresh /app
    // landing to whatever /app/* page localStorage last recorded (e.g. the
    // auth setup session last visited Website Builder) -- force it to stay
    // on the dashboard for this test by pre-seeding the stored route.
    await page.addInitScript(() => localStorage.setItem("vela_last_app_route", "/app"));
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("text=Lead Pipeline", { timeout: 15000 }).catch(() => {});

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`[${name}] LIGHT scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    const hasPipeline = await page.locator("text=Lead Pipeline").count();
    const hasAiActivity = await page.locator("text=AI Activity").count();
    const hasRecentActivity = await page.locator("text=Recent Activity").count();
    console.log(`[${name}] sections present: pipeline=${hasPipeline} aiActivity=${hasAiActivity} recentActivity=${hasRecentActivity}`);
    expect(hasPipeline).toBeGreaterThan(0);
    expect(hasAiActivity).toBeGreaterThan(0);
    expect(hasRecentActivity).toBeGreaterThan(0);

    // Toggle dark mode via the same mechanism as Settings > Appearance
    // (adds/removes .dark on <html>, matching tailwind.config darkMode:"class").
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const scrollWidthDark = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`[${name}] DARK scrollWidth=${scrollWidthDark} clientWidth=${clientWidth}`);
    expect(scrollWidthDark).toBeLessThanOrEqual(clientWidth + 1);

    const cardBg = await page.evaluate(() => {
      const el = [...document.querySelectorAll("div")].find((d) => d.textContent?.trim() === "Lead Pipeline")?.closest("div.rounded-xl");
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    console.log(`[${name}] DARK Lead Pipeline card bg=${cardBg}`);

    await page.screenshot({ path: `test-output-round-m5/dashboard-${name}-dark.png`, fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.screenshot({ path: `test-output-round-m5/dashboard-${name}-light.png`, fullPage: true });
  });
}
