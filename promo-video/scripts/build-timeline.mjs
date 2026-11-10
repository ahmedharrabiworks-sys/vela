// Builds src/timelines/<lang>.json from the chosen voice take: words with
// times, caption chunks (2 to 6 words, never across a sentence end), scene
// cut points anchored on words, and the total length. Cuts land on the voice.
// Usage: node scripts/build-timeline.mjs <en|ar> <take>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT } from "../src/script.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FPS = 30;
const VOICE_OFFSET = 0.2; // the ring hits first, the voice follows
const TAIL = 1.3; // end card keeps holding after the last word

// Where each scene starts: [line index, word that triggers it].
const CUTS = {
  en: { s1: [0, "It's"], s2: [1, "A"], s3: [2, "Every"], s4: [3, "Meet"], s5a: [4, "Vela"], s5b: [4, "It"], s6a: [5, "When"], s6b: [5, "No"], s6c: [5, "Never"], s7a: [6, "You"], s7b: [6, "transcript,"], s7c: [6, "booking."], s7d: [6, "All"], s8a: [7, "We"], s8b: [7, "You"], s8c: [7, "Vela."] },
  ar: { s1: [0, "الساعة"], s2: [1, "مريض"], s3: [2, "كل"], s4: [3, "هذا"], s5a: [4, "يرد"], s5b: [4, "يعرف"], s6a: [5, "ولما"], s6b: [5, "بدون"], s6c: [5, "وما"], s7a: [6, "تشوف"], s7b: [6, "وكل"], s7c: [6, "حجز."], s7d: [6, "كله"], s8a: [7, "واحنا"], s8b: [7, "رقمك"], s8c: [7, "ڤيلا."] },
};

const [lang, take] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "audio", `vo-${lang}-t${take}.json`), "utf8"));
const { characters: ch, character_start_times_seconds: st, character_end_times_seconds: en } = j.alignment;

// Words of the voice text, with times; caption text keeps "Vela" in Latin.
const words = [];
let line = 0, cur = null;
const flush = () => { if (cur) { words.push(cur); cur = null; } };
for (let i = 0; i < ch.length; i++) {
  const c = ch[i];
  if (c === "\n") { flush(); line++; continue; }
  if (/\s/.test(c)) { flush(); continue; }
  if (!cur) cur = { text: "", start: st[i], end: en[i], line };
  cur.text += c; cur.end = en[i];
}
flush();
const captionWords = SCRIPT[lang].flatMap((l, li) => l.split(/\s+/).filter(Boolean).map((w) => ({ w, li })));
if (captionWords.length !== words.length) throw new Error(`word count mismatch ${captionWords.length} vs ${words.length}`);
words.forEach((w, i) => { w.caption = captionWords[i].w; w.start += VOICE_OFFSET; w.end += VOICE_OFFSET; });

// Caption chunks: each sentence is split into the fewest balanced chunks that
// keep every chunk at 5 words / 26 characters or less, so no word is orphaned.
const sentences = [];
let buf = [];
words.forEach((w, i) => {
  buf.push(i);
  const next = words[i + 1];
  if (/[.!?؟…]$/.test(w.caption) || !next || next.line !== w.line) { sentences.push(buf); buf = []; }
});
const chunks = [];
for (const s of sentences) {
  const n = s.length, chars = s.map((k) => words[k].caption).join(" ").length;
  let k = Math.max(Math.ceil(n / 5), Math.ceil(chars / 26));
  if (n / k < 2) k = Math.max(1, Math.floor(n / 2));
  const base = Math.floor(n / k), extra = n % k;
  let at = 0;
  for (let c = 0; c < k; c++) { const size = base + (c < extra ? 1 : 0); chunks.push(s.slice(at, at + size)); at += size; }
}
// A one-word sentence ("Vela.") joins its neighbour on the same line.
for (let i = 0; i < chunks.length; i++) {
  if (chunks[i].length !== 1) continue;
  const nx = chunks[i + 1], pv = chunks[i - 1];
  const same = (a, b) => a && words[a[0]].line === words[b[0]].line;
  if (same(nx, chunks[i]) && nx.length + 1 <= 6) { nx.unshift(...chunks[i]); chunks.splice(i, 1); i--; }
  else if (same(pv, chunks[i]) && pv.length + 1 <= 6) { pv.push(...chunks[i]); chunks.splice(i, 1); i--; }
}
const caption = chunks.map((c, i) => {
  const s = words[c[0]].start, e = words[c[c.length - 1]].end;
  const nextStart = chunks[i + 1] ? words[chunks[i + 1][0]].start : e + 0.6;
  return { text: c.map((k) => words[k].caption).join(" "), words: c, from: Math.round(s * FPS), to: Math.round(Math.min(nextStart, e + 0.6) * FPS), line: words[c[0]].line };
});

const cuts = {};
for (const [name, [li, w]] of Object.entries(CUTS[lang])) {
  const hit = words.find((x) => x.line === li && x.text.replace(/[.,،]/g, "") === w.replace(/[.,،]/g, "") && (!cuts.__after || x.start >= cuts.__after));
  if (!hit) throw new Error(`cut ${name}: word ${w} not found on line ${li}`);
  cuts[name] = Math.round(hit.start * FPS);
}
const lastEnd = words[words.length - 1].end;
const durationInFrames = Math.round((lastEnd + TAIL) * FPS);
const lines = SCRIPT[lang].map((_, li) => {
  const ws = words.filter((w) => w.line === li);
  return { from: Math.round(ws[0].start * FPS), to: Math.round(ws[ws.length - 1].end * FPS) };
});
const out = { lang, take: Number(take), fps: FPS, voiceOffsetFrames: Math.round(VOICE_OFFSET * FPS), durationInFrames, lines, cuts, captions: caption, words: words.map((w) => ({ t: w.caption, from: Math.round(w.start * FPS), to: Math.round(w.end * FPS), line: w.line })) };
fs.mkdirSync(path.join(ROOT, "src", "timelines"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src", "timelines", `${lang}.json`), JSON.stringify(out, null, 1));
console.log(`${lang}: ${(durationInFrames / FPS).toFixed(2)}s, ${caption.length} captions, cuts ${JSON.stringify(cuts)}`);
for (const c of caption) if (c.text.split(" ").length > 6 || c.text.split(" ").length < 1) console.log("  check chunk:", c.text);
console.log("  sample:", caption.slice(0, 6).map((c) => c.text).join(" | "));
