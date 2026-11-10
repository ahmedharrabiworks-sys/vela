import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { CENTER_X, EASE } from "./theme";

// ── Phone frame: a clean device around real captures (390 CSS px wide) ──
export const SCREEN_W = 472;
export const SCREEN_H = Math.round((SCREEN_W * 844) / 390); // 1021
const BEZEL = 12;
export const FRAME_W = SCREEN_W + BEZEL * 2;
export const FRAME_H = SCREEN_H + BEZEL * 2;
export const FRAME_TOP = 236;

export const PhoneFrame: React.FC<{ children: React.ReactNode; x?: number; y?: number; scale?: number; opacity?: number; rotate?: number }> = ({ children, x = CENTER_X, y = FRAME_TOP, scale = 1, opacity = 1, rotate = 0 }) => (
  <div style={{ position: "absolute", left: x - FRAME_W / 2, top: y, width: FRAME_W, height: FRAME_H, transform: `scale(${scale}) rotate(${rotate}deg)`, transformOrigin: "50% 0%", opacity }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 66, background: "#0d0d0f", boxShadow: "0 40px 90px rgba(80,30,10,0.22), 0 10px 30px rgba(0,0,0,0.18)" }} />
    <div style={{ position: "absolute", left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H, borderRadius: 54, overflow: "hidden", background: "#fff" }}>{children}</div>
  </div>
);

// ── Camera over a real capture: center (cx, cy) in CSS px, zoom 1 = fit width ──
export type Cam = { f: number; cx: number; cy: number; z: number };
export function camAt(frame: number, keys: Cam[]): Omit<Cam, "f"> {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame <= b.f) {
      const t = EASE(interpolate(frame, [a.f, b.f], [0, 1]));
      return { cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, z: a.z + (b.z - a.z) * t };
    }
  }
  return keys[keys.length - 1];
}

export const Shot: React.FC<{ src: string; cam: Omit<Cam, "f">; w?: number; h?: number; pageH: number; children?: React.ReactNode }> = ({ src, cam, w = SCREEN_W, h = SCREEN_H, pageH, children }) => {
  const s = (w / 390) * cam.z;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 390, height: pageH, transformOrigin: "0 0", transform: `translate(${w / 2 - cam.cx * s}px, ${h / 2 - cam.cy * s}px) scale(${s})` }}>
        <Img src={staticFile(src)} style={{ width: 390, height: pageH, display: "block" }} />
        {children}
      </div>
    </div>
  );
};

/** An orange outline that draws on around a box (CSS px, inside a Shot). */
export const Highlight: React.FC<{ box: { x: number; y: number; w: number; h: number }; t: number; radius?: number; pad?: number }> = ({ box, t, radius = 14, pad = 6 }) => (
  <div style={{ position: "absolute", left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, borderRadius: radius, border: "3px solid #E4572E", opacity: t, transform: `scale(${0.96 + 0.04 * t})`, boxShadow: `0 0 0 ${6 * t}px rgba(228,87,46,0.12)` }} />
);

export const PhoneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill={color} /></svg>
);
