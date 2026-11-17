// Shared by the supervisor, the autostart launcher, sales:status and sales:stop:
// where the supervisor's pid lives and whether that pid is really our node process.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..");
export const RUNS = path.join(HERE, "..", "data", "runs");
export const PID_FILE = path.join(RUNS, "supervisor.pid");
export const STOPPED = path.join(RUNS, "stopped");
export const TASK_NAME = "Vela sales";

/** True when pid is a live node.exe (a reused pid of another program does not count). */
export function isNode(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); } catch { return false; }
  if (process.platform !== "win32") return true;
  try {
    const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
    return /^"node(\.exe)?"/i.test(out.trim());
  } catch { return false; }
}

/** The running supervisor ({ pid, started, autostart }) or null. */
export function supervisor() {
  try {
    const s = JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    return isNode(s.pid) ? s : null;
  } catch { return null; }
}

/** sales:stop was used since the PC last started (then autostart leaves it stopped). */
export function stoppedOnPurpose() {
  try { return fs.statSync(STOPPED).mtimeMs > Date.now() - os.uptime() * 1000; } catch { return false; }
}
