// One-off asset pipeline for FIX 3 (real logo everywhere). Builds
// public/brand/* from the best-quality existing sources, plus favicon /
// apple-icon / OG image from the high-res icon mark. Re-run manually if a
// new source logo file is ever dropped in.
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/brand", { recursive: true });

const run = async () => {
  // Full logo (mark + wordmark), color variant for light backgrounds --
  // source is already the best-quality existing asset (742x336, sharp at
  // the display sizes this project uses, see the report for why a fresh
  // SVG trace wasn't attempted).
  await sharp("public/assets/logo-full.png").toFile("public/brand/logo-color.png");
  console.log("public/brand/logo-color.png");

  // Full logo, white variant for the orange auth panels / dark backgrounds.
  await sharp("public/logo-light.png").toFile("public/brand/logo-white.png");
  console.log("public/brand/logo-white.png");

  // Icon mark only, trimmed of transparent padding -- app-icon-1024.png is
  // the highest-res mark source available (1024x1024 vs. the older
  // logo-mark.png's 518x481).
  const markMeta = await sharp("public/assets/app-icon-1024.png")
    .trim()
    .toFile("public/brand/logo-mark.png");
  console.log("public/brand/logo-mark.png", markMeta.width + "x" + markMeta.height);

  // Email logo: color variant at 2x the 140px display width used in the
  // templates (<img width="140">) -- true 2x per FIX 3's spec.
  await sharp("public/assets/logo-full.png")
    .resize({ width: 280 })
    .toFile("public/brand/logo-email.png");
  console.log("public/brand/logo-email.png");

  // Favicon (Next.js App Router auto-detects src/app/icon.png).
  await sharp("public/brand/logo-mark.png")
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile("src/app/icon.png");
  console.log("src/app/icon.png");

  // Apple touch icon -- solid white background (transparency renders as
  // black on some older iOS home-screen contexts).
  await sharp("public/brand/logo-mark.png")
    .resize(140, 140, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile("src/app/apple-icon.png");
  console.log("src/app/apple-icon.png");

  // OG image -- mark centered on a clean white canvas, 1200x630 standard size.
  // Flattened onto opaque white BEFORE compositing (not left transparent)
  // to avoid a thin dark seam at the resize boundary that showed up when
  // compositing a still-transparent buffer straight onto the canvas.
  const markForOg = await sharp("public/brand/logo-mark.png")
    .resize(260, 260, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: markForOg, gravity: "center" }])
    .png()
    .toFile("src/app/opengraph-image.png");
  console.log("src/app/opengraph-image.png");
};

run().catch((err) => { console.error(err); process.exit(1); });
