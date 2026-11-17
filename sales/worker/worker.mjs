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
import { execFile, execFileSync, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { DATA, ROOT, SALES, config, env, nicheNote, readChecks, readLeads } from "../scripts/lib.mjs";
import { todayLists } from "../scripts/build-today.mjs";
import { checkPlanRows } from "../scripts/build-check-plan.mjs";
import { keepAwake } from "./awake.mjs";

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
let stopping = false;
panelChild.on("exit", (code) => {
  if (stopping) return;
  say(`The panel engine stopped (code ${code}). If port ${PORT} is busy, close "npm run sales:panel" first: sales:all starts both.`);
  process.exit(1);
});
// Whatever ends this process (crash included), take the panel and its runs down with it,
// so a restart does not find the port still taken by an orphan.
process.on("exit", () => {
  stopping = true;
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(panelChild.pid), "/T", "/F"], { stdio: "ignore" });
    else panelChild.kill("SIGKILL");
  } catch { /* already gone */ }
});
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

// ── Live progress of the run in progress (shown as a card on the dashboard) ──
// Kept in sales_worker.hunt.progress (jsonb), so no new column is needed.
let progress = null; // { job_id, task, label, step, line, found, started_at }
const STEPS = [
  [/ingest/i, "Saving the leads"], [/build-today/i, "Building today's list"], [/niche-voice|voice note/i, "Recording the voice note"],
  [/demo/i, "Building a demo"], [/qualif|scor/i, "Scoring the leads"], [/owner|decision/i, "Finding the owners"],
  [/writ|message|follow/i, "Writing the messages"], [/hunt|search|find|business|lead/i, "Searching for businesses"],
];
function stepOf(text) {
  if (!/Agent started:|Running [\w-]+$/.test(text)) return null;
  return STEPS.find(([re]) => re.test(text))?.[1] ?? null;
}
const leadCount = () => { try { return readLeads().length; } catch { return 0; } };
let progressTimer = null;
function onProgressLine(text) {
  if (!progress) return;
  progress.step = stepOf(text) ?? (progress.step === "Starting" && /Searching the web|Reading /.test(text) ? "Searching for businesses" : progress.step);
  progress.line = String(text).trim().slice(0, 160);
  progress.found = Math.max(0, leadCount() - progress.base);
  if (!progressTimer) progressTimer = setTimeout(pushProgress, 3000);
}
async function pushProgress() {
  progressTimer = null;
  try { await db.from("sales_worker").update({ hunt: { ...(lastState?.hunt ?? {}), progress: publicProgress(), demo_to: demoTo() }, updated_at: new Date().toISOString() }).eq("id", 1); } catch { /* next beat */ }
}
const publicProgress = () => (progress ? { job_id: progress.job_id, task: progress.task, label: progress.label, step: progress.step, line: progress.line, found: progress.found, started_at: progress.started_at } : null);
// The demo button shows where the demo goes, masked (the number itself stays on the laptop).
const demoTo = () => { const d = String(config().DEMO_NUMBER || "").replace(/\D/g, ""); return d.length >= 10 ? `+${d.slice(0, 3)} •••• ${d.slice(-4)}` : null; };

// ── Heartbeat + status ──
let lastState = null;
async function heartbeat() {
  try {
    lastState = await panel("/api/state?q=__none__");
    const s = lastState;
    // Keep the PC awake while there is work; let it sleep when idle.
    const busy = !!s.running || s.queue.length > 0 || !!s.sender?.running || !!s.hunt?.on || !!currentJob;
    if (keepAwake(busy)) say(busy ? "Keeping the PC awake while working." : "Idle: the PC may sleep again.");
    if (progress) progress.found = Math.max(0, leadCount() - progress.base);
    await db.from("sales_worker").upsert({
      id: 1, heartbeat_at: new Date().toISOString(), power_on: s.on, running: s.running?.label ?? null, queue: s.queue,
      hunt: { ...s.hunt, progress: publicProgress(), demo_to: demoTo() }, sender_status: s.sender.running ? (s.sender.mode === "schedule" ? "open (scheduled sessions)" : "open (session now)") : "closed",
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
  const type = local.endsWith(".mp4") ? "video/mp4" : local.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";
  const { error } = await db.storage.from("sales-audio").upload(remote, fs.readFileSync(local), { contentType: type, upsert: true });
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
    // Every niche voice note (both languages), so new leads in any niche play at once on the dashboard.
    const nicheDir = path.join(DATA, "audio", "niche");
    for (const f of fs.existsSync(nicheDir) ? fs.readdirSync(nicheDir).filter((x) => /^[a-z0-9-]+-(ar|en)\.mp3$/.test(x)) : []) await uploadAudio(path.join(nicheDir, f), `niche/${f}`);
    // The WhatsApp videos (third message of a first contact), kept in the same private bucket.
    for (const [lang, rel] of Object.entries(config().send?.video ?? {})) await uploadAudio(path.join(ROOT, rel), `video/vela-wa-${lang}.mp4`);
    const rows = [];
    for (const l of leads) {
      const m = readJson(path.join(DATA, "messages", `${l.slug}.json`));
      const d = readJson(path.join(DATA, "demos", `${l.slug}.json`));
      const lang = m?.send_lang === "en" ? "en" : "ar";
      const audio = {};
      // The same note the sender attaches: the lead's niche note, else the general note.
      const note = nicheNote(l.niche, lang, "mp3");
      if (note) audio.voice_note = await uploadAudio(note.file, `niche/${note.id}-${lang}.mp3`);
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
        message: m ? { ar: m.first?.ar ?? "", en: m.first?.en ?? "", route: m.route ?? null, send_lang: m.send_lang ?? "both", angle: m.angle ?? "", angle_key: m.angle_key ?? null, to: m.to ?? "", followups: m.followups ?? [] } : null,
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
          if (ev.type === "log" && !first) { pushLog(ev.text, ev.kind); onProgressLine(ev.text); syncSoon(); if (currentJob && ev.kind === "error" && /ended with an error/.test(ev.text)) currentJob.failed = true; }
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
  const job = currentJob; currentJob = null; progress = null;
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
            if (currentJob) { await setJob(currentJob.id, { status: "stopped", finished_at: new Date().toISOString() }); currentJob = null; progress = null; }
          }
          await done(p.on ? "Switched ON" : "Switched OFF");
          if (!p.on) break;
        } else if (job.task === "hunt") { await panel("/api/hunt", { on: !!p.on }); await done(p.on ? "Deep hunt started" : "Deep hunt stopping"); }
        else if (job.task === "sender") {
          const action = ["now", "schedule", "demo", "stop"].includes(p.action) ? p.action : "";
          if (!action) { await done("unknown sender action", "failed"); continue; }
          await panel("/api/sender", { action });
          await done(action === "stop" ? "Sender closed" : action === "demo" ? "Demo window opened on the laptop: press Send there, it goes to your own number only" : "Sender window opened on the laptop: press Send there");
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
          progress = { job_id: job.id, task: job.task, label: label ?? job.task, step: "Starting", line: "", found: 0, base: leadCount(), started_at: new Date().toISOString() };
          pushProgress();
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
// A run that was in progress when the last worker died cannot be resumed: close it honestly.
{
  const { data: stale } = await db.from("sales_jobs").update({ status: "failed", finished_at: new Date().toISOString(), result: "The laptop worker stopped during this run. Run it again." }).eq("status", "running").select("id");
  if (stale?.length) pushLog(`Closed ${stale.length} run(s) cut off by the last stop: ${stale.map((j) => `#${j.id}`).join(", ")}. Run them again.`, "error");
}
say("First sync of existing data...");
await sync();
await heartbeat();
await processJobs();
const restarts = Number(process.env.SALES_WORKER_RESTARTS) || 0;
pushLog(restarts ? `Laptop worker back online after a crash (auto restart ${restarts}). Details: sales/data/runs/worker-restarts.log` : "Laptop worker online.", restarts ? "error" : "done");
say("Online. The dashboard can now control this laptop. Ctrl+C to stop.");

const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  say("Stopping...");
  // heartbeat_at stays as "last seen"; sender_status "offline" tells the dashboard it stopped on purpose.
  keepAwake(false);
  await db.from("sales_worker").update({ sender_status: "offline", running: null, hunt: { ...(lastState?.hunt ?? {}), progress: null, demo_to: demoTo() } }).eq("id", 1);
  if (process.platform === "win32") execFile("taskkill", ["/PID", String(panelChild.pid), "/T", "/F"], () => process.exit(0));
  else { panelChild.kill("SIGINT"); process.exit(0); }
};
process.on("SIGINT", shutdown);
// npm run sales:stop writes sales/data/runs/stopped: stop cleanly (this also tells the supervisor not to restart).
const STOPPED = path.join(DATA, "runs", "stopped"), BORN = Date.now();
setInterval(() => { try { if (fs.statSync(STOPPED).mtimeMs > BORN) shutdown(); } catch { /* no stop request */ } }, 1500);
process.on("SIGTERM", shutdown);
// Closing the window (Windows sends SIGHUP and gives a few seconds): mark the laptop offline at once.
process.on("SIGHUP", shutdown);

