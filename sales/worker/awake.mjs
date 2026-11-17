// Keeps Windows awake while the laptop has work (a run, a queue, the deep hunt, the WhatsApp
// sender), and lets it sleep again when idle. A small hidden PowerShell holds
// SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) for as long as it lives; it
// exits on its own if this process dies, so a crash never leaves the PC unable to sleep.
// The screen may still turn off; only system sleep is blocked. Check: powercfg /requests
import { spawn } from "node:child_process";

let child = null;
const PS = `
Add-Type -Namespace Vela -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[void][Vela.Power]::SetThreadExecutionState([uint32]"0x80000001")
while (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 5 }
`;

/** keepAwake(true) while busy, keepAwake(false) when idle. Returns true when it changed. */
export function keepAwake(on) {
  if (process.platform !== "win32") return false;
  if (on && !child) {
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", PS], { stdio: "ignore", windowsHide: true });
    child.on("exit", () => { child = null; });
    return true;
  }
  if (!on && child) {
    try { child.kill(); } catch { /* already gone */ }
    child = null;
    return true;
  }
  return false;
}
export const isKeepingAwake = () => !!child;
process.on("exit", () => { if (child) try { child.kill(); } catch { /* gone */ } });
