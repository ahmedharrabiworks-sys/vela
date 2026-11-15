// Merges agent output into leads.csv, under a lock (agents save in parallel).
//   node sales/scripts/ingest.mjs <batch.json> [...]
// Batch shape: { "kind": "leads" | "dm" | "rescore", "items": [...] }
// - leads: new businesses from the hunter (scored in the same pass). The deep
//   hunt saves ONE lead per file right after finding it. Duplicates (same slug,
//   name, phone, Instagram or website) are skipped, never overwritten.
// - dm: owner-finder results for existing slugs. Not found = score minus 2.
// - rescore: { slug, score, why_fits } from a qualifier re-run (after a check).
import fs from "node:fs";
import { COLUMNS, computeScore, findDuplicate, slugify, today, withLeads } from "./lib.mjs";

const LIST_COLS = ["unanswered_comments", "slow_reply_reviews", "other_evidence", "unknowns"];
const DM_COLS = ["dm_name", "dm_role", "dm_source", "contact_path", "contact_url", "contact_rank", "dm_confidence", "dm_direct", "dm_direct_type", "route"];
const flat = (v) => (v && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);

const summary = await withLeads((leads) => {
  let added = 0, skipped = 0, updated = 0;
  const dups = [];
  for (const file of process.argv.slice(2)) {
    const batch = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of batch.items ?? []) {
      if (batch.kind === "leads") {
        if (!item.name) continue;
        const dup = findDuplicate(leads, item);
        if (dup) { skipped++; dups.push(`${item.name} = ${dup.slug}`); continue; }
        const row = Object.fromEntries(COLUMNS.map((c) => [c, LIST_COLS.includes(c) ? (item[c] ?? []) : flat(item[c] ?? "")]));
        let slug = slugify(item.slug || item.name), n = 2;
        while (leads.some((l) => l.slug === slug)) slug = `${slugify(item.slug || item.name)}-${n++}`;
        Object.assign(row, { slug, score_raw: String(item.score ?? ""), score: String(item.score ?? ""), status: "new", found_at: today(), followups_sent: "0" });
        leads.push(row); added++;
      } else if (batch.kind === "rescore") {
        const lead = leads.find((l) => l.slug === item.slug);
        if (!lead) { console.warn("rescore for unknown slug", item.slug); continue; }
        if (Number.isFinite(Number(item.score))) lead.score_raw = String(Math.max(1, Math.min(10, Math.round(Number(item.score)))));
        if (item.why_fits) lead.why_fits = item.why_fits;
        lead.score = String(computeScore(lead));
        updated++;
      } else if (batch.kind === "dm") {
        const lead = leads.find((l) => l.slug === item.slug);
        if (!lead) { console.warn("dm for unknown slug", item.slug); continue; }
        if (item.found && item.dm_name) {
          for (const c of DM_COLS) lead[c] = flat(item[c] ?? "");
        } else {
          for (const c of DM_COLS) lead[c] = "";
          lead.dm_source = item.dm_source ?? "searched, not found";
          // Without an owner name, the business WhatsApp (B) or Instagram (C) is still a route.
          lead.route = item.route ?? (lead.whatsapp_public ? "B" : lead.instagram ? "C" : "");
        }
        lead.score = String(computeScore(lead));
        updated++;
      }
    }
  }
  return { total: leads.length, added, skipped, updated, dups };
});
console.log(`leads.csv: ${summary.total} total, ${summary.added} added, ${summary.skipped} skipped (already known${summary.dups.length ? `: ${summary.dups.slice(0, 5).join("; ")}` : ""}), ${summary.updated} owner/score updates`);
