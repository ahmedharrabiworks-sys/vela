import { test, expect } from "@playwright/test";

// No stored auth needed -- the widget is a public, unauthenticated page (real
// site visitors have no session). Deliberately no storageState here.
const TENANT = "5ca1624f-c56f-43ad-8068-bbfd236244f8";
const WEBSITE_ID = "4b2a209f-4da2-41d8-b47d-e867d7d96189";

const STALL_PATTERNS = /let me check|get back to you|i'?ll check|i will check/i;

test("real widget conversation: AI checks real availability in the same turn, no stall", async ({ page }) => {
  await page.goto(`/widget/${TENANT}?websiteId=${WEBSITE_ID}`);
  await page.waitForLoadState("networkidle");

  const input = page.locator('input[placeholder="Type a message…"]');
  await expect(input).toBeVisible({ timeout: 15000 });

  await input.fill("Hi, I'd like to book the Deluxe Sea View Room for December 22nd, 2026 at 11am.");
  await input.press("Enter");

  // This turn now runs a pre-flight gpt-4o-mini extraction PLUS the main
  // gpt-4o completion (both new/slower than a plain reply) before the typing
  // indicator is replaced with real text -- give it real room to finish.
  const typingIndicator = page.locator("span.animate-bounce").first();
  await expect(typingIndicator).toBeVisible({ timeout: 15000 });
  await expect(typingIndicator).toHaveCount(0, { timeout: 30000 });

  const replyBubble = page.locator("div.bg-white.border").last();
  await expect(replyBubble).toBeVisible({ timeout: 10000 });
  await expect(replyBubble).not.toHaveText("", { timeout: 10000 });

  const replyText = (await replyBubble.textContent())?.trim() ?? "";
  console.log("WIDGET AI REPLY:", replyText);

  expect(STALL_PATTERNS.test(replyText)).toBe(false);
  expect(/avail|book|confirm|name|number|phone/i.test(replyText)).toBe(true);
});
