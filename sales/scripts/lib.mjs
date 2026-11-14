// Shared helpers for the sales machine: config, env, the leads.csv store
// (single source of truth), message files and the usage budget.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SALES = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DATA = path.join(SALES, "data");
export const ROOT = path.dirname(SALES);
export const LEADS_CSV = path.join(DATA, "leads.csv");

export const config = () => JSON.parse(fs.readFileSync(path.join(SALES, "config.json"), "utf8"));

/** Secrets only from ../.env.local, never printed. */
export function env() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]));
}

// Columns of leads.csv. Lists and evidence are JSON inside one cell.
export const COLUMNS = [
  "slug", "name", "niche", "area", "website", "instagram", "google_maps", "phone_public", "whatsapp_public",
  "branches", "google_rating", "google_reviews", "hours", "closing_time", "ig_followers", "ig_activity",
  "meta_ads", "price_level", "premium_area",
  "unanswered_comments", "slow_reply_reviews", "other_evidence", "unknowns",
  "score", "score_raw", "why_fits",
  "dm_name", "dm_role", "dm_source", "contact_path", "contact_url", "contact_rank",
  "demo_token", "status", "status_note", "status_at", "contacted_at", "followups_sent", "found_at",
];
export const STATUSES = ["new", "sent", "replied", "demo-booked", "trial", "won", "lost", "do-not-contact"];

const esc = (v) => {
  const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ""));
}
const JSON_COLS = new Set(["unanswered_comments", "slow_reply_reviews", "other_evidence", "unknowns"]);

export function readLeads() {
  if (!fs.existsSync(LEADS_CSV)) return [];
  const [head, ...rows] = parseCsv(fs.readFileSync(LEADS_CSV, "utf8"));
  return rows.map((r) => Object.fromEntries(head.map((h, i) => {
    const v = r[i] ?? "";
    if (JSON_COLS.has(h)) { try { return [h, v ? JSON.parse(v) : []]; } catch { return [h, []]; } }
    return [h, v];
  })));
}
export function writeLeads(leads) {
  fs.mkdirSync(DATA, { recursive: true });
  const out = [COLUMNS.join(","), ...leads.map((l) => COLUMNS.map((c) => esc(l[c])).join(","))].join("\n") + "\n";
  fs.writeFileSync(LEADS_CSV + ".tmp", out);
  fs.renameSync(LEADS_CSV + ".tmp", LEADS_CSV);
}
export const slugify = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);

/** Find a lead by slug, or by a unique case-insensitive part of its name. */
export function findLead(leads, key) {
  const k = String(key).toLowerCase();
  const exact = leads.find((l) => l.slug === k);
  if (exact) return exact;
  const hits = leads.filter((l) => l.name.toLowerCase().includes(k) || l.slug.includes(k));
  if (hits.length === 1) return hits[0];
  throw new Error(hits.length ? `"${key}" matches ${hits.length} leads: ${hits.map((h) => h.slug).join(", ")}` : `no lead "${key}"`);
}

// ── Usage budget (ElevenLabs characters per run, Vapi dollars in total) ──
const USAGE = path.join(DATA, "usage.json");
export function usage() {
  return fs.existsSync(USAGE) ? JSON.parse(fs.readFileSync(USAGE, "utf8")) : { runs: [], elevenlabs_chars_total: 0, vapi_usd_total: 0 };
}
export function currentRun(u = usage()) {
  let run = u.runs[u.runs.length - 1];
  if (!run || run.closed) { run = { id: new Date().toISOString(), elevenlabs_chars: 0, vapi_usd: 0, items: [] }; u.runs.push(run); }
  return run;
}
/** Reserve characters before calling ElevenLabs; throws when the run budget would be exceeded. */
export function spendChars(n, what) {
  const u = usage(), run = currentRun(u), cap = config().budget.elevenlabs_chars_per_run;
  if (run.elevenlabs_chars + n > cap) throw new Error(`budget: ${run.elevenlabs_chars} + ${n} > ${cap} ElevenLabs characters this run`);
  run.elevenlabs_chars += n; u.elevenlabs_chars_total += n; run.items.push({ what, chars: n, at: new Date().toISOString() });
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1));
  return run.elevenlabs_chars;
}
export function closeRun() { const u = usage(); const r = u.runs[u.runs.length - 1]; if (r) r.closed = true; fs.writeFileSync(USAGE, JSON.stringify(u, null, 1)); }

export const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Asia/Qatar
export const DASHES = /[–—]/;
