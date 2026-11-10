// Read-only captures of the live app for the promo videos.
// Usage: node scripts/capture.mjs [en|ar|all]
//
// Safety, enforced in the browser:
// - Every request that could change data (non-GET to /api, and any write to
//   the Supabase REST API) is aborted. Login is the only allowed POST.
// - Phone numbers and emails are masked in every text node and input before
//   each capture, and each capture is checked: an unmasked number fails it.
// - Calls, transcripts and appointments are swapped for a short fictional
//   demo scenario in the browser only (response interception). The real
//   test calls name other businesses and real people, so they are never shown.
// Credentials come from ../.env.local and are never printed.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(path.join(ROOT, "..", "package.json"));
const { chromium } = require("playwright");
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, "..", ".env.local"), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]),
);
const BASE = "https://velaos.co";
const OUT = path.join(ROOT, "public", "captures");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fictional demo scenario (display only) ─────────────────────────────
// A call at 9:47 PM last night, answered and booked; tomorrow's calendar.
const QA = (date, hhmm) => new Date(`${date}T${hhmm}:00+03:00`).toISOString();
function demo(lang, today) {
  const add = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  const yday = add(today, -1), tmrw = add(today, 1);
  const T = lang === "ar" ? {
    a1: "مساء الخير، عيادة Vela للأسنان. كيف أقدر أخدمك؟",
    u1: "مساء النور. أبي أحجز تنظيف أسنان بكرة الصبح.",
    a2: "أبشر. التنظيف بـ 60 ريال ويأخذ 45 دقيقة. تناسبك الساعة 10 الصبح؟",
    u2: "تمام، اسمي سارة.",
    a3: "تم يا سارة. موعدك بكرة الساعة 10 الصبح. نشوفك على خير!",
    sum: "سارة حجزت تنظيف أسنان بكرة الساعة 10 الصبح.",
  } : {
    a1: "Good evening, Vela Dental Clinic. How can I help?",
    u1: "Hi, can I book a teeth cleaning for tomorrow morning?",
    a2: "Of course. A cleaning is 60 QAR and takes 45 minutes. Does 10:00 AM work?",
    u2: "Perfect. My name is Sara.",
    a3: "You're booked, Sara. Tomorrow at 10:00 AM. See you then!",
    sum: "Sara booked a teeth cleaning for tomorrow at 10:00 AM.",
  };
  const call = (id, at, lng, secs, outcome, summary, transcript) => ({ id, call_type: "live", created_at: at, ended_at: at, duration_seconds: secs, language: lng, caller_number: "+97455500000", summary, outcome, transcript, has_recording: false, appointment_booked: outcome === "appointment-booked" ? { appointmentId: "demo", status: "confirmed" } : null });
  const hero = call("demo-call-0947", QA(yday, "21:47"), lang, 74, "appointment-booked", T.sum, [
    { role: "assistant", text: T.a1 }, { role: "user", text: T.u1 }, { role: "assistant", text: T.a2 }, { role: "user", text: T.u2 }, { role: "assistant", text: T.a3 },
  ]);
  const calls = [
    call("demo-call-5", QA(today, "11:20"), "en", 48, "assistant-ended-call", lang === "ar" ? "سؤال عن أسعار التبييض." : "Asked about whitening prices.", []),
    call("demo-call-4", QA(today, "09:05"), "ar", 132, "appointment-booked", lang === "ar" ? "عمر حجز فحص عام." : "Omar booked a check-up.", []),
    hero,
    call("demo-call-3", QA(add(today, -2), "19:12"), "ar", 9, "customer-ended-call", "", []),
    call("demo-call-2", QA(add(today, -2), "13:40"), "en", 95, "appointment-booked", lang === "ar" ? "نور حجزت تبييض." : "Noor booked a whitening.", []),
    call("demo-call-1", QA(add(today, -3), "22:15"), "ar", 61, "assistant-ended-call", lang === "ar" ? "سؤال عن ساعات الدوام." : "Asked about opening hours.", []),
  ];
  const appt = (id, date, time, name, service, channel, status, dur) => ({ id, name, phone: "+97455500000", phoneUnconfirmed: false, service, date, time, durationMinutes: dur, outsideHours: false, status, channel, notes: null, conversationId: null, rescheduled: false, callId: null, callSummary: null });
  const N = lang === "ar" ? { Omar: "عمر", Sara: "سارة", Huda: "هدى", Noor: "نور", Khalid: "خالد", Maryam: "مريم" } : { Omar: "Omar", Sara: "Sara", Huda: "Huda", Noor: "Noor", Khalid: "Khalid", Maryam: "Maryam" };
  const appointments = [
    appt("demo-a1", today, "09:00", N.Omar, "General Dental Checkup", "phone", "confirmed", 30),
    appt("demo-a2", tmrw, "10:00", N.Sara, "Teeth Cleaning", "phone", "confirmed", 45),
    appt("demo-a3", tmrw, "15:00", N.Huda, "Dental Filling", "whatsapp", "confirmed", 45),
    appt("demo-a4", add(today, 2), "10:30", N.Noor, "Teeth Whitening", "phone", "pending", 60),
    appt("demo-a5", add(today, 3), "16:00", N.Khalid, "Dental Crown", "instagram", "confirmed", 90),
    appt("demo-a6", add(today, -1), "14:30", N.Maryam, "Teeth Cleaning", "phone", "confirmed", 45),
  ];
  return { calls, appointments, hero, tmrw };
}

// ── Masking, injected before any page script runs ─────────────────────
const MASK = `(() => {
  const PHONE = /(?:\\+|00)?\\d[\\d\\s()\\-\\u2066\\u2069]{6,}\\d/g;
  const EMAIL = /[\\w.+-]+@[\\w-]+\\.[\\w.]+/g;
  const fix = (s) => s.replace(EMAIL, "•••@•••").replace(PHONE, (m) => (m.replace(/\\D/g, "").length >= 7 ? "+974 •••• ••••" : m));
  const walk = (root) => {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const v = fix(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
    root.querySelectorAll && root.querySelectorAll("input, textarea").forEach((el) => { const v = fix(el.value || ""); if (v !== el.value) el.value = v; });
  };
  window.__velaMask = () => walk(document.body);
  new MutationObserver(() => walk(document.body)).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  const style = document.createElement("style");
  // The floating assistant button is not part of these screens.
  style.textContent = "[aria-label*='ssistant'][class*='fixed'], .fixed.bottom-6.end-6, nextjs-portal { display: none !important; }";
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
})();`;

// What still looks like a phone number or email after masking.
const LEAK = /(?:\+|00)?\d[\d\s()-]{6,}\d|[\w.+-]+@[\w-]+\.[\w.]+/g;

async function capture(lang) {
  const dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const layout = {};
  const blocked = [];
  const report = [];
  let scenario = null;

  const makeContext = async (viewport, dpr) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, locale: lang === "ar" ? "ar-QA" : "en-GB", timezoneId: "Asia/Qatar" });
    await ctx.addInitScript(MASK);
    await ctx.addInitScript((l) => { try { localStorage.setItem("vela_lang", l); localStorage.setItem("vela_lang_set", "1"); localStorage.setItem("vela_train_info_open", "0"); localStorage.setItem("vela_onboarding_banner_dismissed", "true"); localStorage.setItem("vela_training_banner_dismissed", "true"); } catch {} }, lang);
    await ctx.route("**/*", async (route) => {
      const req = route.request(), url = req.url(), method = req.method();
      const isApi = url.startsWith(`${BASE}/api/`);
      const isDbWrite = /supabase\.co\/rest\//.test(url) && method !== "GET" && method !== "HEAD";
      if ((isApi && method !== "GET") || isDbWrite) { blocked.push(`${method} ${url.replace(BASE, "")}`); return route.abort(); }
      if (isApi && scenario) {
        if (url.includes("/api/ai-agent/calls")) return route.fulfill({ json: { calls: scenario.calls } });
        if (url.includes("/api/appointments") && !url.includes("availability")) {
          const res = await route.fetch(); const real = await res.json();
          return route.fulfill({ json: { ...real, appointments: scenario.appointments } });
        }
        if (url.includes("/api/dashboard")) {
          const res = await route.fetch(); const real = await res.json();
          const booked = scenario.appointments.length;
          return route.fulfill({ json: { ...real, kpis: { ...real.kpis, appointments: { ...(real.kpis?.appointments ?? {}), value: booked, trend: null } } } });
        }
        if (url.includes("/api/channels/phone-status")) {
          const res = await route.fetch(); const real = await res.json();
          const week = (real.week ?? []).map((d) => ({ ...d, calls: scenario.calls.filter((c) => new Date(Date.parse(c.created_at) + 3 * 36e5).toISOString().slice(0, 10) === d.date).length }));
          return route.fulfill({ json: { ...real, week, callsThisWeek: week.reduce((n, d) => n + d.calls, 0), lastCallAt: scenario.calls[0].created_at } });
        }
      }
      return route.continue();
    });
    return ctx;
  };

  // Log in once (mobile), keep the session for the other viewport.
  const mobile = await makeContext({ width: 390, height: 844 }, 3);
  const p = await mobile.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill('input[type="email"]', env.PROMO_EMAIL);
  await p.fill('input[type="password"]', env.PROMO_PASSWORD);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 45000 });
  const nowRes = await p.request.get(`${BASE}/api/appointments`);
  const today = (await nowRes.json()).now.date;
  scenario = demo(lang, today);
  const storage = await mobile.storageState();

  const shoot = async (page, name, opts = {}) => {
    await page.evaluate(() => document.fonts.ready);
    await wait(opts.settle ?? 900);
    await page.evaluate(() => window.__velaMask && window.__velaMask());
    await wait(150);
    const text = await page.evaluate(() => document.body.innerText + " " + Array.from(document.querySelectorAll("input, textarea")).map((e) => e.value).join(" "));
    const leaks = (text.match(LEAK) || []).filter((m) => m.replace(/\D/g, "").length >= 7 || m.includes("@"));
    if (leaks.length) throw new Error(`${lang}/${name}: unmasked text found (${leaks.length}), capture refused`);
    const file = path.join(dir, `${name}.png`);
    if (opts.selector) await page.locator(opts.selector).first().screenshot({ path: file });
    else await page.screenshot({ path: file, fullPage: !!opts.fullPage });
    report.push(`${name}.png ok (masked, ${opts.fullPage ? "full page" : opts.selector ?? "viewport"})`);
    return file;
  };
  const boxes = async (page, name, sels) => {
    layout[name] = { viewport: page.viewportSize(), dpr: await page.evaluate(() => devicePixelRatio), pageH: await page.evaluate(() => document.documentElement.scrollHeight), boxes: {} };
    for (const [key, sel] of Object.entries(sels)) {
      const b = await page.locator(sel).first().boundingBox().catch(() => null);
      if (b) { const sy = await page.evaluate(() => scrollY); layout[name].boxes[key] = { x: b.x, y: b.y + sy, w: b.width, h: b.height }; }
    }
  };

  // 1. Phone Number page (tall viewport: the app scrolls inside main, not the page)
  await p.setViewportSize({ width: 390, height: 1480 });
  await p.goto(`${BASE}/app/ai-agent/phone`, { waitUntil: "networkidle" });
  await p.waitForSelector('[data-testid="phone-card"]');
  await boxes(p, "phone", { card: '[data-testid="phone-card"]', pill: '[data-testid="phone-status"]', number: '[data-testid="business-number"]', recent: '[data-testid="recent-calls"]', chart: '[data-testid="week-chart"]' });
  await shoot(p, "phone");
  await p.setViewportSize({ width: 390, height: 844 });

  // 2. Conversations, the 9:47 PM call open
  await p.goto(`${BASE}/app/conversations?open=call:${scenario.hero.id}`, { waitUntil: "networkidle" });
  await wait(1500);
  await boxes(p, "transcript", { main: "main" });
  layout.transcript.bubbles = await p.evaluate((texts) => {
    const out = [];
    for (const tx of texts) {
      const el = Array.from(document.querySelectorAll("main p, main div, main span")).find((e) => e.textContent.trim() === tx && e.children.length === 0);
      if (!el) { out.push(null); continue; }
      let b = el; while (b && parseFloat(getComputedStyle(b).borderTopLeftRadius) < 10) b = b.parentElement;
      const r = (b || el).getBoundingClientRect(); out.push({ x: r.x, y: r.y + scrollY, w: r.width, h: r.height });
    }
    return out;
  }, [scenario.hero.summary, ...scenario.hero.transcript.map((t) => t.text)]);
  await shoot(p, "transcript");
  await p.goto(`${BASE}/app/conversations`, { waitUntil: "networkidle" });
  await shoot(p, "inbox");

  // 3. Appointments Day view (tomorrow, the booking), plus an empty plate and the row
  await p.setViewportSize({ width: 390, height: 1700 });
  await p.goto(`${BASE}/app/appointments`, { waitUntil: "networkidle" });
  await wait(1200);
  await p.locator('[data-testid="date-strip"] [role="tab"]').nth(15).click();
  await wait(1200);
  const pickTable = async () => {
    const all = p.locator(`[data-testid="day-table"][data-date="${scenario.tmrw}"]`);
    for (let i = 0; i < await all.count(); i++) { const bx = await all.nth(i).boundingBox(); if (bx && bx.x > -2 && bx.x < 300) return all.nth(i); }
    return all.first();
  };
  const table = await pickTable();
  const row = table.locator('[data-testid="day-booked"]').first();
  await row.scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollTo(0, 0));
  await boxes(p, "day", { table: `[data-testid="day-table"][data-date="${scenario.tmrw}"]`, row: `[data-testid="day-table"][data-date="${scenario.tmrw}"] [data-testid="day-booked"]` });
  await shoot(p, "day");
  await row.screenshot({ path: path.join(dir, "day-row.png") });
  await row.evaluate((el) => { el.style.visibility = "hidden"; });
  await shoot(p, "day-empty");
  await row.evaluate((el) => { el.style.visibility = ""; });

  // 4. Dashboard and AI Agent Overview
  await p.setViewportSize({ width: 390, height: 1500 });
  await p.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await wait(1500);
  await shoot(p, "dashboard");
  await p.goto(`${BASE}/app/ai-agent/overview`, { waitUntil: "networkidle" });
  await wait(1500);
  await shoot(p, "overview");
  await mobile.close();

  // 5. Week view only exists on wider screens: a tablet in portrait.
  const tablet = await browser.newContext({ storageState: storage, viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2, locale: lang === "ar" ? "ar-QA" : "en-GB", timezoneId: "Asia/Qatar" });
  await tablet.addInitScript(MASK);
  await tablet.addInitScript((l) => { try { localStorage.setItem("vela_lang", l); localStorage.setItem("vela_lang_set", "1"); } catch {} }, lang);
  const tctx = tablet;
  await tctx.route("**/*", async (route) => {
    const req = route.request(), url = req.url(), method = req.method();
    if ((url.startsWith(`${BASE}/api/`) && method !== "GET") || (/supabase\.co\/rest\//.test(url) && method !== "GET" && method !== "HEAD")) { blocked.push(`${method} ${url.replace(BASE, "")}`); return route.abort(); }
    if (url.includes("/api/appointments") && !url.includes("availability") && url.startsWith(`${BASE}/api/`)) { const res = await route.fetch(); const real = await res.json(); return route.fulfill({ json: { ...real, appointments: scenario.appointments } }); }
    return route.continue();
  });
  const t = await tctx.newPage();
  await t.goto(`${BASE}/app/appointments`, { waitUntil: "networkidle" });
  await wait(1200);
  const weekBtn = t.getByRole("button", { name: lang === "ar" ? /أسبوع/ : /^Week$/ }).first();
  if (await weekBtn.count()) { await weekBtn.click(); await wait(800); }
  await boxes(t, "week", { grid: '[data-testid="schedule-week"]' });
  await shoot(t, "week", { selector: '[data-testid="schedule-week"]' });
  await tctx.close();

  await browser.close();
  fs.writeFileSync(path.join(dir, "layout.json"), JSON.stringify(layout, null, 1));
  fs.writeFileSync(path.join(dir, "capture-report.json"), JSON.stringify({ lang, today, blocked, report }, null, 1));
  console.log(`${lang}: ${report.length} captures, ${blocked.length} write requests blocked`);
  for (const r of report) console.log("  " + r);
}

const which = process.argv[2] ?? "all";
for (const lang of which === "all" ? ["en", "ar"] : [which]) await capture(lang);
