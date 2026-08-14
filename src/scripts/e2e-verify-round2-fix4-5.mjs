import { chromium } from "playwright";
const BASE = "https://vela-g8h4.vercel.app";

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const check = (label, cond) => { results.push({ label, pass: !!cond }); console.log(`${cond ? "PASS" : "FAIL"} - ${label}`); };

  // ── Desktop context (sidebar is desktop-only) ──────────────────────────
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/app/website`, { waitUntil: "networkidle" });

  // Create a fresh site via chat so we have known real content to verify against.
  const chatInput = page.locator('textarea, input[type="text"]').first();
  await chatInput.waitFor({ state: "visible", timeout: 20000 });
  await chatInput.fill("A small coffee shop called FixFour Cafe in Dubai. No photos, build it now.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);
  await chatInput.fill("Coffee, pastries and sandwiches. No photos, just build it now, do not ask more questions.");
  await page.keyboard.press("Enter");

  // Wait for the build to complete: preview iframe with real content appears.
  await page.waitForSelector('iframe[title="Website preview"]', { timeout: 90000 });
  await page.waitForTimeout(3000); // let the last assistant message land in chat history

  const chatMessagesBeforeCount = await page.locator('text=FixFour Cafe').count();
  check("Setup: site built, business name appears in chat", chatMessagesBeforeCount > 0);

  // Capture the site name from the active sidebar row so we can find/click it later.
  const activeSiteName = await page.locator('.border-l-2.border-\\[\\#FF6B35\\] span.font-semibold').first().textContent().catch(() => null);
  console.log("Active site name in sidebar:", activeSiteName);

  // ── Publish it, so FIX 5's "Edit site" toolbar button (built && isPublished) is testable ──
  // The publish panel is a 3-step wizard: Details -> Check -> Go Live, each advanced
  // by a "Continue ->" button (not a repeated "Publish" button).
  const publishBtn = page.locator('button:has-text("Publish")').first();
  if (await publishBtn.count()) {
    await publishBtn.click();
    await page.waitForTimeout(1000);
    for (let step = 0; step < 4; step++) {
      const continueBtn = page.locator('button:has-text("Continue")').first();
      const goLiveBtn = page.locator('button:has-text("Go Live"), button:has-text("Publish now"), button:has-text("Confirm")').first();
      if (await goLiveBtn.count()) {
        await goLiveBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
        break;
      } else if (await continueBtn.count()) {
        await continueBtn.click().catch(() => {});
        await page.waitForTimeout(1500);
      } else {
        break;
      }
    }
    await page.waitForTimeout(3000);
  }

  // ── FIX 5a: "Edit site" toolbar button appears once published ─────────
  const editSiteToolbarBtn = page.locator('button:has-text("Edit site")');
  const editSiteToolbarCount = await editSiteToolbarBtn.count();
  check("FIX 5: 'Edit site' toolbar button is present after publishing", editSiteToolbarCount > 0);

  // ── FIX 4: navigate away then back, click the site in the sidebar ─────
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/app/website`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // On fresh load, page auto-loads the most-recently-updated site (our new one).
  // To specifically test the sidebar-click restoration path, click on the site's
  // OWN row explicitly (simulates the reported bug: clicking a site from the list).
  const siteRow = page.locator(`button:has-text("FixFour Cafe")`).first();
  const siteRowExists = await siteRow.count();
  check("FIX 4 setup: site row visible in sidebar", siteRowExists > 0);

  if (siteRowExists > 0) {
    await siteRow.click();
    await page.waitForTimeout(3000);

    // Check 1: chat history restored in full (not reset to a blank single-message state).
    // "What language..." is legitimately the FIRST real message of this conversation, so its
    // presence alone isn't a reset signal -- a reset shows ONLY that message with nothing
    // after it. Check instead for the LAST real message ("Got it. Your website is ready!"),
    // which only appears if the full multi-turn history survived the reload.
    const finalAiMessageVisible = await page.locator('text=Got it. Your website is ready').count();
    const businessNameInChat = await page.locator('text=FixFour Cafe').count();
    check("FIX 4: chat did NOT reset — full history (incl. final AI message) restored", finalAiMessageVisible > 0);
    check("FIX 4: chat history restored with real site content", businessNameInChat > 0);

    // Check 2: preview pane shows real content, not the empty placeholder
    const emptyPlaceholder = await page.locator('text=Your website preview').count();
    const previewIframe = page.locator('iframe[title="Website preview"]');
    const iframeCount = await previewIframe.count();
    check("FIX 4: preview pane is NOT showing the empty placeholder", emptyPlaceholder === 0);
    check("FIX 4: preview iframe with real content is rendered", iframeCount > 0);
  }

  // ── FIX 5b: sidebar ⋯ menu shows "Edit site" (not "Open") ─────────────
  const menuTrigger = page.locator('button svg circle').first();
  // Hover the site row to reveal the ⋯ button, then click it.
  if (siteRowExists > 0) {
    const rowContainer = page.locator(`button:has-text("FixFour Cafe")`).first().locator('xpath=..');
    await rowContainer.hover();
    const dotsBtn = rowContainer.locator('button').last();
    if (await dotsBtn.count()) {
      await dotsBtn.click();
      await page.waitForTimeout(500);
      const editSiteMenuItem = await page.locator('button:has-text("Edit site")').count();
      check("FIX 5: sidebar ⋯ menu shows 'Edit site' (not 'Open')", editSiteMenuItem > 0);
      // The menu's own backdrop (fixed inset-0, onClick closes it) has no Escape-key
      // handler -- clicking a neutral corner of the viewport hits that backdrop and
      // dismisses the menu, same as a real user clicking away.
      await page.mouse.click(5, 5);
      await page.waitForTimeout(300);
    }
  }

  // ── FIX 5c: clicking the toolbar "Edit site" button switches to chat tab ──
  if (editSiteToolbarCount > 0) {
    await editSiteToolbarBtn.first().click();
    await page.waitForTimeout(500);
    // On desktop both panels are visible regardless; verify no error/crash and chat panel present.
    const chatPanelVisible = await page.locator('text=FixFour Cafe').count();
    check("FIX 5: clicking 'Edit site' keeps chat/editor accessible", chatPanelVisible > 0);
  }

  await context.close();

  // ── Mobile viewport check (375px) — activeTab toggle + Edit site button don't overflow ──
  const mobileContext = await browser.newContext({ storageState: "e2e/.auth/user.json", viewport: { width: 375, height: 667 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/app/website`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(2000);
  const bodyOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  check("Mobile 375px: no horizontal page overflow on Website Builder", !bodyOverflow);
  const mobileEditBtn = await mobilePage.locator('button:has-text("Edit site")').count();
  console.log("Mobile: Edit site toolbar button count:", mobileEditBtn, "(informational — may be 0 if most-recent site isn't published)");
  await mobileContext.close();

  console.log("\n=== RESULTS ===");
  const failed = results.filter(r => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) console.log("FAILED:", failed.map(f => f.label));

  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
})();
