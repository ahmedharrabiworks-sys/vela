import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 900 },
  mobile: { width: 375, height: 900 },
};

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`Dashboard redesign visual check — ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("vela_last_app_route", "/app"));
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`[${name}] LIGHT scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await page.screenshot({ path: `test-output-round-m8/dash-${name}-light.png`, fullPage: true });

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    const scrollWidthDark = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`[${name}] DARK scrollWidth=${scrollWidthDark} clientWidth=${clientWidth}`);
    expect(scrollWidthDark).toBeLessThanOrEqual(clientWidth + 1);
    await page.screenshot({ path: `test-output-round-m8/dash-${name}-dark.png`, fullPage: true });
  });
}
