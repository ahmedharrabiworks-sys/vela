/**
 * Auth setup — runs once before all tests.
 * Logs into the Vela app with the test account credentials from .env.local,
 * then saves the browser session (cookies + localStorage) to e2e/.auth/user.json
 * so all test specs can reuse it without re-logging in.
 *
 * Required env vars in .env.local:
 *   TEST_ACCOUNT_EMAIL    — e.g. harrabi.online@hotmail.com (or a dedicated test account)
 *   TEST_ACCOUNT_PASSWORD — the account's password
 *
 * The saved session file is gitignored (e2e/.auth/).
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const SESSION_FILE = path.join(__dirname, ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  // Login + website builder navigation can take >90s on cold start — override the global cap
  setup.setTimeout(180_000);

  const email    = process.env.TEST_ACCOUNT_EMAIL;
  const password = process.env.TEST_ACCOUNT_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "\n\n" +
      "┌─────────────────────────────────────────────────────────────┐\n" +
      "│  MISSING TEST CREDENTIALS — tests cannot run               │\n" +
      "│                                                             │\n" +
      "│  Add to .env.local:                                         │\n" +
      "│    TEST_ACCOUNT_EMAIL=<your Vela account email>            │\n" +
      "│    TEST_ACCOUNT_PASSWORD=<your Vela account password>      │\n" +
      "│                                                             │\n" +
      "│  The test account must have:                                │\n" +
      "│  • At least 1 built website (for phase-a8 tests)           │\n" +
      "│  • At least 2 built websites (for phase-a9 tests)          │\n" +
      "│                                                             │\n" +
      "│  Recommendation: use a DEDICATED test account, not the     │\n" +
      "│  main production account — the A9 rename/delete tests      │\n" +
      "│  will modify and delete websites in the test tenant.       │\n" +
      "└─────────────────────────────────────────────────────────────┘\n"
    );
  }

  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  // Fill email and password
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to app dashboard (any /app or /app/* route)
  await page.waitForURL(/\/app/, { timeout: 30_000 });

  // Confirm we're logged in — sidebar nav item visible
  await expect(page.locator("text=/Dashboard|Website|Conversations/").first()).toBeVisible({ timeout: 15_000 });

  // Navigate to the website builder and activate a built site so that
  // the mobile-a8 tests (which can't use the sidebar at 375px) start with
  // a built site active — not the empty new-project left by account setup.
  await page.goto("/app/website");
  await page.waitForSelector('[class*="animate-pulse"]', { state: "detached", timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1_500); // let the site list API settle

  // Click the first site button that has a truncated name span (a real site row)
  const firstSiteBtn = page
    .locator("span").filter({ hasText: /^Sites$/ }).locator("../../..")
    .locator("button").filter({ has: page.locator("span[class*='truncate']") })
    .first();

  if (await firstSiteBtn.isVisible()) {
    await firstSiteBtn.click();
    // Short wait for the site-switch API call to land server-side.
    // We don't need the preview to finish rendering — just the active-site
    // state to be recorded before we capture storageState.
    await page.waitForTimeout(3_000);
    console.log("✅ Built site activated in website builder");
  }

  // Save session to disk for reuse by all test specs
  await page.context().storageState({ path: SESSION_FILE });
  console.log(`\n✅ Auth session saved to ${SESSION_FILE}\n`);
});
