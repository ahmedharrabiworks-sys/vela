import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { camAt, FRAME_W, Highlight, PhoneFrame, Shot, type Cam } from "./components";
import { C, CENTER_X, ease, FONT, GRADIENT, land, lin } from "./theme";
import { COPY, type Lang, type Timeline } from "./timeline";
import layoutEn from "../public/captures/en/layout.json";
import layoutAr from "../public/captures/ar/layout.json";

// Real captures (390 CSS px wide, 3x). Page heights match the capture viewports.
const PAGE_H = { phone: 1480, transcript: 844, inbox: 844, day: 1700, dashboard: 1500, overview: 1500 };
// Transcript bubbles (CSS px, measured on the captures): summary, then the five turns.
const BUBBLES = {
  en: { summary: [170.7, 100], turns: [[284, 66], [362.7, 65.7], [441, 88], [541.7, 43.3], [597.7, 66]] },
  ar: { summary: [179.3, 78], turns: [[270, 64.7], [347.3, 67], [427, 64.7], [504.3, 44], [561, 65.7]] },
} as const;
// Week captures and their closed columns (Sunday and Saturday), as image fractions.
const WEEK = {
  en: { w: 1322, h: 1396, closed: [[107, 281], [1149, 1322]] },
  ar: { w: 1206, h: 1396, closed: [[0, 157], [943, 1099]] },
} as const;
const THREAD_BG = "#FAFAFA";

export function dayLanding(tl: Timeline) { return tl.cuts.s6a + 14 + 14; }
// Bubbles reveal in reading order across the scene, whatever its length; the summary last.
export function bubbleTimes(tl: Timeline) { const s = tl.cuts.s5b, span = tl.cuts.s6a - s - 22; return [0.03, 0.17, 0.31, 0.5, 0.66, 0.84].map((p) => Math.round(s + p * span)); }

const Bg: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(900px 700px at 85% 10%, rgba(237,84,38,0.13), transparent 60%), radial-gradient(800px 800px at 0% 95%, rgba(237,84,38,0.10), transparent 60%), ${C.cream}` }} />
);

export const AppScenes: React.FC<{ tl: Timeline; lang: Lang }> = ({ tl, lang }) => {
  const f = useCurrentFrame();
  const L = (lang === "en" ? layoutEn : layoutAr) as typeof layoutEn;
  const k = tl.cuts;
  const dir = `captures/${lang}`;
  const rise = ease(f, k.s5a, 18);

  // ── Phone frame contents ──
  let screen: React.ReactNode = null;
  let frameVisible = (f >= k.s5a && f < k.s6b) || (f >= k.s7a && f < k.s7d) || (f >= k.s8a && f < k.s8c);
  const settle = (from: number) => 1.02 - 0.02 * ease(f, from, 8);

  if (f >= k.s5a && f < k.s5b) {
    const pill = L.phone.boxes.pill, card = L.phone.boxes.card;
    const keys: Cam[] = [
      { f: k.s5a, cx: 195, cy: 420, z: 1 },
      { f: k.s5a + 26, cx: card.x + card.w / 2, cy: card.y + 120, z: 1.12 },
      { f: k.s5a + 66, cx: card.x + card.w / 2, cy: card.y + 120, z: 1.12 },
      { f: k.s5b - 6, cx: 195, cy: 880, z: 1.25 },
    ];
    const hl = ease(f, k.s5a + 26, 10) * (1 - ease(f, k.s5a + 66, 8));
    screen = <Shot src={`${dir}/phone.png`} pageH={PAGE_H.phone} cam={camAt(f, keys)}><Highlight box={pill} t={hl} radius={16} pad={5} /></Shot>;
  } else if (f >= k.s5b && f < k.s6a) {
    const B = BUBBLES[lang], times = bubbleTimes(tl);
    const covers = [...B.turns.map((b, i) => ({ y: b[0], h: b[1], at: times[i] })), { y: B.summary[0], h: B.summary[1], at: times[5] }];
    const cam = camAt(f, [{ f: k.s5b, cx: 195, cy: 425, z: 1 }, { f: k.s6a, cx: 195, cy: 440, z: 1.07 }]);
    const price = B.turns[2];
    screen = (
      <Shot src={`${dir}/transcript.png`} pageH={PAGE_H.transcript} cam={cam}>
        {covers.map((c, i) => {
          const t = ease(f, c.at, 9);
          return <div key={i} style={{ position: "absolute", left: 20, width: 350, top: c.y - 4, height: c.h + 8, background: THREAD_BG, opacity: 1 - t, transform: `translateY(${-t * 8}px)` }} />;
        })}
        <Highlight box={{ x: lang === "ar" ? 33 : 104, y: price[0], w: 253, h: price[1] }} t={ease(f, bubbleTimes(tl)[2] + 8, 10)} radius={26} pad={5} />
      </Shot>
    );
  } else if (f >= k.s6a && f < k.s6b) {
    const row = L.day.boxes.row;
    const drop = land(f, k.s6a + 14, 20);
    const shown = Math.min(1, drop);
    const cam = camAt(f, [{ f: k.s6a, cx: 195, cy: row.y + 40, z: 1.08 }, { f: k.s6a + 40, cx: 195, cy: row.y + 60, z: 1.2 }]);
    screen = (
      <Shot src={`${dir}/day-empty.png`} pageH={PAGE_H.day} cam={cam}>
        <Img src={staticFile(`${dir}/day-row.png`)} style={{ position: "absolute", left: row.x, top: row.y, width: row.w, height: row.h, opacity: shown, transform: `translateY(${(1 - drop) * -150}px)`, boxShadow: `0 ${18 * (1 - shown)}px 40px rgba(0,0,0,${0.18 * (1 - shown)})`, borderRadius: 4 }} />
        <Highlight box={row} t={ease(f, k.s6a + 36, 10) * (1 - ease(f, k.s6b - 24, 12))} radius={10} pad={3} />
      </Shot>
    );
  } else if (f >= k.s7a && f < k.s7b) {
    screen = <div style={{ position: "absolute", inset: 0, transform: `scale(${settle(k.s7a)})` }}><Shot src={`${dir}/overview.png`} pageH={PAGE_H.overview} cam={camAt(f, [{ f: k.s7a, cx: 195, cy: 430, z: 1 }, { f: k.s7b, cx: 195, cy: 560, z: 1.02 }])} /></div>;
  } else if (f >= k.s7b && f < k.s7c) {
    screen = <div style={{ position: "absolute", inset: 0, transform: `scale(${settle(k.s7b)})` }}><Shot src={`${dir}/inbox.png`} pageH={PAGE_H.inbox} cam={camAt(f, [{ f: k.s7b, cx: 195, cy: 422, z: 1 }, { f: k.s7c, cx: 195, cy: 422, z: 1.05 }])} /></div>;
  } else if (f >= k.s7c && f < k.s7d) {
    screen = <div style={{ position: "absolute", inset: 0, transform: `scale(${settle(k.s7c)})` }}><Shot src={`${dir}/dashboard.png`} pageH={PAGE_H.dashboard} cam={camAt(f, [{ f: k.s7c, cx: 195, cy: 470, z: 1 }, { f: k.s7d, cx: 195, cy: 560, z: 1 }])} /></div>;
  } else if (f >= k.s8a && f < k.s8c) {
    const n = L.phone.boxes.number;
    const cam = camAt(f, [{ f: k.s8a, cx: 195, cy: 330, z: 1.15 }, { f: k.s8b, cx: n.x + n.w / 2 + 8, cy: n.y + n.h / 2, z: 1.6 }]);
    screen = <Shot src={`${dir}/phone.png`} pageH={PAGE_H.phone} cam={cam}><Highlight box={n} t={ease(f, k.s8b + 4, 10)} radius={10} pad={6} /></Shot>;
  } else frameVisible = false;

  // Frame entrance (line 5) and returns after the Week card and the fan.
  const enterFrom = f < k.s6b ? k.s5a : f < k.s7d ? k.s7a : k.s8a;
  const enter = ease(f, enterFrom, 16);
  const frameY = 236 + (1 - (enterFrom === k.s5a ? rise : enter)) * 120;

  // ── Week card (lines 6b, 6c) ──
  const W = WEEK[lang];
  const weekIn = ease(f, k.s6b, 16);
  const weekW = 860, weekH = (weekW * W.h) / W.w;
  const closedT = ease(f, k.s6c, 12);

  // ── Fan of three screens (line 7d) ──
  const fan = ease(f, k.s7d, 18);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Bg />
      {frameVisible && <PhoneFrame y={frameY} opacity={enterFrom === k.s5a ? rise : enter}>{screen}</PhoneFrame>}

      {f >= k.s6b && f < k.s7a && (
        <div style={{ position: "absolute", left: 40 + (1 - weekIn) * 220, top: 300, width: weekW, height: weekH, opacity: weekIn, borderRadius: 28, overflow: "hidden", background: "#fff", boxShadow: "0 30px 80px rgba(80,30,10,0.18)", transform: `scale(${1 + 0.02 * lin(f, k.s6b, k.s7a)})`, transformOrigin: "50% 30%" }}>
          <Img src={staticFile(`captures/${lang}/week.png`)} style={{ width: weekW, height: weekH, display: "block" }} />
          {W.closed.map(([a, b], i) => (
            <div key={i} style={{ position: "absolute", left: (a / W.w) * weekW + 2, width: ((b - a) / W.w) * weekW - 4, top: (116 / W.h) * weekH, bottom: 4, borderRadius: 12, border: `4px solid ${C.orange}`, opacity: closedT, transform: `scaleY(${0.92 + 0.08 * closedT})`, transformOrigin: "50% 0%" }} />
          ))}
        </div>
      )}

      {f >= k.s7d && f < k.s8a && (["overview", "inbox", "dashboard"] as const).map((name, i) => {
        const x = CENTER_X + (i - 1) * 270 * fan;
        return (
          <PhoneFrame key={name} x={x} y={330} scale={0.56} rotate={(i - 1) * 4 * fan} opacity={i === 1 ? 1 : fan}>
            <Shot src={`${dir}/${name}.png`} pageH={PAGE_H[name]} cam={{ cx: 195, cy: 422, z: 1 }} />
          </PhoneFrame>
        );
      })}
      {f >= k.s7d && f < k.s8a && <div style={{ position: "absolute", left: CENTER_X - FRAME_W, width: FRAME_W * 2, top: 0 }} />}
    </div>
  );
};

// ── Line 8 end card: logo, velaos.co, the call to action. Held to the end. ──
export const EndCard: React.FC<{ tl: Timeline; lang: Lang }> = ({ tl, lang }) => {
  const f = useCurrentFrame();
  const s = tl.cuts.s8c;
  const bg = ease(f, s, 12);
  const logo = land(f, s + 4, 20);
  const url = ease(f, s + 16, 16);
  const cta = land(f, s + 26, 18);
  return (
    <div style={{ position: "absolute", inset: 0, background: C.cream, opacity: bg }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 700px at 50% 40%, rgba(237,84,38,0.12), transparent 65%)" }} />
      <div style={{ position: "absolute", left: 0, width: 980, top: 470, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Img src={staticFile("brand/logo-full.png")} style={{ width: 600, opacity: Math.min(1, logo), transform: `scale(${0.9 + 0.1 * logo})` }} />
        <p dir="ltr" style={{ marginTop: 40, fontFamily: FONT.en, fontWeight: 800, fontSize: 96, letterSpacing: -2, color: C.ink, opacity: url, transform: `translateY(${(1 - url) * 18}px)` }}>velaos.co</p>
        <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ marginTop: 44, padding: lang === "ar" ? "16px 54px 24px" : "24px 54px", borderRadius: 999, background: GRADIENT, color: "#fff", fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: 52, boxShadow: "0 18px 40px rgba(237,84,38,0.35)", opacity: Math.min(1, cta), transform: `scale(${0.92 + 0.08 * cta})` }}>{COPY[lang].cta}</div>
      </div>
    </div>
  );
};
