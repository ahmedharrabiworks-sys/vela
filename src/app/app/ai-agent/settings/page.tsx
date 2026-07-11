"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_VOICE_ID, ARABIC_VOICE_ID } from "@/lib/vapi-agent-config";

const VOICES = [
  { id: "PIGsltMj3gFMR34aFDI3", name: "Marcus — Deep male" },
  { id: "EST9Ui6982FZPSi7gCHi", name: "Aria — Warm female" },
  { id: "Wq15xSaY3gWvazBRaGEU", name: "Dylan — Energetic male" },
  { id: "f5HLTX707KIM4SzJYzSz", name: "Luna — Calm female" },
  { id: "6aDn1KB0hjpdcocrUkmq", name: "Cole — Confident male" },
  { id: ARABIC_VOICE_ID,        name: "Arabic Voice — Best for Arabic callers ★" },
];

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

export default function SettingsPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings>({
    agentName:          "Vela",
    voiceId:            DEFAULT_VOICE_ID,
    speed:              0.85,
    personality:        "professional",
    customInstructions: "",
    greetingStyle:      "warm",
    language:           "en",
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);

  const bg          = isDark ? "#0B0D14" : "#F8F9FF";
  const cardBg      = isDark ? "#111420" : "#FFFFFF";
  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const inputBg     = isDark ? "#0B0D14" : "#F9FAFB";
  const inputText   = isDark ? "#CBD5E1" : "#374151";

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
    try {
      await fetch("/api/ai-agent/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const speed    = settings.speed ?? 0.85;
  const speedPct = ((speed - 0.7) / 0.5) * 100;

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>{t("aiAgent.settings.voice")}</label>
                <select
                  value={settings.voiceId ?? ""}
                  onChange={(e) => set("voiceId", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>{t("aiAgent.settings.language")}</label>
                <select
                  value={settings.language ?? "en"}
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

            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>
                Speaking Speed — <span style={{ color: "#FF6B35" }}>{speed.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0.7}
                max={1.2}
                step={0.05}
                value={speed}
                onChange={(e) => set("speed", parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #FF6B35 ${speedPct}%, ${isDark ? "#2A2D3A" : "#E5E7EB"} ${speedPct}%)` }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: textMuted }}>0.7× Slower</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.0× Default</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.2× Faster</span>
              </div>
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
