// One voice note per niche per language (about 25 s): Vela introducing itself
// and what it does for that niche, in the SAME voice as the phone agent
// (DEFAULT_VOICE_ID in src/lib/vapi-agent-config.ts). Made once, reused for
// every lead in the niche. Text comes from sales/data/niche-notes/<niche>.json:
//   { "niche": "dental", "ar": { "text": "..." }, "en": { "text": "..." } }
// Usage: node sales/scripts/niche-voice.mjs <niche>      (skips what exists)
//        node sales/scripts/niche-voice.mjs --list       (which niches have notes)
// Every request reserves its characters first; stops at the weekly cap.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DASHES, DATA, config, env, spendChars, velaVoiceId, weekChars } from "./lib.mjs";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const NOTES = path.join(DATA, "niche-notes");
const OUT = path.join(DATA, "audio", "niche");
export const nicheAudio = (niche, lang) => ({ mp3: path.join(OUT, `${niche}-${lang}.mp3`), ogg: path.join(OUT, `${niche}-${lang}.ogg`) });

const arg = process.argv[2];
if (arg === "--list") {
  for (const n of config().hunt.niches) {
    const has = (l) => fs.existsSync(nicheAudio(n, l).ogg) ? "ready" : fs.existsSync(path.join(NOTES, `${n}.json`)) ? "text only" : "missing";
    console.log(`${n}: ar ${has("ar")}, en ${has("en")}`);
  }
  console.log(`ElevenLabs this week: ${weekChars()} of ${config().budget.elevenlabs_chars_per_week} characters`);
  process.exit(0);
}
if (!arg || !/^[a-z0-9-]+$/.test(arg)) { console.error("usage: niche-voice.mjs <niche> | --list"); process.exit(1); }

const file = path.join(NOTES, `${arg}.json`);
if (!fs.existsSync(file)) { console.error(`${file} not found: write the note text first`); process.exit(1); }
const note = JSON.parse(fs.readFileSync(file, "utf8"));
const KEY = env().ELEVEN_LABS_API_KEY;
if (!KEY) { console.error("ELEVEN_LABS_API_KEY missing in .env.local"); process.exit(1); }
const VOICE = velaVoiceId();
fs.mkdirSync(OUT, { recursive: true });

for (const lang of ["ar", "en"]) {
  const text = String(note[lang]?.text ?? "").trim();
  const out = nicheAudio(arg, lang);
  if (fs.existsSync(out.ogg)) { console.log(`${arg} ${lang}: already made, reused`); continue; }
  if (!text) { console.log(`${arg} ${lang}: no text, skipped`); continue; }
  if (DASHES.test(text)) { console.error(`${arg} ${lang}: em/en dash in the text`); process.exit(1); }
  if (text.length > 600) { console.error(`${arg} ${lang}: ${text.length} characters, keep it near 25 seconds (under 600)`); process.exit(1); }
  try { spendChars(text.length, `niche note ${arg} ${lang}`); }
  catch (e) { console.log(`STOPPED: ${e.message}`); process.exit(0); }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_v3", language_code: lang, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.95 } }),
  });
  if (!res.ok) { console.error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`); process.exit(1); }
  fs.writeFileSync(out.mp3, Buffer.from(await res.arrayBuffer()));
  execFileSync(ffmpegBin("ffmpeg"), ["-y", "-v", "error", "-i", out.mp3, "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "32k", "-application", "voip", out.ogg]);
  const secs = Number(execFileSync(ffmpegBin("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out.mp3]).toString().trim());
  note[lang].seconds = Math.round(secs); note[lang].voice = VOICE; note[lang].made_at = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(note, null, 1));
  console.log(`${arg} ${lang}: ${Math.round(secs)} s, ${text.length} characters`);
}
