import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // FIX 1 + FIX 2: Dashboard KPI strip + AI Resolution Rate
  await page.goto(`${BASE}/app`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/round10-dashboard.png" });
  const dashText = await page.textContent("body");
  console.log("Dashboard contains 'No data yet':", dashText?.includes("No data yet"));

  // FIX 3: Website Builder header/toolbar
  await page.goto(`${BASE}/app/website`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/round10-website-header.png" });
  const wbEditSiteBtn = await page.getByText("Edit site", { exact: true }).count();
  console.log("Toolbar 'Edit site' pill button count (should be 0):", wbEditSiteBtn);

  // FIX 7: Channels page
  await page.goto(`${BASE}/app/channels`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/round10-channels.png", fullPage: true });

  // FIX 10: Analytics
  await page.goto(`${BASE}/app/analytics`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/round10-analytics.png" });

  // FIX 8: Arabic RTL - notification bell + assistant bubble
  await page.goto(`${BASE}/app`);
  await page.waitForLoadState("networkidle");
  await page.locator("aside, nav").first().locator("text=Sarah Wells Coaching").click();
  await page.waitForTimeout(300);
  await page.getByText("Language", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByText("Arabic", { exact: true }).last().click();
  await page.waitForTimeout(800);
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  console.log("dir attribute after switching to Arabic:", dir);

  // Screenshot assistant bubble position
  await page.screenshot({ path: "test-results/round10-rtl-bubble.png" });

  // Open notification bell and screenshot the dropdown
  const bellBtn = page.getByLabel("Notifications");
  await bellBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/round10-rtl-bell.png" });
  const bellBox = await page.locator("text=Notifications").first().boundingBox();
  console.log("Notification dropdown 'Notifications' header bounding box:", JSON.stringify(bellBox));
  const viewportWidth = page.viewportSize()?.width ?? 0;
  console.log("Viewport width:", viewportWidth, "-- box should be within [0, viewportWidth]");

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
