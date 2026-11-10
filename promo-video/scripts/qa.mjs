// QA on the final MP4: probe, loudness, one frame per scene (contact sheet),
// a safe-zone sheet, and the cover frame. Usage: node scripts/qa.mjs <en|ar>
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lang = process.argv[2] ?? "en";
const ff = ffmpegBin("ffmpeg"), fp = ffmpegBin("ffprobe");
const video = path.join(ROOT, "out", `vela-${lang}.mp4`);
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "timelines", `${lang}.json`), "utf8"));
const k = tl.cuts;

const probe = JSON.parse(execFileSync(fp, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels", "-of", "json", video]).toString());
const v = probe.streams.find((s) => s.codec_type === "video"), a = probe.streams.find((s) => s.codec_type === "audio");
const dur = Number(probe.format.duration);
const loud = spawnSync(ff, ["-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const I = Number((loud.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
const peak = Number((loud.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);

const checks = [
  ["duration 45 to 60 s", dur >= 45 && dur <= 60, `${dur.toFixed(2)} s`],
  ["1080x1920", v.width === 1080 && v.height === 1920, `${v.width}x${v.height}`],
  ["30 fps", v.r_frame_rate === "30/1", v.r_frame_rate],
  ["H.264", v.codec_name === "h264", v.codec_name],
  ["audio present (AAC)", !!a && a.codec_name === "aac", a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : "none"],
  ["loudness about -14 LUFS", Math.abs(I + 14) <= 1, `${I} LUFS`],
  ["true peak at most -1 dB (+0.2 tolerance)", peak <= -0.8, `${peak} dBFS`],
];

// One frame per scene, taken from the final file.
const scenes = [
  ["01 night", 45], ["02 missed", k.s2 + 75], ["03 rival", k.s3 - 20], ["04 cost", k.s3 + 90], ["05 brand", k.s4 + 60],
  ["06 live", k.s5a + 50], ["07 transcript", k.s6a - 6], ["08 booking", k.s6a + 70], ["09 week", k.s6b + 30], ["10 closed", k.s6c + 40],
  ["11 overview", k.s7a + 25], ["12 inbox", k.s7b + 20], ["13 dashboard", k.s7c + 15], ["14 together", k.s7d + 40], ["15 number", k.s8b + 30], ["16 end", tl.durationInFrames - 8],
];
const dir = path.join(ROOT, "out", `scenes-${lang}`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const files = scenes.map(([name, frame], i) => {
  const file = path.join(dir, `${String(i).padStart(2, "0")}.png`);
  execFileSync(ff, ["-v", "error", "-y", "-ss", (frame / 30).toFixed(3), "-i", video, "-frames:v", "1", file]);
  return { name, frame, file };
});
const sheet = (out, shade) => {
  const tmp = path.join(dir, shade ? "shaded" : "plain");
  fs.mkdirSync(tmp, { recursive: true });
  const zone = "drawbox=x=0:y=0:w=1080:h=220:color=red@0.25:t=fill,drawbox=x=0:y=1500:w=1080:h=420:color=red@0.25:t=fill,drawbox=x=940:y=0:w=140:h=1920:color=red@0.25:t=fill,";
  files.forEach((f, i) => execFileSync(ff, ["-v", "error", "-y", "-i", f.file, "-vf", `${shade ? zone : ""}scale=270:480,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${f.name}  f${f.frame}':x=8:y=8:fontsize=17:fontcolor=white:box=1:boxcolor=black@0.6`, path.join(tmp, `${String(i).padStart(2, "0")}.png`)]));
  execFileSync(ff, ["-v", "error", "-y", "-framerate", "1", "-i", path.join(tmp, "%02d.png"), "-vf", "tile=8x2:padding=6:color=white", "-frames:v", "1", out]);
};
sheet(path.join(ROOT, "out", `vela-${lang}-contact.png`), false);
sheet(path.join(ROOT, "out", "qa", `safezone-${lang}.png`), true);
// Cover: the hook (the clock at 9:47 and the ringing phone).
execFileSync(ff, ["-v", "error", "-y", "-ss", (40 / 30).toFixed(3), "-i", video, "-frames:v", "1", path.join(ROOT, "out", `vela-${lang}-cover.png`)]);

for (const [name, ok, value] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${value}`);
console.log(`contact sheet: out/vela-${lang}-contact.png, cover: out/vela-${lang}-cover.png`);
if (checks.some((c) => !c[1])) process.exitCode = 1;
