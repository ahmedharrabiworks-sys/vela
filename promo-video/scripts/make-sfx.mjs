// Synthesizes the few subtle sound effects with ffmpeg: no third-party
// samples, nothing to license. Writes public/audio/sfx/*.wav (48 kHz stereo).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "public", "audio", "sfx");
fs.mkdirSync(OUT, { recursive: true });
const ff = ffmpegBin("ffmpeg");

const SFX = {
  // Phone ring: two bursts of a 400 + 450 Hz pair with a 20 Hz warble.
  ring: ["-f", "lavfi", "-i", "aevalsrc='0.22*(sin(2*PI*400*t)+sin(2*PI*450*t))*(0.55+0.45*sin(2*PI*20*t))*(between(t,0,0.42)+between(t,0.62,1.04))':s=48000:d=1.25", "-af", "afade=t=in:d=0.01,afade=t=out:st=1.0:d=0.2"],
  // Notification: a soft two-partial chime with a quick decay.
  ping: ["-f", "lavfi", "-i", "aevalsrc='0.35*(sin(2*PI*1568*t)+0.5*sin(2*PI*2349*t))*exp(-7*t)':s=48000:d=0.7", "-af", "afade=t=in:d=0.004"],
  // Whoosh: band-limited pink noise with a swell and release.
  whoosh: ["-f", "lavfi", "-i", "anoisesrc=d=0.55:c=pink:a=0.6:r=48000", "-af", "highpass=f=500,lowpass=f=5200,afade=t=in:curve=qsin:d=0.28,afade=t=out:curve=qsin:st=0.28:d=0.27,volume=0.5"],
  // Thump: a falling low sine for landings (logo, booking card).
  thump: ["-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*(78-40*t)*t)*exp(-10*t)':s=48000:d=0.5", "-af", "afade=t=in:d=0.003"],
  // Tick: a soft short click for transcript bubbles.
  tick: ["-f", "lavfi", "-i", "aevalsrc='0.25*sin(2*PI*1900*t)*exp(-70*t)':s=48000:d=0.09", "-af", "afade=t=in:d=0.002"],
};
for (const [name, args] of Object.entries(SFX)) {
  execFileSync(ff, ["-y", "-hide_banner", "-loglevel", "error", ...args, "-ac", "2", "-ar", "48000", path.join(OUT, `${name}.wav`)]);
  console.log("sfx", name);
}
