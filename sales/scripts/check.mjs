// /sales-check <lead> <sent-time> [reply-time|none]
// Logs Oussama's after-hours booking question to the business and when (or
// whether) they answered. Times like "22:40", "2026-11-14 22:40" or "none".
// The writer uses it as the hook: "asked at 10:40 pm, reply came at 9:05 am".
import fs from "node:fs";
import path from "node:path";
import { DATA, computeScore, config, findLead, readLeads, today, writeLeads } from "./lib.mjs";

const [key, sent, reply = "none"] = process.argv.slice(2);
if (!key || !sent) { console.error("usage: /sales-check <lead> <sent-time> [reply-time|none]"); process.exit(1); }
const leads = readLeads();
const lead = findLead(leads, key);

const parse = (s) => {
  if (s === "none") return null;
  const m = s.match(/^(?:(\d{4}-\d{2}-\d{2})[ T])?(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`bad time "${s}" (use HH:MM or YYYY-MM-DD HH:MM)`);
  return `${m[1] ?? today()}T${m[2].padStart(2, "0")}:${m[3]}`;
};
const sentAt = parse(sent);
let replyAt = parse(reply);
// A reply time earlier than the question means the next morning.
if (replyAt && replyAt < sentAt && !/\d{4}-/.test(reply)) {
  const d = new Date(`${sentAt.slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1);
  replyAt = `${d.toISOString().slice(0, 10)}${replyAt.slice(10)}`;
}
const minutes = replyAt ? Math.round((Date.parse(replyAt + ":00Z") - Date.parse(sentAt + ":00Z")) / 60000) : null;
const fmt = (iso) => { const [h, m] = iso.slice(11).split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const summary = replyAt ? `asked at ${fmt(sentAt)}, reply came at ${fmt(replyAt)}${minutes >= 600 ? " the next morning" : ""}` : `asked at ${fmt(sentAt)}, no reply`;

const file = path.join(DATA, "checks.json");
const checks = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
checks[lead.slug] = { sent_at: sentAt, reply_at: replyAt, minutes_to_reply: minutes, summary, logged_at: new Date().toISOString() };
fs.writeFileSync(file, JSON.stringify(checks, null, 1));
// Re-score now: no reply, or a reply 8+ hours later, adds +2.
const before = Number(lead.score);
lead.score = String(computeScore(lead, checks));
writeLeads(leads);
const demoAt = config().scoring?.demo_at ?? 9;
const hasDemo = fs.existsSync(path.join(DATA, "demos", `${lead.slug}.json`));
const hasMsg = fs.existsSync(path.join(DATA, "messages", `${lead.slug}.json`));
console.log(`${lead.name}: ${summary}. Score ${before} -> ${lead.score}.`);
console.log("RESULT " + JSON.stringify({ slug: lead.slug, score: Number(lead.score), demo_needed: Number(lead.score) >= demoAt && !!lead.dm_name && !hasDemo, rewrite: hasMsg }));
