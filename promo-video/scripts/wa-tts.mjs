// Voiceover for the WhatsApp video, with character timings for cuts and captions.
// Usage: node scripts/wa-tts.mjs <en|ar>
// Voices come from the Vela agent config, never guessed:
//   en: Mateo (the phone agent and website voice), ar: Heba (DEFAULT_VOICE_ID, female Gulf, Vela is "موظفة").
// Override with WA_VOICE_EN / WA_VOICE_AR (a name from the VOICES list). eleven_v3, speed 1.08.
// Characters are reserved against the shared weekly ElevenLabs cap (sales/data/usage.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, spendChars, velaVoiceId, voiceIdByName } from "../../sales/scripts/lib.mjs";
import { voiceText } from "../src/wa/script.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lang = process.argv[2];
if (!["en", "ar"].includes(lang)) { console.error("usage: wa-tts.mjs <en|ar>"); process.exit(1); }
const KEY = env().ELEVEN_LABS_API_KEY;
if (!KEY) { console.error("ELEVEN_LABS_API_KEY missing in .env.local"); process.exit(1); }
const name = lang === "en" ? process.env.WA_VOICE_EN || "Mateo" : process.env.WA_VOICE_AR || "";
const VOICE = name ? voiceIdByName(name) : velaVoiceId();
const text = voiceText(lang);

spendChars(text.length, `wa video voiceover ${lang} (${name || "Heba"})`);
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text, model_id: "eleven_v3", language_code: lang, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.08 } }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error("ElevenLabs", res.status, JSON.stringify(body).slice(0, 300)); process.exit(1); }
const dir = path.join(ROOT, "public", "audio", "wa");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `vo-${lang}.mp3`), Buffer.from(body.audio_base64, "base64"));
fs.writeFileSync(path.join(dir, `vo-${lang}.json`), JSON.stringify({ voice: VOICE, voiceName: name || "Heba", text, alignment: body.alignment ?? body.normalized_alignment }, null, 1));
console.log(`${lang}: ${text.length} characters, voice ${name || "Heba"} (${VOICE})`);
