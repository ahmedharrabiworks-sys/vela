import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "1280", width: 1280, height: 900 },
  { name: "375", width: 375, height: 1300 },
];

for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"] as const) {
    test(`Dashboard M12 -- ${vp.name}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript((t) => {
        localStorage.setItem("vela_theme", t);
        localStorage.setItem("vela_last_app_route", "/app");
      }, theme);
      await page.goto("/app");
      await page.getByText("Recent Messages").waitFor({ timeout: 20000 });
      await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 20000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-output-round-m12/dash-${vp.name}-${theme}.png`, fullPage: true });
    });
  }
}
