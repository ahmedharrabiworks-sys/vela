// Vela WhatsApp sender, ASSISTED: it prepares, Oussama presses Send.
//   npm run sales:send                 one session now (up to send.per_session)
//   npm run sales:send -- --schedule   stay open, run the morning and evening sessions
//   npm run sales:send -- --dry-run    print today's queue, open nothing
// What it does, per lead in today's queue (sales/scripts/send-queue.mjs):
//   opens the chat with the message already typed in the box, points the orange
//   cursor at Send and waits for Oussama to press it; then attaches the voice
//   note and the promo video, each waiting for his Send; logs the exact time.
// It never presses Send, never replies to anyone and never opens incoming chats.
// Safety stops: any WhatsApp warning or restriction, a logout, or 3 numbers in a
// row that are not on WhatsApp. The WhatsApp session lives in sales/data/wa-profile
// (gitignored, local only).
import fs from "node:fs";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { DATA, ROOT, SALES, config, nameKey, phoneKey, readLeads, today, withLeads } from "../scripts/lib.mjs";
import { SENDS, buildQueue, sentToday } from "../scripts/send-queue.mjs";
import { ffmpegBin } from "../scripts/ffmpeg-path.mjs";
import { overlay } from "./overlay.mjs";
import { mic } from "./mic.mjs";

const args = process.argv.slice(2);
const cfg = config(), S = cfg.send;
const say = (t) => console.log(`[${new Date().toLocaleTimeString("en-GB", { hour12: false })}] ${t}`);

if (args.includes("--dry-run")) {
  const q = buildQueue({ limit: S.per_session });
  say(`Dry run. Sent today: ${sentToday()} of ${S.daily_limit}. Next session would prepare ${q.length}:`);
  q.forEach((x, i) => say(`${i + 1}. ${x.name} (${x.kind}) ${x.attachments.map((a) => a.type).join(" + ") || "text only"}`));
  process.exit(0);
}

// Test mode (a local mock of WhatsApp Web only): --test http://127.0.0.1:<port> --queue <json> --out <dir>.
// Its own profile and files; never touches leads.csv, sends.jsonl or the real session.
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : ""; };
const TEST = args.includes("--test") ? { base: opt("test"), queue: opt("queue"), out: opt("out") } : null;
if (TEST && !(/^http:\/\/127\.0\.0\.1:\d+$/.test(TEST.base) && TEST.queue && TEST.out)) { console.error("--test needs http://127.0.0.1:<port>, --queue and --out"); process.exit(1); }
const BASE = TEST ? TEST.base : "https://web.whatsapp.com";
if (TEST) { S.gap_minutes = [0.03, 0.05]; S.wait_for_send_minutes = 0.5; }

// Demo mode: the full first contact (text, voice note, video) to DEMO_NUMBER only, using the
// top lead's message as the sample. Nothing is logged against any lead.
const DEMO = args.includes("--demo");
const DEMO_DIGITS = String(cfg.DEMO_NUMBER || "").replace(/\D/g, "").replace(/^00/, "");
if (DEMO && DEMO_DIGITS.length < 10) { console.error('Set "DEMO_NUMBER" in sales/config.json first (your own WhatsApp number with country code, e.g. +974 5xxx xxxx).'); process.exit(1); }
const NOLOG = TEST || DEMO;

const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const PROFILE = TEST ? path.join(TEST.out, "profile") : path.join(DATA, "wa-profile");
const STATE = TEST ? path.join(TEST.out, "sender-state.json") : path.join(DATA, "sender-state.json");
fs.mkdirSync(PROFILE, { recursive: true });

let stopRequested = false, pending = null;
const control = (action) => { if (action === "stop") { stopRequested = true; say("STOP pressed."); } if (pending) pending(action); };
process.on("SIGINT", () => { stopRequested = true; });

const opts = { channel: "chrome", headless: false, viewport: null, bypassCSP: true, args: ["--window-size=1320,920"] };
const ctx = await chromium.launchPersistentContext(PROFILE, opts).catch(() => chromium.launchPersistentContext(PROFILE, { ...opts, channel: "msedge" }));
await ctx.exposeBinding("__velaControl", (_src, action) => control(String(action)));
await ctx.addInitScript(overlay);
await ctx.addInitScript(mic);
await ctx.grantPermissions(["microphone"], { origin: BASE }).catch(() => {});
const page = ctx.pages()[0] ?? (await ctx.newPage());
ctx.on("close", () => { stopRequested = true; });
// Read only: never let the page navigate away from WhatsApp.
await page.route("**/*", (r) => { const u = r.request().url(); return r.request().isNavigationRequest() && r.request().frame() === page.mainFrame() && !u.startsWith(`${BASE}/`) ? r.abort() : r.continue(); });

const ui = (caption, buttons = []) => page.evaluate(({ caption, buttons }) => window.__velaSet?.({ caption, buttons }), { caption, buttons }).catch(() => {});
const point = (sel) => page.evaluate(({ sel, ms }) => window.__velaPoint?.(sel, ms), { sel, ms: cfg.panel?.watch_speed_ms ?? 600 }).catch(() => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Waits for a button in the overlay (or a condition), up to ms. Returns the action, "condition" or "timeout". */
async function waitFor({ ms, buttons = [], caption, check }) {
  if (caption !== undefined) await ui(caption, buttons);
  let action = null;
  pending = (a) => { action = a; };
  const end = Date.now() + ms;
  try {
    while (Date.now() < end) {
      if (stopRequested) return "stop";
      if (action) return action;
      const s = await safety();
      if (s.stop) { stopRequested = true; say(`SAFETY STOP: ${s.stop}`); await ui(`Stopped for safety: ${s.stop}`); return "stop"; }
      if (s.invalid) return "invalid";
      if (check && (await check().catch(() => false))) return "condition";
      await sleep(1000);
    }
    return "timeout";
  } finally { pending = null; }
}

// ── What WhatsApp is showing ──
const SEL = {
  logged: "#pane-side",
  compose: "footer div[contenteditable='true']",
  send: "footer button[aria-label='Send'], footer span[data-icon='send'], footer span[data-icon='wds-ic-send-filled']",
  attach: "[aria-label='Attach'], span[data-icon='plus'], span[data-icon='plus-rounded'], span[data-icon='attach-menu-plus']",
  mediaSend: "div[role='button'][aria-label='Send'], span[data-icon='send'], span[data-icon='wds-ic-send-filled']",
  // Voice note recording: the mic shows when the box is empty; pause gives a preview with Send.
  mic: "footer button[aria-label='Voice message'], footer [aria-label='Voice message'], footer [aria-label='رسالة صوتية'], footer span[data-icon='ptt'], footer span[data-icon='mic-outlined'], footer span[data-icon='wds-ic-mic']",
  pause: "footer [aria-label='Pause'], footer [aria-label='Pause recording'], footer [aria-label='إيقاف مؤقت'], footer span[data-icon='pause-refreshed'], footer span[data-icon='pause'], footer span[data-icon='wds-ic-pause']",
  discard: "footer [aria-label='Delete'], footer [aria-label='Discard'], footer [aria-label='حذف'], footer span[data-icon='delete'], footer span[data-icon='wds-ic-delete']",
};

// ── The voice note at 1.08 speed (pitch kept), made once per file ──
function fastVersion(file) {
  const speed = Number(S.voice_speed) || 1.08;
  const out = path.join(path.dirname(file), "fast", `${path.basename(file).replace(/\.\w+$/, "")}-x${String(speed).replace(".", "")}.ogg`);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync(ffmpegBin("ffmpeg"), ["-y", "-v", "error", "-i", file, "-filter:a", `atempo=${speed}`, "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "48k", out]);
  }
  return out;
}
const between = ([lo, hi]) => Math.round((lo + Math.random() * (hi - lo)) * 1000);

/** Records the voice note through WhatsApp's own recorder, then waits for Oussama's Send. Returns "sent", "skipped", "stop" or "fallback". */
async function voiceNote(item, file) {
  const fast = fastVersion(file);
  const secs = await page.evaluate((b64) => window.__velaMicLoad?.(b64), fs.readFileSync(fast).toString("base64")).catch(() => 0);
  if (!secs) return "fallback";
  const micBtn = page.locator(SEL.mic).first();
  if (!(await micBtn.isVisible().catch(() => false))) { await page.evaluate(() => window.__velaMicClear?.()); return "fallback"; }
  await point(SEL.mic);
  await ui(`${item.name}: recording the voice note (${Math.round(secs)} s), hands off`);
  await micBtn.click({ timeout: 5000 });
  // Wait for the voice to finish playing into the recorder.
  const t0 = Date.now();
  while (Date.now() - t0 < (secs + 8) * 1000) {
    if (stopRequested) return "stop";
    const st = await page.evaluate(() => window.__velaMicState?.()).catch(() => null);
    if (st?.ends && st.now > st.ends + 250) break;
    await sleep(200);
  }
  const pauseBtn = page.locator(SEL.pause).first();
  if (!(await pauseBtn.isVisible().catch(() => false))) {
    // No pause in this WhatsApp version: throw the recording away rather than let silence run on.
    await page.locator(SEL.discard).first().click({ timeout: 3000 }).catch(() => {});
    await page.evaluate(() => window.__velaMicClear?.());
    return "fallback";
  }
  await pauseBtn.click({ timeout: 3000 });
  await page.evaluate(() => window.__velaMicClear?.());
  await point(SEL.send);
  const before = await outCount();
  const r = await waitFor({
    ms: S.wait_for_send_minutes * 60000,
    caption: `${item.name}: listen if you like, then press Send for the voice note`,
    buttons: [{ id: "sent", label: "I sent it" }, { id: "skip", label: "Skip voice note" }],
    check: async () => (await outCount()) > before,
  });
  return r === "stop" ? "stop" : r === "condition" || r === "sent" ? "sent" : "skipped";
}
let wasLoggedIn = false;
async function safety() {
  const t = await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll("[role='dialog'], [data-animate-modal-popup='true']")].map((d) => d.innerText).join("\n");
    const logged = !!document.querySelector("#pane-side");
    const qr = !logged && (!!document.querySelector("canvas[aria-label*='scan' i], canvas[aria-label*='QR' i]") || /Steps to log in|Log into WhatsApp|Scan the QR code|Link with phone number/i.test(document.body?.innerText || ""));
    return { dialogs, logged, qr };
  }).catch(() => ({ dialogs: "", logged: false, qr: false }));
  if (wasLoggedIn && t.qr) return { stop: "WhatsApp logged out" };
  if (/banned|restricted|suspended|unusual activity|temporarily|blocked|spam|محظور|مقيد|تقييد|حظر|مؤقت/i.test(t.dialogs)) return { stop: `WhatsApp shows a warning: "${t.dialogs.trim().slice(0, 140)}"` };
  if (/phone number shared via url is invalid|not on WhatsApp|غير صالح|ليس على واتساب/i.test(t.dialogs)) return { invalid: true };
  return {};
}
const loggedIn = () => page.locator(SEL.logged).first().isVisible().catch(() => false);
const composeText = () => page.evaluate((s) => document.querySelector(s)?.innerText?.trim() ?? null, SEL.compose).catch(() => null);
const mainHas = (snippet) => page.evaluate((s) => (document.querySelector("#main")?.innerText || "").replace(/\s+/g, " ").includes(s), snippet).catch(() => false);
const outCount = () => page.evaluate(() => document.querySelectorAll("#main .message-out").length).catch(() => 0);

// ── Records ──
const run = (script, a) => (NOLOG ? Promise.resolve(`(${DEMO ? "demo" : "test"}) ${script} ${a.join(" ")}`) : new Promise((ok) => execFile(process.execPath, [path.join(SALES, "scripts", `${script}.mjs`), ...a], { cwd: ROOT }, (e, out, err) => ok(`${out}${err}`.trim()))));
const record = (entry) => fs.appendFileSync(TEST ? path.join(TEST.out, "sends.jsonl") : DEMO ? path.join(DATA, "runs", "demo-sends.jsonl") : SENDS, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");

// ── Replies: read the chat list only (unread badges), never open a chat ──
const flagged = new Set();
async function scanReplies() {
  const rows = await page.evaluate(() => [...document.querySelectorAll("#pane-side [role='row'], #pane-side [role='listitem']")].map((r) => ({
    title: r.querySelector("span[title]")?.getAttribute("title") || "",
    unread: !!r.querySelector("[aria-label*='unread' i]"),
  })).filter((r) => r.title && r.unread)).catch(() => []);
  if (!rows.length) return 0;
  const leads = TEST ? JSON.parse(fs.readFileSync(TEST.queue, "utf8")).map((q) => ({ ...q, status: "sent", whatsapp_public: q.number })) : readLeads().filter((l) => l.status === "sent");
  let n = 0;
  for (const r of rows) {
    const key = phoneKey(r.title), name = nameKey(r.title);
    const lead = leads.find((l) => (key && [l.whatsapp_public, l.dm_direct].map(phoneKey).includes(key)) || (name && nameKey(l.name) === name));
    if (!lead || flagged.has(lead.slug)) continue;
    flagged.add(lead.slug);
    say(`${lead.name} replied: your turn. ${await run("log", [lead.slug, "replied", "Replied on WhatsApp, your turn"])}`);
    record({ slug: lead.slug, result: "replied" });
    n++;
  }
  return n;
}

// ── One lead ──
let invalidStreak = 0;
async function sendOne(item, i, n) {
  const label = `${item.name}, ${i} of ${n}`;
  say(`Opening ${label} (${item.kind})`);
  await page.goto(`${BASE}/send?phone=${item.number}&text=${encodeURIComponent(item.text)}`, { waitUntil: "domcontentloaded" });
  const ready = await waitFor({ ms: 60000, caption: `Opening ${label}`, buttons: [{ id: "skip", label: "Skip" }], check: async () => !!(await composeText()) });
  if (ready === "stop") return "stop";
  if (ready === "invalid") {
    invalidStreak++;
    if (!NOLOG) await withLeads((ls) => { const l = ls.find((x) => x.slug === item.slug); if (l) l.wa_invalid = today(); });
    record({ slug: item.slug, kind: item.kind, result: "not-on-whatsapp" });
    say(`${item.name}: number not on WhatsApp (${invalidStreak} in a row).`);
    if (invalidStreak >= S.invalid_streak_stop) { stopRequested = true; say(`SAFETY STOP: ${invalidStreak} numbers in a row are not on WhatsApp.`); await ui("Stopped for safety: 3 numbers in a row not on WhatsApp"); return "stop"; }
    return "skipped";
  }
  if (ready !== "condition") { record({ slug: item.slug, kind: item.kind, result: "skipped" }); say(`${item.name}: skipped.`); return "skipped"; }
  invalidStreak = 0;

  // The text is in the box: Oussama checks it and presses Send.
  await point(SEL.send);
  const snippet = item.text.replace(/\s+/g, " ").slice(0, 25);
  const before = await outCount();
  const sent = await waitFor({
    ms: S.wait_for_send_minutes * 60000,
    caption: `${label}: check the message, then press Send`,
    buttons: [{ id: "sent", label: "I sent it" }, { id: "skip", label: "Skip" }],
    check: async () => (await composeText()) === "" && ((await outCount()) > before || (await mainHas(snippet))),
  });
  if (sent === "stop") return "stop";
  if (sent !== "condition" && sent !== "sent") { record({ slug: item.slug, kind: item.kind, result: "skipped" }); say(`${item.name}: not sent (${sent}).`); return "skipped"; }
  record({ slug: item.slug, kind: item.kind, result: "sent", number_end: item.number.slice(-4) });
  say(`${item.name}: sent. ${await run("log", [item.slug, "sent", item.kind === "first" ? "WhatsApp, first message" : `WhatsApp, ${item.kind}`])}`);

  // Then: 3 to 6 s later the voice note (a real WhatsApp voice note), 5 to 10 s later the video. Oussama presses Send on each.
  for (const a of item.attachments) {
    if (stopRequested) return "stop";
    const what = a.type === "voice" ? "the voice note" : "the Vela video";
    const pause = between(a.type === "voice" ? S.voice_after_seconds ?? [3, 6] : S.video_after_seconds ?? [5, 10]);
    await ui(`${item.name}: ${what} in ${Math.round(pause / 1000)} s`);
    await sleep(pause);
    if (stopRequested) return "stop";
    if (a.type === "voice") {
      const v = await voiceNote(item, a.file);
      if (v === "stop") return "stop";
      if (v !== "fallback") { record({ slug: item.slug, kind: `${item.kind}-voice`, result: v, as: "voice-note" }); continue; }
      say(`${item.name}: the voice recorder was not found, attaching the voice note as audio instead.`);
    }
    let attached = false;
    try {
      await point(SEL.attach);
      await sleep(500);
      await page.locator(SEL.attach).first().click({ timeout: 5000 });
      const menu = a.type === "video" ? page.getByText(/^(Photos (&|and) videos|الصور والفيديوهات)$/i) : page.getByText(/^(Document|مستند)$/i);
      const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 8000 }), menu.first().click({ timeout: 5000 })]);
      await chooser.setFiles(a.file);
      attached = true;
      await sleep(1200);
      await point(SEL.mediaSend);
    } catch { await page.keyboard.press("Escape").catch(() => {}); }
    const beforeA = await outCount();
    const r = await waitFor({
      ms: S.wait_for_send_minutes * 60000,
      caption: attached ? `${item.name}: press Send for ${what}` : `${item.name}: attach ${what} yourself (${path.basename(a.file)}), send it, then press Done`,
      buttons: [{ id: "sent", label: attached ? "I sent it" : "Done", primary: !attached }, { id: "skip", label: "Skip this file" }],
      check: attached ? async () => (await outCount()) > beforeA : undefined,
    });
    if (r === "stop") return "stop";
    record({ slug: item.slug, kind: `${item.kind}-${a.type}`, result: r === "condition" || r === "sent" ? "sent" : "skipped" });
  }
  return "sent";
}

// ── A session ──
async function ensureLogin() {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  if (await page.locator(SEL.logged).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) { wasLoggedIn = true; return true; }
  say("Scan the QR code with WhatsApp on your phone (Settings, Linked devices). Waiting up to 5 minutes.");
  await ui("First time: scan the QR code with WhatsApp on your phone (Linked devices)");
  const ok = await page.locator(SEL.logged).first().waitFor({ timeout: 300000 }).then(() => true).catch(() => false);
  wasLoggedIn = ok;
  return ok;
}
// Demo: the top first-contact item (its text, voice note and video), sent to DEMO_NUMBER only.
function demoQueue() {
  const top = buildQueue({ limit: 50 }).find((q) => q.kind === "first");
  if (!top) return [];
  return [{ ...top, slug: `demo-${top.slug}`, name: `Demo (${top.name})`, number: DEMO_DIGITS }];
}
const getQueue = (o) => (TEST ? JSON.parse(fs.readFileSync(TEST.queue, "utf8")) : DEMO ? demoQueue() : buildQueue(o));
async function session(name) {
  const queue = getQueue({ limit: S.per_session });
  say(`Session ${name}: ${queue.length} to prepare (sent today ${sentToday()} of ${S.daily_limit}).`);
  await scanReplies();
  let sentN = 0;
  for (const [i, item] of queue.entries()) {
    if (stopRequested) break;
    // Re-check right before each one: a reply or a status change wins.
    const fresh = getQueue().find((q) => q.slug === item.slug && q.kind === item.kind);
    if (!fresh) { say(`${item.name}: no longer due, skipped.`); continue; }
    const r = await sendOne(fresh, i + 1, queue.length);
    if (r === "stop") break;
    if (r === "sent") sentN++;
    await scanReplies();
    if (i < queue.length - 1 && !stopRequested) {
      const [lo, hi] = S.gap_minutes, gap = Math.round((lo + Math.random() * (hi - lo)) * 60000), end = Date.now() + gap;
      while (Date.now() < end && !stopRequested) {
        const left = Math.ceil((end - Date.now()) / 1000);
        await ui(`Next: ${queue[i + 1].name} in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} (${i + 1} of ${queue.length} done)`, []);
        const s = await safety(); if (s.stop) { stopRequested = true; say(`SAFETY STOP: ${s.stop}`); break; }
        await sleep(1000);
      }
    }
  }
  say(`Session ${name} finished: ${sentN} sent.`);
  await ui(`Session ${name} finished: ${sentN} sent. ${stopRequested ? "Stopped." : ""}`);
  return sentN;
}

// ── Schedule: morning and evening sessions (Asia/Qatar) ──
const qNow = () => new Date(Date.now() + 3 * 3600e3);
const hhmm = () => qNow().toISOString().slice(11, 16);
const readState = () => { try { const s = JSON.parse(fs.readFileSync(STATE, "utf8")); return s.date === today() ? s : { date: today(), done: [] }; } catch { return { date: today(), done: [] }; } };
const markDone = (name) => { const s = readState(); s.done.push(name); fs.writeFileSync(STATE, JSON.stringify(s)); };

try {
  if (!(await ensureLogin())) { say("Not logged in to WhatsApp Web. Stopped."); }
  else if (!args.includes("--schedule")) {
    await session("now");
  } else {
    say(`Scheduled: ${S.sessions.map((s) => `${s.name} at ${s.at}`).join(", ")} (Qatar time).`);
    while (!stopRequested) {
      const st = readState();
      const due = S.sessions.find((s) => !st.done.includes(s.name) && hhmm() >= s.at && hhmm() < `${String(Number(s.at.slice(0, 2)) + 3).padStart(2, "0")}${s.at.slice(2)}`);
      if (due) { markDone(due.name); await session(due.name); continue; }
      const next = S.sessions.find((s) => !st.done.includes(s.name) && hhmm() < s.at);
      await ui(next ? `Waiting for the ${next.name} session at ${next.at}` : "Today's sessions are done. Waiting for tomorrow.");
      await scanReplies();
      for (let k = 0; k < 60 && !stopRequested; k++) { const s = await safety(); if (s.stop) { stopRequested = true; say(`SAFETY STOP: ${s.stop}`); } await sleep(5000); }
    }
  }
} finally {
  say("Sender closed.");
  await sleep(1500);
  await ctx.close().catch(() => {});
}
