// Today's WhatsApp queue for the assisted sender (it prepares, Oussama presses Send).
//   node sales/scripts/send-queue.mjs            print today's queue (dry run, sends nothing)
// Rules:
// - follow-ups due today first (day 2, 5, 9), then new leads by score;
// - only WhatsApp routes: A with the owner's public WhatsApp, B with the
//   business's public WhatsApp; Instagram and LinkedIn stay manual (today.html);
// - never: do-not-contact, known contacts, replied / booked / won / lost, numbers
//   marked not on WhatsApp, or a number contacted in the last recontact_days;
// - capped by send.daily_limit minus what was already sent today.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA, ROOT, config, nicheNote, phoneKey, readLeads, today } from "./lib.mjs";

export const SENDS = path.join(DATA, "sends.jsonl");
const STOP_STATUSES = new Set(["do-not-contact", "known-contact", "replied", "demo-booked", "trial", "won", "lost"]);
const qatarDate = (iso) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(0, 10);

export function sendsLog() {
  if (!fs.existsSync(SENDS)) return [];
  return fs.readFileSync(SENDS, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
export const sentToday = () => sendsLog().filter((s) => s.result === "sent" && qatarDate(s.at) === today()).length;

/** International digits for wa.me, or "" when the number is not usable. */
export function waNumber(raw) {
  let d = String(raw || "").replace(/\D/g, "").replace(/^00/, "");
  if (d.length === 8) d = `974${d}`; // a local Qatar number
  return d.length >= 10 && d.length <= 15 ? d : "";
}
const msgFile = (slug) => path.join(DATA, "messages", `${slug}.json`);
const readMsg = (slug) => { try { return JSON.parse(fs.readFileSync(msgFile(slug), "utf8")); } catch { return null; } };
// One language per message (3 short lines, like a person types): "both" sends the Arabic, with the Arabic voice note.
const compose = (pair, lang) => String((lang === "en" ? pair.en : pair.ar || pair.en) ?? "").trim();

export function buildQueue({ limit } = {}) {
  const cfg = config(), s = cfg.send;
  const leads = readLeads();
  const room = Math.max(0, Math.min(limit ?? Infinity, s.daily_limit - sentToday()));
  const days = (d) => Math.round((Date.parse(today()) - Date.parse(d)) / 864e5);
  // Numbers contacted recently (any lead sharing a number counts: branches share lines).
  const recent = new Set(leads.filter((l) => l.last_sent_at && Date.now() - Date.parse(l.last_sent_at) < s.recontact_days * 864e5)
    .flatMap((l) => [l.whatsapp_public, l.dm_direct].map(phoneKey).filter(Boolean)));
  const numberFor = (l) => (l.route === "A" && l.dm_direct_type === "whatsapp" ? waNumber(l.dm_direct) : l.route === "B" || l.route === "A" ? waNumber(l.whatsapp_public) : "");

  const items = [];
  for (const l of leads) {
    if (STOP_STATUSES.has(l.status) || l.wa_invalid) continue;
    const m = readMsg(l.slug), number = numberFor(l);
    if (!m || !number) continue;
    const lang = m.send_lang || s.language || "both";
    if (l.status === "sent" && l.contacted_at && Number(l.followups_sent || 0) < 3) {
      const day = [2, 5, 9][Number(l.followups_sent || 0)];
      const f = (m.followups || []).find((x) => x.day === day);
      if (f && days(l.contacted_at) >= day && (!l.last_sent_at || qatarDate(l.last_sent_at) !== today()))
        items.push({ slug: l.slug, name: l.name, kind: `followup-${day}`, number, text: compose(f, lang), lang, score: Number(l.score), attachments: [] });
    } else if (l.status === "new" && !recent.has(phoneKey(number))) {
      const audioLang = lang === "en" ? "en" : "ar";
      // Always the voice note of the lead's niche (Vela answering a customer of that niche), else the general note.
      const voice = s.voice_note ? nicheNote(l.niche, audioLang, "ogg")?.file ?? "" : "";
      const video = s.attach_video && s.video?.[audioLang] ? path.join(ROOT, s.video[audioLang]) : ""; // off by default: message 1 is the text + the voice note
      items.push({ slug: l.slug, name: l.name, kind: "first", number, text: compose(m.first, lang), lang, score: Number(l.score), route: l.route, owner: l.dm_name,
        attachments: [voice && { type: "voice", file: voice }, video && fs.existsSync(video) && { type: "video", file: video }].filter(Boolean) });
    }
  }
  items.sort((a, b) => (a.kind === "first") - (b.kind === "first") || b.score - a.score);
  // One message per number per day, even across branches.
  const seen = new Set();
  return items.filter((i) => !seen.has(i.number) && seen.add(i.number)).slice(0, room);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const q = buildQueue();
  console.log(`Sent today: ${sentToday()} of ${config().send.daily_limit}. Queue: ${q.length}`);
  for (const [i, x] of q.entries()) console.log(`${i + 1}. ${x.name} (${x.kind}, score ${x.score}, +${x.number.slice(0, 5)}...) ${x.attachments.map((a) => a.type).join(" + ") || "text only"}`);
}
