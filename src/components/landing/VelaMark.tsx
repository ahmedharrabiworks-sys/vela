"use client";

/**
 * hero-v5 round (FIX 3): the real Vela logo mark (the mountain + spark
 * glyph in /public/assets/logo-mark.png), forced white via a CSS filter,
 * on the brand gradient circle -- replaces every hand-drawn "V" avatar
 * in the hero story and the "How it works" tour. brightness(0) collapses
 * the mark's orange pixels to solid black while keeping its alpha
 * channel intact, invert(1) flips that black to white -- a standard,
 * asset-free way to recolor a single-color PNG without needing a
 * separate white export.
 */
export default function VelaMark({ size = 22, radius = "50%" }: { size?: number; radius?: string }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, background: "linear-gradient(140deg, #C2410C, #FF6B35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo-mark.png"
        alt=""
        aria-hidden="true"
        style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain", filter: "brightness(0) invert(1)" }}
      />
    </div>
  );
}
