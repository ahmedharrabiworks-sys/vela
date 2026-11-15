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
  // Deep hunt: size and after-hours signals, owner direct contact and route.
  "staff", "closed_days", "after_hours_signal", "hunt_cell",
  "dm_confidence", "dm_direct", "dm_direct_type", "route",
  "last_sent_at", "wa_invalid", "replied_at",
];
// known-contact: someone we already know (e.g. Kings Dental Center); never cold messaged.
export const STATUSES = ["new", "sent", "replied", "demo-booked", "trial", "won", "lost", "do-not-contact", "known-contact"];

/** After-hours checks logged with /sales-check, by slug. */
export function readChecks() {
  const f = path.join(DATA, "checks.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
}

/**
 * The one scoring rule, applied after the qualifier's evidence score:
 * - unknown signals are never punished (the qualifier scores what it can see);
 * - a logged after-hours check with no reply, or a reply 8+ hours later: +2;
 * - no decision maker found after searching: minus 2.
 * Clamped to 1..10.
 */
export function computeScore(lead, checks = readChecks()) {
  const s = config().scoring ?? { check_bonus: 2, check_slow_reply_hours: 8, dm_missing_penalty: 2 };
  let score = Number(lead.score_raw || lead.score || 0);
  const c = checks[lead.slug];
  if (c && (c.minutes_to_reply === null || c.minutes_to_reply >= s.check_slow_reply_hours * 60)) score += s.check_bonus;
  if (!lead.dm_name && lead.dm_source) score -= s.dm_missing_penalty;
  return Math.max(1, Math.min(10, Math.round(score)));
}

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

// ── Dedupe keys: phone digits (last 8, Qatar numbers), name, Instagram, website ──
export const phoneKey = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length >= 8 ? d.slice(-8) : ""; };
export const nameKey = (n) => String(n || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const urlKey = (u) => String(u || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
/** The existing lead this one duplicates (same slug, phone, name, Instagram or website), or null. */
export function findDuplicate(leads, item) {
  const slug = slugify(item.slug || item.name), name = nameKey(item.name), ig = urlKey(item.instagram), web = urlKey(item.website);
  const phones = [item.phone_public, item.whatsapp_public].map(phoneKey).filter(Boolean);
  return leads.find((l) => l.slug === slug || (name && nameKey(l.name) === name)
    || (ig && urlKey(l.instagram) === ig) || (web && urlKey(l.website) === web)
    || (phones.length && [l.phone_public, l.whatsapp_public].map(phoneKey).some((p) => p && phones.includes(p)))) ?? null;
}

// ── A small cross-process lock around leads.csv (agents save in parallel) ──
const LOCK = path.join(DATA, ".leads.lock");
export async function withLeads(fn) {
  fs.mkdirSync(DATA, { recursive: true });
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); break; }
    catch {
      // A lock older than 30 s belongs to a crashed process.
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 30000) fs.rmSync(LOCK, { force: true }); } catch { /* gone */ }
      if (i > 300) throw new Error("leads.csv is locked by another process");
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  try { const leads = readLeads(); const out = await fn(leads); writeLeads(leads); return out; }
  finally { fs.rmSync(LOCK, { force: true }); }
}

/** The Vela phone agent's voice, read from the agent config (one source of truth). */
export function velaVoiceId() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "vapi-agent-config.ts"), "utf8");
  const m = src.match(/export const DEFAULT_VOICE_ID\s*=\s*"([A-Za-z0-9]+)"/);
  if (!m) throw new Error("DEFAULT_VOICE_ID not found in src/lib/vapi-agent-config.ts");
  return m[1];
}

// ── Usage budget (ElevenLabs characters per week, Vapi dollars in total) ──
const USAGE = path.join(DATA, "usage.json");
export function usage() {
  return fs.existsSync(USAGE) ? JSON.parse(fs.readFileSync(USAGE, "utf8")) : { runs: [], elevenlabs_chars_total: 0, vapi_usd_total: 0 };
}
export function currentRun(u = usage()) {
  let run = u.runs[u.runs.length - 1];
  if (!run || run.closed) { run = { id: new Date().toISOString(), elevenlabs_chars: 0, vapi_usd: 0, items: [] }; u.runs.push(run); }
  return run;
}
/** Start of this week (Sunday, Asia/Qatar) as YYYY-MM-DD. */
export function weekStart() {
  const d = new Date(Date.now() + 3 * 3600e3);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
/** ElevenLabs characters spent since the start of this week. */
export function weekChars(u = usage()) {
  const from = weekStart();
  return u.runs.flatMap((r) => r.items ?? []).filter((i) => new Date(Date.parse(i.at) + 3 * 3600e3).toISOString().slice(0, 10) >= from).reduce((n, i) => n + (i.chars || 0), 0);
}
/** Reserve characters before calling ElevenLabs; throws when the weekly cap would be exceeded. */
export function spendChars(n, what) {
  const u = usage(), run = currentRun(u), cap = config().budget.elevenlabs_chars_per_week, used = weekChars(u);
  if (used + n > cap) throw new Error(`budget: ${used} + ${n} > ${cap} ElevenLabs characters this week (resets Sunday)`);
  run.elevenlabs_chars += n; u.elevenlabs_chars_total += n; run.items.push({ what, chars: n, at: new Date().toISOString() });
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1));
  return run.elevenlabs_chars;
}
export function closeRun() { const u = usage(); const r = u.runs[u.runs.length - 1]; if (r) r.closed = true; fs.writeFileSync(USAGE, JSON.stringify(u, null, 1)); }

export const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Asia/Qatar
export const DASHES = /[–—]/;
