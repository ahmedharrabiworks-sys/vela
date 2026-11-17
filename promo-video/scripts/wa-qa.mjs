// QA for the WhatsApp video: ffprobe (duration, size, codecs, profile), loudness, one frame per
// scene (taken at the beat, from the final file) and a contact sheet with the unsafe zones shaded.
// Usage: node scripts/wa-qa.mjs <en|ar>
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lang = process.argv[2];
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "wa", `timeline-${lang}.json`), "utf8"));
const file = path.join(ROOT, "out", `vela-wa-${lang}.mp4`);
const ff = ffmpegBin("ffmpeg"), probe = ffmpegBin("ffprobe");
const fails = [];

// ffprobe
const p = JSON.parse(execFileSync(probe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,profile,level,width,height,pix_fmt,r_frame_rate,sample_rate,channels", "-of", "json", file]).toString());
const v = p.streams.find((s) => s.width), a = p.streams.find((s) => s.sample_rate);
const dur = Number(p.format.duration), mb = Number(p.format.size) / 1048576;
console.log(`video ${v.codec_name} ${v.profile} L${v.level} ${v.width}x${v.height} ${v.pix_fmt} ${v.r_frame_rate}; audio ${a?.codec_name} ${a?.sample_rate} Hz ${a?.channels} ch; ${dur.toFixed(2)} s; ${mb.toFixed(2)} MB`);
if (v.codec_name !== "h264" || v.pix_fmt !== "yuv420p" || v.width !== 1080 || v.height !== 1920) fails.push("video format");
if (!a || a.codec_name !== "aac") fails.push("audio missing or not AAC");
if (dur < 22 || dur > 25.05) fails.push(`duration ${dur.toFixed(2)} s (22 to 25)`);
if (mb >= 8) fails.push(`size ${mb.toFixed(2)} MB (under 8)`);
const lo = spawnSync(ff, ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const I = Number(lo.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0]);
const TP = Number(lo.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0]);
console.log(`loudness ${I} LUFS integrated, true peak ${TP} dBFS`);
if (Math.abs(I + 14) > 1) fails.push(`loudness ${I} LUFS (about -14)`);

// One frame per scene, at the beats (same rules as WaVideo.tsx beats()).
const words = (line) => tl.words.filter((w) => w.line === line);
const IDX = { en: { books: 11 }, ar: { books: 7 } };
const start = (l) => tl.clips[l].from;
const flood = start(4) - 3, answerAt = flood + 56, booksAt = words(4)[IDX[lang].books].from, calendarAt = start(5) - 10, endAt = start(6) - 4;
const shots = [
  ["1 ringing", 30], ["1 after hours", words(1)[0].from + 18], ["2 fridays", words(2)[0].from + 16], ["2 busy lines", words(3)[0].from + 18],
  ["3 logo", flood + 22], ["3 phone in", answerAt - 4], ["4 answered", answerAt + 12], ["4 transcript", booksAt - 4],
  ["4 booked", booksAt + 26], ["4 calendar", calendarAt + 50], ["5 end card", endAt + 40], ["5 last frame", tl.durationInFrames - 2],
];
const dir = path.join(ROOT, "out", "qa", `wa-${lang}`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const frames = shots.map(([name, fr], i) => {
  const out = path.join(dir, `${String(i).padStart(2, "0")} ${name} ${(fr / 30).toFixed(1)}s.png`);
  execFileSync(ff, ["-y", "-v", "error", "-ss", (fr / 30).toFixed(3), "-i", file, "-frames:v", "1", out]);
  return out;
});
// Contact sheet, plus a copy with WhatsApp's overlay zones shaded (top 180, bottom 220).
const sheet = path.join(ROOT, "out", `vela-wa-${lang}-contact.png`);
execFileSync(process.execPath, [path.join(ROOT, "scripts", "contact-sheet.mjs"), sheet, "6", "0", ...frames]);
const shaded = frames.map((f) => { const o = f.replace(/\.png$/, " safe.png"); execFileSync(ff, ["-y", "-v", "error", "-i", f, "-vf", "drawbox=x=0:y=0:w=1080:h=180:color=red@0.25:t=fill,drawbox=x=0:y=1700:w=1080:h=220:color=red@0.25:t=fill", o]); return o; });
execFileSync(process.execPath, [path.join(ROOT, "scripts", "contact-sheet.mjs"), path.join(dir, "safe-sheet.png"), "6", "0", ...shaded]);
console.log(`frames in ${dir}\ncontact sheet ${sheet}`);
console.log(fails.length ? `FAIL: ${fails.join("; ")}` : "PASS: format, duration, size, loudness");
