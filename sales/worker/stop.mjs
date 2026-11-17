// npm run sales:stop: stops the laptop worker, its panel and any run cleanly, and keeps it
// stopped (the scheduled task leaves it alone) until you start it again or the PC restarts.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { env } from "../scripts/lib.mjs";
import { RUNS, STOPPED, supervisor } from "./proc.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(RUNS, { recursive: true });
fs.writeFileSync(STOPPED, new Date().toISOString());
const s = supervisor();
if (!s) { console.log("The laptop worker is not running. It stays stopped until npm run sales:all or the next PC restart."); process.exit(0); }
console.log(`Stopping the laptop worker (pid ${s.pid})...`);
for (let i = 0; i < 40 && supervisor(); i++) await sleep(500); // the worker sees the flag, marks itself offline, exits
if (supervisor()) {
  console.log("It did not stop within 20 s: ending it now.");
  try { execFileSync("taskkill", ["/PID", String(s.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* gone */ }
  const E = env();
  if (E.NEXT_PUBLIC_SUPABASE_URL && E.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    try { await db.from("sales_worker").update({ sender_status: "offline", running: null }).eq("id", 1); } catch { /* best effort */ }
  }
}
console.log("Stopped. It stays stopped until npm run sales:all or the next PC restart.");
