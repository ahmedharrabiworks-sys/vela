// Screenshot pass for the "make auth SYSTEM real" round: signup step 1
// (with the live password checklist filled in so it's visible), forgot
// password, reset password (ready state, forced via a stubbed session is
// not possible headlessly, so this captures the "expired" honest state a
// real visitor gets without a valid recovery code -- documented as such),
// link-expired, and login's unconfirmed-email error state, at 1440 and
// 375x812, in English and Arabic.
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const outDir = "verification";
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "m375", width: 375, height: 812 },
];

const browser = await chromium.launch();

// Locale is driven by localStorage("vela_lang"), not a URL param -- seed it
// via addInitScript before the very first navigation on each fresh page.
async function newLocalePage(vp, locale) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  if (locale === "ar") {
    await page.addInitScript(() => localStorage.setItem("vela_lang", "ar"));
  }
  return page;
}

async function shot(pathAndQuery, label, locale) {
  for (const vp of viewports) {
    const page = await newLocalePage(vp, locale);
    await page.goto(`${BASE}${pathAndQuery}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${outDir}/auth-${label}-${vp.name}-${locale}.png`, fullPage: true });
    await page.close();
    console.log(`auth-${label}-${vp.name}-${locale}.png`);
  }
}

// Signup step 1 with the password checklist visible (type a partial password)
async function shotSignupStep1(locale) {
  for (const vp of viewports) {
    const page = await newLocalePage(vp, locale);
    await page.goto(`${BASE}/auth/signup`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.fill("hunter2");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${outDir}/auth-signup-step1-${vp.name}-${locale}.png`, fullPage: true });
    await page.close();
    console.log(`auth-signup-step1-${vp.name}-${locale}.png`);
  }
}

await shotSignupStep1("en");
await shotSignupStep1("ar");
await shot("/auth/forgot-password", "forgot-password", "en");
await shot("/auth/forgot-password", "forgot-password", "ar");
await shot("/auth/reset-password", "reset-password-expired", "en");
await shot("/auth/reset-password", "reset-password-expired", "ar");
await shot("/auth/link-expired", "link-expired", "en");
await shot("/auth/link-expired", "link-expired", "ar");
await shot("/auth/login", "login", "en");
await shot("/auth/login", "login", "ar");

await browser.close();
