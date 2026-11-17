// The writer's self-check. Usage: node sales/scripts/unique.mjs [slug]  (exit 1 on any problem)
// Message 1: 2 or 3 lines, about 25 words (max 30), exactly ONE question and nothing after it
// that answers it, a last line that points to what follows without asking permission, no
// competitors, losses, fear, product explanation, price, trial or meeting, no Latin letters in
// Arabic except "Vela", max 1 emoji, no dashes, an angle_key from the A/B set.
// Follow-ups: days 3, 7, 12; 1 to 2 lines; day 3 one question on another angle.
// Across leads: no repeated sentence, opening or closing.
import fs from "node:fs";
import path from "node:path";
import { ANGLES, DASHES, DATA } from "./lib.mjs";

const dir = path.join(DATA, "messages");
const only = process.argv[2];
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const sentences = (t) => t.split(/(?<=[.!?؟])\s+|\n+/).map(norm).filter((s) => s.split(" ").length >= 4);
const words = (t) => t.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const lines = (t) => t.trim().split(/\n+/).filter((l) => l.trim());
const emojis = (t) => (t.match(/\p{Extended_Pictographic}/gu) || []).length;
const questions = (t) => (t.match(/[?؟]/g) || []).length;

// No self-introduction anywhere (message or follow-up): the voice note and the video speak for Vela.
const INTRO = /\b(Oussama|Ahmed Harrabi|my name is|this is [A-Z][a-z]+ from|from Doha)\b|أسامة|اسمي|معك [^\s،.]+ من|أنا [^\s،.]+ من الدوحة|من الدوحة/i;
const RULES = {
  en: [
    [/\b(competitors?|down the street|other clinics?|lose|losing|lost|loss|missed (customers|patients|business)|cost you|leaving money)\b/i, "competitors, losses or fear"],
    [/\b(can i|may i|could i|would you like|do you mind|mind if|shall i|is it ok|okay if)\b/i, "asks permission"],
    [/\b(AI|receptionist|answers? (every|your|all)|books? (the|appointments?)|24\/7|around the clock|assistant)\b/i, "explains the product (the voice note does that)"],
    [/\b(QAR|riyals?|price|free|trial|discount|offer|demo|meeting|call me|10 minutes)\b/i, "price, trial or meeting in message 1"],
    [/\b(reviews?|rating|followers?|I noticed|I saw that|I came across)\b|\d+\s?%/i, "sounds researched"],
  ],
  ar: [
    [/(منافس|العيادة اللي جنب|تخسر|خسارة|يضيع عليك|راح عليك|فاتكم|تفوتكم زباين)/, "competitors, losses or fear"],
    [/(تسمح لي|تسمحون لي|ممكن أرسل|عادي أرسل|تبي أرسل|تبون أرسل|أقدر أرسل|إذا ما عندك مانع|ودك أرسل)/, "asks permission"],
    [/(ذكاء اصطناعي|موظفة? استقبال|ترد على كل|يرد على كل|تحجز|يحجز|٢٤ ساعة|24 ساعة|على مدار الساعة)/, "explains the product (the voice note does that)"],
    [/(ريال|سعر|مجان|تجربة|خصم|عرض|اجتماع|ديمو|10 دقايق|عشر دقايق)/, "price, trial or meeting in message 1"],
    [/(تقييم|مراجعات|متابع|لاحظت إن|شفت إنكم)/, "sounds researched"],
  ],
};

const msgs = files.map((f) => ({ slug: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }));
const problems = [];
const seen = new Map();
for (const m of msgs) {
  const mine = !only || m.slug === only;
  if (mine && !ANGLES.includes(m.angle_key)) problems.push(`${m.slug}: angle_key "${m.angle_key ?? ""}" is not one of ${ANGLES.join(", ")} (run node sales/scripts/angle.mjs ${m.slug})`);
  for (const lang of ["en", "ar"]) {
    const text = m.first?.[lang] ?? "";
    if (!text) continue;
    if (mine) {
      const ls = lines(text);
      if (ls.length < 2 || ls.length > 3) problems.push(`${m.slug} ${lang}: ${ls.length} lines (2 or 3)`);
      if (words(text) > 30) problems.push(`${m.slug} ${lang}: ${words(text)} words (about 25, max 30)`);
      if (questions(text) !== 1) problems.push(`${m.slug} ${lang}: ${questions(text)} questions (exactly one)`);
      // Nothing after the question line may answer it: the only line after it is the pointer to the voice note.
      const qi = ls.findIndex((l) => /[?؟]/.test(l));
      if (qi >= 0 && ls.length - qi > 2) problems.push(`${m.slug} ${lang}: more than one line after the question`);
      if (qi >= 0 && ls[qi].replace(/^.*[?؟]/, "").trim().length > 2) problems.push(`${m.slug} ${lang}: text after the question mark (answering it?)`);
      if (qi >= 0 && qi === ls.length - 1) problems.push(`${m.slug} ${lang}: the last line must point to the voice note, not be the question`);
      if (!/👇|⬇️/.test(ls[ls.length - 1] || "")) problems.push(`${m.slug} ${lang}: the last line should point to what follows (👇)`);
      if (emojis(text) > 1) problems.push(`${m.slug} ${lang}: ${emojis(text)} emojis (max 1)`);
      if (DASHES.test(text)) problems.push(`${m.slug} ${lang}: contains an em/en dash`);
      if (INTRO.test(text)) problems.push(`${m.slug} ${lang}: self-introduction "${text.match(INTRO)[0]}" (no intro, ever)`);
      for (const [re, why] of RULES[lang]) { const hit = text.match(re); if (hit) problems.push(`${m.slug} ${lang}: "${hit[0]}" (${why})`); }
      if (lang === "ar") {
        const latin = (text.match(/[A-Za-z]+/g) || []).filter((w) => w !== "Vela");
        if (latin.length) problems.push(`${m.slug} ar: Latin letters "${latin.join(" ")}" (Arabic script only, except Vela)`);
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
  if (!mine) continue;
  const days = (m.followups || []).map((f) => f.day).join(",");
  if (days !== "3,7,12") problems.push(`${m.slug}: follow-ups must be days 3, 7, 12 (has ${days || "none"})`);
  for (const f of m.followups || []) for (const fl of ["ar", "en"]) {
    const t = f[fl] || "";
    if (t && INTRO.test(t)) problems.push(`${m.slug} day ${f.day} ${fl}: self-introduction "${t.match(INTRO)[0]}"`);
    if (!t) { problems.push(`${m.slug} day ${f.day} ${fl}: missing`); continue; }
    if (lines(t).length > 2) problems.push(`${m.slug} day ${f.day} ${fl}: ${lines(t).length} lines (max 2)`);
    if (words(t) > 30) problems.push(`${m.slug} day ${f.day} ${fl}: ${words(t)} words (keep it short)`);
    if (emojis(t) > 1) problems.push(`${m.slug} day ${f.day} ${fl}: more than 1 emoji`);
    if (DASHES.test(t)) problems.push(`${m.slug} day ${f.day} ${fl}: contains an em/en dash`);
    if (fl === "ar") { const latin = (t.match(/[A-Za-z]+/g) || []).filter((w) => w !== "Vela"); if (latin.length) problems.push(`${m.slug} day ${f.day} ar: Latin letters "${latin.join(" ")}"`); }
    if (/(voice note|video|التسجيل|الفيديو|الريكورد)/i.test(t)) problems.push(`${m.slug} day ${f.day} ${fl}: mentions the media again`);
    if (f.day === 3) {
      if (questions(t) !== 1) problems.push(`${m.slug} day 3 ${fl}: must be one question`);
      if (!ANGLES.includes(f.angle_key) || f.angle_key === m.angle_key) problems.push(`${m.slug} day 3: angle_key must be a different angle than message 1`);
    }
    if (/\b(competitors?|lose|losing|lost)\b|منافس|تخسر|خسارة/i.test(t)) problems.push(`${m.slug} day ${f.day} ${fl}: competitors or losses`);
  }
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`ok: ${msgs.length} message file(s), all within the rules, no repeated sentences, openings or closings`);
