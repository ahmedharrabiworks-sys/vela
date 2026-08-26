import { test, expect } from "@playwright/test";

// Round M9 FIX 3(b): live proof the structured-booking form result no longer
// appears twice in the chat thread. No stored auth needed -- public widget,
// no OpenAI call involved (structured-booking is a deterministic route).
const TENANT = "5ca1624f-c56f-43ad-8068-bbfd236244f8";
// Round M9: availability-fix-verify.spec.ts's WEBSITE_ID (4b2a209f-...) no
// longer exists in the websites table (confirmed live -- the site was
// regenerated with a new id since that test was written). Using the
// current real id for this tenant's site, confirmed via direct query.
const WEBSITE_ID = "bac46c1b-7934-4ec5-92bd-9c044ad8a46e";

test("structured-booking form result appears exactly once when switching back to chat", async ({ page }) => {
  await page.goto(`/widget/${TENANT}?websiteId=${WEBSITE_ID}`);
  await page.waitForLoadState("networkidle");

  await page.getByText("Prefer a quick form instead?").click();
  await expect(page.getByText("Quick booking")).toBeVisible({ timeout: 10000 });

  await page.getByPlaceholder("Your name").fill("M9 Fix3b Test");
  await page.getByPlaceholder("50 000 0000").fill("501234567"); // valid 9-digit UAE mobile

  // This tenant has real trained services -- explicitly pick "Something
  // else..." to force Case A (untrained service), the exact branch whose
  // message this fix touches.
  const serviceSelect = page.locator("select");
  if (await serviceSelect.isVisible().catch(() => false)) {
    await serviceSelect.selectOption({ label: "Something else…" });
  }
  await page.getByPlaceholder("What do you need?").fill("Round M9 Fix3b Untrained Service " + Date.now());
  // Leave date/time empty -- doesn't matter for this test, only whether the
  // resulting message renders exactly once.

  await page.getByRole("button", { name: "Submit" }).click();

  // Wait for the form-result panel to render.
  const resultPanel = page.locator("p.text-sm.text-\\[\\#111111\\].leading-relaxed").first();
  await expect(resultPanel).toBeVisible({ timeout: 15000 });
  const resultText = (await resultPanel.textContent())?.trim() ?? "";
  console.log("FORM RESULT TEXT:", resultText);
  expect(resultText.length).toBeGreaterThan(0);

  // Switch back to chat -- this is exactly the interaction the bug report
  // described: the same message appearing a second time as a chat bubble.
  await page.getByRole("button", { name: "Back to chat" }).click();
  await page.waitForTimeout(1500); // let the immediate history fetch resolve

  const matchingBubbles = page.locator("div.bg-white.border", { hasText: resultText.slice(0, 30) });
  const count = await matchingBubbles.count();
  console.log("Matching chat bubbles found:", count);
  expect(count).toBe(1);
});
