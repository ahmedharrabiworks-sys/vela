// The writer's guard: no sentence, opening or closing line may repeat across
// leads. Usage: node sales/scripts/unique.mjs [slug]  (exit 1 on any repeat)
// Also rejects em/en dashes, more than one emoji and messages over 70 words.
import fs from "node:fs";
import path from "node:path";
import { DASHES, DATA } from "./lib.mjs";

const dir = path.join(DATA, "messages");
const only = process.argv[2];
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const sentences = (t) => t.split(/(?<=[.!?؟])\s+|\n+/).map(norm).filter((s) => s.split(" ").length >= 4);
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const emojis = (t) => (t.match(/\p{Extended_Pictographic}/gu) || []).length;

const msgs = files.map((f) => ({ slug: f.replace(/\.json$/, ""), ...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }));
const problems = [];
const seen = new Map();
for (const m of msgs) {
  for (const lang of ["en", "ar"]) {
    const text = m.first?.[lang] ?? "";
    if (!text) continue;
    const mine = !only || m.slug === only;
    if (mine) {
      if (words(text) > 70) problems.push(`${m.slug} ${lang}: ${words(text)} words (max 70)`);
      if (emojis(text) > 1) problems.push(`${m.slug} ${lang}: ${emojis(text)} emojis (max 1)`);
      if (DASHES.test(text)) problems.push(`${m.slug} ${lang}: contains an em/en dash`);
    }
    const ss = sentences(text);
    const opening = norm(text).split(" ").slice(0, 4).join(" ");
    const closing = ss[ss.length - 1];
    for (const key of [...ss.map((s) => `s:${s}`), `open:${opening}`, `close:${closing}`]) {
      const other = seen.get(`${lang}|${key}`);
      if (other && other !== m.slug && (mine || !only)) problems.push(`${m.slug} ${lang} repeats ${other}: "${key.slice(key.indexOf(":") + 1).slice(0, 80)}"`);
      else seen.set(`${lang}|${key}`, m.slug);
    }
  }
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`ok: ${msgs.length} message file(s), no repeated sentences, openings or closings`);
