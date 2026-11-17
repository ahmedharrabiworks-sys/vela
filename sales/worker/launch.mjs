// Run by the "Vela sales" scheduled task (at login after 30 s, then every 5 minutes), hidden.
// Starts `npm run sales:all` in a minimized "Vela sales" window unless the worker is already
// running or was stopped on purpose with npm run sales:stop since the PC started.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ROOT, RUNS, stoppedOnPurpose, supervisor } from "./proc.mjs";

const LOG = path.join(RUNS, "autostart.log");
const note = (m) => { try { fs.mkdirSync(RUNS, { recursive: true }); fs.appendFileSync(LOG, `[${new Date().toLocaleString("en-GB", { hour12: false })}] ${m}\n`); } catch { /* best effort */ } };

if (supervisor()) process.exit(0); // running: nothing to do (no log line every 5 minutes)
if (stoppedOnPurpose()) process.exit(0);
note("Worker not running: starting it in a minimized \"Vela sales\" window.");
const child = spawn("cmd.exe", ["/d", "/c", "start", "\"Vela sales\"", "/min", "cmd.exe", "/d", "/c", "npm run sales:all"], {
  cwd: ROOT, env: { ...process.env, SALES_AUTOSTART: "1" }, detached: true, stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true,
});
child.unref();
