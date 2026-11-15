// Vela sales control panel. Local only: `npm run sales:panel`.
// Security:
// - binds to 127.0.0.1 only; the Host header must match (no DNS rebinding);
// - a random token, printed in the terminal, becomes an HttpOnly SameSite=Strict
//   cookie; every request needs it; POSTs must also be same-origin JSON;
// - it can only run the sales tasks below (fixed prompts, validated inputs),
//   through headless Claude Code with a tool allow-list and dontAsk mode,
//   one at a time; the OFF switch kills the running process tree.
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { DATA, ROOT, SALES, STATUSES, config, env, readChecks, readLeads, today, usage, weekCap, weekChars } from "../scripts/lib.mjs";
import { buildQueue, sentToday } from "../scripts/send-queue.mjs";
import { readPage } from "../scripts/browser-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SALES_PANEL_PORT) || config().panel?.port || 4321;
const ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const TOKEN = crypto.randomBytes(24).toString("hex");
const BROWSE_TOKEN = crypto.randomBytes(24).toString("hex");
// The local worker (npm run sales:worker / sales:all) starts the panel with its own
// random token; it stands in for the cookie and the same-origin check, on 127.0.0.1 only.
const WORKER_TOKEN = /^[a-f0-9]{48}$/.test(process.env.SALES_WORKER_TOKEN || "") ? process.env.SALES_WORKER_TOKEN : "";
const RUNS = path.join(DATA, "runs");
fs.mkdirSync(RUNS, { recursive: true });

// ── Claude Code binary: CLAUDE_BIN, `claude` on PATH, or the VS Code extension's ──
function findClaude() {
  if (process.env.CLAUDE_BIN && fs.existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const name of process.platform === "win32" ? ["claude.exe"] : ["claude"]) {
      const p = path.join(dir, name); if (fs.existsSync(p)) return p;
    }
  }
  const ext = path.join(process.env.USERPROFILE || process.env.HOME || "", ".vscode", "extensions");
  if (fs.existsSync(ext)) {
    const dirs = fs.readdirSync(ext).filter((d) => d.startsWith("anthropic.claude-code-")).sort().reverse();
    for (const d of dirs) {
      const p = path.join(ext, d, "resources", "native-binary", process.platform === "win32" ? "claude.exe" : "claude");
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}
const CLAUDE = findClaude();

// ── The only things the panel can run ──
const RULES = "Rules: public information only; never log in anywhere; never send, schedule or submit any message or form; never call a business. To read web pages use `node sales/scripts/browse.mjs \"<url>\" --caption \"<what you are doing>\"` (it is visible to Oussama in Watch mode). Write progress as short plain-English sentences. No em or en dashes.";
const TASKS = {
  find: ({ count }) => ({ label: `Finding ${count} new leads`, prompt: `Run the /sales-run pipeline for ${count} new leads: follow .claude/commands/sales-run.md and the agent files in .claude/agents exactly, and skip every lead already in sales/data/leads.csv. ${RULES}` }),
  today: () => ({ label: "Building today's list", prompt: `Run the /sales-today command: follow .claude/commands/sales-today.md exactly. ${RULES}` }),
  followups: () => ({ label: "Drafting follow-ups due", prompt: `Draft only the follow-ups due today: follow .claude/agents/follow-up.md exactly, then run node sales/scripts/build-today.mjs. ${RULES}` }),
  rescore: () => ({ label: "Re-scoring checked leads", prompt: `For each lead slug in sales/data/checks.json only: re-run the qualifier (.claude/agents/qualifier.md) on that lead's evidence plus its after-hours check, write { "kind": "rescore", "items": [{ "slug", "score", "why_fits" }] } to sales/data/batches/rescore-${today()}.json and run node sales/scripts/ingest.mjs on it. Then, for each of those leads with a decision maker, re-run the writer (.claude/agents/writer.md) so the check result is the hook (it must pass node sales/scripts/unique.mjs <slug>). For any of them now scoring 9 or more with a decision maker and no sales/data/demos/<slug>.json, build the demo as step 4 of .claude/commands/sales-run.md. Finally run node sales/scripts/build-today.mjs. ${RULES}` }),
  demo: ({ slug }) => ({ label: `Building the demo for ${slug}`, prompt: `Build the personalised demo for the lead "${slug}" only, exactly as step 4 of .claude/commands/sales-run.md (demo JSON from public info, then node sales/scripts/demo-voice.mjs ${slug}, then node sales/scripts/demo-publish.mjs ${slug}; stop at the ElevenLabs budget). Then run node sales/scripts/build-today.mjs. ${RULES}` }),
  hunt: () => ({ label: "Deep hunt: next batch", prompt: `Run ONE batch of the deep hunt: follow .claude/commands/sales-hunt.md exactly (claim the next cell with node sales/scripts/hunt.mjs next, save every lead the moment it is found, owner-finder on 6+, messages, niche voice note, then close the cell). ${RULES}` }),
  rewrite: ({ slug }) => ({ label: `Rewriting the message for ${slug}`, prompt: `Re-run the writer (.claude/agents/writer.md) for the lead "${slug}" only: a new first message and its day 2, 5 and 9 follow-ups under the current rules (3 short lines, max 40 words, one question on one real fact; a logged after-hours check may be that fact). It must pass node sales/scripts/unique.mjs ${slug}. Then run node sales/scripts/build-today.mjs. ${RULES}` }),
};
// The only tools that EXIST in a panel run (--tools). Everything else (PowerShell,
// WebFetch, schedulers, MCP, notifications) is absent, not just unapproved.
const TOOLS = ["Read", "Glob", "Grep", "WebSearch", "Task", "Write", "Edit", "Bash"];
// What runs without asking (dontAsk denies the rest): writes only under sales/data,
// commands only node sales/scripts/*.
const ALLOWED_TOOLS = ["Read", "Glob", "Grep", "WebSearch", "Agent", "Task", "Write(sales/data/**)", "Edit(sales/data/**)", "Bash(node sales/scripts/*)"];

// ── Subscription login only: never an API key for sales runs ──
const KEY_NAMES = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"];
const keyWarnings = KEY_NAMES.flatMap((k) => [process.env[k] && `${k} in this shell`, env()[k] && `${k} in .env.local`]).filter(Boolean);
const runEnv = () => { const e = { ...process.env, PANEL_URL: `http://127.0.0.1:${PORT}`, PANEL_BROWSE_TOKEN: BROWSE_TOKEN }; for (const k of KEY_NAMES) delete e[k]; return e; };

// ── State ──
const state = { on: true, running: null, queue: [], watch: false, speed: config().panel?.watch_speed_ms ?? 600 };
// Deep hunt: one batch per run, continued automatically, paced, paused at the usage limit.
const hunt = { on: false, timer: null, nextAt: 0, pausedUntil: 0, batchesToday: 0, day: today(), note: "" };
// The WhatsApp sender (assisted): a separate visible window, one at a time.
const sender = { child: null, mode: "", started: 0 };
const clients = new Set();
const history = []; // last 300 log lines, replayed when the page opens or reconnects
const send = (obj) => { const line = `data: ${JSON.stringify(obj)}\n\n`; for (const c of clients) c.write(line); };
const stamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
function log(text, kind = "info") {
  const entry = { type: "log", at: stamp(), text, kind };
  send(entry);
  history.push(entry); if (history.length > 300) history.shift();
  if (state.running?.logFile) fs.appendFileSync(state.running.logFile, `[${entry.at}] ${text}\n`);
}
const pushState = () => send({ type: "state", state: publicState() });
const publicState = () => ({
  on: state.on, running: state.running ? { label: state.running.label, started: state.running.started } : null, queue: state.queue.map((t) => t.label), watch: state.watch, speed: state.speed, claude: !!CLAUDE,
  hunt: { on: hunt.on, note: hunt.note, nextAt: hunt.nextAt, pausedUntil: hunt.pausedUntil, batchesToday: hunt.batchesToday, ...huntProgress() },
  sender: { running: !!sender.child, mode: sender.mode },
  keyWarnings,
});

// ── Running Claude Code headless ──
function describeTool(name, input = {}) {
  const base = (p) => path.basename(String(p || ""));
  if (name === "WebSearch") return `Searching the web: "${String(input.query || "").slice(0, 90)}"`;
  if (name === "Bash") {
    const cmd = String(input.command || "");
    const m = cmd.match(/browse\.mjs\s+"?([^"\s]+)"?/);
    if (m) { const c = cmd.match(/--caption\s+"([^"]+)"/); return c ? c[1] : `Reading ${m[1]}`; }
    const s = cmd.match(/sales\/scripts\/([\w-]+)\.mjs/);
    return s ? `Running ${s[1]}` : "Running a sales script";
  }
  if (name === "Read") return `Reading ${base(input.file_path)}`;
  if (name === "Write" || name === "Edit") return `Saving ${base(input.file_path)}`;
  if (name === "Agent" || name === "Task") return `Agent started: ${input.description || input.subagent_type || "research"}`;
  if (name === "Glob" || name === "Grep") return "Looking through the lead files";
  return `Using ${name}`;
}
function startNext() {
  if (!state.on || state.running || !state.queue.length) return;
  if (!CLAUDE) { log("Claude Code was not found. Install it or set CLAUDE_BIN, then try again.", "error"); state.queue = []; return pushState(); }
  const task = state.queue.shift();
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${task.kind}`;
  const logFile = path.join(RUNS, `${id}.log`), rawFile = path.join(RUNS, `${id}.jsonl`);
  const args = ["-p", task.prompt, "--output-format", "stream-json", "--verbose", "--permission-mode", "dontAsk", "--tools", TOOLS.join(","), "--allowedTools", ALLOWED_TOOLS.join(","), "--setting-sources", "project", "--strict-mcp-config", "--no-session-persistence"];
  const child = spawn(CLAUDE, args, {
    cwd: ROOT,
    env: runEnv(), // subscription login: API keys removed
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    windowsHide: true,
  });
  state.running = { ...task, child, logFile, started: Date.now(), limitText: "" };
  const LIMIT = /usage limit|limit reached|hit your limit|rate.?limit|out of (extra )?usage/i;
  const watchLimit = (t) => { if (LIMIT.test(t) && state.running?.child === child) state.running.limitText = String(t).slice(0, 300); };
  fs.writeFileSync(logFile, `${task.label}\n`);
  log(`Started: ${task.label}${state.watch ? " (Watch mode on)" : ""}`, "start");
  pushState();
  let buf = "";
  child.stdout.on("data", (d) => {
    fs.appendFileSync(rawFile, d);
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      const sub = ev.parent_tool_use_id ? "  " : "";
      if (ev.type === "system" && ev.subtype === "init") log(`Claude is ready${ev.model ? ` (${ev.model})` : ""}`);
      if (ev.type === "assistant") for (const c of ev.message?.content ?? []) {
        if (c.type === "tool_use") log(sub + describeTool(c.name, c.input));
        if (c.type === "text" && c.text.trim()) { log(sub + c.text.trim().split("\n")[0].slice(0, 220), "say"); if (!sub) watchLimit(c.text); }
      }
      if (ev.type === "result" && ev.is_error) watchLimit(`${ev.result ?? ""} ${ev.subtype ?? ""}`);
      if (ev.type === "result") log(`Finished in ${Math.round((ev.duration_ms || 0) / 1000)}s${ev.total_cost_usd ? `, cost $${ev.total_cost_usd.toFixed(2)}` : ""}${ev.is_error ? " (with errors)" : ""}`, ev.is_error ? "error" : "done");
    }
  });
  child.stderr.on("data", (d) => { fs.appendFileSync(logFile, `[stderr] ${d}`); watchLimit(d.toString()); });
  child.on("exit", (code) => {
    if (state.running?.child === child) {
      const r = state.running;
      if (r.killed) log("Stopped by the OFF switch.", "error");
      else if (code && !r.limitText) log(`The run ended with an error (code ${code}). See ${path.relative(ROOT, logFile)}.`, "error");
      state.running = null;
      if (r.kind === "hunt") afterHunt({ killed: !!r.killed, code, limitText: r.limitText });
    }
    pushState();
    setTimeout(startNext, 300);
  });
}

// ── Deep hunt loop ──
const huntCfg = () => config().hunt;
const clock = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function huntProgress() {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(DATA, "hunt", "plan.json"), "utf8"));
    const by = (s) => p.cells.filter((c) => c.status === s).length;
    return { cells: p.cells.length, done: by("done") + by("exhausted"), todo: by("todo") + by("claimed") };
  } catch { return { cells: 0, done: 0, todo: 0 }; }
}
/** When a usage limit resets: an epoch in the message, "resets 3pm", or the configured wait. */
function parseReset(text) {
  const ep = text.match(/\|(\d{10})\b/);
  if (ep) return Number(ep[1]) * 1000 + 60000;
  const m = text.match(/resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (m) {
    const d = new Date(); d.setHours((Number(m[1]) % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0), Number(m[2] || 0), 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.getTime() + 60000;
  }
  return Date.now() + huntCfg().usage_limit_wait_minutes * 60000;
}
function scheduleHunt(ms, note) {
  clearTimeout(hunt.timer); hunt.timer = null;
  if (!hunt.on) return pushState();
  if (hunt.day !== today()) { hunt.day = today(); hunt.batchesToday = 0; }
  if (hunt.batchesToday >= huntCfg().max_batches_per_day) {
    const midnight = new Date(Date.parse(`${today()}T00:00:00+03:00`) + 864e5 + 5 * 60000).getTime(); // next Qatar day
    ms = Math.max(ms, midnight - Date.now());
    note = `Daily limit of ${huntCfg().max_batches_per_day} batches reached. Continues at ${clock(Date.now() + ms)}.`;
  }
  hunt.nextAt = Date.now() + ms;
  hunt.note = note || `Next batch at ${clock(hunt.nextAt)}.`;
  log(`Deep hunt: ${hunt.note}`);
  hunt.timer = setTimeout(() => {
    hunt.timer = null; hunt.pausedUntil = 0; hunt.nextAt = 0;
    if (!hunt.on || !state.on) return;
    if (!state.queue.some((t) => t.kind === "hunt") && state.running?.kind !== "hunt") { hunt.note = "Running a batch."; enqueue("hunt"); }
  }, Math.max(1000, ms));
  pushState();
}
async function afterHunt({ killed, code, limitText }) {
  if (killed) { await runScript("hunt", ["release"]); hunt.on = false; hunt.note = "Stopped. Unfinished cells go back in the plan."; return pushState(); }
  if (limitText) {
    await runScript("hunt", ["release"]);
    hunt.pausedUntil = parseReset(limitText);
    return scheduleHunt(hunt.pausedUntil - Date.now(), `Usage limit reached. Paused, resumes at ${clock(hunt.pausedUntil)}.`);
  }
  hunt.batchesToday++;
  hunt.errors = code ? (hunt.errors || 0) + 1 : 0;
  if (hunt.errors >= 3) { await runScript("hunt", ["release"]); hunt.on = false; hunt.note = "Stopped after 3 failed batches in a row. Check the run logs."; log(`Deep hunt: ${hunt.note}`, "error"); return pushState(); }
  const p = huntProgress();
  if (p.cells && !p.todo) { hunt.on = false; hunt.note = "Plan complete: every niche and area has been hunted."; log(`Deep hunt: ${hunt.note}`, "done"); return pushState(); }
  scheduleHunt(huntCfg().pause_minutes_between_batches * 60000);
}

// ── The assisted WhatsApp sender (a separate visible window) ──
function startSender(mode) {
  if (sender.child) return false;
  const child = spawn(process.execPath, [path.join(SALES, "sender", "send.mjs"), ...(mode === "schedule" ? ["--schedule"] : [])], { cwd: ROOT, env: runEnv(), stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32", windowsHide: false });
  Object.assign(sender, { child, mode, started: Date.now() });
  log(mode === "schedule" ? "WhatsApp sender opened: morning and evening sessions." : "WhatsApp sender opened: one session now.", "start");
  let buf = "";
  const onData = (d) => { buf += d.toString(); let nl; while ((nl = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, nl).replace(/^\[\d\d:\d\d:\d\d\]\s*/, "").trim(); buf = buf.slice(nl + 1); if (line) log(`WhatsApp: ${line}`, /SAFETY|Stopped/.test(line) ? "error" : "send"); } };
  child.stdout.on("data", onData); child.stderr.on("data", onData);
  child.on("exit", () => { if (sender.child === child) Object.assign(sender, { child: null, mode: "", started: 0 }); log("WhatsApp sender closed."); pushState(); });
  pushState();
  return true;
}
function stopSender() {
  const c = sender.child; if (!c) return;
  if (process.platform === "win32") execFile("taskkill", ["/PID", String(c.pid), "/T", "/F"], () => {});
  else { try { process.kill(-c.pid, "SIGKILL"); } catch { try { c.kill("SIGKILL"); } catch { /* gone */ } } }
}
function enqueue(kind, params = {}) {
  const t = TASKS[kind](params);
  state.queue.push({ kind, params, ...t });
  log(state.running ? `Queued: ${t.label}` : `Starting: ${t.label}`);
  pushState();
  startNext();
}
function killRunning() {
  const r = state.running; if (!r) return;
  r.killed = true;
  if (process.platform === "win32") execFile("taskkill", ["/PID", String(r.child.pid), "/T", "/F"], () => {});
  else { try { process.kill(-r.child.pid, "SIGKILL"); } catch { try { r.child.kill("SIGKILL"); } catch { /* gone */ } } }
}

// ── The agents' browser, shared by every browse.mjs call ──
// Watch mode: one visible page, reads happen one after another so they can be followed.
// Otherwise: up to 3 headless pages, so parallel hunters do not wait for each other.
let browserP = null, browserHeaded = null, freePages = [], active = 0;
const waiters = [];
async function ensureBrowser() {
  if (browserP && browserHeaded !== state.watch && active === 0) {
    const b = await browserP.catch(() => null); browserP = null; freePages = []; await b?.close().catch(() => {});
  }
  if (!browserP) {
    browserHeaded = state.watch;
    const require = createRequire(path.join(ROOT, "package.json"));
    const { chromium } = require("playwright");
    const opts = { headless: !state.watch, args: state.watch ? ["--window-size=1280,900"] : [] };
    browserP = chromium.launch({ channel: "chrome", ...opts }).catch(() => chromium.launch({ channel: "msedge", ...opts }));
  }
  return browserP;
}
async function acquirePage() {
  while (active >= (state.watch ? 1 : 3)) await new Promise((r) => waiters.push(r));
  active++;
  try {
    const b = await ensureBrowser();
    const p = freePages.pop();
    return p && !p.isClosed() && p.context().browser() === b ? p : await b.newPage({ viewport: { width: 1280, height: 860 } });
  } catch (e) { active--; waiters.shift()?.(); throw e; }
}
async function releasePage(page) {
  active--;
  const b = await browserP?.catch(() => null);
  if (page && !page.isClosed()) { if (page.context().browser() === b) freePages.push(page); else await page.close().catch(() => {}); }
  waiters.shift()?.();
}
async function browse({ url, caption, find }) {
  if (!state.on) throw new Error("the panel is switched off");
  const page = await acquirePage();
  try {
    if (state.watch) log(`Watching: ${caption || url}`, "watch");
    return await readPage(page, { url, caption, find, speed: state.speed, watch: state.watch });
  } finally { await releasePage(page); }
}

// ── Data for the page ──
function snapshot(q = "") {
  const query = String(q).toLowerCase().trim().slice(0, 60);
  const leads = readLeads();
  const msgDir = path.join(DATA, "messages"), demoDir = path.join(DATA, "demos");
  const hasMsg = (s) => fs.existsSync(path.join(msgDir, `${s}.json`));
  const hasDemo = (s) => fs.existsSync(path.join(demoDir, `${s}.json`));
  const checks = readChecks();
  const daysSince = (d) => Math.round((Date.parse(today()) - Date.parse(d)) / 864e5);
  const next = (l) => {
    if (l.status === "known-contact") return "Known contact: no cold message";
    if (l.status === "do-not-contact") return "None (do not contact)";
    if (["won", "lost"].includes(l.status)) return "Done";
    if (l.status === "trial") return "Day 7 review call";
    if (l.status === "demo-booked") return "Run the 10-minute demo";
    if (l.status === "replied") return "Book the demo";
    if (l.status === "sent") { const n = Number(l.followups_sent || 0); if (n >= 3) return "Wait for a reply"; const d = [2, 5, 9][n]; const left = d - daysSince(l.contacted_at); return left <= 0 ? `Follow-up day ${d} due` : `Follow-up in ${left} day(s)`; }
    if (!l.dm_name) return l.dm_source ? "No decision maker found" : "Find the decision maker";
    if (!hasMsg(l.slug)) return "Write the message";
    if (!checks[l.slug] && l.closing_time) return "Send the message (or do the after-hours check first)";
    return "Send the first message";
  };
  const u = usage();
  const todays = u.runs.flatMap((r) => r.items ?? []).filter((i) => String(i.at).slice(0, 10) === today());
  const cfg = config();
  const count = (f) => leads.filter(f).length;
  return {
    stats: {
      found: leads.length,
      ready: count((l) => l.status === "new" && l.dm_name && hasMsg(l.slug)),
      sent: count((l) => !!l.contacted_at),
      replied: count((l) => ["replied", "demo-booked", "trial", "won"].includes(l.status)),
      demos: count((l) => ["demo-booked", "trial", "won"].includes(l.status)),
      won: count((l) => l.status === "won"),
    },
    budget: { eleven_week: weekChars(u), eleven_cap: weekCap(), eleven_today: todays.reduce((n, i) => n + (i.chars || 0), 0), vapi_total: u.vapi_usd_total || 0, vapi_cap: cfg.budget.vapi_usd_total },
    send: { sent_today: sentToday(), limit: cfg.send.daily_limit, queue: buildQueue().length, sessions: cfg.send.sessions },
    // Replies the sender spotted (or logged by hand): Oussama answers these himself.
    your_turn: leads.filter((l) => l.status === "replied").sort((a, b) => String(b.replied_at).localeCompare(String(a.replied_at))).slice(0, 20).map((l) => ({ slug: l.slug, name: l.name, dm: l.dm_name, at: l.replied_at || l.status_at })),
    total_leads: leads.length,
    // The table shows the best 200 matches; search narrows it (the store can hold thousands).
    leads: leads.filter((l) => !query || `${l.name} ${l.niche} ${l.area} ${l.dm_name} ${l.status}`.toLowerCase().includes(query))
      .sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 200)
      .map((l) => ({ slug: l.slug, name: l.name, niche: l.niche, score: Number(l.score), dm: l.dm_name ? `${l.dm_name}, ${l.dm_role}${l.dm_confidence ? ` (${l.dm_confidence})` : ""}` : "", route: l.route || "", status: l.status, next: next(l), demo: hasDemo(l.slug), check: checks[l.slug]?.summary ?? "" })),
    statuses: STATUSES.filter((s) => s !== "new"),
  };
}

// ── HTTP ──
const cookieToken = (req) => (String(req.headers.cookie || "").match(/(?:^|;\s*)vela_panel=([a-f0-9]{48})/) || [])[1] || "";
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const json = (res, code, obj) => { res.writeHead(code, { ...SEC, "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const SLUG = /^[a-z0-9-]{2,80}$/;
const TIME = /^(\d{4}-\d{2}-\d{2} )?\d{1,2}:\d{2}$/;
const readBody = (req) => new Promise((ok, bad) => { let d = ""; req.on("data", (c) => { d += c; if (d.length > 20000) { bad(new Error("too large")); req.destroy(); } }); req.on("end", () => { try { ok(d ? JSON.parse(d) : {}); } catch { bad(new Error("bad json")); } }); });
const runScript = (name, args) => new Promise((ok) => execFile(process.execPath, [path.join(SALES, "scripts", `${name}.mjs`), ...args], { cwd: ROOT, timeout: 60000 }, (err, stdout, stderr) => ok({ ok: !err, out: `${stdout}${stderr}`.trim() })));

const FILES = {
  "/": [path.join(HERE, "index.html"), "text/html; charset=utf-8"],
  "/app.js": [path.join(HERE, "app.js"), "text/javascript; charset=utf-8"],
  "/files/today.html": [path.join(SALES, "today.html"), "text/html; charset=utf-8"],
  "/files/check-plan.html": [path.join(SALES, "check-plan.html"), "text/html; charset=utf-8"],
  "/public/assets/logo-full.png": [path.join(ROOT, "public", "assets", "logo-full.png"), "image/png"],
};

const server = http.createServer(async (req, res) => {
  try {
    if (!HOSTS.has(String(req.headers.host))) { res.writeHead(403, SEC); return res.end("Forbidden"); }
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    // Agents' page reads (from browse.mjs), with their own token.
    if (url.pathname === "/api/browse" && req.method === "POST") {
      const t = String(req.headers["x-browse-token"] || "");
      if (!same(t, BROWSE_TOKEN)) return json(res, 403, { error: "forbidden" });
      const b = await readBody(req);
      try { return json(res, 200, await browse({ url: String(b.url || ""), caption: String(b.caption || "").slice(0, 120), find: String(b.find || "").slice(0, 80) })); }
      catch (e) { return json(res, 400, { error: e.message }); }
    }

    // First visit with the token from the terminal: set the cookie.
    if (url.pathname === "/" && url.searchParams.get("t")) {
      if (!same(url.searchParams.get("t"), TOKEN)) { res.writeHead(403, SEC); return res.end("Wrong token. Use the link printed in the terminal."); }
      res.writeHead(303, { ...SEC, "Set-Cookie": `vela_panel=${TOKEN}; HttpOnly; SameSite=Strict; Path=/`, Location: "/" });
      return res.end();
    }
    const isWorker = !!WORKER_TOKEN && same(String(req.headers["x-worker-token"] || ""), WORKER_TOKEN);
    if (!isWorker && !same(cookieToken(req), TOKEN)) { res.writeHead(401, { ...SEC, "Content-Type": "text/plain" }); return res.end("Open the link printed in the terminal (npm run sales:panel)."); }

    if (req.method === "GET" && FILES[url.pathname]) {
      const [file, type] = FILES[url.pathname];
      if (!fs.existsSync(file)) { res.writeHead(404, SEC); return res.end("Not built yet: run Build today's list."); }
      res.writeHead(200, { ...SEC, "Content-Type": type, "X-Frame-Options": "SAMEORIGIN", ...(url.pathname === "/" ? { "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; connect-src 'self'; media-src 'self'" } : {}) });
      return fs.createReadStream(file).pipe(res);
    }
    // Audio linked from today.html (data/audio/<slug>/<file>).
    const audio = url.pathname.match(/^\/files\/data\/audio\/([a-z0-9-]{2,80})\/(call\.mp3|voice-note\.mp3|voice-note\.ogg)$/);
    if (req.method === "GET" && audio) {
      const file = path.join(DATA, "audio", audio[1], audio[2]);
      if (!fs.existsSync(file)) { res.writeHead(404, SEC); return res.end(); }
      res.writeHead(200, { ...SEC, "Content-Type": audio[2].endsWith(".ogg") ? "audio/ogg" : "audio/mpeg" });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, { ...publicState(), ...snapshot(url.searchParams.get("q") || "") });
    if (req.method === "GET" && url.pathname === "/api/events") {
      res.writeHead(200, { ...SEC, "Content-Type": "text/event-stream", Connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "state", state: publicState() })}\n\n`);
      for (const entry of history) res.write(`data: ${JSON.stringify(entry)}\n\n`);
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => { clearInterval(ping); clients.delete(res); });
      return;
    }

    if (req.method !== "POST") { res.writeHead(404, SEC); return res.end(); }
    if ((!isWorker && !ORIGINS.has(String(req.headers.origin))) || !String(req.headers["content-type"]).startsWith("application/json")) return json(res, 403, { error: "forbidden" });
    const b = await readBody(req);

    if (url.pathname === "/api/power") {
      state.on = !!b.on;
      if (!state.on) {
        const n = state.queue.length; state.queue = [];
        // OFF stops everything: the agent run, the hunt loop and the WhatsApp window.
        if (hunt.on) { hunt.on = false; clearTimeout(hunt.timer); hunt.timer = null; hunt.nextAt = 0; hunt.note = "Stopped by the OFF switch."; if (state.running?.kind !== "hunt") runScript("hunt", ["release"]); }
        killRunning(); stopSender();
        log(`Switched OFF${n ? `, ${n} queued task(s) cleared` : ""}.`, "error");
      }
      else { log("Switched ON."); startNext(); }
      pushState(); return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/watch") {
      state.watch = !!b.on;
      if (Number.isFinite(Number(b.speed))) state.speed = Math.max(150, Math.min(2500, Math.round(Number(b.speed))));
      log(`Watch mode ${state.watch ? `on (${state.speed} ms per move)` : "off (fast, in the background)"}.`);
      pushState(); return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/run") {
      if (!state.on) return json(res, 409, { error: "The panel is OFF. Switch it ON first." });
      const kind = String(b.task);
      if (kind === "find") { const count = Math.round(Number(b.count)); if (!(count >= 1 && count <= 60)) return json(res, 400, { error: "count must be 1 to 60" }); enqueue("find", { count }); }
      else if (["today", "followups", "rescore"].includes(kind)) enqueue(kind);
      else if (kind === "rewrite") { const slug = String(b.slug); if (!SLUG.test(slug) || !readLeads().some((l) => l.slug === slug)) return json(res, 400, { error: "invalid lead" }); enqueue("rewrite", { slug }); }
      else return json(res, 400, { error: "unknown task" });
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/hunt") {
      if (b.on) {
        if (!state.on) return json(res, 409, { error: "The panel is OFF. Switch it ON first." });
        if (hunt.on) return json(res, 200, { ok: true });
        await runScript("hunt", ["init"]);
        Object.assign(hunt, { on: true, errors: 0, pausedUntil: 0 });
        log("Deep hunt started: one batch at a time, saved after every lead.", "start");
        scheduleHunt(0, "Starting the first batch.");
      } else {
        hunt.on = false; clearTimeout(hunt.timer); hunt.timer = null; hunt.nextAt = 0;
        state.queue = state.queue.filter((t) => t.kind !== "hunt");
        hunt.note = state.running?.kind === "hunt" ? "Stopping after the current batch (or use OFF to stop it now)." : "Stopped. Start again any time: it resumes where it left off.";
        log(`Deep hunt: ${hunt.note}`);
        pushState();
      }
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/sender") {
      const action = String(b.action);
      if (action === "stop") { stopSender(); log("WhatsApp sender: stop requested."); return json(res, 200, { ok: true }); }
      if (!["now", "schedule"].includes(action)) return json(res, 400, { error: "unknown action" });
      if (!state.on) return json(res, 409, { error: "The panel is OFF. Switch it ON first." });
      if (!startSender(action)) return json(res, 409, { error: "The sender is already open." });
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/log") {
      const slug = String(b.slug), status = String(b.status), note = String(b.note || "").slice(0, 200).replace(/[\r\n]/g, " ");
      if (!SLUG.test(slug) || !STATUSES.includes(status) || status === "new" || !readLeads().some((l) => l.slug === slug)) return json(res, 400, { error: "invalid lead or status" });
      const r = await runScript("log", note ? [slug, status, note] : [slug, status]);
      log(r.out.split("\n").pop()); pushState();
      return json(res, r.ok ? 200 : 400, r);
    }
    if (url.pathname === "/api/check") {
      const slug = String(b.slug), sent = String(b.sent || ""), reply = String(b.reply || "none");
      if (!SLUG.test(slug) || !readLeads().some((l) => l.slug === slug) || !TIME.test(sent) || !(reply === "none" || TIME.test(reply))) return json(res, 400, { error: "lead, sent time (HH:MM) and reply time (HH:MM or none) required" });
      const r = await runScript("check", [slug, sent, reply]);
      const line = r.out.split("\n").find((x) => x.startsWith("RESULT "));
      log(r.out.split("\n").filter((x) => !x.startsWith("RESULT ")).join(" "));
      if (line) {
        const res2 = JSON.parse(line.slice(7));
        // Reached the demo score: build the demo first, then refresh the message.
        if (res2.demo_needed && state.on) enqueue("demo", { slug });
        if (res2.rewrite && state.on) enqueue("rewrite", { slug });
      }
      pushState();
      return json(res, r.ok ? 200 : 400, r);
    }
    return json(res, 404, { error: "not found" });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const link = `http://127.0.0.1:${PORT}/?t=${TOKEN}`;
  console.log(`\nVela sales panel (local only): ${link}\nKeep this link private. Ctrl+C to stop.${CLAUDE ? "" : "\nWarning: Claude Code not found; set CLAUDE_BIN to run tasks."}\n`);
  if (!process.argv.includes("--no-open")) {
    const opener = process.platform === "win32" ? ["explorer.exe", [link]] : process.platform === "darwin" ? ["open", [link]] : ["xdg-open", [link]];
    try { spawn(opener[0], opener[1], { detached: true, stdio: "ignore" }).unref(); } catch { /* open it by hand */ }
  }
});
if (keyWarnings.length) {
  const msg = `Found ${keyWarnings.join(" and ")}. It is ignored: sales runs always use your Claude subscription login.`;
  console.log(`Note: ${msg}`); log(msg, "error");
}
process.on("SIGINT", () => { killRunning(); stopSender(); process.exit(0); });
