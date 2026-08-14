import { chromium } from "playwright";
const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 900 } })).newPage();

  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); };

  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check the API route responds gracefully (table likely not migrated yet)
  const apiRes = await page.evaluate(async () => {
    const r = await fetch("/api/notifications");
    return { status: r.status, body: await r.json() };
  });
  console.log("GET /api/notifications ->", JSON.stringify(apiRes));
  check("API responds 200 (not a 500 crash) even if table missing", apiRes.status === 200);
  check("API returns notifications array", Array.isArray(apiRes.body.notifications));
  check("API returns numeric unreadCount", typeof apiRes.body.unreadCount === "number");

  const bell = page.locator('button[aria-label="Notifications"]');
  check("Bell button renders", await bell.count() > 0);

  await bell.click();
  await page.waitForTimeout(500);

  const dropdownVisible = await page.locator('text=Notifications').isVisible().catch(() => false);
  check("Dropdown opens on click", dropdownVisible);

  const emptyStateVisible = await page.locator('text=No notifications yet').isVisible().catch(() => false);
  console.log("Empty state visible:", emptyStateVisible);
  await page.screenshot({ path: "bell-dropdown-desktop.png" });

  // Click outside closes it
  await page.locator('body').click({ position: { x: 10, y: 500 } });
  await page.waitForTimeout(300);
  const closedAfterOutsideClick = !(await page.locator('text=Notifications').isVisible().catch(() => false));
  check("Dropdown closes on outside click", closedAfterOutsideClick);

  // Mobile
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(300);
  await bell.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "bell-dropdown-mobile.png" });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check("No horizontal overflow at 375px with dropdown open", !mobileOverflow);

  console.log("\n=== RESULTS ===");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} - ${r.label}`);
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
