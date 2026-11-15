// Keeps the laptop worker alive: `npm run sales:all` runs this.
// If the worker crashes (any non-zero exit), it is restarted after a short pause
// (5 s, then 15 s, 30 s, 60 s while it keeps failing), with a clear log line here
// and in sales/data/runs/worker-restarts.log. Ctrl+C stops it for good.
// Closing the window stops everything: nothing can restart a closed window.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(HERE, "..", "data", "runs", "worker-restarts.log");
const WAITS = [5, 15, 30, 60];
const stamp = () => new Date().toLocaleString("en-GB", { hour12: false });
const say = (m) => {
  const line = `[${stamp()}] ${m}`;
  console.log(`\n=== ${line} ===\n`);
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${line}\n`); } catch { /* the console line is enough */ }
};

let first = true, fails = 0, restarts = 0, child = null, quitting = false;
function start() {
  const args = [path.join(HERE, "worker.mjs"), ...(first && process.argv.includes("--open") ? ["--open"] : [])];
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
