// The question angle for a lead's first message (A/B test).
//   node sales/scripts/angle.mjs <slug>     prints the angle to write on (keeps an existing one)
//   node sales/scripts/angle.mjs --stats    per angle: sent, replied, reply rate
// Balanced until every angle has 20+ sends, then 70% the best reply rate, 30% the others.
import fs from "node:fs";
import path from "node:path";
import { ANGLES, DATA, angleStats, eligibleAngles, findLead, pickAngle, readLeads } from "./lib.mjs";

const arg = process.argv[2];
const leads = readLeads();
if (arg === "--stats") {
  const s = angleStats(leads);
  for (const a of ANGLES) console.log(`${a}: sent ${s[a].sent}, replied ${s[a].replied}, ${s[a].rate}%`);
  process.exit(0);
}
const lead = arg && findLead(leads, arg);
if (!lead) { console.error("usage: angle.mjs <slug> | --stats"); process.exit(1); }
let existing = null;
try { existing = JSON.parse(fs.readFileSync(path.join(DATA, "messages", `${lead.slug}.json`), "utf8")).angle_key; } catch { /* no message yet */ }
const angle = ANGLES.includes(existing) ? existing : pickAngle(lead, leads);
console.log(angle);
console.error(`fits: ${eligibleAngles(lead).join(", ")}`);
