// Merges agent output into leads.csv.
//   node sales/scripts/ingest.mjs <batch.json> [...]
// Batch shape: { "kind": "leads" | "dm", "items": [...] }
// - leads: new businesses from hunter + qualifier. Leads already in the CSV
//   (same slug, website or Instagram) are skipped, never overwritten.
// - dm: decision-maker results for existing slugs. Not found = score minus 2.
import fs from "node:fs";
import { COLUMNS, readLeads, slugify, today, writeLeads } from "./lib.mjs";

const norm = (u) => String(u || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
const leads = readLeads();
let added = 0, skipped = 0, updated = 0;

for (const file of process.argv.slice(2)) {
  const batch = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const item of batch.items ?? []) {
    if (batch.kind === "leads") {
      const slug = item.slug ? slugify(item.slug) : slugify(item.name);
      const dup = leads.find((l) => l.slug === slug || (item.website && norm(l.website) === norm(item.website)) || (item.instagram && norm(l.instagram) === norm(item.instagram)));
      if (dup) { skipped++; continue; }
      const row = Object.fromEntries(COLUMNS.map((c) => [c, item[c] ?? (["unanswered_comments", "slow_reply_reviews", "other_evidence", "unknowns"].includes(c) ? [] : "")]));
      row.slug = slug;
      row.score_raw = String(item.score ?? "");
      row.score = String(item.score ?? "");
      row.status = "new";
      row.found_at = today();
      row.followups_sent = "0";
      leads.push(row); added++;
    } else if (batch.kind === "dm") {
      const lead = leads.find((l) => l.slug === item.slug);
      if (!lead) { console.warn("dm for unknown slug", item.slug); continue; }
      if (item.found && item.dm_name) {
        for (const c of ["dm_name", "dm_role", "dm_source", "contact_path", "contact_url", "contact_rank"]) lead[c] = item[c] ?? "";
        lead.score = lead.score_raw;
      } else {
        lead.dm_name = ""; lead.dm_role = ""; lead.dm_source = item.dm_source ?? "searched, not found";
        lead.score = String(Math.max(1, Number(lead.score_raw || 0) - 2));
      }
      updated++;
    }
  }
}
writeLeads(leads);
console.log(`leads.csv: ${leads.length} total, ${added} added, ${skipped} skipped (already known), ${updated} decision-maker updates`);
