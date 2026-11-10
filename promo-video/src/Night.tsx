import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { PhoneIcon } from "./components";
import { C, CENTER_X, ease, FONT, GRADIENT, land, lin } from "./theme";
import { COPY, wordAt, type Lang, type Timeline } from "./timeline";

// Lines 1 to 3: the problem, at night. Built only from type, shapes and motion.
export const Night: React.FC<{ tl: Timeline; lang: Lang }> = ({ tl, lang }) => {
  const f = useCurrentFrame();
  const t = COPY[lang];
  const rtl = lang === "ar";
  const font = FONT[lang];
  const { s2, s3, s4 } = tl.cuts;
  const rivalAt = lang === "en" ? wordAt(tl, 1, "So") : wordAt(tl, 1, "فيتصل");

  // Phase 1: clock + ringing phone. Phase 2: missed calls stack, a rival answers. Phase 3: the cost.
  const toMissed = ease(f, s2, 16);
  const toCost = ease(f, s3, 18);
  const ringing = f < s2;
  const ringPhase = (f % 52) / 52; // one ring burst every 52 frames
  const shake = ringing && ringPhase < 0.4 ? Math.sin(f * 2.4) * 5 * (1 - ringPhase / 0.4) : 0;

  // The clock: big in phase 1, shrinks to the top in phase 2.
  const clockScale = interpolate(toMissed, [0, 1], [1, 0.42]);
  const clockY = interpolate(toMissed, [0, 1], [300, 236]);
  const minute = "47";

  const missedTimes = [s2 + 8, s2 + 34, s2 + 52]; // faster and faster
  const rivalIn = ease(f, rivalAt, 18);
  const lostCount = Math.round(interpolate(lin(f, s3 + 6, s3 + 70), [0, 1], [3, 12], { easing: (x) => 1 - Math.pow(1 - x, 3) }));

  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1200px 900px at 50% 38%, ${C.night2}, ${C.night})`, fontFamily: font, direction: rtl ? "rtl" : "ltr" }}>
      {/* Clock */}
      <div style={{ position: "absolute", left: 0, width: 980, top: clockY, display: "flex", justifyContent: "center", opacity: 1 - toCost, transform: `scale(${clockScale})`, transformOrigin: "50% 0%" }}>
        <div dir="ltr" style={{ display: "flex", alignItems: "baseline", gap: 18, flexDirection: rtl ? "row-reverse" : "row" }}>
          <span style={{ fontFamily: FONT.en, fontWeight: 800, fontSize: 250, color: "#F5EDE6", letterSpacing: -10, lineHeight: 1 }}>
            9<span style={{ opacity: f % 30 < 18 || f > 60 ? 1 : 0.35 }}>:</span>{minute}
          </span>
          <span style={{ fontFamily: font, fontWeight: 600, fontSize: 64, color: C.soft }}>{t.clockSuffix}</span>
        </div>
      </div>
      {/* Closed sign */}
      <div style={{ position: "absolute", top: 600, left: 0, width: 980, display: "flex", justifyContent: "center", opacity: (1 - toMissed) * ease(f, 14, 14) }}>
        <div style={{ padding: "10px 28px", borderRadius: 999, border: "2px solid rgba(255,138,80,0.55)", color: C.soft, fontWeight: 600, fontSize: 38, letterSpacing: rtl ? 0 : 6, textTransform: rtl ? "none" : "uppercase" }}>{t.closed}</div>
      </div>

      {/* Ringing phone card */}
      <div style={{ position: "absolute", left: CENTER_X - 300, top: interpolate(toMissed, [0, 1], [760, 900]), width: 600, transform: `translateX(${shake}px) scale(${interpolate(toMissed, [0, 1], [1, 0.9])})`, opacity: interpolate(toCost, [0, 1], [1 - 0.45 * toMissed, 0]) * (1 - rivalIn) }}>
        {/* pulse rings */}
        {ringing && [0, 1].map((k) => {
          const p = ((f + k * 26) % 52) / 52;
          return <div key={k} style={{ position: "absolute", left: 300 - 110 - p * 120, top: 60 - p * 120, width: 220 + p * 240, height: 220 + p * 240, borderRadius: "50%", border: `3px solid rgba(237,84,38,${0.55 * (1 - p)})` }} />;
        })}
        <div style={{ position: "relative", margin: "0 auto", width: 220, height: 220, borderRadius: "50%", background: ringing ? GRADIENT : "#3a2f2a", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: ringing ? "0 20px 60px rgba(237,84,38,0.35)" : "none" }}>
          <PhoneIcon size={96} color={ringing ? "#fff" : "#8f8580"} />
        </div>
        <p style={{ marginTop: 40, textAlign: "center", color: "#B8ADA6", fontSize: 36, fontWeight: 600 }}>{ringing ? t.incoming : t.missed}</p>
        <p style={{ marginTop: 6, textAlign: "center", color: "#F5EDE6", fontSize: 58, fontWeight: lang === "ar" ? 700 : 800 }}>{t.clinic}</p>
      </div>

      {/* Missed call notifications stack in, faster each time */}
      {missedTimes.map((at, i) => {
        const k = land(f, at, 14);
        return (
          <div key={i} style={{ position: "absolute", left: CENTER_X - 400, width: 800, top: 380 + i * 132, opacity: Math.min(1, k) * (f >= at ? 1 : 0) * (1 - toCost), transform: `translateY(${(1 - Math.min(1, k)) * -60}px) scale(${0.96 + 0.04 * Math.min(1, k)})` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "22px 28px", borderRadius: 30, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(220,38,38,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon size={34} color="#F87171" /></div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#FCA5A5", fontSize: 32, fontWeight: 700 }}>{t.missed}</p>
                <p style={{ color: "#D6CCC5", fontSize: 30 }}>{t.clinic}</p>
              </div>
              <p dir="ltr" style={{ color: "#9A8F88", fontSize: 28, fontFamily: font }}>{t.times[i]}</p>
            </div>
          </div>
        );
      })}

      {/* The clinic down the street answers */}
      <div style={{ position: "absolute", left: CENTER_X - 400, width: 800, top: 930, opacity: rivalIn * (1 - toCost), transform: `translateX(${(1 - rivalIn) * (rtl ? -80 : 80)}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "24px 28px", borderRadius: 30, background: "rgba(22,163,74,0.14)", border: "1px solid rgba(74,222,128,0.35)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><PhoneIcon size={34} /></div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#F5EDE6", fontSize: 34, fontWeight: 700 }}>{t.rival}</p>
            <p style={{ color: "#86EFAC", fontSize: 30, fontWeight: 600 }}>{t.rivalState} · <span dir="ltr">0:{String(12 + Math.max(0, Math.floor((f - rivalAt) / 30))).padStart(2, "0")}</span></p>
          </div>
        </div>
      </div>

      {/* The cost: missed calls become missed patients */}
      <div style={{ position: "absolute", left: 0, width: 980, top: 420, display: "flex", flexDirection: "column", alignItems: "center", opacity: toCost * (1 - ease(f, s4 - 6, 6)) }}>
        <p dir="ltr" style={{ fontFamily: FONT.en, fontWeight: 800, fontSize: 340, lineHeight: 1, color: C.o1, letterSpacing: -12 }}>{lostCount}</p>
        <p style={{ marginTop: 10, color: "#F5EDE6", fontSize: 64, fontWeight: lang === "ar" ? 700 : 800 }}>{t.lost}</p>
        <div style={{ marginTop: 40, display: "flex", gap: 14 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: i < lostCount ? C.o1 : "rgba(255,255,255,0.12)" }} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Line 4: the mood flips; the logo lands on cream.
export const BrandReveal: React.FC<{ tl: Timeline; lang: Lang; endAt: number }> = ({ tl, lang, endAt }) => {
  const f = useCurrentFrame();
  const { s4 } = tl.cuts;
  const wipe = ease(f, s4, 20);
  const logo = land(f, s4 + 10, 22);
  const tag = ease(f, s4 + 30, 18);
  void endAt; // hard cut to the app scene (cream to cream), never back to dark
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 490 - 1500 * wipe, top: 760 - 1500 * wipe, width: 3000 * wipe, height: 3000 * wipe, borderRadius: "50%", background: C.cream }} />
      <LogoBlock t={logo} tag={tag} lang={lang} text={COPY[lang].tagline} />
    </div>
  );
};

export const LogoBlock: React.FC<{ t: number; tag: number; lang: Lang; text: string }> = ({ t, tag, lang, text }) => (
  <div style={{ position: "absolute", left: 0, width: 980, top: 560, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <Img src={staticFile("brand/logo-full.png")} style={{ width: 640, opacity: Math.min(1, t), transform: `scale(${0.9 + 0.1 * t})` }} />
    <p dir={lang === "ar" ? "rtl" : "ltr"} style={{ marginTop: 36, maxWidth: 820, textAlign: "center", textWrap: "balance", fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: 64, lineHeight: 1.25, color: C.ink, opacity: tag, transform: `translateY(${(1 - tag) * 16}px)`, letterSpacing: lang === "ar" ? 0 : -1 }}>{text}</p>
  </div>
);
