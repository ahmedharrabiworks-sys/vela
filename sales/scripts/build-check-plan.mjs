// Writes sales/check-plan.html: today's leads with their closing time, the
// best moment to check (30 to 60 minutes after closing), and a natural
// booking question in Arabic to send by hand to their PUBLIC WhatsApp or
// Instagram. Log the result with /sales-check <lead> <sent-time> [reply-time|none].
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA, SALES, config, readLeads, today } from "./lib.mjs";
import { h, safeUrl, shell } from "./page.mjs";

const cfg = config();
const checksFile = path.join(DATA, "checks.json");
const checks = fs.existsSync(checksFile) ? JSON.parse(fs.readFileSync(checksFile, "utf8")) : {};
const toMin = (t) => { const m = String(t).match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const fmt = (m) => { const x = ((m % 1440) + 1440) % 1440, hh = Math.floor(x / 60), mm = x % 60; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "am" : "pm"}`; };

// A few natural questions per niche; each lead gets one (stable per slug).
const Q = {
  dental: ["السلام عليكم، أبي أحجز موعد تنظيف أسنان بكرة الصبح، عندكم وقت؟", "مرحبا، كم سعر التبييض عندكم؟ وأقرب موعد متى؟", "هلا، عندي ألم في ضرسي، أقدر أحجز موعد بكرة؟"],
  derm: ["مرحبا، كم سعر جلسة الليزر عندكم؟ وفيه موعد هالأسبوع؟", "السلام عليكم، أبي أحجز استشارة جلدية، متى أقرب موعد؟", "هلا، كم سعر جلسة تنظيف البشرة؟ وأقدر أحجز الخميس؟"],
  salon: ["هلا، أبي أحجز موعد سشوار وصبغة يوم الخميس العصر، متاح؟", "مرحبا، كم سعر الباديكير والمناكير؟ وأقدر أحجز بكرة؟", "السلام عليكم، عندكم موعد للمكياج يوم الجمعة المغرب؟"],
};
const nicheKey = (n) => (/dent|orth/i.test(n) ? "dental" : /salon|spa|beauty|hair|nail/i.test(n) ? "salon" : "derm");
const pick = (slug, list) => list[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % list.length];

export function checkPlanRows() {
  const checks = fs.existsSync(checksFile) ? JSON.parse(fs.readFileSync(checksFile, "utf8")) : {};
  return readLeads()
  .filter((l) => ["new", "sent"].includes(l.status) && l.closing_time && toMin(l.closing_time) !== null && !checks[l.slug])
  .filter((l) => l.whatsapp_public || l.instagram)
  .sort((a, b) => Number(b.score) - Number(a.score))
  .slice(0, Number(cfg.daily_limit) || 15)
  .map((l) => ({ l, close: toMin(l.closing_time) }))
  .sort((a, b) => a.close - b.close)
  .map((r) => ({ ...r, question: pick(r.l.slug, Q[nicheKey(r.l.niche)]), from: fmt(r.close + 30), to: fmt(r.close + 60), closes: fmt(r.close) }));
}

const card = ({ l, close }, i) => {
  const q = pick(l.slug, Q[nicheKey(l.niche)]);
  const wa = String(l.whatsapp_public || "").replace(/\D/g, "");
  return `<section class="card">
    <div class="row"><h2 class="sp">${h(l.name)}</h2><span class="pill">closes ${h(fmt(close))}</span></div>
    <div class="row" style="margin-top:6px"><span class="pill g">Check between ${h(fmt(close + 30))} and ${h(fmt(close + 60))}</span><span class="unk">score ${h(l.score)}</span></div>
    <div class="k">Question to send (copy)</div>
    <div class="msg" dir="rtl" id="q-${i}">${h(q)}</div>
    <div class="row" style="margin-top:6px"><button class="btn" data-copy="q-${i}">Copy question</button>
      ${wa.length >= 8 ? `<a class="btn p" href="https://wa.me/${h(wa)}" target="_blank" rel="noopener">Open their WhatsApp</a>` : ""}
      ${safeUrl(l.instagram) ? `<a class="btn" href="${safeUrl(l.instagram)}" target="_blank" rel="noopener">Open their Instagram</a>` : ""}</div>
    <div class="unk" style="margin-top:8px">Then log it: <code>/sales-check ${h(l.slug)} HH:MM [HH:MM|none]</code></div>
  </section>`;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const rows = checkPlanRows();
const body = `
  <div class="row"><img src="../public/assets/logo-full.png" alt="Vela" style="height:34px"><span class="sp"></span><span class="pill">${h(today())}</span></div>
  <h1>After-hours check: ${rows.length} business(es)</h1>
  <p class="sub">Send one natural booking question by hand, 30 to 60 minutes after they close, on the WhatsApp or Instagram they publish. Note the time you sent it and when (or if) they answer. Only public contact points; one message, no follow-up chasing.</p>
  ${rows.length ? rows.map(card).join("") : `<section class="card">No leads with a known closing time and a public WhatsApp or Instagram yet.</section>`}`;
fs.writeFileSync(path.join(SALES, "check-plan.html"), shell(`Vela after-hours check: ${today()}`, body));
console.log(`sales/check-plan.html: ${rows.length} business(es) to check`);
}
