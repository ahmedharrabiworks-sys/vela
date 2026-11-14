// /sales-log <lead> <status> [note]
// Statuses: sent, replied, demo-booked, trial, won, lost, do-not-contact.
// do-not-contact is permanent: it can never be changed back.
import { STATUSES, findLead, readLeads, today, writeLeads } from "./lib.mjs";

const [key, status, ...note] = process.argv.slice(2);
if (!key || !STATUSES.includes(status) || status === "new") {
  console.error(`usage: /sales-log <lead> <${STATUSES.filter((s) => s !== "new").join("|")}> [note]`);
  process.exit(1);
}
const leads = readLeads();
const lead = findLead(leads, key);
if (lead.status === "do-not-contact") {
  console.error(`${lead.name} is do-not-contact. That is permanent; nothing changed.`);
  process.exit(1);
}
const prev = lead.status;
lead.status = status;
lead.status_at = today();
if (note.length) lead.status_note = note.join(" ");
if (status === "sent") {
  if (!lead.contacted_at) lead.contacted_at = today(); // the first message
  else lead.followups_sent = String(Number(lead.followups_sent || 0) + 1); // a follow-up
}
writeLeads(leads);
console.log(`${lead.name}: ${prev} -> ${status}${lead.status_note ? ` (${lead.status_note})` : ""}`);
