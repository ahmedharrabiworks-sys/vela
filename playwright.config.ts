import { defineConfig, devices } from "@playwright/test";

// Playwright config for Vela E2E tests.
// Auth is handled via a setup project (e2e/auth.setup.ts) that logs in once
// and saves storageState to e2e/.auth/user.json, which is reused by all tests.
//
// Required env vars (add to .env.local — never commit):
//   PLAYWRIGHT_BASE_URL   — defaults to https://vela-g8h4.vercel.app
//   TEST_ACCOUNT_EMAIL    — Vela account email for the test tenant
//   TEST_ACCOUNT_PASSWORD — password for that account

// Load .env.local so the env vars are available when running via `npx playwright test`
// without passing them on the command line.
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // ── 0. One-time account + site creation — run this ONCE to bootstrap test data ─
    {
      name: "create-account",
      testMatch: /create-test-account\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    // ── 1. Auth setup — runs first, saves session to e2e/.auth/user.json ─────
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // ── 2. Phase A8 — mobile collision at 375×667 ────────────────────────────
    // Use Chromium (not WebKit/Safari) to avoid needing the WebKit browser install.
    // Pixel 5 is a Chromium-based device; override viewport to iPhone SE dimensions.
    {
      name: "mobile-a8",
      dependencies: ["setup"],
      testMatch: /phase-a8-.*\.spec\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
        storageState: "e2e/.auth/user.json",
      },
    },
    // ── 3. Phase A9 — desktop sites list at 1280px ───────────────────────────
    {
      name: "desktop-a9",
      dependencies: ["setup"],
      testMatch: /phase-a9-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/.auth/user.json",
      },
    },
    // ── 4. Round 8 — Conversations/Analytics polish, desktop 1280px ─────────
    {
      name: "round8",
      dependencies: ["setup"],
      testMatch: /round8-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/.auth/user.json",
      },
    },
    // ── 5. Public widget tests — no auth needed (real visitors have no session) ─
    {
      name: "widget-public",
      testMatch: /availability-fix-verify\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // ── 6. Round 9 — Analytics/Dashboard/Channels/AI Trainer/Website Builder
    // polish, desktop 1280px. No "setup" dependency -- reuses the stored
    // session directly (established pattern: the stored file remains valid
    // even when the login flow itself needs re-bootstrapping separately).
    {
      name: "round9",
      testMatch: /round9-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
});
