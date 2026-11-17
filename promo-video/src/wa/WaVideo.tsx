import React from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "../theme"; // bundles Inter and IBM Plex Sans Arabic locally
import { WA_COPY } from "./script.js";
import en from "./timeline-en.json";
import ar from "./timeline-ar.json";

/* VelaWA: the 22 to 25 s video sent on WhatsApp after the text and the voice note.
   One world: the same phone (the landing hero device) lies ringing on a dark counter,
   then rises into the warm light as Vela answers, and the call becomes a booking.
   Acts: 1 dark (the problem, 0 to "Vela"), 2 warm white (Vela at work), 3 end card.
   Every cue lands on a word of the voiceover (timeline-<lang>.json). */

export type Lang = "en" | "ar";
type Word = { line: number; t: string; from: number; to: number };
type TL = { lang: Lang; fps: number; durationInFrames: number; clips: { line: number; from: number; srcFrom: number; srcTo: number }[]; words: Word[]; captions: { line: number; words: number[]; from: number; to: number }[] };
export const WA_TL: Record<Lang, TL> = { en: en as TL, ar: ar as TL };

// ── Tokens (velaos.co landing hero) ──
const INK = "#17120E", INK2 = "#6B625C", WARM = "#FBF7F3", NIGHT = "#0D0907", COUNTER = "#17110D";
const ORANGE = "#E8552B", GRAD = "linear-gradient(140deg, #C2410C, #FF6B35)", GREEN = "#22A559";
const FONT = { en: "Inter, sans-serif", ar: "'IBM Plex Sans Arabic', Inter, sans-serif" };
const SAFE = { left: 80, right: 1000, top: 200, bottom: 1700 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const arrive = (f: number, at: number, dur = 18) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
const both = (f: number, at: number, dur = 24) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame where word `i` of line `line` starts. */
const cue = (tl: TL, line: number, i = 0) => tl.words.filter((w) => w.line === line)[i]?.from ?? 0;
const lineStart = (tl: TL, line: number) => tl.clips[line].from;
// Words that trigger scene beats, per language (index within the line).
const IDX = { en: { knows: 7, books: 11 }, ar: { knows: 5, books: 7 } };

function beats(tl: TL, lang: Lang) {
  const flood = lineStart(tl, 4) - 3;
  const answerAt = flood + 56;
  const transcriptAt = answerAt + 20;
  const booksAt = cue(tl, 4, IDX[lang].books);
  const calendarAt = lineStart(tl, 5) - 10;
  return {
    afterHours: cue(tl, 1), fridays: cue(tl, 2), busy: cue(tl, 3), flood, answerAt, transcriptAt,
    bubbles: [0, 1, 2, 3].map((i) => Math.round(mix(transcriptAt + 6, booksAt - 16, i / 3))),
    booksAt, calendarAt, dropAt: calendarAt + 16, endAt: lineStart(tl, 6) - 4,
  };
}

// ── Phone (StoryDevice: 300x620, 10 px bezel, radius 50, warm dark metal) ──
const Phone: React.FC<{ children: React.ReactNode; lift: number }> = ({ children, lift }) => (
  <div style={{
    position: "relative", width: 300, height: 620, boxSizing: "border-box", padding: 10, borderRadius: 50,
    background: "linear-gradient(145deg, #2E2824, #0C0A09 62%)",
    boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.28), 0 44px 80px -24px rgba(194,65,12,${0.38 * lift}), 0 20px 40px -16px rgba(23,18,14,0.45)`,
  }}>
    <div style={{ position: "relative", width: 280, height: 600, borderRadius: 40, overflow: "hidden", background: "#000" }}>{children}</div>
    <div style={{ position: "absolute", top: 21, left: 104, width: 92, height: 27, borderRadius: 14, background: "#000" }} />
  </div>
);

const StatusBar: React.FC<{ dark: boolean; time: string }> = ({ dark, time }) => (
  <div dir="ltr" style={{ height: 46, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px 0 30px", fontFamily: FONT.en, fontSize: 15, fontWeight: 600, color: dark ? "#fff" : INK }}>
    <span>{time}</span>
    <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" /><rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" /><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" /></svg>
      <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.45" /><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" /></svg>
    </span>
  </div>
);

const Mark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Img src={staticFile("brand/logo-mark.png")} style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
  </div>
);

const PhoneIcon: React.FC<{ rot?: number }> = ({ rot = 0 }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot}deg)` }}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

/** Pulse rings around the caller, period-based (the landing's ringStyle). */
const Rings: React.FC<{ f: number; color: string }> = ({ f, color }) => (
  <>{[0, 13, 26].map((o) => { const t = (((f + o) % 39) + 39) % 39 / 39; return <div key={o} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${color}`, transform: `scale(${1 + t * 0.9})`, opacity: 0.6 * (1 - t) }} />; })}</>
);

// ── Screens (280x600, text 14 px and up: 28 px and up in the final frame) ──
const NightCall: React.FC<{ f: number; lang: Lang }> = ({ f, lang }) => {
  const c = WA_COPY[lang];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #3A2A22 0%, #120D0B 100%)", fontFamily: FONT[lang], color: "#fff" }}>
      <StatusBar dark time="11:42" />
      <div style={{ marginTop: 92, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 76, height: 76 }}>
          <Rings f={f} color="rgba(255,255,255,0.45)" />
          <div style={{ position: "relative", width: 76, height: 76, borderRadius: "50%", background: "#3B312B", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon /></div>
        </div>
        <div style={{ fontSize: 15, opacity: 0.75 }}>{c.incoming}</div>
        <div dir="ltr" style={{ fontFamily: FONT.en, fontSize: 24, fontWeight: 600, letterSpacing: 0.5 }}>{c.caller}</div>
      </div>
      <div style={{ position: "absolute", bottom: 64, left: 0, right: 0, display: "flex", justifyContent: "space-around" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E5484D", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon rot={135} /></div>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon /></div>
      </div>
    </AbsoluteFill>
  );
};

const Answering: React.FC<{ f: number; lang: Lang; answerAt: number }> = ({ f, lang, answerAt }) => {
  const c = WA_COPY[lang];
  const on = arrive(f, answerAt, 12);
  const secs = Math.max(0, Math.floor((f - answerAt) / 30));
  return (
    <AbsoluteFill style={{ background: WARM, fontFamily: FONT[lang], color: INK }}>
      <StatusBar dark={false} time="11:43" />
      <div style={{ marginTop: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 84, height: 84 }}>
          {on < 1 ? <div style={{ opacity: 1 - on }}><Rings f={f} color="rgba(232,85,43,0.5)" /></div> : null}
          <div style={{ position: "relative" }}><Mark size={84} /></div>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, position: "relative", height: 28, width: 260, textAlign: "center" }}>
          <span style={{ position: "absolute", inset: 0, opacity: 1 - on }}>{c.answering}</span>
          <span style={{ position: "absolute", inset: 0, opacity: on }}>{c.answered}</span>
        </div>
        <div dir="ltr" style={{ fontFamily: FONT.en, fontSize: 16, color: INK2 }}>{c.caller}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: on, fontSize: 15, fontWeight: 600, color: GREEN }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: GREEN }} />
          <span dir="ltr" style={{ fontFamily: FONT.en }}>00:{String(secs).padStart(2, "0")}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Transcript: React.FC<{ f: number; lang: Lang; b: ReturnType<typeof beats> }> = ({ f, lang, b }) => {
  const c = WA_COPY[lang];
  const secs = Math.max(0, Math.floor((f - b.answerAt) / 30));
  const card = spring({ frame: f - b.booksAt, fps: 30, config: { damping: 18, stiffness: 140, mass: 1 } });
  const check = arrive(f, b.booksAt + 8, 14);
  return (
    <AbsoluteFill dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: WARM, fontFamily: FONT[lang], color: INK }}>
      <StatusBar dark={false} time="11:43" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px 12px", borderBottom: "1px solid #EDE5DF" }}>
        <Mark size={34} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.live}</div>
          <div dir="ltr" style={{ fontFamily: FONT.en, fontSize: 15, color: INK2, textAlign: lang === "ar" ? "right" : "left" }}>{c.caller}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, color: GREEN }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN }} />
          <span dir="ltr" style={{ fontFamily: FONT.en }}>00:{String(secs).padStart(2, "0")}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 14px" }}>
        {c.bubbles.map(([who, text], i) => {
          const p = arrive(f, b.bubbles[i], 14);
          const vela = who === "v";
          return (
            <div key={i} style={{ display: "flex", justifyContent: vela ? "flex-end" : "flex-start", opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
              <div style={{
                maxWidth: 222, padding: "9px 13px", fontSize: 15, lineHeight: lang === "ar" ? 1.55 : 1.38,
                borderRadius: vela ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                background: vela ? "linear-gradient(135deg, #D9481F, #FF6B35)" : "#EFE9E5", color: vela ? "#fff" : INK,
              }}>{text}</div>
            </div>
          );
        })}
      </div>
      {/* The booking card slides up over the transcript, with a soft check. */}
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 18, transform: `translateY(${(1 - card) * 240}px)`, opacity: f >= b.booksAt ? 1 : 0 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "16px 16px", border: "1px solid #EFE4DC", boxShadow: "0 18px 36px -18px rgba(23,18,14,0.35)", display: "flex", gap: 12, alignItems: "center" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
            <circle cx="20" cy="20" r="20" fill={GREEN} opacity={0.12 + 0.88 * check} />
            <path d="M12 20.5l5.5 5.5L28.5 15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="26" strokeDashoffset={26 * (1 - check)} />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{c.booked}</div>
            <div style={{ fontSize: 15, color: INK }}>{c.when}</div>
            <div style={{ fontSize: 15, color: INK2 }}>{c.who} · <span dir="ltr" style={{ fontFamily: FONT.en }}>{c.phone}</span></div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Week: React.FC<{ f: number; lang: Lang; b: ReturnType<typeof beats> }> = ({ f, lang, b }) => {
  const c = WA_COPY[lang];
  const ROW = 78, TOP = 132, COLW = 54, GUT = 50;
  const drop = spring({ frame: f - b.dropAt, fps: 30, config: { damping: 16, stiffness: 120, mass: 1 } });
  const glow = interpolate(f, [b.dropAt + 10, b.dropAt + 22, b.dropAt + 50], [0, 1, 0.35], clamp);
  // Existing bookings: neutral outlined blocks, no names. [day, start hour index, length in rows]
  const busy: [number, number, number][] = [[0, 0.5, 1], [0, 3, 1], [1, 0, 1], [1, 3.5, 0.9], [2, 1, 1.5], [3, 0.5, 1], [3, 2.5, 1]];
  const colX = (d: number) => (lang === "ar" ? 280 - GUT - (d + 1) * COLW - 6 : GUT + d * COLW + 6);
  return (
    <AbsoluteFill dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: WARM, fontFamily: FONT[lang], color: INK }}>
      <StatusBar dark={false} time="11:44" />
      <div style={{ padding: "4px 16px 0", fontSize: 18, fontWeight: 700 }}>{c.week}</div>
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, height: 30 }}>
        {c.days.map((d, i) => (
          <div key={i} style={{ position: "absolute", left: colX(i), width: COLW - 4, textAlign: "center", fontSize: 15, fontWeight: i === c.tomorrow ? 700 : 500, color: i === c.tomorrow ? ORANGE : INK2 }}>{d}</div>
        ))}
      </div>
      {c.hours.map((h, r) => (
        <React.Fragment key={h}>
          <div style={{ position: "absolute", top: TOP + r * ROW, left: 0, right: 0, height: 1, background: "#ECE3DC" }} />
          <div style={{ position: "absolute", top: TOP + r * ROW + 6, [lang === "ar" ? "right" : "left"]: 8, width: GUT - 10, fontSize: 15, color: INK2 } as React.CSSProperties}>{h}</div>
        </React.Fragment>
      ))}
      {busy.map(([d, s, len], i) => (
        <div key={i} style={{ position: "absolute", left: colX(d), top: TOP + s * ROW + 4, width: COLW - 6, height: len * ROW - 8, borderRadius: 10, background: "#F1EAE4", border: "1px solid #E4D9D0" }} />
      ))}
      {/* The new booking: tomorrow, 7:30 PM, drops into its slot. */}
      <div style={{
        position: "absolute", left: colX(c.tomorrow) - 2, width: COLW - 2, top: TOP + 2.5 * ROW + 4, height: ROW - 8, borderRadius: 10, background: GRAD,
        transform: `translateY(${(1 - drop) * -260}px)`, opacity: f >= b.dropAt ? 1 : 0, boxShadow: `0 10px 24px -8px rgba(232,85,43,${0.6 * glow})`,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 700, textAlign: "center", lineHeight: 1.2, padding: 2,
      }}>{c.who}</div>
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 22, padding: "12px 14px", borderRadius: 16, background: "#fff", border: "1px solid #EFE4DC", display: "flex", alignItems: "center", gap: 10, opacity: arrive(f, b.dropAt + 18, 14), fontSize: 15, fontWeight: 600 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: ORANGE, flexShrink: 0 }} />
        <span>{c.newLabel}</span>
      </div>
    </AbsoluteFill>
  );
};

// ── The phone in the world: lying on the counter, then rising into the light ──
const World: React.FC<{ tl: TL; lang: Lang; b: ReturnType<typeof beats> }> = ({ tl, lang, b }) => {
  const f = useCurrentFrame();
  const rise = both(f, b.flood + 26, 30); // lying -> standing, after the logo has moved up
  // Soft cuts on the type beats: the framing steps closer, each with a short blur dip.
  const framing = f < b.fridays ? 0 : f < b.busy ? 1 : 2;
  const fr = [{ x: 540, y: 1080, s: 1.55, rz: -16 }, { x: 560, y: 1120, s: 1.85, rz: -10 }, { x: 520, y: 1060, s: 1.7, rz: -22 }][framing];
  const dip = Math.max(...[b.fridays, b.busy].map((t) => interpolate(f, [t - 3, t, t + 6], [0, 1, 0], clamp)));
  const stand = { x: 540, y: 925, s: 1.9 }; // phone spans y ~335 to ~1515: captions sit below it
  const x = mix(fr.x, stand.x, rise), y = mix(fr.y, stand.y, rise), s = mix(fr.s, stand.s, rise);
  const rx = mix(58, 5, rise), rz = mix(fr.rz, 0, rise), ry = mix(0, -12, rise) + interpolate(f, [b.answerAt, b.endAt], [0, 6], clamp);
  const push = interpolate(f, [b.answerAt, b.endAt], [1, 1.04], clamp);
  // Each screen fades in OVER the previous one (which stays underneath until the fade is done).
  const starts = { night: 0, answer: b.flood + 6, transcript: b.transcriptAt, week: b.calendarAt };
  const showing = (from: number, next: number) => f >= from && f < next + 10;
  const sw = (at: number) => (at === 0 ? 1 : arrive(f, at, 8));
  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <div style={{ position: "absolute", left: x - 150, top: y - 310, width: 300, height: 620, transform: `scale(${s * push}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, filter: dip > 0.01 ? `blur(${dip * 10}px)` : undefined, opacity: 1 - dip * 0.5 }}>
        <Phone lift={rise}>
          {showing(starts.night, starts.answer) ? <NightCall f={f} lang={lang} /> : null}
          {showing(starts.answer, starts.transcript) ? <div style={{ position: "absolute", inset: 0, opacity: sw(starts.answer) }}><Answering f={f} lang={lang} answerAt={b.answerAt} /></div> : null}
          {showing(starts.transcript, starts.week) ? <div style={{ position: "absolute", inset: 0, opacity: sw(starts.transcript) }}><Transcript f={f} lang={lang} b={b} /></div> : null}
          {f >= starts.week ? <div style={{ position: "absolute", inset: 0, opacity: sw(starts.week) }}><Week f={f} lang={lang} b={b} /></div> : null}
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

/** The dark closed shop: a wall and a counter; the ringing screen lights the counter. */
const Night: React.FC<{ b: ReturnType<typeof beats> }> = ({ b }) => {
  const f = useCurrentFrame();
  const ring = 0.5 + 0.5 * Math.sin((f / 39) * Math.PI * 2);
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, bottom: 0, background: COUNTER, borderTop: "1px solid rgba(255,240,230,0.06)" }} />
      <div style={{ position: "absolute", left: 140, top: 820, width: 800, height: 620, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,214,190,0.16), rgba(255,214,190,0) 70%)", opacity: f < b.flood ? 0.55 + 0.45 * ring : 0 }} />
    </AbsoluteFill>
  );
};

/** Missed calls counter: ticks up after each unanswered ring cycle. */
const Missed: React.FC<{ lang: Lang; b: ReturnType<typeof beats> }> = ({ lang, b }) => {
  const f = useCurrentFrame();
  const n = Math.min(9, Math.floor(Math.max(0, f - 20) / 46) + 1);
  const bump = interpolate((Math.max(0, f - 20) % 46), [0, 4, 12], [1.12, 1.12, 1], clamp);
  const out = 1 - arrive(f, b.flood, 8);
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ position: "absolute", top: SAFE.top + 20, [lang === "ar" ? "right" : "left"]: SAFE.left, display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.82)", fontFamily: FONT[lang], fontSize: 32, fontWeight: 600, opacity: out * arrive(f, 6, 14) } as React.CSSProperties}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#E5484D" }} />
      <span>{WA_COPY[lang].missed}</span>
      <span dir="ltr" style={{ fontFamily: FONT.en, fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "#fff", display: "inline-block", transform: `scale(${bump})` }}>{n}</span>
    </div>
  );
};

/** Kinetic type: "After hours", then "Fridays.", "Busy lines." in the same place, each blurring in word by word. */
const TypeBeats: React.FC<{ lang: Lang; b: ReturnType<typeof beats> }> = ({ lang, b }) => {
  const f = useCurrentFrame();
  const c = WA_COPY[lang];
  const items: [string, number, number][] = [[c.afterHours, b.afterHours, b.fridays], [c.fridays, b.fridays, b.busy], [c.busy, b.busy, b.flood]];
  return (
    <>{items.map(([text, from, to]) => {
      if (f < from - 2 || f > to + 6) return null;
      const out = interpolate(f, [to - 1, to + 5], [1, 0], clamp);
      return (
        <div key={text} dir={lang === "ar" ? "rtl" : "ltr"} style={{ position: "absolute", top: SAFE.top + 150, left: SAFE.left, right: 1080 - SAFE.right, fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: lang === "ar" ? 128 : 136, lineHeight: lang === "ar" ? 1.3 : 0.98, letterSpacing: lang === "ar" ? 0 : "-0.04em", color: "#fff", opacity: out, filter: out < 1 ? `blur(${(1 - out) * 8}px)` : undefined }}>
          {text.split(" ").map((w, i) => {
            const p = interpolate(f, [from + i * 3, from + i * 3 + 5], [0, 1], clamp);
            return <span key={i} style={{ opacity: p, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>{w}{i < text.split(" ").length - 1 ? " " : ""}</span>;
          })}
        </div>
      );
    })}</>
  );
};

/** The flood to warm white and the logo resolving, then moving up out of the phone's way. */
const Light: React.FC<{ b: ReturnType<typeof beats> }> = ({ b }) => {
  const f = useCurrentFrame();
  const flood = both(f, b.flood, 12);
  return (
    <AbsoluteFill style={{ background: WARM, opacity: flood }} />
  );
};

/** The logo resolves in the middle of the light, then rises to the top as the phone stands up (always in front of it). */
const Logo: React.FC<{ b: ReturnType<typeof beats> }> = ({ b }) => {
  const f = useCurrentFrame();
  const logoIn = interpolate(f, [b.flood + 4, b.flood + 16], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
  const up = both(f, b.flood + 16, 18);
  const out = 1 - arrive(f, b.answerAt + 8, 10);
  if (f < b.flood) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: mix(520, 214, up), display: "flex", justifyContent: "center", opacity: logoIn * out }}>
      <Img src={staticFile("brand/logo-full.png")} style={{ height: mix(230, 92, up), filter: logoIn < 1 ? `blur(${(1 - logoIn) * 12}px)` : undefined }} />
    </div>
  );
};

const EndCard: React.FC<{ lang: Lang; b: ReturnType<typeof beats> }> = ({ lang, b }) => {
  const f = useCurrentFrame();
  const c = WA_COPY[lang];
  if (f < b.endAt) return null;
  const inP = arrive(f, b.endAt, 4); // near cut: fields do not cross-fade
  const logo = spring({ frame: f - b.endAt - 4, fps: 30, config: { damping: 17, stiffness: 120, mass: 1 } });
  return (
    <AbsoluteFill style={{ background: WARM, opacity: inP, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 0 }}>
      <Img src={staticFile("brand/logo-full.png")} style={{ height: 250, transform: `translateY(${(1 - logo) * 30}px) scale(${0.94 + 0.06 * logo})` }} />
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ marginTop: 56, textAlign: "center", fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: lang === "ar" ? 70 : 72, lineHeight: lang === "ar" ? 1.35 : 1.04, letterSpacing: lang === "ar" ? 0 : "-0.035em", color: INK }}>
        {c.tagline.map((l, i) => {
          const p = interpolate(f, [b.endAt + 12 + i * 5, b.endAt + 20 + i * 5], [0, 1], clamp);
          return <div key={i} style={{ opacity: p, filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined }}>{l}</div>;
        })}
      </div>
      <div style={{ marginTop: 44, fontFamily: FONT.en, fontSize: 40, fontWeight: 600, color: ORANGE, opacity: arrive(f, b.endAt + 26, 12) }}>{c.url}</div>
    </AbsoluteFill>
  );
};

/** Burned-in captions: 2 to 5 words, the spoken word in orange. Hidden where the type beats or the end card say it. */
const Captions: React.FC<{ tl: TL; lang: Lang; b: ReturnType<typeof beats> }> = ({ tl, lang, b }) => {
  const f = useCurrentFrame();
  const cap = tl.captions.find((c) => f >= c.from && f < c.to);
  if (!cap || [1, 2, 3, 6].includes(cap.line) || f >= b.endAt) return null;
  const p = interpolate(f, [cap.from, cap.from + 4], [0, 1], clamp);
  const dark = f < b.flood + 6;
  return (
    <div style={{ position: "absolute", left: SAFE.left, right: 1080 - SAFE.right, top: 1560, display: "flex", justifyContent: "center" }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{
        padding: lang === "ar" ? "8px 28px 14px" : "12px 28px", borderRadius: 24, background: dark ? "rgba(255,255,255,0.10)" : "rgba(23,18,14,0.90)",
        fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: 54, lineHeight: lang === "ar" ? 1.45 : 1.18, color: "#fff", textAlign: "center",
        letterSpacing: lang === "ar" ? 0 : -0.5, opacity: p,
      }}>
        {cap.words.map((wi, i) => {
          const w = tl.words[wi];
          const on = f >= w.from && f < Math.max(w.to, w.from + 4);
          return <span key={wi} style={{ color: on ? "#FF8A50" : "#fff" }}>{w.t}{i < cap.words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </div>
  );
};

/** Sound: every entry pinned to a beat. Low volumes; the voice leads. */
function sfx(b: ReturnType<typeof beats>) {
  const rows: { from: number; src: string; volume: number }[] = [];
  for (let at = 0; at < b.flood - 20; at += 46) rows.push({ from: at, src: "ring", volume: 0.3 });
  for (let at = 20 + 46; at < b.flood; at += 46) rows.push({ from: at, src: "tick", volume: 0.14 });
  rows.push({ from: b.fridays - 4, src: "whoosh", volume: 0.16 }, { from: b.busy - 4, src: "whoosh", volume: 0.16 });
  rows.push({ from: b.flood - 4, src: "whoosh", volume: 0.3 }, { from: b.flood + 14, src: "thump", volume: 0.22 });
  rows.push({ from: b.transcriptAt - 2, src: "whoosh", volume: 0.12 });
  rows.push({ from: b.booksAt + 8, src: "tick", volume: 0.38 });
  rows.push({ from: b.calendarAt - 2, src: "whoosh", volume: 0.14 }, { from: b.dropAt + 8, src: "thump", volume: 0.3 });
  rows.push({ from: b.endAt, src: "whoosh", volume: 0.18 }, { from: b.endAt + 12, src: "thump", volume: 0.22 });
  return rows;
}

export const WaVideo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const tl = WA_TL[lang];
  const { fps } = useVideoConfig();
  const b = beats(tl, lang);
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Night b={b} />
      <Light b={b} />
      <World tl={tl} lang={lang} b={b} />
      <Logo b={b} />
      <Missed lang={lang} b={b} />
      <TypeBeats lang={lang} b={b} />
      <EndCard lang={lang} b={b} />
      <Captions tl={tl} lang={lang} b={b} />
      {tl.clips.map((c) => (
        <Sequence key={c.line} from={c.from} durationInFrames={c.srcTo - c.srcFrom}>
          <Audio src={staticFile(`audio/wa/vo-${lang}.mp3`)} trimBefore={c.srcFrom} trimAfter={c.srcTo} />
        </Sequence>
      ))}
      {sfx(b).map((r, i) => (
        <Sequence key={`s${i}`} from={Math.max(0, r.from)} durationInFrames={2 * fps}>
          <Audio src={staticFile(`audio/sfx/${r.src}.wav`)} volume={r.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
