// The 20 to 25 s Vela video sent after the voice note (general version).
// Cut from the full renders on whole voice lines, so every sentence is complete:
//   the night hook, "Meet Vela", "answers every call in Arabic or English",
//   "books it straight into your calendar", the end card.
// Skips the "clinic down the street" and "missed patient" lines: no competitors, no fear.
// Usage: node scripts/short-cut.mjs [en|ar]   (both by default)
// Output: out/vela-short-<lang>.mp4 and out/vela-short-<lang>-contact.png (one frame per segment, start and end).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "out");
const FPS = 30;
// [from, to) in frames of the full render; every cut sits on a scene start and a line end.
const SEGMENTS = {
  en: [["hook", 0, 195], ["meet", 593, 765], ["answers", 769, 896], ["books", 1027, 1177], ["end", 1654, 1758]],
  ar: [["hook", 0, 211], ["meet", 612, 765], ["answers", 769, 886], ["books", 989, 1141], ["end", 1634, 1749]],
};
const ff = ffmpegBin("ffmpeg"), probe = ffmpegBin("ffprobe");

for (const lang of process.argv[2] ? [process.argv[2]] : ["en", "ar"]) {
  const src = path.join(OUT, `vela-${lang}.mp4`);
  if (!fs.existsSync(src)) { console.error(`${src} missing: render the full video first`); process.exit(1); }
  const segs = SEGMENTS[lang];
  const fade = 0.06;
  // One filter graph: trim each piece, short audio fades at every joint (no clicks), concat.
  const parts = segs.map(([, a, b], i) => {
    const s = (a / FPS).toFixed(4), e = (b / FPS).toFixed(4), d = ((b - a) / FPS).toFixed(4);
    return `[0:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${(d - fade).toFixed(4)}:d=${fade}[a${i}]`;
  });
  const graph = `${parts.join(";")};${segs.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${segs.length}:v=1:a=1[v][a]`;
  const out = path.join(OUT, `vela-short-${lang}.mp4`);
  execFileSync(ff, ["-y", "-v", "error", "-i", src, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);
  const dur = Number(execFileSync(probe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
  // Contact sheet: the first and last frame of each segment, as cut.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "short-"));
  const frames = [];
  let t = 0;
  segs.forEach(([name, a, b]) => {
    for (const [tag, at] of [["in", t + 0.15], ["out", t + (b - a) / FPS - 0.12]]) {
      const f = path.join(tmp, `${String(frames.length).padStart(2, "0")} ${name} ${tag} ${at.toFixed(1)}s.png`);
      execFileSync(ff, ["-y", "-v", "error", "-ss", at.toFixed(3), "-i", out, "-frames:v", "1", f]);
      frames.push(f);
    }
    t += (b - a) / FPS;
  });
  const sheet = path.join(OUT, `vela-short-${lang}-contact.png`);
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "contact-sheet.mjs"), sheet, "5", "0", ...frames]);
  console.log(`${lang}: ${out} (${dur.toFixed(1)} s), contact sheet ${sheet}`);
}
