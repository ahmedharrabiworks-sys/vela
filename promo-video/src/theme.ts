import { continueRender, delayRender, Easing, interpolate } from "remotion";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";

// Vela tokens, taken from the app (globals.css): orange gradient #ed5426 to
// #9e3819, accent #E4572E family, white / cream surfaces, near-black ink.
export const C = {
  orange: "#E4572E",
  o1: "#ed5426",
  o2: "#9e3819",
  soft: "#FF8A50",
  cream: "#FFF8F3",
  night: "#120D0B",
  night2: "#1E1612",
  ink: "#111111",
  grey: "#6B7280",
  green: "#16A34A",
  red: "#DC2626",
};
export const GRADIENT = `linear-gradient(135deg, ${C.o1}, ${C.o2})`;
export const FONT = { en: "Inter, sans-serif", ar: "'IBM Plex Sans Arabic', Inter, sans-serif" } as const;

// One motion voice for the whole film: fast out, no bounce; landings get 1.04.
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const ease = (f: number, from: number, dur: number) => interpolate(f, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
export const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
/** 0 to 1 with a small overshoot (1.04) for things that land. */
export const land = (f: number, from: number, dur = 20) => {
  const t = lin(f, from, from + dur);
  return t < 0.7 ? EASE(t / 0.7) * 1.04 : 1.04 - 0.04 * Easing.inOut(Easing.quad)((t - 0.7) / 0.3);
};

// Safe zone for Reels / TikTok on 1080x1920: keep text and key UI inside.
export const SAFE = { left: 40, right: 940, top: 220, bottom: 1500 };
export const CENTER_X = (SAFE.left + SAFE.right) / 2; // 490

// Fonts are bundled (@fontsource); hold the render until both are ready.
let fontsHandle: number | null = null;
if (typeof document !== "undefined") {
  fontsHandle = delayRender("fonts");
  Promise.all([
    document.fonts.load("800 64px Inter"),
    document.fonts.load("600 32px Inter"),
    document.fonts.load("700 64px 'IBM Plex Sans Arabic'", "مرحبا"),
    document.fonts.load("600 32px 'IBM Plex Sans Arabic'", "مرحبا"),
  ]).then(() => document.fonts.ready).then(() => { if (fontsHandle !== null) continueRender(fontsHandle); });
}
