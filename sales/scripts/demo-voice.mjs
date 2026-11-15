// Generates a demo's audio from sales/data/demos/<slug>.json:
// - sample call (about 40 s): ElevenLabs text-to-dialogue, eleven_v3, two
//   voices (a caller and the Vela receptionist voice our agent uses);
// - voice note (about 25 s): Vela introducing itself to the owner by name,
//   exported as .mp3 and as .ogg (Opus) so it sends like a WhatsApp voice note.
// Every request reserves its characters first; the run stops at the budget.
// Usage: node sales/scripts/demo-voice.mjs <slug>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DASHES, DATA, config, env, spendChars, velaVoiceId } from "./lib.mjs";
const VELA = velaVoiceId(); // same voice as the phone agent
import { ffmpegBin } from "./ffmpeg-path.mjs";

const slug = process.argv[2];
const file = path.join(DATA, "demos", `${slug}.json`);
const demo = JSON.parse(fs.readFileSync(file, "utf8"));
const cfg = config();
const KEY = env().ELEVEN_LABS_API_KEY;
if (!KEY) throw new Error("ELEVEN_LABS_API_KEY missing in .env.local");

const call = demo.call ?? [];
const note = demo.voice_note?.text ?? "";
if (!call.length || !note) throw new Error(`${slug}: demo needs "call" lines and "voice_note.text"`);
for (const t of [...call.map((c) => c.text), note]) if (DASHES.test(t)) throw new Error(`${slug}: em/en dash in voice text`);

const out = path.join(DATA, "audio", slug);
fs.mkdirSync(out, { recursive: true });
const ff = ffmpegBin("ffmpeg");

async function eleven(urlPath, body) {
  const res = await fetch(`https://api.elevenlabs.io${urlPath}?output_format=mp3_44100_128`, { method: "POST", headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Sample call: the caller and Vela, one dialogue.
const callChars = call.reduce((n, c) => n + c.text.length, 0);
spendChars(callChars, `${slug} sample call`);
const callMp3 = await eleven("/v1/text-to-dialogue", {
  model_id: "eleven_v3",
  inputs: call.map((c) => ({ text: c.text, voice_id: c.speaker === "vela" ? VELA : cfg.voices.caller })),
});
fs.writeFileSync(path.join(out, "call.mp3"), callMp3);

// Voice note to the owner, in the Vela voice.
spendChars(note.length, `${slug} voice note`);
const noteMp3 = await eleven(`/v1/text-to-speech/${VELA}`, {
  text: note, model_id: "eleven_v3", language_code: "ar",
  voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.95 },
});
fs.writeFileSync(path.join(out, "voice-note.mp3"), noteMp3);
execFileSync(ff, ["-y", "-v", "error", "-i", path.join(out, "voice-note.mp3"), "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "32k", "-application", "voip", path.join(out, "voice-note.ogg")]);

const dur = (f) => Number(execFileSync(ffmpegBin("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
demo.generated = {
  call_mp3: `audio/${slug}/call.mp3`, note_mp3: `audio/${slug}/voice-note.mp3`, note_ogg: `audio/${slug}/voice-note.ogg`,
  call_seconds: Math.round(dur(path.join(out, "call.mp3"))), note_seconds: Math.round(dur(path.join(out, "voice-note.mp3"))),
  chars: callChars + note.length, voices: { vela: VELA, caller: cfg.voices.caller }, model: "eleven_v3", at: new Date().toISOString(),
};
fs.writeFileSync(file, JSON.stringify(demo, null, 1));
console.log(`${slug}: call ${demo.generated.call_seconds}s, voice note ${demo.generated.note_seconds}s, ${demo.generated.chars} characters`);
