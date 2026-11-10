// Tiles PNG frames into a contact sheet, optionally with the Reels/TikTok
// unsafe zones shaded (top 220, bottom 420, right 140 of 1080x1920).
// Usage: node scripts/contact-sheet.mjs <out.png> <cols> <safe:0|1> <frame.png...>
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { ffmpegBin } from "./ffmpeg-path.mjs";

const [out, cols = "4", safe = "0", ...files] = process.argv.slice(2);
const ff = ffmpegBin("ffmpeg");
const W = 270, H = 480;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-"));
const shade = "drawbox=x=0:y=0:w=1080:h=220:color=red@0.22:t=fill,drawbox=x=0:y=1500:w=1080:h=420:color=red@0.22:t=fill,drawbox=x=940:y=0:w=140:h=1920:color=red@0.22:t=fill,";
files.forEach((f, i) => execFileSync(ff, ["-y", "-v", "error", "-i", f, "-vf", `${safe === "1" ? shade : ""}scale=${W}:${H},drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${path.basename(f, ".png")}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6`, path.join(tmp, `${String(i).padStart(3, "0")}.png`)]));
const rows = Math.ceil(files.length / Number(cols));
execFileSync(ff, ["-y", "-v", "error", "-framerate", "1", "-i", path.join(tmp, "%03d.png"), "-vf", `tile=${cols}x${rows}:padding=6:color=white`, "-frames:v", "1", out]);
console.log(out);
