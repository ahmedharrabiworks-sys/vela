// npm run sales:status: is the laptop worker running, when did the dashboard last hear from it,
// what is it doing, and what is waiting.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { env } from "../scripts/lib.mjs";
import { TASK_NAME, stoppedOnPurpose, supervisor } from "./proc.mjs";

const s = supervisor();
const ago = (t) => { if (!t) return "never"; const m = Math.round((Date.now() - Date.parse(t)) / 60000); return `${new Date(t).toLocaleString("en-GB", { hour12: false })} (${m < 1 ? "just now" : `${m} min ago`})`; };
console.log(`Worker:      ${s ? `RUNNING (pid ${s.pid}, since ${new Date(s.started).toLocaleString("en-GB", { hour12: false })}${s.autostart ? ", started automatically" : ""})` : stoppedOnPurpose() ? "NOT RUNNING (stopped with sales:stop)" : "NOT RUNNING"}`);
let task = "not installed (npm run sales:autostart)";
try { const q = execFileSync("schtasks", ["/Query", "/TN", TASK_NAME, "/FO", "LIST"], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }); task = `installed (${q.match(/Status:\s*(.+)/)?.[1]?.trim() ?? "?"})`; } catch { /* not installed */ }
console.log(`Autostart:   ${task}`);
const E = env();
if (!E.NEXT_PUBLIC_SUPABASE_URL || !E.SUPABASE_SERVICE_ROLE_KEY) { console.log("Supabase keys missing in .env.local: cannot read the heartbeat."); process.exit(0); }
const db = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [{ data: w }, { data: q }] = await Promise.all([
  db.from("sales_worker").select("*").eq("id", 1).maybeSingle(),
  db.from("sales_jobs").select("id,task,status,created_at").in("status", ["queued", "running"]).order("created_at"),
]);
console.log(`Heartbeat:   ${ago(w?.heartbeat_at)}${w?.sender_status === "offline" ? ", stopped" : ""}`);
console.log(`Power:       ${w?.power_on ? "ON" : "OFF"}`);
console.log(`Running:     ${w?.running ?? "nothing"}${w?.hunt?.progress ? ` (${w.hunt.progress.step}, ${w.hunt.progress.found} lead(s) found)` : ""}`);
console.log(`Laptop queue: ${w?.queue?.length ? w.queue.join(", ") : "empty"}`);
console.log(`Site jobs:   ${q?.length ? q.map((j) => `#${j.id} ${j.task} ${j.status}`).join(", ") : "none waiting"}`);
console.log(`WhatsApp:    ${w?.sender_status ?? "?"}, sent today ${w?.today_sent ?? 0} of ${w?.daily_limit ?? 60}`);
