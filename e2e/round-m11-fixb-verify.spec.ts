import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test("FIX B -- Dashboard no longer shows Lead Pipeline or Recent Activity, KPI band has 6 cells", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("vela_last_app_route", "/app"));
  await page.goto("/app");
  await page.getByText("Recent Messages").waitFor({ timeout: 20000 });
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 20000 });
  await page.waitForTimeout(800);

  const leadPipelineGone = await page.getByText("Lead Pipeline").count();
  const recentActivityGone = await page.getByText("Recent Activity").count();
  const aiActivityGone = await page.getByText("AI Activity").count();
  const escalatedVisible = await page.getByText("Escalated to you").count();
  console.log("Lead Pipeline count (should be 0):", leadPipelineGone);
  console.log("Recent Activity count (should be 0):", recentActivityGone);
  console.log("AI Activity count (should be 0):", aiActivityGone);
  console.log("Escalated to Human count (should be 1, in KPI band):", escalatedVisible);

  expect(leadPipelineGone).toBe(0);
  expect(recentActivityGone).toBe(0);
  expect(aiActivityGone).toBe(0);
  expect(escalatedVisible).toBe(1);

  await page.screenshot({ path: "test-output-round-m11/fixb-dashboard.png", fullPage: true });
});
