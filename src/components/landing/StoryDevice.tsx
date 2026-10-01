"use client";

import { useI18n } from "@/lib/i18n";
import VelaMark from "@/components/landing/VelaMark";

/* ═══════════════════════════════════════════════════════════════
   Hero v2 round: the shared phone device + 3 screens, ported 1:1 from
   reference/Main.dc.html + Phone.dc.html.

   hero-v4 round (FIX 1/2/3) -- rewritten from CSS animation-delay chains
   to a single real-time clock: every visual (opacity/transform/stroke) is
   now a pure function of the `elapsedMs` prop the caller hands down
   (from useAutoplayStep's own clock). This is what makes "nothing
   animates before it's on screen" and "pause/resume exactly where it
   was" both true for free -- there is no CSS @keyframes/animation-delay
   left in this file to race against visibility or to need an
   animation-play-state pause class. Callers (HeroDesktopStory /
   HeroPhoneStory) own the actual autoplay clock and the between-step
   crossfade (see Crossfade.tsx); this component is a pure render of
   "step N at elapsed time T."

   Avatars (exactly 3 kinds in the spec, no initials avatar):
   - Customer: white silhouette on a grey (#CFC8C3) circle.
   - Plain business (both "Your business" pre-Vela AND "Another
     business"): a generic storefront glyph -- same icon, different
     label, matching the spec exactly (the whole point of the story is
     they look the same until Vela answers).
   - Vela: the real logo mark, forced white, on the orange gradient. */

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function easeOutCubic(p: number) {
  const t = clamp01(p);
  return 1 - Math.pow(1 - t, 3);
}
/** Fade + slide up (the old .v-pop feel), pure function of elapsedMs. */
function reveal(elapsedMs: number, atMs: number, durationMs = 420, fromY = 8) {
  const p = easeOutCubic((elapsedMs - atMs) / durationMs);
  return { opacity: p, transform: `translateY(${fromY * (1 - p)}px)` } as React.CSSProperties;
}
/** Fade + drop down (the old .v-drop feel, notification cards). */
function revealDrop(elapsedMs: number, atMs: number, durationMs = 500, fromY = -14) {
  const p = easeOutCubic((elapsedMs - atMs) / durationMs);
  return { opacity: p, transform: `translateY(${fromY * (1 - p)}px) scale(${0.98 + 0.02 * p})` } as React.CSSProperties;
}
/** Trapezoid opacity window: fades in at `start`, holds, fades out before `end`. */
function windowOpacity(elapsedMs: number, start: number, end: number, fadeMs = 200) {
  if (elapsedMs < start || elapsedMs > end) return 0;
  return Math.min(clamp01((elapsedMs - start) / fadeMs), clamp01((end - elapsedMs) / fadeMs), 1);
}
/** Gentle up/down bounce, period-based, pure function of elapsedMs. */
function dotBounce(elapsedMs: number, offsetMs: number, periodMs = 1000) {
  const t = ((((elapsedMs + offsetMs) % periodMs) + periodMs) % periodMs) / periodMs;
  return Math.max(0, Math.sin(t * Math.PI * 2));
}
/** Expanding call-ring pulse, period-based. */
function ringStyle(elapsedMs: number, offsetMs: number, periodMs = 1300) {
  const t = ((((elapsedMs + offsetMs) % periodMs) + periodMs) % periodMs) / periodMs;
  return { transform: `scale(${1 + t * 0.9})`, opacity: 0.6 * (1 - t) } as React.CSSProperties;
}

// FIX 3 round: the red/green dramatic-ending reveal choreography, shared
// by both endings -- color fades in over 900ms, the icon circle scales
// 0.85->1 with its stroke drawing over 600ms starting 500ms in (still
// overlapping the color fade), the text fades up 400ms after the icon
// starts (900ms after the ending itself starts).
const ENDING_COLOR_MS = 900;
const ENDING_ICON_DELAY_MS = 500;
const ENDING_ICON_MS = 600;
const ENDING_TEXT_DELAY_MS = 900;
const ENDING_TEXT_MS = 400;
function endingProgress(elapsedMs: number, startMs: number) {
  return {
    colorP: easeOutCubic((elapsedMs - startMs) / ENDING_COLOR_MS),
    iconP: easeOutCubic((elapsedMs - (startMs + ENDING_ICON_DELAY_MS)) / ENDING_ICON_MS),
    textP: easeOutCubic((elapsedMs - (startMs + ENDING_TEXT_DELAY_MS)) / ENDING_TEXT_MS),
  };
}

// FIX 2 round: exact pacing from Oussama's review (seconds -> ms).
// Exported so callers can size their own autoplay durations and scale
// the desktop floating cards' delays to match, off one source of truth.
export const STORY_DURATIONS_MS = [16500, 13400, 10500];

const S0 = {
  ringsEnd: 3500,
  noAnswerAt: 3500,
  crossfadeStart: 5500,
  crossfadeMs: 800,
  bubble1At: 7000,
  bubble2At: 9000,
  bubble3At: 10800,
  endingStart: 12500,
};
const S1 = {
  customerAt: 600,
  typingStart: 1600,
  typingEnd: 3800,
  replyAt: 3800,
  chipsAt: 5000,
  selectAt: 6600,
  confirmAt: 7600,
  endingStart: 9200,
};
const S2 = {
  notif1At: 800,
  notif2At: 2600,
  notif3At: 4400,
  summaryAt: 6200,
};

function StatusBar({ time, dark }: { time: string; dark: boolean }) {
  const color = dark ? "#FFFFFF" : "#17120E";
  return (
    <div style={{ height: 46, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 0 30px", fontSize: 13, fontWeight: 600, color }}>
      <span dir="ltr">{time}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden="true">
          <path d="M7.5 2.2c2.1 0 4 .8 5.5 2.1l1.1-1.2A9.6 9.6 0 0 0 7.5.5 9.6 9.6 0 0 0 .9 3.1L2 4.3a8 8 0 0 1 5.5-2.1z" />
          <path d="M7.5 5.4c1.3 0 2.4.5 3.3 1.2l1.1-1.2a6.5 6.5 0 0 0-8.8 0l1.1 1.2c.9-.7 2-1.2 3.3-1.2z" />
          <circle cx="7.5" cy="9.3" r="1.6" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <rect x="23" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

function StorefrontIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function CustomerAvatar({ size = 22 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: "50%", background: "#CFC8C3", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
      <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="9" r="4.4" fill="#FFFFFF" />
        <path d="M3.2 24c0-5.2 3.9-8.4 8.8-8.4s8.8 3.2 8.8 8.4z" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

function BackChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function LightningIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 010 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M18 6.5a8 8 0 010 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function FaceTimeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="3" />
      <path d="M16 10.3L21.5 7v10l-5.5-3.3z" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0012 0M12 17v3" />
    </svg>
  );
}
function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M18 8v6M15 11h6" />
    </svg>
  );
}
function KeypadIcon() {
  const dots = [6, 12, 18];
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {dots.flatMap((cy) => dots.map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" />))}
    </svg>
  );
}
function EndCallIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function CallButton({ icon, label, end }: { icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64 }}>
      <div
        style={{
          width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: end ? "#E5484D" : "rgba(255,255,255,0.14)",
          border: end ? "none" : "1px solid rgba(255,255,255,0.18)",
          color: "#FFFFFF",
          boxShadow: end ? "0 10px 24px -6px rgba(229,72,77,0.6)" : "none",
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{label}</span>
    </div>
  );
}

/* ═══ Screen 0: "Without Vela" -- call crossfades into chat, ends red ═══ */
function ScreenWithoutVela({ elapsedMs }: { elapsedMs: number }) {
  const { t } = useI18n();
  const chatP = easeOutCubic((elapsedMs - S0.crossfadeStart) / S0.crossfadeMs);
  const callOpacity = 1 - chatP;
  const chatOpacity = chatP;
  const callingTextOpacity = 1 - clamp01((elapsedMs - S0.noAnswerAt) / 300);
  const noAnswerTextOpacity = clamp01((elapsedMs - S0.noAnswerAt) / 300);
  const { colorP, iconP, textP } = endingProgress(elapsedMs, S0.endingStart);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Call layer */}
      <div style={{ position: "absolute", inset: 0, opacity: callOpacity, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #3A2A22 0%, #120D0B 100%)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, background: "radial-gradient(ellipse 240px 160px at 50% 0%, rgba(255,150,90,0.16), transparent 72%)", pointerEvents: "none" }} aria-hidden="true" />
        <StatusBar time="11:48" dark />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 30 }}>
          <div style={{ position: "relative", width: 56, height: 56 }}>
            {/* FIX 2 round: expanding call rings, revived from the spec --
                period-based pure function of elapsedMs, so pausing just
                freezes them mid-pulse, exactly where they were. */}
            {elapsedMs < S0.ringsEnd && [0, 650].map((offset) => (
              <div key={offset} aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", ...ringStyle(elapsedMs, offset) }} />
            ))}
            <div style={{ position: "relative", width: 56, height: 56, borderRadius: "50%", background: "#3B312B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <StorefrontIcon size={26} />
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-display), 'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 300, letterSpacing: "-0.01em", color: "#FFFFFF" }}>{t("landing.hero.story2.yourBusiness")}</div>
          <div style={{ position: "relative", width: 200, height: 18 }}>
            <div style={{ position: "absolute", inset: 0, opacity: callingTextOpacity, textAlign: "center", fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.58)" }}>{t("landing.hero.story2.callingLabel")}</div>
            <div style={{ position: "absolute", inset: 0, opacity: noAnswerTextOpacity, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#FF7A7A" }}>{t("landing.hero.story2.noAnswer")}</div>
          </div>
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, alignItems: "center", paddingBottom: 44 }}>
          <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
            <CallButton icon={<SpeakerIcon />} label={t("landing.hero.story2.callSpeaker")} />
            <CallButton icon={<FaceTimeIcon />} label={t("landing.hero.story2.callFaceTime")} />
            <CallButton icon={<MuteIcon />} label={t("landing.hero.story2.callMute")} />
          </div>
          <div style={{ display: "flex", gap: 26, justifyContent: "center" }}>
            <CallButton icon={<AddIcon />} label={t("landing.hero.story2.callAdd")} />
            <CallButton icon={<EndCallIcon />} label={t("landing.hero.story2.callEnd")} end />
            <CallButton icon={<KeypadIcon />} label={t("landing.hero.story2.callKeypad")} />
          </div>
        </div>
      </div>

      {/* Chat layer */}
      <div style={{ position: "absolute", inset: 0, opacity: chatOpacity, display: "flex", flexDirection: "column", background: "#F6F2EF" }}>
        <StatusBar time="11:49" dark={false} />
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 12px", borderBottom: "1px solid #EDE6E1" }}>
          <span style={{ color: "#8A807A", display: "flex" }}><BackChevron /></span>
          <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: "#E3DDD9", color: "#6B625C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StorefrontIcon size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#17120E" }}>{t("landing.hero.story2.anotherBusiness")}</span>
            <span style={{ fontSize: 11.5, color: "#8A807A" }}>{t("landing.hero.story2.online")}</span>
          </div>
        </div>
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 8, padding: "16px 16px" }}>
          <div style={{ alignSelf: "center", fontSize: 11, color: "#9A908A", ...reveal(elapsedMs, S0.crossfadeStart + S0.crossfadeMs + 100) }}>{t("landing.hero.story2.timestampTonight1149")}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S0.bubble1At) }}>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgCalledElsewhere")}</div>
            <CustomerAvatar />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S0.bubble2At) }}>
            <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: "#E3DDD9", color: "#6B625C", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <StorefrontIcon size={12} />
            </div>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 18px 6px", background: "#E9E3DF", color: "#17120E", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgSlotAt9")}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S0.bubble3At) }}>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgPerfectBookMe")}</div>
            <CustomerAvatar />
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: "10px 12px 26px" }}>
          <div style={{ height: 36, borderRadius: 18, background: "#FFFFFF", border: "1px solid #E9E1DB", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: "#A39A94" }}>{t("landing.hero.story2.messagePlaceholder")}</div>
        </div>

        {/* Dramatic red ending -- FIX 3: color fades in over 900ms (a soft
            tint deepening to full, since this whole layer's opacity is
            the color fade -- not a hard cut), icon scale 0.85->1 + stroke
            draw over 600ms starting 500ms in, text fading up 400ms after
            the icon starts. Every value below is a pure function of
            elapsedMs -- no CSS animation involved, so pausing is simply
            "elapsedMs stopped changing." */}
        <div style={{ position: "absolute", inset: 0, opacity: colorP, background: "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.16), transparent 62%), #E5484D", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 5 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" style={{ opacity: iconP, transform: `scale(${0.85 + 0.15 * iconP})` }}>
            <circle cx="44" cy="44" r="44" fill="#FFFFFF" />
            <path d="M30 30L58 58M58 30L30 58" stroke="#E5484D" strokeWidth="5" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - iconP} />
          </svg>
          <div style={{ opacity: textP, transform: `translateY(${8 * (1 - textP)}px)`, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{t("landing.hero.story2.leadLostTitle")}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>{t("landing.hero.story2.leadLostSubtitle")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Screen 1: "With Vela" -- ends green ═══ */
function ScreenWithVela({ elapsedMs }: { elapsedMs: number }) {
  const { t } = useI18n();
  const typingOpacity = windowOpacity(elapsedMs, S1.typingStart, S1.typingEnd, 200);
  const selectP = easeOutCubic((elapsedMs - S1.selectAt) / 300);
  const { colorP, iconP, textP } = endingProgress(elapsedMs, S1.endingStart);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#FBF8F6" }}>
      <StatusBar time="11:48" dark={false} />
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 12px", borderBottom: "1px solid #EDE6E1" }}>
        <span style={{ color: "#8A807A", display: "flex" }}><BackChevron /></span>
        <VelaMark size={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#17120E" }}>{t("landing.hero.story2.yourBusiness")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#1F8A4C" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22A559" }} />
            {t("landing.hero.story2.repliesInstantly")}
          </span>
        </div>
      </div>
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 8, padding: "16px 16px" }}>
        <div style={{ alignSelf: "center", fontSize: 11, color: "#9A908A", ...reveal(elapsedMs, 100) }}>{t("landing.hero.story2.timestampTonight1148")}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S1.customerAt) }}>
          <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgFreeTonight")}</div>
          <CustomerAvatar />
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 0, display: "flex", gap: 4, padding: "12px 14px", borderRadius: "18px 18px 18px 6px", background: "#EFE9E5", opacity: typingOpacity }}>
            {[0, 150, 300].map((offset) => {
              const b = dotBounce(elapsedMs, offset);
              return <span key={offset} style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8AEA8", opacity: 0.35 + 0.65 * b, transform: `translateY(${-2 * b}px)` }} />;
            })}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S1.replyAt) }}>
            <VelaMark size={22} />
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 18px 6px", background: "linear-gradient(135deg, #D9481F, #FF6B35)", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgTwoSlots")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, paddingLeft: 28, ...reveal(elapsedMs, S1.chipsAt) }}>
          <span style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #F1C8B6", background: "#FFFFFF", color: "#C2410C", fontSize: 12, fontWeight: 600 }}>{t("landing.hero.story2.slot830")}</span>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #F1C8B6", background: "#FFFFFF", color: "#C2410C", fontSize: 12, fontWeight: 600, display: "block", opacity: 1 - selectP }}>{t("landing.hero.story2.slot915")}</span>
            <span style={{ position: "absolute", inset: 0, padding: "6px 12px", borderRadius: 999, border: "1px solid #E8552B", background: "#E8552B", color: "#FFFFFF", fontSize: 12, fontWeight: 600, opacity: selectP, display: "flex", alignItems: "center", justifyContent: "center" }}>{t("landing.hero.story2.slot915")}</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, ...reveal(elapsedMs, S1.confirmAt) }}>
          <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msg915Please")}</div>
          <CustomerAvatar />
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: "10px 12px 26px" }}>
        <div style={{ height: 36, borderRadius: 18, background: "#FFFFFF", border: "1px solid #E9E1DB", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: "#A39A94" }}>{t("landing.hero.story2.messagePlaceholder")}</div>
      </div>

      {/* Dramatic green ending -- same FIX 3 choreography as the red one. */}
      <div style={{ position: "absolute", inset: 0, opacity: colorP, background: "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.16), transparent 62%), #1F9D55", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 5 }}>
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" style={{ opacity: iconP, transform: `scale(${0.85 + 0.15 * iconP})` }}>
          <circle cx="44" cy="44" r="44" fill="#FFFFFF" />
          <path d="M28 45l11 11 21-24" stroke="#1F9D55" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - iconP} />
        </svg>
        <div style={{ opacity: textP, transform: `translateY(${8 * (1 - textP)}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{t("landing.hero.story2.appointmentBookedTitle")}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", marginTop: 6 }}>{t("landing.hero.story2.appointmentBookedSubtitle")}</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.22)", color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>
            <LightningIcon size={12} />
            {t("landing.hero.story2.answeredIn2Seconds")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══ Screen 2: "Next morning" -- lock screen + notification stack ═══ */
function ScreenMorning({ elapsedMs }: { elapsedMs: number }) {
  const { t } = useI18n();
  const notifs = [
    { time: t("landing.hero.story2.notif1Time"), title: t("landing.hero.story2.notif1Title"), body: t("landing.hero.story2.notif1Body"), at: S2.notif1At },
    { time: t("landing.hero.story2.notif2Time"), title: t("landing.hero.story2.notif2Title"), body: t("landing.hero.story2.notif2Body"), at: S2.notif2At },
    { time: t("landing.hero.story2.notif3Time"), title: t("landing.hero.story2.notif3Title"), body: t("landing.hero.story2.notif3Body"), at: S2.notif3At },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(172deg, #1C130F 0%, #3A1F14 42%, #93360F 78%, #E8552B 100%)" }}>
      <StatusBar time="7:02" dark />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>{t("landing.hero.story2.lockDate")}</span>
        <span dir="ltr" style={{ fontSize: 72, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#FFFFFF" }}>7:02</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "22px 12px 0" }}>
        {notifs.map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "11px 12px", borderRadius: 18, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.14)", ...revealDrop(elapsedMs, n.at) }}>
            <VelaMark size={30} radius="8px" />
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{t("landing.hero.story2.notif1Sender")}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{n.time}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{n.title}</span>
              <span style={{ fontSize: 12, lineHeight: 1.35, color: "rgba(255,255,255,0.78)" }}>{n.body}</span>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "13px 14px", borderRadius: 18, background: "#FFFFFF", ...revealDrop(elapsedMs, S2.summaryAt) }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8552B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#C2410C" }}>{t("landing.hero.story2.whileYouSlept")}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#17120E" }}>{t("landing.hero.story2.threeCustomersNoneMissed")}</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", paddingBottom: 10 }}>
        <div style={{ width: 110, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.85)" }} />
      </div>
    </div>
  );
}

export default function StoryDevice({ step, elapsedMs }: { step: 0 | 1 | 2; elapsedMs: number }) {
  return (
    <div
      style={{ position: "relative", width: 300, height: 620, boxSizing: "border-box", padding: 10, borderRadius: 50, background: "linear-gradient(145deg, #2E2824, #0C0A09 62%)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.28), 0 44px 80px -24px rgba(194,65,12,0.38), 0 20px 40px -16px rgba(23,18,14,0.45)" }}
    >
      <div style={{ position: "relative", width: 280, height: 600, borderRadius: 40, overflow: "hidden", background: "#000000" }}>
        {step === 0 && <ScreenWithoutVela elapsedMs={elapsedMs} />}
        {step === 1 && <ScreenWithVela elapsedMs={elapsedMs} />}
        {step === 2 && <ScreenMorning elapsedMs={elapsedMs} />}
      </div>
      {/* Dynamic island -- top:21/left:104/92x27, clear of the status bar's
          time (left, ~30-70px) and signal/wifi/battery icons (right edge),
          matching the spec's exact coordinates so it never overlaps them. */}
      <div style={{ position: "absolute", top: 21, left: 104, width: 92, height: 27, borderRadius: 14, background: "#000000" }} />
    </div>
  );
}
