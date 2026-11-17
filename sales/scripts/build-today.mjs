// /sales-today: writes sales/today.html. New contacts (status new, with a
// decision maker and a written message) sorted by score, at most daily_limit,
// plus the follow-ups due today. Nothing here sends anything.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA, SALES, config, readLeads, today } from "./lib.mjs";
import { h, safeUrl, shell } from "./page.mjs";

const cfg = config();
const msg = (slug) => { const f = path.join(DATA, "messages", `${slug}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const demo = (slug) => { const f = path.join(DATA, "demos", `${slug}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const daysSince = (d) => Math.round((Date.parse(today()) - Date.parse(d)) / 864e5);

export function todayLists(leads = readLeads()) {
const fresh = leads
  .filter((l) => l.status === "new" && l.route && msg(l.slug))
  .sort((a, b) => Number(b.score) - Number(a.score))
  .slice(0, Number(cfg.daily_limit) || 15);
const due = leads.filter((l) => l.status === "sent" && l.contacted_at && Number(l.followups_sent || 0) < 3).map((l) => {
  const n = Number(l.followups_sent || 0), day = [3, 7, 12][n];
  const f = msg(l.slug)?.followups?.find((x) => x.day === day);
  return daysSince(l.contacted_at) >= day && f ? { l, f } : null;
}).filter(Boolean);
return { fresh, due };
}

const ROUTES = { A: "A · owner direct", B: "B · business WhatsApp, for the owner", C: "C · Instagram DM to the business" };
const viaSender = (l) => l.route === "B" || (l.route === "A" && l.dm_direct_type === "whatsapp");
const contactLabel = { instagram: "Open Instagram", linkedin: "Open LinkedIn", whatsapp: "Open WhatsApp", phone: "Call the business line" };
const evidence = (l) => [
  ...(l.unanswered_comments || []).map((c) => `Unanswered comment${c.date ? ` (${h(c.date)})` : ""}: "${h(c.quote)}" ${safeUrl(c.link) ? `<a href="${safeUrl(c.link)}" target="_blank" rel="noopener">link</a>` : ""}`),
  ...(l.slow_reply_reviews || []).map((c) => `Review${c.date ? ` (${h(c.date)})` : ""}: "${h(c.quote)}" ${safeUrl(c.link) ? `<a href="${safeUrl(c.link)}" target="_blank" rel="noopener">link</a>` : ""}`),
  ...(l.other_evidence || []).map((c) => `${h(c.fact ?? c)} ${safeUrl(c.link) ? `<a href="${safeUrl(c.link)}" target="_blank" rel="noopener">link</a>` : ""}`),
];
const facts = (l) => [l.google_rating && `${h(l.google_rating)} on Google${l.google_reviews ? `, ${h(l.google_reviews)} reviews` : ""}`, l.branches && `${h(l.branches)} branch(es)`, l.closing_time && `closes ${h(l.closing_time)}`, l.ig_followers && `${h(l.ig_followers)} Instagram followers`, l.meta_ads && `ads: ${h(l.meta_ads)}`, l.area && h(l.area)].filter(Boolean).join(" · ");

const card = (l, i) => {
  const m = msg(l.slug), d = demo(l.slug);
  const audio = d?.generated ? `
    <div class="k">Voice note for ${h(l.dm_name)} (send as a WhatsApp voice note)</div>
    <audio controls preload="none" src="data/${h(d.generated.note_mp3)}"></audio>
    <div class="row"><a class="btn" href="data/${h(d.generated.note_ogg)}" download>Download .ogg</a><a class="btn" href="data/${h(d.generated.note_mp3)}" download>Download .mp3</a></div>
    <div class="k">Sample call (${h(d.generated.call_seconds)}s)</div>
    <audio controls preload="none" src="data/${h(d.generated.call_mp3)}"></audio>
    <div class="row"><a class="btn" href="data/${h(d.generated.call_mp3)}" download>Download call</a>${d.published?.url ? `<a class="btn" href="${safeUrl(d.published.url)}" target="_blank" rel="noopener">Open demo page</a>` : `<span class="unk">Demo page not published yet (needs migration_v44, then demo-publish.mjs)</span>`}</div>` : "";
  const igUrl = l.route === "C" ? safeUrl(l.instagram) : "";
  const open = igUrl ? `<a class="btn p" href="${igUrl}" target="_blank" rel="noopener">Open Instagram</a>` : safeUrl(l.contact_url) ? `<a class="btn p" href="${safeUrl(l.contact_url)}" target="_blank" rel="noopener">${h(contactLabel[l.contact_path] ?? "Open contact")}</a>` : "";
  return `<section class="card">
    <div class="row"><div class="score">${h(l.score)}</div><div class="sp"><h2>${h(l.name)}</h2><div class="unk">${h(l.niche)} · ${facts(l)}</div></div></div>
    <div class="k">Decision maker</div>
    <div class="row"><span class="pill m">${h(ROUTES[l.route] ?? l.route)}</span>${viaSender(l) ? `<span class="unk">Goes out through the WhatsApp sender (npm run sales:send)</span>` : `<span class="unk">Send by hand: Copy, then Open</span>`}</div>
    <div class="row"><strong>${h(l.dm_name || "Owner not found")}</strong>${l.dm_confidence ? `<span class="unk">confidence: ${h(l.dm_confidence)}</span>` : ""}<span class="unk">${h(l.dm_role)}</span>${safeUrl(l.dm_source) ? `<a href="${safeUrl(l.dm_source)}" target="_blank" rel="noopener">source</a>` : ""}</div>
    <div class="unk">Contact path: ${h(l.contact_rank || l.contact_path)}</div>
    <div class="k">Why it fits</div><div>${h(l.why_fits)}</div>
    ${evidence(l).length ? `<div class="k">Evidence</div><ul class="wrap">${evidence(l).map((e) => `<li>${e}</li>`).join("")}</ul>` : ""}
    ${(l.unknowns || []).length ? `<div class="unk">Not verified: ${h((l.unknowns || []).join("; "))}</div>` : ""}
    ${m.notes ? `<div class="pill" style="margin-top:10px">${h(m.notes)}</div>` : ""}
    <div class="k">Message, Arabic</div><div class="msg" dir="rtl" id="ar-${i}">${h(m.first.ar)}</div>
    <div class="row" style="margin-top:6px"><button class="btn" data-copy="ar-${i}">Copy Arabic</button></div>
    <div class="k">Message, English</div><div class="msg" id="en-${i}">${h(m.first.en)}</div>
    <div class="row" style="margin-top:6px"><button class="btn" data-copy="en-${i}">Copy English</button>${open}</div>
    ${audio}
    <div class="unk" style="margin-top:10px">After sending: <code>/sales-log ${h(l.slug)} sent</code></div>
  </section>`;
};
const fu = ({ l, f }, i) => `<section class="card">
  <div class="row"><span class="pill m">Day ${h(f.day)}</span><h2 class="sp">${h(l.name)}</h2>${safeUrl(l.contact_url) ? `<a class="btn" href="${safeUrl(l.contact_url)}" target="_blank" rel="noopener">Open</a>` : ""}</div>
  <div class="unk">${h(l.dm_name)} · adds: ${h(f.adds)}</div>
  <div class="msg" dir="rtl" id="fa-${i}">${h(f.ar)}</div><div class="row" style="margin-top:6px"><button class="btn" data-copy="fa-${i}">Copy Arabic</button></div>
  <div class="msg" id="fe-${i}">${h(f.en)}</div><div class="row" style="margin-top:6px"><button class="btn" data-copy="fe-${i}">Copy English</button></div>
  <div class="unk" style="margin-top:8px">After sending: <code>/sales-log ${h(l.slug)} sent</code></div></section>`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const { fresh, due } = todayLists();
const body = `
  <div class="row"><img src="../public/assets/logo-full.png" alt="Vela" style="height:34px"><span class="sp"></span><span class="pill">${h(today())}</span></div>
  <h1>Today: ${fresh.length} new contact(s), ${due.length} follow-up(s)</h1>
  <p class="sub">Sorted by score, max ${h(cfg.daily_limit)} new a day. You send every message yourself. A "no" stops follow-ups; do-not-contact is permanent.</p>
  ${fresh.length ? fresh.map(card).join("") : `<section class="card">No new contacts ready. Run /sales-run.</section>`}
  ${due.length ? `<h1 style="margin-top:24px">Follow-ups due today</h1>${due.map(fu).join("")}` : ""}
  <p class="sub" style="margin-top:20px">Status: <code>/sales-log &lt;lead&gt; sent|replied|demo-booked|trial|won|lost|do-not-contact</code></p>`;
fs.writeFileSync(path.join(SALES, "today.html"), shell(`Vela sales: ${today()}`, body));
console.log(`sales/today.html: ${fresh.length} new contact(s), ${due.length} follow-up(s) due`);
}
