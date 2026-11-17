// Keeps the laptop worker alive: `npm run sales:all` runs this.
// If the worker crashes (any non-zero exit), it is restarted after a short pause
// (5 s, then 15 s, 30 s, 60 s while it keeps failing), with a clear log line here
// and in sales/data/runs/worker-restarts.log. Ctrl+C stops it for good.
// Closing the window stops everything here; the "Vela sales" scheduled task (npm run
// sales:autostart) starts it again at login and within 5 minutes if it was closed.
// npm run sales:stop stops it cleanly and keeps it stopped until the next restart of the PC.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PID_FILE, RUNS, STOPPED, supervisor } from "./proc.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(HERE, "..", "data", "runs", "worker-restarts.log");
const WAITS = [5, 15, 30, 60];
const stamp = () => new Date().toLocaleString("en-GB", { hour12: false });
const say = (m) => {
  const line = `[${stamp()}] ${m}`;
  console.log(`\n=== ${line} ===\n`);
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${line}\n`); } catch { /* the console line is enough */ }
};

// One supervisor at a time: its pid is in sales/data/runs/supervisor.pid (read by the launcher,
// sales:status and sales:stop). Starting by hand also clears an earlier sales:stop.
fs.mkdirSync(RUNS, { recursive: true });
const running = supervisor();
if (running && running.pid !== process.pid) { console.log(`The laptop worker is already running (pid ${running.pid}). npm run sales:status to check, npm run sales:stop to stop it.`); process.exit(0); }
fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, started: new Date().toISOString(), autostart: !!process.env.SALES_AUTOSTART }));
fs.rmSync(STOPPED, { force: true });
process.on("exit", () => { try { if (JSON.parse(fs.readFileSync(PID_FILE, "utf8")).pid === process.pid) fs.rmSync(PID_FILE); } catch { /* gone */ } });
process.stdout.write("\u001b]0;Vela sales\u0007"); // window title

let first = true, fails = 0, restarts = 0, child = null, quitting = false;
function start() {
  const args = [path.join(HERE, "worker.mjs"), ...(first && process.argv.includes("--open") && !process.env.SALES_AUTOSTART ? ["--open"] : [])];
  first = false;
  const started = Date.now();
  child = spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, SALES_WORKER_RESTARTS: String(restarts) } });
  child.on("exit", (code, signal) => {
    child = null;
    if (quitting || code === 0) { console.log("Worker stopped."); process.exit(0); }
    if (Date.now() - started > 5 * 60e3) fails = 0; // it ran fine for a while: start the backoff over
    const wait = WAITS[Math.min(fails, WAITS.length - 1)];
    fails++; restarts++;
    say(`WORKER CRASHED (exit ${code ?? signal}). Restarting in ${wait} s (restart ${fails}).`);
    setTimeout(start, wait * 1000);
  });
}
// Ctrl+C reaches the worker too (same console); it marks the laptop offline and exits 0.
const quit = () => { quitting = true; if (!child) process.exit(0); };
process.on("SIGINT", quit);
process.on("SIGTERM", quit);
process.on("SIGHUP", quit);
start();
