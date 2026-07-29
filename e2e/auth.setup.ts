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

  // Wait for redirect to app dashboard (any /app/* route)
  await page.waitForURL(/\/app\//, { timeout: 30_000 });

  // Confirm we're logged in — sidebar or dashboard content should be visible
  await expect(page.locator("text=/Dashboard|Website|Conversations/")).toBeVisible({ timeout: 15_000 });

  // Save session to disk for reuse by all test specs
  await page.context().storageState({ path: SESSION_FILE });
  console.log(`\n✅ Auth session saved to ${SESSION_FILE}\n`);
});
