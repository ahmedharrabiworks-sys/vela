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
  { value: "pro",    label: "Professional",  description: "\"Welcome to [Business], how can I assist you today?\"" },
  { value: "custom", label: "Custom",        description: "Write exactly what your AI should say" },
];

const LANGUAGES = [
  { value: "",   label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "es", label: "Spanish (Español)" },
];

const GREETING_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French (Français)" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "es", label: "Spanish (Español)" },
  { value: "de", label: "German (Deutsch)" },
];

interface Settings {
  agentName?:          string;
  voiceId?:            string;
  speed?:              number;
  personality?:        string;
  customInstructions?: string;
  greetingStyle?:      string;
  customGreeting?:     string;
  language?:           string;
  greetingLanguage?:   string;
}

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
    customGreeting:     "",
    language:           "",
    greetingLanguage:   "en",
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
      setLoading(false);
    }
    load();
  }, []);

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

        {/* Identity / Personality & Tone / Greeting Style — stacked, each card
            sized to its own content. Was a height-matched 2-column grid; that
            left a dead zone under Identity since its content is much shorter
            than Personality + Greeting combined. */}
        <div className="space-y-5">

          {/* Identity */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: cardBg, borderColor: border }}>
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

        </div>

        {/* Greeting Style + Speaking Speed — merged two-column card. Each column
            uses items-start so a taller sibling never pads out the shorter one. */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>{t("aiAgent.settings.greeting")}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

            {/* Greeting Style + custom script + Greeting Language — left */}
            <div className="space-y-4">
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

              {settings.greetingStyle === "custom" && (
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Custom greeting script</label>
                  <textarea
                    value={settings.customGreeting ?? ""}
                    onChange={(e) => set("customGreeting", e.target.value)}
                    placeholder="Write exactly what your AI should say when it answers a call..."
                    rows={3}
                    maxLength={300}
                    className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
                    style={{ background: inputBg, borderColor: border, color: inputText }}
                  />
                  <p className="text-[10px] mt-1.5" style={{ color: textMuted }}>
                    {(settings.customGreeting ?? "").length} / 300 characters
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Greeting Language</label>
                <select
                  value={settings.greetingLanguage || "en"}
                  onChange={(e) => set("greetingLanguage", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  {GREETING_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <p className="text-[10px] mt-1.5" style={{ color: textMuted }}>
                  Controls only the opening line, spoken before Vela has heard the caller.
                </p>
              </div>
            </div>

            {/* Speaking Speed — right */}
            <div className="max-w-md">
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

        {/* Voice — full width (merged in from the former standalone Voice tab).
            Speaking Speed now lives in the merged Greeting card above; this card
            is voice selection only. */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>{t("aiAgent.voice.pageTitle")}</h2>
          <p className="text-xs mb-4" style={{ color: textMuted }}>{t("aiAgent.voice.subtitle")}</p>

          <div>
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
