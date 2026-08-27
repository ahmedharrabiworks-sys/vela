import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "1280", width: 1280, height: 900 },
  { name: "375", width: 375, height: 1400 },
];

for (const vp of VIEWPORTS) {
  for (const theme of ["light", "dark"] as const) {
    test(`Dashboard FIX 7 -- ${vp.name}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript((t) => {
        localStorage.setItem("vela_theme", t);
        localStorage.setItem("vela_last_app_route", "/app");
      }, theme);
      await page.goto("/app");
      await page.getByText("Recent Activity").waitFor({ timeout: 20000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `test-output-round-m10/fix7-${vp.name}-${theme}.png`, fullPage: true });
    });
  }
}
