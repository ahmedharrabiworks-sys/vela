import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import "./theme";
import { AppScenes, bubbleTimes, dayLanding, EndCard } from "./AppScenes";
import { Captions } from "./Captions";
import { BrandReveal, Night } from "./Night";
import { TIMELINES, wordAt, type Lang, type Timeline } from "./timeline";

// Central SFX table, every entry pinned to a scene or word of the voice.
// Volumes are low: the voice leads; music is added later in the app.
export function sfxTable(tl: Timeline, lang: Lang) {
  const k = tl.cuts;
  const rivalAt = lang === "en" ? wordAt(tl, 1, "So") : wordAt(tl, 1, "فيتصل");
  const rows: Array<{ from: number; src: string; volume: number; until?: number; what: string }> = [];
  for (const at of [0, 52, 104, 156]) if (at < k.s2) rows.push({ from: at, src: "ring", volume: 0.5, until: k.s2, what: "phone rings, unanswered" });
  [8, 34, 52].forEach((d, i) => rows.push({ from: k.s2 + d, src: "ping", volume: [0.5, 0.42, 0.34][i], what: `missed call ${i + 1}` }));
  rows.push({ from: rivalAt, src: "whoosh", volume: 0.28, what: "the clinic down the street answers" });
  rows.push({ from: k.s4, src: "whoosh", volume: 0.42, what: "dark to bright wipe" });
  rows.push({ from: k.s4 + 10 + 14, src: "thump", volume: 0.55, what: "logo lands" });
  rows.push({ from: k.s5a, src: "whoosh", volume: 0.32, what: "phone frame rises" });
  bubbleTimes(tl).forEach((at, i) => rows.push({ from: at, src: "tick", volume: 0.3 - i * 0.02, what: `transcript bubble ${i + 1}` }));
  rows.push({ from: dayLanding(tl), src: "thump", volume: 0.5, what: "booking lands in its slot" });
  rows.push({ from: k.s6b, src: "whoosh", volume: 0.28, what: "week view slides in" });
  for (const at of [k.s7a, k.s7b, k.s7c]) rows.push({ from: at, src: "whoosh", volume: 0.2, what: "quick cut" });
  rows.push({ from: k.s7d, src: "whoosh", volume: 0.26, what: "screens fan out" });
  rows.push({ from: k.s8c + 18, src: "thump", volume: 0.45, what: "end card logo lands" });
  return rows;
}

export const Video: React.FC<{ lang: Lang }> = ({ lang }) => {
  const tl = TIMELINES[lang];
  const k = tl.cuts;
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#120D0B" }}>
      {frame < k.s4 + 24 && <Night tl={tl} lang={lang} />}
      {frame >= k.s4 && frame < k.s5a && <BrandReveal tl={tl} lang={lang} endAt={k.s5a} />}
      {frame >= k.s5a && frame < k.s8c + 14 && <AppScenes tl={tl} lang={lang} />}
      {frame >= k.s8c && <EndCard tl={tl} lang={lang} />}
      <Captions tl={tl} lang={lang} hide={(f, line, text) => line === 3 || f >= k.s8c || text.includes("velaos")} />

      <Sequence from={tl.voiceOffsetFrames}><Audio src={staticFile(`audio/vo-${lang}.mp3`)} /></Sequence>
      {sfxTable(tl, lang).map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.until ? s.until - s.from : undefined}>
          <Audio src={staticFile(`audio/sfx/${s.src}.wav`)} volume={s.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
