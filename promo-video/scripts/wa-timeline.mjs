// Builds src/wa/timeline-<lang>.json from the voiceover timings:
//  - each sentence is cut out of the take and placed at its storyboard time (LINE_AT),
//    never before the previous one ends plus a breath;
//  - words with absolute frames (scene cues land on them);
//  - caption chunks of 2 to 5 words, never across a sentence;
//  - the total length (end card holds END_HOLD s after the last word, 22.5 to 25 s).
// Usage: node scripts/wa-timeline.mjs <en|ar>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { END_HOLD, LINE_AT, MAX_TOTAL, MIN_TOTAL, WA_SCRIPT } from "../src/wa/script.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FPS = 30, BREATH = 0.2, PAD_IN = 0.06, PAD_OUT = 0.12;
const lang = process.argv[2];
const j = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "audio", "wa", `vo-${lang}.json`), "utf8"));
const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = j.alignment;

// Words per line from the alignment ("\n" separates lines).
const lines = [[]];
let cur = null;
const flush = () => { if (cur) { lines[lines.length - 1].push(cur); cur = null; } };
for (let i = 0; i < ch.length; i++) {
  const c = ch[i];
  if (c === "\n") { flush(); lines.push([]); continue; }
  if (/\s/.test(c)) { flush(); continue; }
  if (!cur) cur = { t: "", s: st[i], e: en[i] };
  cur.t += c; cur.e = en[i];
}
flush();
if (lines.length !== WA_SCRIPT[lang].length) throw new Error(`line count ${lines.length} vs ${WA_SCRIPT[lang].length}`);

// Caption words come from the script (shows "Vela"), matched one to one.
const clips = [], words = [], captions = [];
let prevEnd = 0;
lines.forEach((ws, li) => {
  const cap = WA_SCRIPT[lang][li].split(/\s+/).filter(Boolean);
  if (cap.length !== ws.length) throw new Error(`line ${li}: ${cap.length} script words vs ${ws.length} spoken`);
  const srcFrom = Math.max(0, ws[0].s - PAD_IN), srcTo = ws[ws.length - 1].e + PAD_OUT;
  const at = Math.max(LINE_AT[li], prevEnd + BREATH);
  const shift = at - srcFrom;
  clips.push({ line: li, from: Math.round(at * FPS), srcFrom: Math.round(srcFrom * FPS), srcTo: Math.round(srcTo * FPS) });
  const first = words.length;
  ws.forEach((w, wi) => words.push({ line: li, t: cap[wi], spoken: w.t, from: Math.round((w.s + shift) * FPS), to: Math.round((w.e + shift) * FPS) }));
  prevEnd = srcTo + shift;
  // Chunks of 2 to 5 words: break after punctuation, or at 4 words.
  let chunk = [];
  const push = () => { if (!chunk.length) return; captions.push({ line: li, words: chunk, from: words[chunk[0]].from, to: words[chunk[chunk.length - 1]].to }); chunk = []; };
  for (let k = 0; k < ws.length; k++) {
    chunk.push(first + k);
    const left = ws.length - k - 1;
    if ((/[.,،!?؟]$/.test(cap[k]) && chunk.length >= 2 && left !== 1) || (chunk.length >= 4 && left !== 1) || chunk.length === 5) push();
  }
  push();
});
// A caption stays up until the next one starts (no flicker), at most 0.4 s past its last word.
captions.forEach((c, i) => { const next = captions[i + 1]; c.to = Math.min(next ? next.from : c.to + 12, c.to + 12); });
let total = prevEnd + END_HOLD;
total = Math.min(MAX_TOTAL, Math.max(MIN_TOTAL, total));
if (prevEnd + 2.5 > total) throw new Error(`end card hold too short: last word ${prevEnd.toFixed(2)} s, total ${total} s`);
const out = { lang, fps: FPS, voice: j.voiceName, durationInFrames: Math.round(total * FPS), clips, words, captions };
fs.writeFileSync(path.join(ROOT, "src", "wa", `timeline-${lang}.json`), JSON.stringify(out, null, 1));
console.log(`${lang}: ${total.toFixed(2)} s, ${words.length} words, ${captions.length} captions; lines at ${clips.map((c) => (c.from / FPS).toFixed(2)).join(", ")}`);
