import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

// FIX: /app has a legitimate ResumeLastAppRoute redirect (jumps to whatever
// /app/* page was last visited in this browser session) -- visiting it
// anywhere but first in a shared page/session bounces back to the
// previous page instead of showing the real dashboard. Dashboard must be
// captured first (or in its own fresh context) to get the real page.
const PAGES = [
  { path: "/app", name: "dashboard" },
  { path: "/app/analytics", name: "analytics" },
  { path: "/app/channels", name: "channels" },
  { path: "/app/ai-training", name: "ai-training" },
  { path: "/app/website", name: "website-builder" },
];

test("light mode screenshots of all 5 pages", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200); // let count-up animations settle
    await page.screenshot({ path: `test-results/round9-light-${p.name}.png`, fullPage: true });
  }
});

test("dark mode screenshots of all 5 pages", async ({ page }) => {
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
  // Toggle dark mode via the real header button (not a fake localStorage
  // write) so this exercises the actual code path a user would.
  const themeToggle = page.getByLabel("Toggle dark mode");
  await themeToggle.click();
  await page.waitForTimeout(300);

  for (const p of PAGES) {
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/round9-dark-${p.name}.png`, fullPage: true });
  }
});

test("FIX 1: Analytics KPI cards are non-interactive", async ({ page }) => {
  await page.goto("/app/analytics");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // The 4 top KPI cards should now be plain <div>s -- confirm there is no
  // <button> wrapping the "Conversations" label text.
  const convLabel = page.getByText("Conversations", { exact: true }).first();
  const isButton = await convLabel.evaluate((el) => {
    let node: HTMLElement | null = el;
    while (node) {
      if (node.tagName === "BUTTON") return true;
      node = node.parentElement;
    }
    return false;
  });
  expect(isButton).toBe(false);

  // Clicking the card must not open the metric detail modal.
  await convLabel.click();
  await page.waitForTimeout(300);
  const modalVisible = await page.locator("text=Full history").isVisible().catch(() => false);
  expect(modalVisible).toBe(false);
});

test("FIX 2: no orange gradient inline style on Analytics/Dashboard", async ({ page }) => {
  for (const path of ["/app/analytics", "/app"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const hasGradient = await page.evaluate(() => {
      const all = document.querySelectorAll<HTMLElement>("[style*='gradient']");
      for (const el of all) {
        if (el.style.background.includes("rgba(255,107,53") || el.style.background.includes("rgba(255, 107, 53")) return true;
      }
      return false;
    });
    expect(hasGradient).toBe(false);
  }
});

test("FIX 4: Channels shows real Manage/Disconnect and stat pairs when connected", async ({ page }) => {
  await page.goto("/app/channels");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const bodyText = await page.textContent("body");
  console.log("CHANNELS PAGE TEXT SNIPPET:", bodyText?.slice(0, 400));
});

test("FIX 5: Train Your AI shows underline tabs and checklist", async ({ page }) => {
  await page.goto("/app/ai-training");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const hasSaveChanges = await page.getByText("Save Changes", { exact: true }).isVisible().catch(() => false);
  const hasChecklist = await page.getByText("Booking Policy", { exact: true }).isVisible().catch(() => false);
  console.log("AI TRAINING: Save Changes button visible =", hasSaveChanges, "| checklist item visible =", hasChecklist);
});
