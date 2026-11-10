// Finds ffmpeg / ffprobe: PATH first, then the winget install folder on Windows.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function ffmpegBin(name) {
  try { execFileSync(name, ["-version"], { stdio: "ignore" }); return name; } catch { /* not on PATH */ }
  const base = path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  if (fs.existsSync(base)) {
    for (const pkg of fs.readdirSync(base).filter((d) => d.startsWith("Gyan.FFmpeg"))) {
      for (const sub of fs.readdirSync(path.join(base, pkg))) {
        const exe = path.join(base, pkg, sub, "bin", `${name}.exe`);
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  throw new Error(`${name} not found: install ffmpeg`);
}
