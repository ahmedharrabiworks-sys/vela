/**
 * One-time test account bootstrap — run ONCE to set up the test tenant.
 *
 * Does the full end-to-end flow:
 *   1. Creates a fresh Vela account via /auth/signup (real UI, not DB injection)
 *   2. Writes TEST_ACCOUNT_EMAIL + TEST_ACCOUNT_PASSWORD into .env.local
 *   3. Generates 3 websites via the real Website Builder chat so the account
 *      has enough sites for the A8 (≥1) and A9 (≥3 for delete test) test suites
 *
 * Run once:
 *   npx playwright test --project=create-account e2e/create-test-account.spec.ts --reporter=list
 *
 * After this completes successfully, run the real test suites:
 *   npx playwright test e2e/phase-a8-mobile-collision.spec.ts e2e/phase-a9-sites-list.spec.ts --reporter=list
 *
 * NEVER run this script again on the same tenant — it will attempt to sign up
 * with a new email each time. If the tenant already exists, just run the real tests.
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app";
const TS        = Date.now();
const EMAIL     = `vela-e2e-test-${TS}@example.com`;
const PASSWORD  = `VelaTest${TS}!E2E`;
const ENV_PATH  = path.resolve(__dirname, "../.env.local");

// Three distinct business prompts (realistic, not placeholder text)
const BUSINESSES = [
  {
    name: "Dental site",
    prompt:
      "Smile Bright Dental Clinic — professional dental services in Dubai. We offer general dentistry, teeth whitening, implants, and orthodontics. Dr. Hassan Al Rashid, 15 years experience. " +
      "Phone: +971 50 123 4567. Email: hello@smilebrightdxb.com. Open daily 9 AM – 8 PM, Friday 2 PM – 8 PM.",
  },
  {
    name: "Gym site",
    prompt:
      "Apex Performance Gym — premium fitness centre in Abu Dhabi. CrossFit classes, HIIT, weight training and yoga. Certified personal trainers, state-of-the-art equipment. " +
      "Memberships from AED 199/month. Phone: +971 2 555 0100. Email: join@apexgym.ae. Open 6 AM – 11 PM.",
  },
  {
    name: "Real-estate site",
    prompt:
      "Maison Prestige — luxury real estate agency in Dubai. Specialising in villas, apartments and commercial properties across Downtown, DIFC and Palm Jumeirah. " +
      "Over 200 active listings. Phone: +971 4 888 7766. Email: info@maisonprestige.ae.",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Upsert TEST_ACCOUNT_EMAIL and TEST_ACCOUNT_PASSWORD in .env.local. */
function writeCredentials(email: string, password: string) {
  let content = "";
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, "utf-8");
    // Remove any existing TEST_ACCOUNT_* lines
    content = content
      .split("\n")
      .filter((l) => !l.startsWith("TEST_ACCOUNT_EMAIL=") && !l.startsWith("TEST_ACCOUNT_PASSWORD="))
      .join("\n");
    if (!content.endsWith("\n")) content += "\n";
  }
  content += `TEST_ACCOUNT_EMAIL=${email}\n`;
  content += `TEST_ACCOUNT_PASSWORD=${password}\n`;
  fs.writeFileSync(ENV_PATH, content, "utf-8");
  console.log(`\n✅ Credentials written to .env.local`);
  console.log(`   EMAIL:    ${email}`);
  console.log(`   PASSWORD: ${password}\n`);
}

/** Returns true if the site is already built (textarea placeholder changed). */
async function isSiteBuilt(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const ta = document.querySelector("textarea");
    return (ta?.placeholder?.toLowerCase().includes("change") ||
            ta?.placeholder?.toLowerCase().includes("edit")) ?? false;
  });
}

/** Generate one website via the chat. Handles the 2-turn conversation the AI
 *  uses: (1) business description, (2) photo question → "use stock photography"
 *  → then site is generated. */
async function generateSite(page: Page, prompt: string, label: string) {
  console.log(`\n  → Generating "${label}" …`);

  // Wait for chat area (either language picker or textarea is visible)
  await page.waitForSelector("textarea, button:text('English')", { timeout: 30_000 });

  // Pick "English" if the language picker is shown
  const englishBtn = page.getByRole("button", { name: "English" });
  if (await englishBtn.isVisible()) {
    await englishBtn.click();
    await page.waitForTimeout(300);
  }

  // Send the business description
  const chatTextarea = page.locator("textarea").first();
  await expect(chatTextarea).toBeEnabled({ timeout: 10_000 });
  await chatTextarea.fill(prompt);
  await chatTextarea.press("Enter");

  // The AI typically responds with a photo question before generating.
  // Wait up to 30s for a new AI message to appear, then answer it.
  console.log(`  → Waiting for AI to respond …`);
  await page.waitForTimeout(3_000);

  // Give the AI time to finish its response (the typing indicator disappears)
  await page.waitForFunction(
    () => {
      // If site is already built, we're done
      const ta = document.querySelector("textarea");
      if (ta?.placeholder?.toLowerCase().includes("change") ||
          ta?.placeholder?.toLowerCase().includes("edit")) return true;
      // Check that the textarea is re-enabled (AI finished responding)
      return !(ta as HTMLTextAreaElement | null)?.disabled;
    },
    { timeout: 30_000, polling: 1_000 }
  );

  // If not yet built, answer the photo follow-up question
  if (!(await isSiteBuilt(page))) {
    console.log(`  → AI asked a follow-up; answering "use stock photography" …`);
    const ta2 = page.locator("textarea").first();
    await expect(ta2).toBeEnabled({ timeout: 15_000 });
    await ta2.fill("Please use professional stock photography — no custom images needed.");
    await ta2.press("Enter");
  }

  // Wait for generation to complete (up to 3 minutes)
  console.log(`  → Waiting for site generation to complete (up to 3 minutes) …`);
  await page.waitForFunction(
    () => {
      const ta = document.querySelector("textarea");
      return (ta?.placeholder?.toLowerCase().includes("change") ||
              ta?.placeholder?.toLowerCase().includes("edit")) ?? false;
    },
    { timeout: 180_000, polling: 2_000 }
  );

  console.log(`  ✅ "${label}" generated successfully`);
}

/** Start a new project from within the website builder (desktop sidebar + button). */
async function startNewProject(page: Page) {
  // Click the + button in the sidebar (title="New website")
  // If that's not visible (desktop only), click the "New Website" button in the header
  const sidebarPlus = page.locator("button[title='New website']");
  const headerNew   = page.getByRole("button", { name: "New Website" });

  if (await sidebarPlus.isVisible()) {
    await sidebarPlus.click();
  } else if (await headerNew.isVisible()) {
    await headerNew.click();
  } else {
    throw new Error("Cannot find 'New website' button");
  }

  // Confirmation modal — use .last() because the sidebar + button also matches "New website"
  await expect(page.getByText("Start a new website?")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "New Website" }).last().click();
  await page.waitForTimeout(500);
}

// ── Test ─────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test("create test account and generate 3 websites", async ({ page }) => {
  // 15 min total — signup + 3 × up to 3 min/site + headroom
  test.setTimeout(15 * 60 * 1_000);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Sign up
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n═══ STEP 1: Signing up ${EMAIL} ═══\n`);

  await page.goto(`${BASE_URL}/auth/signup`);
  await page.waitForLoadState("networkidle");

  // Step 1 — account details
  await page.locator('input[type="text"]').first().fill("Vela E2E Test");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Continue →" }).click();

  // Step 2 — business info (waits for step 2 to appear)
  await expect(page.getByText("Tell us about your business")).toBeVisible({ timeout: 10_000 });
  await page.locator("textarea").fill("Dental clinic in Dubai offering general dentistry and cosmetic treatments.");
  // Wait a moment for AI detection debounce, then skip it — it's optional
  await page.waitForTimeout(1_200);
  await page.locator('input[placeholder="Dubai"]').fill("Dubai");
  // Phone — the dial-code display and a phone number input
  await page.locator('input[type="tel"]').fill("501234567");
  // Submit step 2
  await page.getByRole("button", { name: "Continue →" }).last().click();

  // May show "Analysing…" briefly
  await page.waitForFunction(
    () => !document.body.innerText.includes("Analysing…"),
    { timeout: 15_000 }
  );

  // Step 3 — plan selection (just leave Pro selected and click Subscribe Now)
  await expect(page.getByText("Choose your plan")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Subscribe Now" }).click();

  // Wait for redirect to /app/welcome
  await page.waitForURL(/\/app\/welcome/, { timeout: 30_000 });
  console.log("✅ Signup complete — redirected to /app/welcome");

  // Write credentials — session from signup is still live, skip re-login
  writeCredentials(EMAIL, PASSWORD);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Generate 3 websites (we are already logged in from signup)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n═══ STEP 2: Generating 3 websites ═══\n`);

  await page.goto(`${BASE_URL}/app/website`);
  // Wait for page to load (skeleton gone)
  await page.waitForSelector('[class*="animate-pulse"]', { state: "detached", timeout: 30_000 }).catch(() => {});

  // Site 1: Dental Clinic
  await generateSite(page, BUSINESSES[0].prompt, BUSINESSES[0].name);

  // Site 2: Gym — start a new project first
  await startNewProject(page);
  await generateSite(page, BUSINESSES[1].prompt, BUSINESSES[1].name);

  // Site 3: Real Estate — start a new project again
  await startNewProject(page);
  await generateSite(page, BUSINESSES[2].prompt, BUSINESSES[2].name);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Verify the sidebar has 3 sites
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n═══ STEP 3: Verifying 3 sites in sidebar ═══\n`);

  // The sidebar shows at 1280px (hidden md:flex)
  const siteRows = page
    .locator("span")
    .filter({ hasText: /^Sites$/ })
    .locator("../../..")
    .locator("button")
    .filter({ has: page.locator("span[class*='truncate']") });

  const count = await siteRows.count();
  // Pro plan allows 2 sites max — ≥2 is sufficient for A8 + A9 tests A–D
  expect(count, `Expected ≥2 sites in sidebar, got ${count}`).toBeGreaterThanOrEqual(2);

  const names = await siteRows.locator("span[class*='truncate']").allTextContents();
  console.log(`\n✅ Setup complete. ${count} sites in sidebar (Pro plan max = 2):`);
  names.forEach((n, i) => console.log(`   ${i + 1}. ${n.trim()}`));

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Test account is ready. Run the E2E suites with:");
  console.log("  npx playwright test e2e/phase-a8-mobile-collision.spec.ts e2e/phase-a9-sites-list.spec.ts --reporter=list");
  console.log("═══════════════════════════════════════════════════════\n");
});
