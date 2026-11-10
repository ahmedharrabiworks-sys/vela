// Final render: Remotion (H.264, x264 veryfast) then a two-pass loudnorm of
// the mix to -14 LUFS / -1 dBTP (video stream copied untouched).
// Usage: node scripts/render.mjs <en|ar>
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lang = process.argv[2] ?? "en";
const id = lang === "en" ? "VelaEN" : "VelaAR";
const out = path.join(ROOT, "out");
fs.mkdirSync(out, { recursive: true });
const raw = path.join(out, `raw-${lang}.mp4`);
const final = path.join(out, `vela-${lang}.mp4`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

if (!process.argv.includes("--reuse-raw") || !fs.existsSync(raw)) execFileSync(npx, ["remotion", "render", "src/index.ts", id, raw, "--codec=h264", "--x264-preset=veryfast", "--crf=18", "--audio-codec=aac", "--audio-bitrate=192k", "--pixel-format=yuv420p"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });

const ff = ffmpegBin("ffmpeg");
const target = "I=-14:TP=-1:LRA=11";
const measured = spawnSync(ff, ["-hide_banner", "-nostats", "-i", raw, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(measured.slice(measured.lastIndexOf("{"), measured.lastIndexOf("}") + 1));
const second = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync(ff, ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", `${second},alimiter=limit=0.84:level=false`, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final]);
fs.unlinkSync(raw);
console.log(`${final} (input ${m.input_i} LUFS, true peak ${m.input_tp} dBTP)`);
