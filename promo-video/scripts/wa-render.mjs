// Renders the WhatsApp video: Remotion (high quality intermediate), then one ffmpeg pass that
// normalizes the mix to -14 LUFS / -1 dBTP and encodes for WhatsApp inline playback:
// H.264 High@4.0, yuv420p, 30 fps, AAC 48 kHz, faststart, under 8 MB (steps CRF up if needed).
// Usage: node scripts/wa-render.mjs <en|ar> [--reuse-raw]
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lang = process.argv[2];
if (!["en", "ar"].includes(lang)) { console.error("usage: wa-render.mjs <en|ar>"); process.exit(1); }
const id = lang === "en" ? "VelaWAEN" : "VelaWAAR";
const OUT = path.join(ROOT, "out");
fs.mkdirSync(OUT, { recursive: true });
const raw = path.join(OUT, `wa-raw-${lang}.mp4`), final = path.join(OUT, `vela-wa-${lang}.mp4`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
if (!process.argv.includes("--reuse-raw") || !fs.existsSync(raw))
  execFileSync(npx, ["remotion", "render", "src/index.ts", id, raw, "--codec=h264", "--crf=14", "--x264-preset=medium", "--audio-codec=aac", "--audio-bitrate=256k", "--pixel-format=yuv420p", "--concurrency=6"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });

const ff = ffmpegBin("ffmpeg");
const target = "I=-14:TP=-1:LRA=11";
const err = spawnSync(ff, ["-hide_banner", "-nostats", "-i", raw, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1));
const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,alimiter=limit=0.84:level=false`;
const LIMIT = 8 * 1024 * 1024 * 0.97;
for (const crf of [21, 23, 25, 27]) {
  execFileSync(ff, ["-y", "-hide_banner", "-loglevel", "error", "-i", raw,
    "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-maxrate", "2600k", "-bufsize", "5200k", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-r", "30",
    "-af", af, "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", final]);
  const size = fs.statSync(final).size;
  console.log(`${path.basename(final)}: CRF ${crf}, ${(size / 1048576).toFixed(2)} MB`);
  if (size <= LIMIT) break;
}
console.log(`loudness in ${m.input_i} LUFS, true peak ${m.input_tp} dBTP -> normalized to -14 LUFS`);
