"use client";

import { useI18n } from "@/lib/i18n";

/* ═══════════════════════════════════════════════════════════════
   Hero v2 round: the shared phone device + 3 screens, ported 1:1 from
   reference/Main.dc.html + Phone.dc.html (both files share this exact
   device markup -- only the outer 3D stage differs between desktop and
   phone, see HeroDesktopStory.tsx / HeroPhoneStory.tsx). Do not ship
   the .dc.html files themselves; this is the real rebuild.

   Timing model: every element schedules itself via CSS animation-delay
   (v-in/v-out/v-pop/v-drop/v-ring/v-typing/v-dot/v-select in
   globals.css, exact same names/durations/easings as the spec) rather
   than a JS setTimeout chain -- "animations restart when a step is
   shown" is just "mount fresh DOM nodes," which the two callers already
   do by keying the active step. `paused` toggles
   animation-play-state via the .v-story-paused class (IntersectionObserver-
   driven, see the callers) and prefers-reduced-motion is handled by the
   matching global media query in globals.css (both defined once, not
   duplicated per screen).

   Avatars (exactly 3 kinds in the spec, no initials avatar):
   - Customer: white silhouette on a grey (#CFC8C3) circle.
   - Plain business (both "Your business" pre-Vela AND "Another
     business"): a generic storefront glyph -- same icon, different
     label, matching the spec exactly (the whole point of the story is
     they look the same until Vela answers).
   - Vela: the real logo mark (not the spec's rough placeholder path,
     per the explicit "use the real Vela logo assets" instruction),
     forced white, on the orange gradient. */

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

/* Real Vela mark (Logo.tsx's own SVG-fallback path), forced white, on
   the brand gradient -- replaces the spec's rough placeholder mark. */
function VelaAvatar({ size = 22, radius = "50%" }: { size?: number; radius?: string }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: radius, background: "linear-gradient(140deg, #C2410C, #FF6B35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M5 7L18 28L31 7" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="18" cy="30" r="2.5" fill="#FFFFFF" />
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

function CheckIcon({ size = 15, width = 2.6 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
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

/* ═══ iOS call-screen control grid icons (FIX 1 round) ═══ */
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

/* One 64px translucent circle button + 11px label, real-iOS-call style. */
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

/* ═══ Screen 0: "Without Vela" -- call crossfades into chat ═══ */
function ScreenWithoutVela() {
  const { t } = useI18n();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Call layer -- visible (opacity:1, vOut's "from") until 3.4s, then
          fades out over .5s. FIX 1 round: rebuilt to look like a real iOS
          outgoing call -- contact photo + large name + status line (was a
          giant pulsing-ring avatar in the middle), a real 2x3 iOS control
          grid (Speaker/FaceTime/Mute, Add/End/Keypad) instead of a single
          center avatar. The "calling..." text itself pulses gently
          (.v-call-pulse, its own always-on animation, independent of this
          layer's own v-out fade) rather than rings around an avatar. */}
      <div className="v-out" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #3A2A22 0%, #120D0B 100%)", animationDelay: "3.4s" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, background: "radial-gradient(ellipse 240px 160px at 50% 0%, rgba(255,150,90,0.16), transparent 72%)", pointerEvents: "none" }} aria-hidden="true" />
        <StatusBar time="11:48" dark />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 30 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#3B312B", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StorefrontIcon size={26} />
          </div>
          <div style={{ fontFamily: "var(--font-display), 'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 300, letterSpacing: "-0.01em", color: "#FFFFFF" }}>{t("landing.hero.story2.yourBusiness")}</div>
          <div style={{ position: "relative", width: 200, height: 18 }}>
            <div className="v-out" style={{ position: "absolute", inset: 0, animationDelay: "2.6s" }}>
              <span className="v-call-pulse" style={{ display: "block", textAlign: "center", fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.58)" }}>{t("landing.hero.story2.callingLabel")}</span>
            </div>
            <div className="v-in" style={{ position: "absolute", inset: 0, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#FF7A7A", animationDelay: "2.6s" }}>{t("landing.hero.story2.noAnswer")}</div>
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

      {/* Chat layer -- hidden (opacity:0, vIn's "from") until 3.4s, then fades in */}
      <div className="v-in" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#F6F2EF", animationDelay: "3.4s" }}>
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
          <div className="v-pop" style={{ alignSelf: "center", fontSize: 11, color: "#9A908A", animationDelay: "3.7s" }}>{t("landing.hero.story2.timestampTonight1149")}</div>
          <div className="v-pop" style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, animationDelay: "3.9s" }}>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgCalledElsewhere")}</div>
            <CustomerAvatar />
          </div>
          <div className="v-pop" style={{ display: "flex", alignItems: "flex-end", gap: 6, animationDelay: "5.0s" }}>
            <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: "#E3DDD9", color: "#6B625C", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <StorefrontIcon size={12} />
            </div>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 18px 6px", background: "#E9E3DF", color: "#17120E", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgSlotAt9")}</div>
          </div>
          <div className="v-pop" style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, animationDelay: "5.9s" }}>
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgPerfectBookMe")}</div>
            <CustomerAvatar />
          </div>
          <div className="v-pop" style={{ marginTop: "auto", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 14, background: "#FDECEC", border: "1px solid #F7C9CA", animationDelay: "6.8s" }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%", background: "#E5484D", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#9B1C20" }}>{t("landing.hero.story2.leadLostTitle")}</span>
              <span style={{ fontSize: 11.5, color: "#B24A4D" }}>{t("landing.hero.story2.leadLostSubtitle")}</span>
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: "10px 12px 26px" }}>
          <div style={{ height: 36, borderRadius: 18, background: "#FFFFFF", border: "1px solid #E9E1DB", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: "#A39A94" }}>{t("landing.hero.story2.messagePlaceholder")}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Screen 1: "With Vela" ═══ */
function ScreenWithVela() {
  const { t } = useI18n();
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#FBF8F6" }}>
      <StatusBar time="11:48" dark={false} />
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 12px", borderBottom: "1px solid #EDE6E1" }}>
        <span style={{ color: "#8A807A", display: "flex" }}><BackChevron /></span>
        <VelaAvatar size={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#17120E" }}>{t("landing.hero.story2.yourBusiness")}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#1F8A4C" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22A559" }} />
            {t("landing.hero.story2.repliesInstantly")}
          </span>
        </div>
      </div>
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 8, padding: "16px 16px" }}>
        <div className="v-pop" style={{ alignSelf: "center", fontSize: 11, color: "#9A908A", animationDelay: "0.1s" }}>{t("landing.hero.story2.timestampTonight1148")}</div>
        <div className="v-pop" style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, animationDelay: "0.3s" }}>
          <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgFreeTonight")}</div>
          <CustomerAvatar />
        </div>
        <div style={{ position: "relative" }}>
          <div className="v-typing" style={{ position: "absolute", left: 28, top: 0, display: "flex", gap: 4, padding: "12px 14px", borderRadius: "18px 18px 18px 6px", background: "#EFE9E5", animationDelay: "0.9s" }}>
            <span className="v-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8AEA8", animationDelay: "0s" }} />
            <span className="v-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8AEA8", animationDelay: "0.15s" }} />
            <span className="v-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8AEA8", animationDelay: "0.3s" }} />
          </div>
          <div className="v-pop" style={{ display: "flex", alignItems: "flex-end", gap: 6, animationDelay: "2.1s" }}>
            <VelaAvatar size={22} />
            <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 18px 6px", background: "linear-gradient(135deg, #D9481F, #FF6B35)", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msgTwoSlots")}</div>
          </div>
        </div>
        <div className="v-pop" style={{ display: "flex", gap: 6, paddingLeft: 28, animationDelay: "2.5s" }}>
          <span style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #F1C8B6", background: "#FFFFFF", color: "#C2410C", fontSize: 12, fontWeight: 600 }}>{t("landing.hero.story2.slot830")}</span>
          <span className="v-select" style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #F1C8B6", background: "#FFFFFF", color: "#C2410C", fontSize: 12, fontWeight: 600, animationDelay: "3.6s" }}>{t("landing.hero.story2.slot915")}</span>
        </div>
        <div className="v-pop" style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6, animationDelay: "4.1s" }}>
          <div style={{ maxWidth: 202, padding: "9px 12px", borderRadius: "18px 18px 6px 18px", background: "#221B17", color: "#FFFFFF", fontSize: 13, lineHeight: 1.38 }}>{t("landing.hero.story2.msg915Please")}</div>
          <CustomerAvatar />
        </div>
        <div className="v-pop" style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 28, width: "calc(100% - 28px)", boxSizing: "border-box", padding: "11px 12px", borderRadius: 14, background: "#FFFFFF", border: "1px solid #CDEBD8", boxShadow: "0 8px 20px -14px rgba(20,90,50,0.5)", animationDelay: "4.8s" }}>
          <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%", background: "#1F9D55", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckIcon size={15} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#145C33" }}>{t("landing.hero.story2.appointmentBookedTitle")}</span>
            <span style={{ fontSize: 11.5, color: "#3C7A57" }}>{t("landing.hero.story2.appointmentBookedSubtitle")}</span>
          </div>
        </div>
        <div className="v-pop" style={{ marginTop: "auto", alignSelf: "center", display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#C2410C", animationDelay: "5.4s" }}>
          <LightningIcon />
          {t("landing.hero.story2.answeredIn2Seconds")}
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: "10px 12px 26px" }}>
        <div style={{ height: 36, borderRadius: 18, background: "#FFFFFF", border: "1px solid #E9E1DB", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: "#A39A94" }}>{t("landing.hero.story2.messagePlaceholder")}</div>
      </div>
    </div>
  );
}

/* ═══ Screen 2: "Next morning" -- lock screen + notification stack ═══ */
function ScreenMorning() {
  const { t } = useI18n();
  const notifs = [
    { time: t("landing.hero.story2.notif1Time"), title: t("landing.hero.story2.notif1Title"), body: t("landing.hero.story2.notif1Body"), delay: "0.4s" },
    { time: t("landing.hero.story2.notif2Time"), title: t("landing.hero.story2.notif2Title"), body: t("landing.hero.story2.notif2Body"), delay: "1.0s" },
    { time: t("landing.hero.story2.notif3Time"), title: t("landing.hero.story2.notif3Title"), body: t("landing.hero.story2.notif3Body"), delay: "1.6s" },
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
          <div key={i} className="v-drop" style={{ display: "flex", gap: 10, padding: "11px 12px", borderRadius: 18, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.14)", animationDelay: n.delay }}>
            <VelaAvatar size={30} radius="8px" />
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
        <div className="v-drop" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "13px 14px", borderRadius: 18, background: "#FFFFFF", animationDelay: "2.3s" }}>
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

export default function StoryDevice({ step, paused }: { step: 0 | 1 | 2; paused: boolean }) {
  return (
    <div
      className={paused ? "v-story-paused" : undefined}
      style={{ position: "relative", width: 300, height: 620, boxSizing: "border-box", padding: 10, borderRadius: 50, background: "linear-gradient(145deg, #2E2824, #0C0A09 62%)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.28), 0 44px 80px -24px rgba(194,65,12,0.38), 0 20px 40px -16px rgba(23,18,14,0.45)" }}
    >
      <div style={{ position: "relative", width: 280, height: 600, borderRadius: 40, overflow: "hidden", background: "#000000" }}>
        {step === 0 && <ScreenWithoutVela />}
        {step === 1 && <ScreenWithVela />}
        {step === 2 && <ScreenMorning />}
      </div>
      {/* Dynamic island -- top:21/left:104/92x27, clear of the status bar's
          time (left, ~30-70px) and signal/wifi/battery icons (right edge),
          matching the spec's exact coordinates so it never overlaps them. */}
      <div style={{ position: "absolute", top: 21, left: 104, width: 92, height: 27, borderRadius: 14, background: "#000000" }} />
    </div>
  );
}
