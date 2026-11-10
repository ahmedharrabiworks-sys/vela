// QA stills: bundle once, render chosen frames (default: one per scene).
// Usage: node scripts/stills.mjs <en|ar> [frame,frame,...] [label]
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [lang = "en", list, label = "qa"] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "timelines", `${lang}.json`), "utf8"));
const k = tl.cuts;
const frames = list ? list.split(",").map(Number) : [
  20, k.s2 - 30, k.s2 + 70, k.s3 + 90, k.s4 + 50, k.s5a + 50, k.s5b + 110, k.s6a + 60, k.s6b + 30, k.s6c + 30, k.s7a + 20, k.s7b + 20, k.s7c + 15, k.s7d + 30, k.s8b + 30, tl.durationInFrames - 10,
];
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });
const id = lang === "en" ? "VelaEN" : "VelaAR";
const composition = await selectComposition({ serveUrl, id, inputProps: {} });
const outDir = path.join(ROOT, "out", label);
fs.mkdirSync(outDir, { recursive: true });
for (const frame of frames) {
  const output = path.join(outDir, `${lang}-${String(frame).padStart(4, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps: {} });
  console.log(output);
}
