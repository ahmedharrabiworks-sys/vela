// Per-line timing from ElevenLabs character alignment, plus glitch indicators.
// Usage: node scripts/analyze-vo.mjs <en|ar> <take>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function lineTimings(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const a = j.alignment;
  const chars = a.characters, st = a.character_start_times_seconds, en = a.character_end_times_seconds;
  const lines = [];
  let cur = { text: "", start: null, end: null, longest: 0 };
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "\n") { lines.push(cur); cur = { text: "", start: null, end: null, longest: 0 }; continue; }
    if (cur.start === null && chars[i].trim()) cur.start = st[i];
    if (chars[i].trim()) cur.end = en[i];
    cur.text += chars[i];
    if (chars[i].trim()) cur.longest = Math.max(cur.longest, en[i] - st[i]);
  }
  lines.push(cur);
  return { lines, total: en[en.length - 1], chars, st, en };
}

if (process.argv[1] && process.argv[1].endsWith("analyze-vo.mjs")) {
  const [lang, take] = process.argv.slice(2);
  const { lines, total } = lineTimings(path.join(ROOT, "public", "audio", `vo-${lang}-t${take}.json`));
  let prevEnd = 0;
  lines.forEach((l, i) => {
    const gap = l.start - prevEnd;
    console.log(`${i + 1}. ${l.start.toFixed(2)}s to ${l.end.toFixed(2)}s (${(l.end - l.start).toFixed(2)}s, gap ${gap.toFixed(2)}s, longest char ${l.longest.toFixed(2)}s) ${l.text.slice(0, 50)}`);
    prevEnd = l.end;
  });
  const wps = lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0) / lines.reduce((n, l) => n + (l.end - l.start), 0);
  console.log(`total ${total.toFixed(2)}s, ${wps.toFixed(2)} words/s speaking`);
}
