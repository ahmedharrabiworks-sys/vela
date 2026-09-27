// Real-browser test of OtpCodeInput.tsx (FIX 3) against the actual live
// signup code screen -- not a stubbed/simulated render. Verifies:
// typing auto-advances, backspace on an empty box goes back and clears the
// previous box, and pasting a full 6-digit string fills every box and
// fires onComplete (auto-submit). Consistent with this project's existing
// pattern of Playwright-driven checks (no jest/vitest configured).
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`PASS ${label}`); pass++; }
  else { console.log(`FAIL ${label}`); fail++; }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: { "X-Forwarded-For": "198.51.100.77" },
});
const page = await context.newPage();

await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
await page.fill('input[type="text"]', "Otp Test");
await page.fill('input[type="email"]', `otpcodetest_${Date.now()}@gmail.com`);
await page.fill('input[type="password"]', "Velvet0range!52Coast");
await page.waitForTimeout(200);
await page.click('button[type="submit"]');
await page.waitForSelector('input[aria-label="Digit 1 of 6"]', { timeout: 10000 });

const boxes = () => page.locator('input[aria-label^="Digit"]');

// 1. Typing a single digit auto-advances to the next box.
await boxes().nth(0).click();
await page.keyboard.type("1");
await page.waitForTimeout(100);
const focusedAfterType = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
check("typing a digit auto-advances focus to box 2", focusedAfterType === "Digit 2 of 6");

// 2. Backspace on an empty box moves focus back AND clears the previous box's value.
await page.keyboard.type("2"); // box 2 now has "2", focus moves to box 3
await page.waitForTimeout(100);
await page.keyboard.press("Backspace"); // box 3 is empty -> should jump back to box 2 and clear it
await page.waitForTimeout(100);
const focusedAfterBackspace = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
const box2Value = await boxes().nth(1).inputValue();
check("backspace on empty box moves focus back to box 2", focusedAfterBackspace === "Digit 2 of 6");
check("backspace on empty box clears box 2's value", box2Value === "");

// Reset by starting a second fresh signup for a clean paste test -- a hard
// reload would lose the wizard's in-memory step state (correct, expected
// behavior; not what this test is checking), so a new signup is used
// instead of reloading the same one.
await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
await page.fill('input[type="text"]', "Otp Test Two");
await page.fill('input[type="email"]', `otpcodetest2_${Date.now()}@gmail.com`);
await page.fill('input[type="password"]', "Velvet0range!52Coast");
await page.waitForTimeout(200);
await page.click('button[type="submit"]');
await page.waitForSelector('input[aria-label="Digit 1 of 6"]', { timeout: 10000 });

// 3. Pasting a full 6-digit code fills every box and triggers verification
//    (auto-submit) -- observed via the "Verifying..." text appearing, since
//    a real wrong code will show a "Wrong code" error right after, which
//    itself proves onComplete fired and the verify-code API call was made.
await boxes().nth(0).click();
await page.evaluate(() => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text", "482913");
  const evt = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  el.dispatchEvent(evt);
});
await page.waitForTimeout(150);
const allValues = await boxes().evaluateAll((els) => els.map((e) => e.value));
check("pasting a 6-digit code fills all 6 boxes", allValues.join("") === "482913");

await page.waitForTimeout(2500);
const bodyText = await page.evaluate(() => document.body.innerText);
const autoSubmitFired = bodyText.includes("Wrong code") || bodyText.includes("Verifying") || bodyText.includes("Too many attempts");
check("pasting the 6th digit auto-submits (verify-code call fired)", autoSubmitFired);

await browser.close();

console.log(`\n${pass}/${pass + fail} checks passed.`);
if (fail > 0) process.exit(1);
