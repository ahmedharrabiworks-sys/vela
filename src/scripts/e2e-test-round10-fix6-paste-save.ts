// Live reproduction of FIX 6 (general chat surface must parse+save a pasted
// services list via the existing save_kb mechanism). Uses the real browser
// UI end to end: types a price list into the floating VelaAssistant (NOT
// the dedicated training interview), then reloads Train Your AI -> Services
// and checks the parsed services actually landed there.
import { chromium } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vela-g8h4.vercel.app";

const PRICE_LIST = `Here's what we offer:
1:1 Coaching Session - $150
Group Coaching Package - $400
Executive Leadership Coaching - $300`;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();

  await page.goto(`${BASE}/app`);
  await page.waitForLoadState("networkidle");

  const bubble = page.getByLabel("Open Vela AI Assistant");
  await bubble.click();
  await page.waitForTimeout(500);

  const textarea = page.locator("textarea");
  await textarea.fill(PRICE_LIST);
  await textarea.press("Enter");

  // Wait for the AI reply + the save_kb POST to /api/ai-training to settle.
  await page.waitForTimeout(6000);
  const replyText = await page.locator(".bg-\\[\\#F3F4F6\\].text-\\[\\#111111\\]").last().textContent();
  console.log("Assistant reply:", replyText);
  await page.screenshot({ path: "test-results/round10-fix6-chat-after-paste.png" });

  // Now check the real saved KB.
  await page.goto(`${BASE}/app/ai-training`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const bodyText = await page.textContent("body");
  const hasCoaching = bodyText?.includes("1:1 Coaching Session") || bodyText?.includes("Coaching Session");
  const hasExec = bodyText?.includes("Executive Leadership Coaching");
  console.log("Services tab contains '1:1 Coaching Session':", hasCoaching);
  console.log("Services tab contains 'Executive Leadership Coaching':", hasExec);
  await page.screenshot({ path: "test-results/round10-fix6-training-page.png", fullPage: true });

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
