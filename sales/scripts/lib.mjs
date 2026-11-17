// Shared helpers for the sales machine: config, env, the leads.csv store
// (single source of truth), message files and the usage budget.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SALES = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DATA = path.join(SALES, "data");
export const ROOT = path.dirname(SALES);
export const LEADS_CSV = path.join(DATA, "leads.csv");

// sales/config.json (in git) plus sales/data/local-config.json (gitignored, personal values such as
// DEMO_NUMBER: the repo is public, so a phone number never goes in config.json).
export const config = () => {
  const base = JSON.parse(fs.readFileSync(path.join(SALES, "config.json"), "utf8"));
  try { Object.assign(base, JSON.parse(fs.readFileSync(path.join(SALES, "data", "local-config.json"), "utf8"))); } catch { /* no local values */ }
  return base;
};

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

// ── Niches: free-text niches from older runs map to the 24 hunt niches ──
const NICHE_RULES = [
  [/dent|orthodon|implant/, "dental"],
  [/derma|aesthetic|cosmetic|laser|hair transplant|plastic|skin/, "dermatology-aesthetic"],
  [/physio|chiro|rehab/, "physiotherapy"],
  [/vet(erinar)?|animal hospital/, "veterinary"],
  [/pet groom|grooming/, "pet-grooming"],
  [/nail/, "nail-bar"],
  [/barber/, "barber"],
  [/\bspa\b|massage/, "spa"],
  [/salon|beauty|hair/, "hair-beauty-salon"],
  [/gym|fitness|personal train|crossfit|yoga|pilates/, "gym-personal-training"],
  [/car rental|rent a car|car hire|limousine/, "car-rental"],
  [/car (service|wash|care)|detailing|garage|auto/, "car-service-detailing"],
  [/\bac\b|air condition|maintenance|handyman/, "ac-home-maintenance"],
  [/clean/, "cleaning"],
  [/mov(ers|ing)|relocation/, "movers"],
  [/real estate|propert|realty/, "real-estate"],
  [/driving/, "driving-school"],
  [/tutor|training cent|academy|courses/, "tutoring-training"],
  [/event|venue|wedding|hall/, "event-venue"],
  [/restaurant|cafe|dining/, "restaurant-reservations"],
  [/pest/, "pest-control"],
  [/home (health|care|nursing)|nursing/, "home-healthcare"],
  [/plumb|electric/, "plumbing-electrical-emergency"],
  [/lab|test/, "medical-lab-home-tests"],
];
/** The hunt niche id for a lead's niche text ("polyclinic group with dermatology" -> "dermatology-aesthetic"), or "general". */
export function nicheId(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return "general";
  try { if (config().hunt.niches.includes(t)) return t; } catch { /* config unreadable: use the rules */ }
  for (const [re, id] of NICHE_RULES) if (re.test(t)) return id;
  return "general";
}
/** The niche voice note for a lead (ext "ogg" for WhatsApp, "mp3" for the dashboard), falling back to the general note. */
export function nicheNote(nicheText, lang, ext = "ogg") {
  const dir = path.join(DATA, "audio", "niche"), l = lang === "en" ? "en" : "ar";
  for (const id of [nicheId(nicheText), "general"]) {
    const f = path.join(dir, `${id}-${l}.${ext}`);
    if (fs.existsSync(f)) return { id, file: f };
  }
  return null;
}

// ── Question angles (A/B test on message 1) ──
export const ANGLES = ["after-hours", "friday", "branches", "peak-hours", "whatsapp-backlog"];
const REPLIED = new Set(["replied", "demo-booked", "trial", "won"]);
const msgOf = (slug) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, "messages", `${slug}.json`), "utf8")); } catch { return null; } };
/** Angles this lead has a real fact for (peak-hours always fits: every business has a rush). */
export function eligibleAngles(l) {
  const text = `${l.hours || ""} ${l.closed_days || ""}`.toLowerCase();
  const branches = Number(String(l.branches || "").match(/\d+/)?.[0] || 0);
  const out = [];
  if (l.closing_time || /\d{1,2}[:.]\d\d/.test(text)) out.push("after-hours");
  if (/fri(day)?[^,;]{0,12}closed|closed[^,;]{0,12}fri|weekend|الجمعة/.test(text)) out.push("friday");
  if (branches >= 2) out.push("branches");
  out.push("peak-hours");
  if (l.whatsapp_public) out.push("whatsapp-backlog");
  return out;
}
/** Per angle: first messages sent and how many of those leads replied. */
export function angleStats(leads = readLeads()) {
  const s = Object.fromEntries(ANGLES.map((a) => [a, { sent: 0, replied: 0, rate: 0 }]));
  for (const l of leads) {
    const a = msgOf(l.slug)?.angle_key;
    if (!s[a] || !(l.contacted_at || l.last_sent_at) || l.status === "new") continue;
    s[a].sent++;
    if (REPLIED.has(l.status) || l.replied_at) s[a].replied++;
  }
  for (const a of ANGLES) s[a].rate = s[a].sent ? Math.round((s[a].replied / s[a].sent) * 1000) / 10 : 0;
  return s;
}
/** The angle for a new message: balanced until every angle has 20+ sends, then 70% the best reply rate, 30% the others. */
export function pickAngle(lead, leads = readLeads(), rnd = Math.random) {
  const ok = eligibleAngles(lead), st = angleStats(leads);
  const allTested = ANGLES.every((a) => st[a].sent >= 20);
  if (allTested) {
    const best = [...ANGLES].sort((a, b) => st[b].rate - st[a].rate)[0];
    const others = ok.filter((a) => a !== best);
    if (ok.includes(best) && (rnd() < 0.7 || !others.length)) return best;
    if (others.length) return others[Math.floor(rnd() * others.length)];
  }
  // Still testing: the least-sent angle this lead fits (ties broken at random, so the angles spread).
  const planned = Object.fromEntries(ANGLES.map((a) => [a, st[a].sent]));
  for (const l of leads) { const a = l.status === "new" ? msgOf(l.slug)?.angle_key : null; if (a && planned[a] !== undefined) planned[a] += 1; }
  const min = Math.min(...ok.map((a) => planned[a]));
  const pool = ok.filter((a) => planned[a] === min);
  return pool[Math.floor(rnd() * pool.length)];
}

/** A voice from the agent config's VOICES list, by name (e.g. "Mateo"); never guessed. */
export function voiceIdByName(name) {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "vapi-agent-config.ts"), "utf8");
  const m = src.match(new RegExp(`\\{\\s*id:\\s*"([A-Za-z0-9]+)",\\s*name:\\s*"${name}"`));
  if (!m) throw new Error(`voice "${name}" not found in src/lib/vapi-agent-config.ts`);
  return m[1];
}
/** The voice for a niche note: Arabic = the phone agent's default (Heba), English = config.voices.note_en (Mateo). */
export function noteVoiceId(lang) {
  return lang === "en" ? voiceIdByName(config().voices?.note_en || "Mateo") : velaVoiceId();
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
/** This week's ElevenLabs cap: the normal weekly cap, unless a one-time raise is set for this exact week
 *  (config.budget.elevenlabs_one_time = { week: "YYYY-MM-DD" (a Sunday), chars: N }). Next week it is ignored. */
export function weekCap() {
  const b = config().budget, o = b.elevenlabs_one_time;
  return o && o.week === weekStart() && Number(o.chars) > 0 ? Number(o.chars) : b.elevenlabs_chars_per_week;
}
/** Reserve characters before calling ElevenLabs; throws when the weekly cap would be exceeded. */
export function spendChars(n, what) {
  const u = usage(), run = currentRun(u), cap = weekCap(), used = weekChars(u);
  if (used + n > cap) throw new Error(`budget: ${used} + ${n} > ${cap} ElevenLabs characters this week (resets Sunday)`);
  run.elevenlabs_chars += n; u.elevenlabs_chars_total += n; run.items.push({ what, chars: n, at: new Date().toISOString() });
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1));
  return run.elevenlabs_chars;
}
export function closeRun() { const u = usage(); const r = u.runs[u.runs.length - 1]; if (r) r.closed = true; fs.writeFileSync(USAGE, JSON.stringify(u, null, 1)); }

export const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Asia/Qatar
export const DASHES = /[–—]/;
