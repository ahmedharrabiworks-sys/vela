// The writer's guard. Usage: node sales/scripts/unique.mjs [slug]  (exit 1 on any problem)
// First message: max 3 lines and 40 words per language, max 1 emoji, no dashes, nothing that
// sounds researched or salesy (stats, prices, reviews, offers, meetings), Arabic in Arabic script
// (Latin only for "Vela" or the business's own brand). No sentence, opening or closing repeated across leads.
// Follow-ups: days 2, 5 and 9, max 2 lines each, same dash and emoji rules.
import fs from "node:fs";
import path from "node:path";
import { DASHES, DATA, readLeads } from "./lib.mjs";

const dir = path.join(DATA, "messages");
const only = process.argv[2];
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
// The required self-introduction is the same in every message by design.
const REQUIRED = new Set(["oussama here from doha", "معك أسامة من الدوحة"]);
const sentences = (t) => t.split(/(?<=[.!?؟])\s+|\n+/).map(norm).filter((s) => s.split(" ").length >= 4 && !REQUIRED.has(s));
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const lines = (t) => t.trim().split(/\n+/).filter((l) => l.trim()).length;
const emojis = (t) => (t.match(/\p{Extended_Pictographic}/gu) || []).length;
// Message 1 must not sound researched or ask for anything yet.
const BANNED = {
  en: /\b(reviews?|rating|rated|followers?|QAR|riyals?|founding|free trial|trial|discount|offer|demo|meeting|10 minutes|I noticed|I saw that|I came across)\b|\d[\d,.]*\s?(k|%)/i,
  ar: /(تقييم|مراجعات|متابع|ريال|مؤسسين|تجربة مجانية|عرض خاص|خصم|اجتماع|ديمو|لاحظت إن|شفت إنكم نشرتوا)/,
};
const leads = new Map(readLeads().map((l) => [l.slug, l]));
const brandWords = (slug) => new Set(norm(leads.get(slug)?.name || "").split(" ").filter((w) => /^[a-z]+$/.test(w)));

const msgs = files.map((f) => ({ slug: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }));
const problems = [];
const seen = new Map();
for (const m of msgs) {
  const mine = !only || m.slug === only;
  for (const lang of ["en", "ar"]) {
    const text = m.first?.[lang] ?? "";
    if (!text) continue;
    if (mine) {
      if (words(text) > 40) problems.push(`${m.slug} ${lang}: ${words(text)} words (max 40)`);
      if (lines(text) > 3) problems.push(`${m.slug} ${lang}: ${lines(text)} lines (max 3)`);
      if (emojis(text) > 1) problems.push(`${m.slug} ${lang}: ${emojis(text)} emojis (max 1)`);
      if (DASHES.test(text)) problems.push(`${m.slug} ${lang}: contains an em/en dash`);
      const hit = text.match(BANNED[lang]);
      if (hit) problems.push(`${m.slug} ${lang}: "${hit[0]}" does not belong in message 1 (no stats, prices, offers or meeting asks)`);
      if (lang === "ar") {
        const ok = brandWords(m.slug);
        const latin = (text.match(/[A-Za-z]+/g) || []).filter((w) => w !== "Vela" && !ok.has(w.toLowerCase()));
        if (latin.length) problems.push(`${m.slug} ar: Latin words "${latin.join(" ")}" (write them in Arabic script; Latin only for Vela or the brand)`);
      }
      for (const f of m.followups || []) for (const fl of ["ar", "en"]) {
        const t = f[fl] || "";
        if (!t) continue;
        if (lines(t) > 2) problems.push(`${m.slug} day ${f.day} ${fl}: ${lines(t)} lines (max 2)`);
        if (words(t) > 35) problems.push(`${m.slug} day ${f.day} ${fl}: ${words(t)} words (keep it short, max 35)`);
        if (emojis(t) > 1) problems.push(`${m.slug} day ${f.day} ${fl}: more than 1 emoji`);
        if (DASHES.test(t)) problems.push(`${m.slug} day ${f.day} ${fl}: contains an em/en dash`);
      }
    }
    const ss = sentences(text);
    const opening = norm(text).split(" ").slice(0, 4).join(" ");
    const closing = ss[ss.length - 1];
    for (const key of [...ss.map((s) => `s:${s}`), `open:${opening}`, `close:${closing}`]) {
      const other = seen.get(`${lang}|${key}`);
      // With a slug given, a repeat counts whichever of the two files comes first.
      if (other && other !== m.slug && (!only || mine || other === only)) problems.push(`${only && other === only ? other : m.slug} ${lang} repeats ${only && other === only ? m.slug : other}: "${key.slice(key.indexOf(":") + 1).slice(0, 80)}"`);
      else seen.set(`${lang}|${key}`, m.slug);
    }
  }
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`ok: ${msgs.length} message file(s), all within the rules, no repeated sentences, openings or closings`);
