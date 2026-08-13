"use client";

import { useState, useEffect, useRef } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_VOICE_ID, DEFAULT_SPEED, VOICES } from "@/lib/vapi-agent-config";

const PERSONALITIES = [
  { value: "friendly",     label: "Friendly",     description: "Warm, approachable, builds rapport quickly" },
  { value: "professional", label: "Professional",  description: "Formal, precise, business-focused" },
  { value: "persuasive",   label: "Persuasive",   description: "Confident, highlights value, drives conversions" },
  { value: "concise",      label: "Concise",      description: "Short answers, respects the caller's time" },
];

const GREETING_STYLES = [
  { value: "warm",   label: "Warm welcome",  description: "\"Hi! Thanks for calling [Business]…\"" },
  { value: "pro",    label: "Professional",  description: "\"Good day, you've reached [Business]…\"" },
  { value: "custom", label: "Custom",        description: "Use your custom instructions for greeting" },
];

const LANGUAGES = [
  { value: "",   label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "es", label: "Spanish (Español)" },
];

interface Settings {
  agentName?:          string;
  voiceId?:            string;
  speed?:              number;
  personality?:        string;
  customInstructions?: string;
  greetingStyle?:      string;
  language?:           string;
}

interface PhoneAgentKb {
  services: Array<{ name: string; price: string; duration: string; description: string }>;
  business: { hours: string; address: string; bookingPolicy: string };
  extra: string;
}

const EMPTY_PHONE_KB: PhoneAgentKb = {
  services: [],
  business: { hours: "", address: "", bookingPolicy: "" },
  extra: "",
};

export default function SettingsPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings>({
    agentName:          "Vela",
    voiceId:            DEFAULT_VOICE_ID,
    speed:              DEFAULT_SPEED,
    personality:        "professional",
    customInstructions: "",
    greetingStyle:      "warm",
    language:           "",
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  // Voice card — preview playback state (merged in from the former standalone Voice tab)
  const [playing, setPlaying]         = useState<string | null>(null);
  const [generating, setGenerating]   = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Phone Agent's own knowledge base -- separate from the Training interview's KB,
  // saved independently via its own endpoint (see /api/ai-agent/phone-knowledge).
  const [phoneKb, setPhoneKb]           = useState<PhoneAgentKb>(EMPTY_PHONE_KB);
  const [phoneKbSaving, setPhoneKbSaving] = useState(false);
  const [phoneKbSaved, setPhoneKbSaved]   = useState(false);
  const [phoneKbError, setPhoneKbError]   = useState<string | null>(null);

  const bg          = isDark ? "var(--dm-bg)" : "#F8F9FF";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const inputBg     = isDark ? "var(--dm-bg)" : "#F9FAFB";
  const inputText   = isDark ? "var(--dm-text)" : "#374151";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/settings");
        if (res.ok) {
          const data = await res.json() as Settings;
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch { /* ignore */ }
      try {
        const res = await fetch("/api/ai-agent/phone-knowledge");
        if (res.ok) {
          const data = await res.json() as PhoneAgentKb;
          setPhoneKb({ ...EMPTY_PHONE_KB, ...data, business: { ...EMPTY_PHONE_KB.business, ...(data.business ?? {}) } });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const setPhoneBiz = <K extends keyof PhoneAgentKb["business"]>(key: K, val: string) =>
    setPhoneKb((prev) => ({ ...prev, business: { ...prev.business, [key]: val } }));

  const setPhoneService = (idx: number, field: "name" | "price", val: string) =>
    setPhoneKb((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));

  const addPhoneService = () =>
    setPhoneKb((prev) => ({ ...prev, services: [...prev.services, { name: "", price: "", duration: "", description: "" }] }));

  const removePhoneService = (idx: number) =>
    setPhoneKb((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }));

  const savePhoneKb = async () => {
    setPhoneKbSaving(true);
    setPhoneKbError(null);
    try {
      const res = await fetch("/api/ai-agent/phone-knowledge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...phoneKb, services: phoneKb.services.filter((s) => s.name.trim()) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setPhoneKbError(data.error ?? "Save failed. Please try again");
        setPhoneKbSaving(false);
        return;
      }
      setPhoneKbSaved(true);
      setTimeout(() => setPhoneKbSaved(false), 2500);
    } catch {
      setPhoneKbError("Network error. Please check your connection");
    }
    setPhoneKbSaving(false);
  };

  const set = <K extends keyof Settings>(key: K, val: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/ai-agent/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setSaveError(data.error ?? "Save failed. Please try again");
        setSaving(false);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Network error. Please check your connection");
    }
    setSaving(false);
  };

  const speed    = settings.speed ?? DEFAULT_SPEED;
  const speedPct = ((speed - 0.7) / 0.5) * 100;
  const speedLabel =
    speed < 0.85  ? "Slower. Clear and deliberate"
    : speed <= 1.0 ? "Natural conversational speed"
    : speed <= 1.1 ? "Slightly faster. Energetic and efficient"
    : "Fast. Concise, high-paced";

  const playPreview = async (voiceId: string) => {
    if (generating === voiceId || playing === voiceId) {
      audioRef.current?.pause();
      setPlaying(null);
      setGenerating(null);
      return;
    }
    if (playing) {
      audioRef.current?.pause();
      setPlaying(null);
    }
    setGenerating(voiceId);
    setPreviewNote(null);
    try {
      const res = await fetch("/api/ai-agent/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, speed }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setPreviewNote(data.error ?? "Preview unavailable");
        setGenerating(null);
        return;
      }
      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(null); };
      setGenerating(null);
      setPlaying(voiceId);
      await audio.play();
    } catch {
      setGenerating(null);
      setPlaying(null);
      setPreviewNote("Preview unavailable. Add ELEVEN_LABS_API_KEY to .env.local to enable voice samples.");
    }
  };

  const inputClass = "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all";
  const inputStyle = { background: inputBg, borderColor: border, color: inputText };

  if (loading) {
    return (
      <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-center" style={{ minHeight: 240 }}>
          <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>{t("aiAgent.settings.pageTitle")}</h1>
          <p className="text-sm" style={{ color: textMuted }}>{t("aiAgent.settings.subtitle")}</p>
        </div>

        {/* Two-column row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

          {/* Identity — 3/5 */}
          <div className="lg:col-span-3 rounded-2xl border p-5 space-y-4" style={{ background: cardBg, borderColor: border }}>
            <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>{t("aiAgent.settings.identity")}</h2>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>{t("aiAgent.settings.agentName")}</label>
              <input
                type="text"
                value={settings.agentName ?? ""}
                onChange={(e) => set("agentName", e.target.value)}
                placeholder={t("aiAgent.settings.agentNamePlaceholder")}
                className={inputClass}
                style={inputStyle}
              />
              <p className="text-[10px] mt-1.5" style={{ color: textMuted }}>{t("aiAgent.settings.agentNameHint")}</p>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>{t("aiAgent.settings.language")}</label>
              <select
                value={settings.language ?? ""}
                onChange={(e) => set("language", e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right column — 2/5 */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Personality */}
            <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>{t("aiAgent.settings.personality")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map((p) => {
                  const active = settings.personality === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => set("personality", p.value)}
                      className="flex flex-col gap-1 p-3 rounded-xl border text-left transition-all"
                      style={{
                        background:  active ? (isDark ? "rgba(255,107,53,0.08)" : "#FFF5F0") : inputBg,
                        borderColor: active ? "#FF6B35" : border,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                          style={{ borderColor: "#FF6B35", background: active ? "#FF6B35" : "transparent" }}
                        />
                        <span className="text-xs font-semibold" style={{ color: textPrimary }}>{p.label}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed pl-[18px]" style={{ color: textMuted }}>{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Greeting */}
            <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>{t("aiAgent.settings.greeting")}</h2>
              <div className="space-y-2">
                {GREETING_STYLES.map((g) => {
                  const active = settings.greetingStyle === g.value;
                  return (
                    <button
                      key={g.value}
                      onClick={() => set("greetingStyle", g.value)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                      style={{
                        background:  active ? (isDark ? "rgba(255,107,53,0.08)" : "#FFF5F0") : inputBg,
                        borderColor: active ? "#FF6B35" : border,
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2 shrink-0"
                        style={{ borderColor: "#FF6B35", background: active ? "#FF6B35" : "transparent" }}
                      />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: textPrimary }}>{g.label}</p>
                        <p className="text-[10px]" style={{ color: textMuted }}>{g.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Voice — full width (merged in from the former standalone Voice tab) */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>{t("aiAgent.voice.pageTitle")}</h2>
          <p className="text-xs mb-4" style={{ color: textMuted }}>{t("aiAgent.voice.subtitle")}</p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* Voice list — 3/5 */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold mb-3" style={{ color: textPrimary }}>{t("aiAgent.voice.selectVoice")}</h3>
              {(["male", "female"] as const).map((gender) => (
                <div key={gender} className={gender === "female" ? "mt-4" : ""}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
                    {gender === "male" ? "Male" : "Female"}
                  </p>
                  <div className="space-y-2">
                    {VOICES.filter((v) => v.gender === gender).map((v) => {
                      const active       = settings.voiceId === v.id;
                      const isPlaying    = playing === v.id;
                      const isGenerating = generating === v.id;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer"
                          style={{
                            background:  active ? (isDark ? "rgba(255,107,53,0.09)" : "#FFF5F0") : inputBg,
                            borderColor: active ? "#FF6B35" : border,
                          }}
                          onClick={() => set("voiceId", v.id)}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: active ? "linear-gradient(135deg,#FF6B35,#FF3366)" : (isDark ? "var(--dm-card2)" : "#F3F4F6"),
                              color: active ? "white" : textMuted,
                            }}
                          >
                            {v.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: textPrimary }}>{v.name}</p>
                            <p className="text-xs" style={{ color: textMuted }}>{v.description}</p>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); playPreview(v.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                            style={{
                              background: (isPlaying || isGenerating) ? (isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0") : (isDark ? "var(--dm-card2)" : "#F3F4F6"),
                              color: (isPlaying || isGenerating) ? "#FF6B35" : textMuted,
                              border: `1px solid ${(isPlaying || isGenerating) ? "#FF6B35" : border}`,
                            }}
                          >
                            {isGenerating ? (
                              <>
                                <div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                                <span>…</span>
                              </>
                            ) : isPlaying ? (
                              <>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <rect x="2" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                                  <rect x="5.5" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                                </svg>
                                {t("aiAgent.voice.stop")}
                              </>
                            ) : (
                              <>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>
                                </svg>
                                {t("aiAgent.voice.test")}
                              </>
                            )}
                          </button>

                          {active && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FF6B35" }}>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {previewNote && (
                <p className="text-xs mt-3 px-1" style={{ color: textMuted }}>&#x2139; {previewNote}</p>
              )}
            </div>

            {/* Speed — 2/5 */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold" style={{ color: textPrimary }}>{t("aiAgent.voice.speakingSpeed")}</h3>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
                >
                  {speed.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.7}
                max={1.2}
                step={0.05}
                value={speed}
                onChange={(e) => set("speed", parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #FF6B35 ${speedPct}%, ${isDark ? "var(--dm-border)" : "#E5E7EB"} ${speedPct}%)` }}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px]" style={{ color: textMuted }}>0.7× Slower</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.0× Default</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.2× Faster</span>
              </div>
              <p className="text-xs mt-3" style={{ color: textMuted }}>{speedLabel}</p>
              <button
                onClick={() => playPreview(settings.voiceId ?? DEFAULT_VOICE_ID)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: isDark ? "var(--dm-card2)" : "#F3F4F6",
                  border: `1px solid ${generating === settings.voiceId || playing === settings.voiceId ? "#FF6B35" : border}`,
                  color: generating === settings.voiceId || playing === settings.voiceId ? "#FF6B35" : textMuted,
                }}
              >
                {generating === settings.voiceId ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                    Generating…
                  </>
                ) : playing === settings.voiceId ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="2" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                      <rect x="5.5" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                    </svg>
                    {t("aiAgent.voice.stop")}
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>
                    </svg>
                    {t("aiAgent.voice.previewSpeed")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Phone Agent Knowledge Base — full-width, editable directly, separate from
            the Training interview's knowledge panel. Automatically merged with the
            Training/Magic Import knowledge base wherever the real Phone Agent or the
            internal Assistant build their context -- see src/lib/knowledge-base.ts. */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Phone Agent Knowledge Base</h2>
          <p className="text-xs mb-4" style={{ color: textMuted }}>
            What your real Phone Agent knows when answering customer calls. Separate from the Training interview: edit it here directly. Automatically combined with anything learned via Training or file/link analysis.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Hours</label>
              <input
                type="text"
                value={phoneKb.business.hours}
                onChange={(e) => setPhoneBiz("hours", e.target.value)}
                placeholder="Mon–Sat 9:00–17:00"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Address</label>
              <input
                type="text"
                value={phoneKb.business.address}
                onChange={(e) => setPhoneBiz("address", e.target.value)}
                placeholder="Where you're located"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Booking Policy</label>
              <input
                type="text"
                value={phoneKb.business.bookingPolicy}
                onChange={(e) => setPhoneBiz("bookingPolicy", e.target.value)}
                placeholder="How customers book"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: textMuted }}>Services</label>
              <button
                type="button"
                onClick={addPhoneService}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: "#FF6B35" }}
              >
                + Add service
              </button>
            </div>
            {phoneKb.services.length === 0 ? (
              <p className="text-[11px]" style={{ color: textMuted }}>No services added yet.</p>
            ) : (
              <div className="space-y-2">
                {phoneKb.services.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => setPhoneService(i, "name", e.target.value)}
                      placeholder="Service name"
                      className={`${inputClass} flex-1`}
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={s.price}
                      onChange={(e) => setPhoneService(i, "price", e.target.value)}
                      placeholder="Price"
                      className={inputClass}
                      style={{ ...inputStyle, maxWidth: 120 }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoneService(i)}
                      aria-label="Remove service"
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textMuted }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Extra notes</label>
            <textarea
              value={phoneKb.extra}
              onChange={(e) => setPhoneKb((prev) => ({ ...prev, extra: e.target.value }))}
              placeholder="Anything else the Phone Agent should know…"
              rows={3}
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
              style={{ background: inputBg, borderColor: border, color: inputText }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            {phoneKbSaved && (
              <span className="text-sm text-green-500 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
            {phoneKbError && <span className="text-xs text-red-400 leading-snug">{phoneKbError}</span>}
            <button
              onClick={savePhoneKb}
              disabled={phoneKbSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              {phoneKbSaving ? t("common.saving") : "Save Phone Agent Knowledge"}
            </button>
          </div>
        </div>

        {/* Custom instructions — full-width */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>{t("aiAgent.settings.customInstructions")}</h2>
          <p className="text-xs mb-4" style={{ color: textMuted }}>
            Add specific rules or notes. For example: &quot;Always mention our free consultation.&quot; or &quot;Never discuss pricing on the first call.&quot;
          </p>
          <textarea
            value={settings.customInstructions ?? ""}
            onChange={(e) => set("customInstructions", e.target.value)}
            placeholder="Enter any custom rules or context for your AI phone agent…"
            rows={4}
            maxLength={1000}
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            style={{ background: inputBg, borderColor: border, color: inputText }}
          />
          <p className="text-xs mt-2" style={{ color: textMuted }}>
            {(settings.customInstructions ?? "").length} / 1000 characters
          </p>
        </div>

        {/* Save row */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-500 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("aiAgent.settings.saved")}
            </span>
          )}
          {saveError && (
            <span className="text-xs text-red-400 leading-snug">{saveError}</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            {saving ? t("common.saving") : t("aiAgent.settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
