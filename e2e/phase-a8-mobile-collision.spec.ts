/**
 * Phase A item 8 — VelaAssistant bubble collision on mobile (375×667)
 *
 * Verifies that the VelaAssistant floating bubble:
 *   (A) Website Builder: is hidden (opacity:0, pointer-events:none) while the
 *       Publish panel is open, then reappears when the panel is closed.
 *   (B) Channels: is hidden while the channel-connect modal is open, then
 *       reappears when the modal is closed.
 *
 * Uses real browser interaction — no static analysis, no mock state.
 *
 * Assumptions / preconditions:
 *   - Test account has ≥1 built website (Publish button must be enabled)
 *   - If Instagram is already connected, the connect-modal test is skipped
 *     with an explanatory message (use a fresh test account to run all tests)
 *
 * Run:
 *   npx playwright test e2e/phase-a8-mobile-collision.spec.ts --reporter=list
 */

import { test, expect } from "@playwright/test";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the computed opacity (0..1) of the VelaAssistant bubble button. */
async function getBubbleOpacity(page: import("@playwright/test").Page): Promise<number> {
  const bubble = page.locator('[aria-label="Open Vela AI Assistant"]');
  await expect(bubble).toBeAttached({ timeout: 10_000 });
  const opacity = await bubble.evaluate(
    (el) => parseFloat(window.getComputedStyle(el).opacity)
  );
  return opacity;
}

/** Returns the computed pointer-events value of the bubble. */
async function getBubblePointerEvents(page: import("@playwright/test").Page): Promise<string> {
  const bubble = page.locator('[aria-label="Open Vela AI Assistant"]');
  return bubble.evaluate(
    (el) => window.getComputedStyle(el).pointerEvents
  );
}

/** Wait for the CSS transition (200ms) to settle before checking computed style. */
async function waitForTransition(page: import("@playwright/test").Page) {
  await page.waitForTimeout(350);
}

// ── Test A: Website Builder — Publish panel ──────────────────────────────────

test.describe("A8 — Website Builder Publish panel (375px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/website");
    // Wait for the loading skeleton to disappear
    await page.waitForSelector('[class*="animate-pulse"]', { state: "detached", timeout: 30_000 }).catch(() => {});
    // Wait for the bubble to be attached
    await expect(page.locator('[aria-label="Open Vela AI Assistant"]')).toBeAttached({ timeout: 20_000 });
  });

  test("bubble visible before panel opens", async ({ page }) => {
    await waitForTransition(page);
    const opacity = await getBubbleOpacity(page);
    expect(opacity, "Bubble should be visible (opacity ≥ 0.9) on fresh page load").toBeGreaterThanOrEqual(0.9);
  });

  test("bubble hidden while Publish panel is open, reappears on close", async ({ page }) => {
    // Find the Publish button (text varies by state: "Publish", "Update Site", "Published ↗")
    const publishBtn = page.getByRole("button", { name: /Publish|Update Site/ }).first();

    // Precondition: publish button must be enabled (needs a built website)
    const isDisabled = await publishBtn.evaluate((el) => (el as HTMLButtonElement).disabled);
    if (isDisabled) {
      test.skip(
        true,
        "Test account has no built website — generate a site first, then re-run."
      );
    }

    // ── Step 1: open the Publish panel ──────────────────────────────────────
    await publishBtn.click();

    // Panel appears — wait for "Continue →" button (step 1 of the panel flow)
    const continueBtn = page.getByRole("button", { name: "Continue →" });
    await expect(continueBtn).toBeVisible({ timeout: 10_000 });

    // ── Step 2: verify bubble is hidden ──────────────────────────────────────
    await waitForTransition(page);
    const opacityWhenOpen = await getBubbleOpacity(page);
    expect(
      opacityWhenOpen,
      "Bubble should be invisible (opacity ≈ 0) while Publish panel is open on mobile"
    ).toBeLessThan(0.1);

    const peWhenOpen = await getBubblePointerEvents(page);
    expect(
      peWhenOpen,
      "Bubble should have pointer-events:none while Publish panel is open"
    ).toBe("none");

    // ── Step 3: verify the Continue button itself is clickable ────────────────
    const boundingBox = await continueBtn.boundingBox();
    expect(boundingBox, "Continue → button must have a bounding box (visible, not zero-size)").not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);

    // Click Continue → and confirm the panel advances to step 2
    await continueBtn.click();
    await expect(page.getByText("Pre-publish checks")).toBeVisible({ timeout: 10_000 });

    // ── Step 4: close the panel and verify bubble reappears ───────────────────
    // Close via the × button in the panel header
    await page.locator('button:has-text("×")').first().click();

    await waitForTransition(page);
    const opacityAfterClose = await getBubbleOpacity(page);
    expect(
      opacityAfterClose,
      "Bubble should be visible again (opacity ≥ 0.9) after closing the Publish panel"
    ).toBeGreaterThanOrEqual(0.9);

    const peAfterClose = await getBubblePointerEvents(page);
    expect(
      peAfterClose,
      "Bubble should have pointer-events auto/all after panel is closed"
    ).not.toBe("none");
  });
});

// ── Test B: Channels — Connect modal ────────────────────────────────────────

test.describe("A8 — Channels Connect modal (375px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/channels");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[aria-label="Open Vela AI Assistant"]')).toBeAttached({ timeout: 20_000 });
  });

  test("bubble visible before modal opens", async ({ page }) => {
    await waitForTransition(page);
    const opacity = await getBubbleOpacity(page);
    expect(opacity, "Bubble should be visible on channels page load").toBeGreaterThanOrEqual(0.9);
  });

  test("bubble hidden while Connect Instagram modal is open, reappears on close", async ({ page }) => {
    // Find the "Connect" button next to Instagram
    // If Instagram is already connected, this button becomes "Disconnect"; skip then.
    const connectBtn = page.getByRole("button", { name: "Connect" }).first();
    const connectBtnCount = await connectBtn.count();
    if (connectBtnCount === 0) {
      test.skip(
        true,
        "No 'Connect' button found — both channels may already be connected. " +
        "Use a fresh test account without connected channels to run this test."
      );
    }

    // ── Step 1: open the Connect Instagram modal ─────────────────────────────
    await connectBtn.click();

    // The Instagram modal shows "Connect Instagram" heading
    await expect(page.getByText("Connect Instagram")).toBeVisible({ timeout: 10_000 });

    // ── Step 2: verify bubble is hidden ──────────────────────────────────────
    await waitForTransition(page);
    const opacityWhenOpen = await getBubbleOpacity(page);
    expect(
      opacityWhenOpen,
      "Bubble should be invisible (opacity ≈ 0) while Connect modal is open on mobile"
    ).toBeLessThan(0.1);

    const peWhenOpen = await getBubblePointerEvents(page);
    expect(
      peWhenOpen,
      "Bubble should have pointer-events:none while modal is open"
    ).toBe("none");

    // ── Step 3: verify interactive element inside modal is clickable ──────────
    const continueToMeta = page.getByRole("button", { name: "Continue to Meta Authorization" });
    const bb = await continueToMeta.boundingBox();
    expect(bb, "Continue to Meta Authorization button must be visible and have a bounding box").not.toBeNull();
    expect(bb!.width).toBeGreaterThan(0);

    // Click it — panel should advance to step 2 ("Authorize with Meta")
    await continueToMeta.click();
    await expect(page.getByText("Authorize with Meta")).toBeVisible({ timeout: 10_000 });

    // ── Step 4: close the modal and verify bubble reappears ───────────────────
    // Click the backdrop (top area of the screen, above the bottom-sheet modal)
    // The modal is an items-end sheet at the bottom on mobile; clicking near the top
    // of the viewport hits the backdrop, which calls onClose.
    await page.mouse.click(187, 80);

    await waitForTransition(page);
    const opacityAfterClose = await getBubbleOpacity(page);
    expect(
      opacityAfterClose,
      "Bubble should be visible again (opacity ≥ 0.9) after closing the Connect modal"
    ).toBeGreaterThanOrEqual(0.9);

    const peAfterClose = await getBubblePointerEvents(page);
    expect(
      peAfterClose,
      "Bubble should have pointer-events auto/all after modal is closed"
    ).not.toBe("none");
  });
});
