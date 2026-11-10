import React from "react";
import { useCurrentFrame } from "remotion";
import { C, ease, FONT, SAFE } from "./theme";
import type { Lang, Timeline } from "./timeline";

// Burned-in captions: 2 to 5 words, bold, white on a dark pill, the spoken
// word in orange. Arabic is right to left with Plex Arabic; never mixed.
// Lines whose words are shown by a brand card (logo line, end card) are skipped.
export const Captions: React.FC<{ tl: Timeline; lang: Lang; hide: (frame: number, lineIdx: number, text: string) => boolean }> = ({ tl, lang, hide }) => {
  const frame = useCurrentFrame();
  const cap = tl.captions.find((c) => frame >= c.from && frame < c.to);
  if (!cap || hide(frame, cap.line, cap.text)) return null;
  const t = ease(frame, cap.from, 5);
  const words = cap.text.split(" ");
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE.right - SAFE.left, top: 1330, height: 170, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"} style={{
        maxWidth: SAFE.right - SAFE.left, padding: lang === "ar" ? "10px 30px 16px" : "14px 30px", borderRadius: 26, background: "rgba(18,13,11,0.86)",
        fontFamily: FONT[lang], fontWeight: lang === "ar" ? 700 : 800, fontSize: 60, lineHeight: lang === "ar" ? 1.45 : 1.18, color: "#fff", textAlign: "center",
        letterSpacing: lang === "ar" ? 0 : -0.5, opacity: t, transform: `translateY(${(1 - t) * 10}px) scale(${0.97 + 0.03 * t})`,
      }}>
        {words.map((w, i) => {
          const word = tl.words[cap.words[i]];
          const active = word && frame >= word.from && frame < Math.max(word.to, word.from + 4);
          return <span key={i} style={{ color: active ? C.soft : "#fff" }}>{w}{i < words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </div>
  );
};
