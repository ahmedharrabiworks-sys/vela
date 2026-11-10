// Voiceover with ElevenLabs, with character timings for cuts and captions.
// Usage: node scripts/tts.mjs <en|ar> <take> [model]
// Reads ELEVEN_LABS_API_KEY from ../.env.local (never printed). Writes
// public/audio/vo-<lang>-t<take>.mp3 + .json (alignment) and appends to
// public/audio/ledger.json so the character budget is tracked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCRIPT, voiceText } from "../src/script.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, "..", ".env.local"), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")]),
);
const KEY = env.ELEVEN_LABS_API_KEY;
if (!KEY) throw new Error("ELEVEN_LABS_API_KEY missing in .env.local");

const [lang, take = "1", model = "eleven_v3"] = process.argv.slice(2);
if (!SCRIPT[lang]) throw new Error("lang must be en or ar");
// The voice the Vela phone agent uses (DEFAULT_VOICE_ID in src/lib/vapi-agent-config.ts).
const VOICE_ID = process.env.VOICE_ID || "QsV9PCczMIklRM6xLPAS";
const MAX_CHARS = 5000;

const AUDIO = path.join(ROOT, "public", "audio");
fs.mkdirSync(AUDIO, { recursive: true });
const ledgerPath = path.join(AUDIO, "ledger.json");
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : [];
const text = voiceText(lang);
const used = ledger.reduce((n, e) => n + e.chars, 0);
const takes = ledger.filter((e) => e.lang === lang).length;
if (takes >= 3) throw new Error(`budget: already ${takes} takes for ${lang}`);
if (used + text.length > MAX_CHARS) throw new Error(`budget: ${used} + ${text.length} > ${MAX_CHARS}`);

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    text,
    model_id: model,
    language_code: lang,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.9 },
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("ElevenLabs error", res.status, JSON.stringify(body).slice(0, 400));
  process.exit(1);
}
const base = path.join(AUDIO, `vo-${lang}-t${take}`);
fs.writeFileSync(`${base}.mp3`, Buffer.from(body.audio_base64, "base64"));
fs.writeFileSync(`${base}.json`, JSON.stringify({ model, voiceId: VOICE_ID, text, alignment: body.alignment ?? null, normalized: body.normalized_alignment ?? null }, null, 1));
ledger.push({ lang, take, model, chars: text.length, at: new Date().toISOString() });
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1));
console.log(`ok ${lang} take ${take} (${model}): ${text.length} chars; total used ${used + text.length}/${MAX_CHARS}`);
