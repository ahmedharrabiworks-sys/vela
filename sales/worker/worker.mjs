// Vela sales worker: connects the laptop to the online sales dashboard.
//   npm run sales:worker      worker + panel engine (panel link printed, not opened)
//   npm run sales:all         the same, and opens the local panel in the browser
// - Starts the local panel as its engine (same restricted Claude Code runs,
//   subscription login only, writes only in sales/data/), with a random token.
// - Picks jobs the site queued in sales_jobs (realtime + polling), one run at a
//   time; control jobs (ON/OFF, hunt, sender, status, check) apply at once.
// - Streams every log line to sales_logs, a heartbeat to sales_worker every 30 s,
//   and syncs leads, messages, checks, audio and hunt progress after every step.
// Secrets: SUPABASE_SERVICE_ROLE_KEY only from .env.local, never sent anywhere
// but Supabase, never printed.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { DATA, ROOT, SALES, config, env, readChecks, readLeads } from "../scripts/lib.mjs";
import { todayLists } from "../scripts/build-today.mjs";
import { checkPlanRows } from "../scripts/build-check-plan.mjs";

const E = env();
const URL_ = E.NEXT_PUBLIC_SUPABASE_URL, KEY = E.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local"); process.exit(1); }
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const say = (t) => console.log(`[worker ${new Date().toLocaleTimeString("en-GB", { hour12: false })}] ${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── The panel engine ──
const PORT = Number(process.env.SALES_PANEL_PORT) || config().panel?.port || 4321;
const PANEL = `http://127.0.0.1:${PORT}`;
const WTOKEN = crypto.randomBytes(24).toString("hex");
const panelChild = spawn(process.execPath, [path.join(SALES, "panel", "server.mjs"), ...(process.argv.includes("--open") ? [] : ["--no-open"])], {
  cwd: ROOT, env: { ...process.env, SALES_PANEL_PORT: String(PORT), SALES_WORKER_TOKEN: WTOKEN }, stdio: ["ignore", "inherit", "inherit"],
});
panelChild.on("exit", (code) => { say(`The panel engine stopped (code ${code}). If port ${PORT} is busy, close "npm run sales:panel" first: sales:all starts both.`); process.exit(1); });
const panel = async (p, body) => {
  const res = await fetch(`${PANEL}${p}`, body ? { method: "POST", headers: { "x-worker-token": WTOKEN, "Content-Type": "application/json" }, body: JSON.stringify(body) } : { headers: { "x-worker-token": WTOKEN } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || out.out || `panel ${res.status}`);
  return out;
};
for (let i = 0; i < 60; i++) { try { await panel("/api/state"); break; } catch { await sleep(500); } }

// ── Tables ready? (migration_v45) ──
async function tablesReady() {
  const { error } = await db.from("sales_worker").select("id").limit(1);
  if (error) say(`Supabase sales tables not reachable (${error.message}). Run supabase/migration_v45.sql; retrying every minute.`);
  return !error;
}
while (!(await tablesReady())) await sleep(60000);
say("Connected to Supabase.");

// ── Logs: batched inserts ──
let currentJob = null; // the sales_jobs row of the run in progress
const logBuf = [];
const pushLog = (line, kind = "info") => logBuf.push({ job_id: currentJob?.id ?? null, line: String(line).slice(0, 500), kind });
setInterval(async () => {
  if (!logBuf.length) return;
  const rows = logBuf.splice(0, logBuf.length);
  const { error } = await db.from("sales_logs").insert(rows);
  if (error) say(`log upload failed: ${error.message}`);
}, 2000);

// ── Heartbeat + status ──
let lastState = null;
async function heartbeat() {
  try {
    lastState = await panel("/api/state?q=__none__");
    const s = lastState;
    await db.from("sales_worker").upsert({
      id: 1, heartbeat_at: new Date().toISOString(), power_on: s.on, running: s.running?.label ?? null, queue: s.queue,
      hunt: s.hunt, sender_status: s.sender.running ? (s.sender.mode === "schedule" ? "open (scheduled sessions)" : "open (session now)") : "closed",
      today_sent: s.send.sent_today, daily_limit: s.send.limit, queue_left: s.send.queue, eleven_week: s.budget.eleven_week, eleven_cap: s.budget.eleven_cap,
      updated_at: new Date().toISOString(),
    });
    await finishRunIfIdle(s);
  } catch (e) { say(`heartbeat: ${e.message}`); }
}
setInterval(heartbeat, 30000);

// ── Sync: leads, messages, checks, demos, audio, hunt progress ──
const SYNC_STATE = path.join(DATA, "sync-state.json");
const syncState = (() => { try { return JSON.parse(fs.readFileSync(SYNC_STATE, "utf8")); } catch { return { leads: {}, audio: {}, hunt: {} }; } })();
const saveSync = () => fs.writeFileSync(SYNC_STATE, JSON.stringify(syncState));
const hash = (o) => crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex");
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const num = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
const ts = (v) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

async function uploadAudio(local, remote) {
  if (!fs.existsSync(local)) return null;
  const st = fs.statSync(local), key = `${st.size}:${Math.round(st.mtimeMs)}`;
  if (syncState.audio[remote] === key) return remote;
  const { error } = await db.storage.from("sales-audio").upload(remote, fs.readFileSync(local), { contentType: "audio/mpeg", upsert: true });
  if (error) { say(`audio upload ${remote}: ${error.message}`); return null; }
  syncState.audio[remote] = key;
  return remote;
}

let syncing = false, syncAgain = false;
async function sync() {
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  try {
    const leads = readLeads(), checks = readChecks();
    const { fresh, due } = todayLists(leads);
    const rank = new Map(fresh.map((l, i) => [l.slug, i + 1]));
    const dueDay = new Map(due.map(({ l, f }) => [l.slug, f.day]));
    const plan = new Map(checkPlanRows().map((r) => [r.l.slug, { question: r.question, from: r.from, to: r.to, closes: r.closes }]));
    const rows = [];
    for (const l of leads) {
      const m = readJson(path.join(DATA, "messages", `${l.slug}.json`));
      const d = readJson(path.join(DATA, "demos", `${l.slug}.json`));
      const lang = m?.send_lang === "en" ? "en" : "ar";
      const audio = {};
      if (d?.generated?.note_mp3) audio.voice_note = await uploadAudio(path.join(DATA, d.generated.note_mp3), `demos/${l.slug}/voice-note.mp3`);
      if (!audio.voice_note && l.niche) audio.voice_note = await uploadAudio(path.join(DATA, "audio", "niche", `${l.niche}-${lang}.mp3`), `niche/${l.niche}-${lang}.mp3`);
      if (d?.generated?.call_mp3) audio.call = await uploadAudio(path.join(DATA, d.generated.call_mp3), `demos/${l.slug}/call.mp3`);
      for (const k of Object.keys(audio)) if (!audio[k]) delete audio[k];
      const row = {
        slug: l.slug, name: l.name, niche: l.niche || null, area: l.area || null, score: num(l.score), score_raw: num(l.score_raw), why_fits: l.why_fits || null,
        status: l.status || "new", status_note: l.status_note || null, route: ["A", "B", "C"].includes(l.route) ? l.route : null,
        owner_name: l.dm_name || null, owner_role: l.dm_role || null, owner_confidence: l.dm_confidence || null, owner_source: l.dm_source || null,
        direct_contact: l.dm_direct || null, direct_type: l.dm_direct_type || null, contact_url: l.contact_url || null,
        website: l.website || null, instagram: l.instagram || null, whatsapp_public: l.whatsapp_public || null, phone_public: l.phone_public || null,
        google_rating: l.google_rating || null, google_reviews: l.google_reviews || null, closing_time: l.closing_time || null, after_hours: l.after_hours_signal || null,
        evidence: { unanswered_comments: l.unanswered_comments || [], slow_reply_reviews: l.slow_reply_reviews || [], other_evidence: l.other_evidence || [], unknowns: l.unknowns || [], branches: l.branches || null, staff: l.staff || null, hours: l.hours || null, closed_days: l.closed_days || null, ig_followers: l.ig_followers || null, meta_ads: l.meta_ads || null, premium_area: l.premium_area || null },
        message: m ? { ar: m.first?.ar ?? "", en: m.first?.en ?? "", route: m.route ?? null, send_lang: m.send_lang ?? "both", angle: m.angle ?? "", to: m.to ?? "", followups: m.followups ?? [] } : null,
        check_result: checks[l.slug] ?? null, check_plan: plan.get(l.slug) ?? null, demo_url: d?.published?.url ?? null, audio,
        in_today: rank.has(l.slug), today_rank: rank.get(l.slug) ?? null, followup_due: dueDay.get(l.slug) ?? null,
        contacted_at: l.contacted_at || null, last_contacted_at: ts(l.last_sent_at), replied_at: ts(l.replied_at), found_at: l.found_at || null,
      };
      const h = hash(row);
      if (syncState.leads[l.slug] !== h) rows.push([row, h]);
    }
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await db.from("sales_leads").upsert(chunk.map(([r]) => ({ ...r, synced_at: new Date().toISOString() })));
      if (error) { say(`lead sync failed: ${error.message}`); break; }
      for (const [r, h] of chunk) syncState.leads[r.slug] = h;
    }
    // Hunt plan
    const p = readJson(path.join(DATA, "hunt", "plan.json"));
    const cells = (p?.cells ?? []).map((c) => ({ cell_id: c.id, niche: c.niche, area: c.area, status: c.status, found: c.found || 0 })).filter((c) => syncState.hunt[c.cell_id] !== hash(c));
    for (let i = 0; i < cells.length; i += 400) {
      const chunk = cells.slice(i, i + 400);
      const { error } = await db.from("sales_hunt_progress").upsert(chunk.map((c) => ({ ...c, updated_at: new Date().toISOString() })));
      if (error) { say(`hunt sync failed: ${error.message}`); break; }
      for (const c of chunk) syncState.hunt[c.cell_id] = hash(c);
    }
    saveSync();
    if (rows.length || cells.length) say(`Synced ${rows.length} lead(s) and ${cells.length} hunt cell(s).`);
  } catch (e) { say(`sync: ${e.message}`); }
  finally { syncing = false; if (syncAgain) { syncAgain = false; setTimeout(sync, 1000); } }
}
let syncTimer = null;
const syncSoon = () => { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 4000); };
setInterval(sync, 60000); // also catches edits made outside the panel

// ── Panel events: logs and state, as they happen ──
(async function events() {
  for (;;) {
    try {
      const res = await fetch(`${PANEL}/api/events`, { headers: { "x-worker-token": WTOKEN } });
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", first = true;
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = chunk.split("\n").find((x) => x.startsWith("data: ")); if (!line) continue;
          let ev; try { ev = JSON.parse(line.slice(6)); } catch { continue; }
          if (ev.type === "log" && !first) { pushLog(ev.text, ev.kind); syncSoon(); if (currentJob && ev.kind === "error" && /ended with an error/.test(ev.text)) currentJob.failed = true; }
          if (ev.type === "state") { first = false; setTimeout(heartbeat, 500); }
        }
      }
    } catch { /* panel restarting */ }
    await sleep(2000);
  }
})();

// ── Jobs ──
const RUN_TASKS = new Set(["find", "today", "followups", "rescore", "rewrite"]);
const SLUG = /^[a-z0-9-]{2,80}$/;
const setJob = (id, patch) => db.from("sales_jobs").update(patch).eq("id", id);

async function finishRunIfIdle(s) {
  if (!currentJob || Date.now() - currentJob.startedAt < 5000) return;
  const label = currentJob.label;
  const busy = label ? s.running?.label === label || s.queue.includes(label) : !!s.running || s.queue.length;
  if (busy) return;
  const job = currentJob; currentJob = null;
  const status = !s.on ? "stopped" : job.failed ? "failed" : "done";
  await setJob(job.id, { status, finished_at: new Date().toISOString(), result: status === "done" ? "Finished" : status });
  pushLog(`Job ${job.id} ${status}.`, status === "done" ? "done" : "error");
  syncSoon();
  setTimeout(processJobs, 500);
}

let processing = false;
async function processJobs() {
  if (processing) return;
  processing = true;
  try {
    const { data: jobs, error } = await db.from("sales_jobs").select("*").eq("status", "queued").order("created_at").limit(50);
    if (error) return say(`jobs: ${error.message}`);
    for (const job of jobs ?? []) {
      const p = job.params ?? {};
      const done = (result, status = "done") => setJob(job.id, { status, result: String(result).slice(0, 300), started_at: job.started_at ?? new Date().toISOString(), finished_at: new Date().toISOString() });
      try {
        if (job.task === "power") {
          await panel("/api/power", { on: !!p.on });
          if (!p.on) {
            // OFF from the phone: stop the run and clear the site's queue too.
            await db.from("sales_jobs").update({ status: "stopped", finished_at: new Date().toISOString(), result: "Cleared by OFF" }).eq("status", "queued").neq("id", job.id);
            if (currentJob) { await setJob(currentJob.id, { status: "stopped", finished_at: new Date().toISOString() }); currentJob = null; }
          }
          await done(p.on ? "Switched ON" : "Switched OFF");
          if (!p.on) break;
        } else if (job.task === "hunt") { await panel("/api/hunt", { on: !!p.on }); await done(p.on ? "Deep hunt started" : "Deep hunt stopping"); }
        else if (job.task === "sender") {
          const action = ["now", "schedule", "stop"].includes(p.action) ? p.action : "";
          if (!action) { await done("unknown sender action", "failed"); continue; }
          await panel("/api/sender", { action });
          await done(action === "stop" ? "Sender closed" : "Sender window opened on the laptop: press Send there");
        } else if (job.task === "log") {
          if (!SLUG.test(String(p.slug))) { await done("invalid lead", "failed"); continue; }
          const r = await panel("/api/log", { slug: p.slug, status: String(p.status), note: String(p.note || "From the online dashboard") });
          await done(r.out?.split("\n").pop() || "Logged");
        } else if (job.task === "check") {
          const r = await panel("/api/check", { slug: String(p.slug), sent: String(p.sent), reply: String(p.reply || "none") });
          await done(r.out?.split("\n").filter((x) => !x.startsWith("RESULT ")).join(" ") || "Check logged");
        } else if (RUN_TASKS.has(job.task)) {
          if (currentJob) continue; // one run at a time; it stays queued
          if (lastState && !lastState.on) { await done("The laptop is switched OFF", "stopped"); continue; }
          const before = await panel("/api/state?q=__none__");
          await panel("/api/run", job.task === "find" ? { task: "find", count: Math.max(1, Math.min(60, Number(p.count) || 20)) } : job.task === "rewrite" ? { task: "rewrite", slug: String(p.slug) } : { task: job.task });
          const after = await panel("/api/state?q=__none__");
          const label = after.queue.find((q) => !before.queue.includes(q)) ?? (after.running && after.running.label !== before.running?.label ? after.running.label : null);
          currentJob = { id: job.id, label, startedAt: Date.now(), failed: false };
          await setJob(job.id, { status: "running", started_at: new Date().toISOString() });
          pushLog(`Job ${job.id} started: ${label ?? job.task}`, "start");
        } else await done("unknown task", "failed");
      } catch (e) { await done(e.message, "failed"); }
      syncSoon();
    }
  } finally { processing = false; }
}
db.channel("sales-jobs").on("postgres_changes", { event: "INSERT", schema: "public", table: "sales_jobs" }, () => processJobs()).subscribe();
setInterval(processJobs, 10000);

// Old log lines: keep two weeks.
setInterval(() => db.from("sales_logs").delete().lt("created_at", new Date(Date.now() - 14 * 864e5).toISOString()), 6 * 3600e3);

// ── Start ──
say("First sync of existing data...");
await sync();
await heartbeat();
await processJobs();
pushLog("Laptop worker online.", "done");
say("Online. The dashboard can now control this laptop. Ctrl+C to stop.");

const shutdown = async () => {
  say("Stopping...");
  await db.from("sales_worker").update({ heartbeat_at: null, sender_status: "offline", running: null }).eq("id", 1);
  if (process.platform === "win32") execFile("taskkill", ["/PID", String(panelChild.pid), "/T", "/F"], () => process.exit(0));
  else { panelChild.kill("SIGINT"); process.exit(0); }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

