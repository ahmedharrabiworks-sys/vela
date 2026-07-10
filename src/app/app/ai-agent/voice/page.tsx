"use client";

import { useState, useEffect, useRef } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { DEFAULT_VOICE_ID } from "@/lib/vapi-agent-config";

const VOICES = [
  { id: "PIGsltMj3gFMR34aFDI3", name: "Marcus", description: "Deep, authoritative male", gender: "M" },
  { id: "EST9Ui6982FZPSi7gCHi", name: "Aria",   description: "Warm, professional female", gender: "F" },
  { id: "Wq15xSaY3gWvazBRaGEU", name: "Dylan",  description: "Clear, energetic male", gender: "M" },
  { id: "f5HLTX707KIM4SzJYzSz", name: "Luna",   description: "Calm, elegant female", gender: "F" },
  { id: "6aDn1KB0hjpdcocrUkmq", name: "Cole",   description: "Confident, smooth male", gender: "M" },
];

export default function VoicePage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [speed, setSpeed]   = useState(0.85);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const bg          = isDark ? "#0F1117" : "#F8F9FF";
  const cardBg      = isDark ? "#13161F" : "#FFFFFF";
  const border      = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const inputBg     = isDark ? "#0F1117" : "#F9FAFB";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/settings");
        if (res.ok) {
          const data = await res.json() as { voiceId?: string; speed?: number };
          if (data.voiceId) setSelectedVoice(data.voiceId);
          if (data.speed)   setSpeed(data.speed);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const playPreview = async (voiceId: string) => {
    if (playing === voiceId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (playing) {
      audioRef.current?.pause();
    }
    setPlaying(voiceId);
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
        setPlaying(null);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(null); };
      await audio.play();
    } catch {
      setPlaying(null);
      setPreviewNote("Preview unavailable — add ELEVEN_LABS_API_KEY to .env.local to enable voice samples.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/ai-agent/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: selectedVoice, speed }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" style={{ background: bg, minHeight: 240 }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>{t("aiAgent.voice.pageTitle")}</h1>
        <p className="text-sm" style={{ color: textMuted }}>{t("aiAgent.voice.subtitle")}</p>
      </div>

      {/* Voice picker */}
      <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: border }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: textPrimary }}>{t("aiAgent.voice.selectVoice")}</h2>
        <div className="space-y-2">
          {VOICES.map((v) => {
            const active    = selectedVoice === v.id;
            const isPlaying = playing === v.id;
            return (
              <div
                key={v.id}
                className="flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer"
                style={{
                  background:   active ? (isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0") : inputBg,
                  borderColor:  active ? "#FF6B35" : border,
                }}
                onClick={() => setSelectedVoice(v.id)}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: active ? "linear-gradient(135deg, #FF6B35, #FF3366)" : (isDark ? "#1E2130" : "#F3F4F6"),
                    color: active ? "white" : textMuted,
                  }}
                >
                  {v.gender}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: textPrimary }}>{v.name}</p>
                  <p className="text-xs" style={{ color: textMuted }}>{v.description}</p>
                </div>

                {/* Test button */}
                <button
                  onClick={(e) => { e.stopPropagation(); playPreview(v.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                  style={{
                    background: isPlaying
                      ? (isDark ? "rgba(255,107,53,0.2)" : "#FFF5F0")
                      : (isDark ? "#1E2130" : "#F3F4F6"),
                    color:       isPlaying ? "#FF6B35" : textMuted,
                    border:      `1px solid ${isPlaying ? "#FF6B35" : border}`,
                  }}
                  title={isPlaying ? "Stop preview" : "Play a sample of this voice"}
                >
                  {isPlaying ? (
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

                {/* Check */}
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
        {previewNote && (
          <p className="text-xs mt-3 px-1" style={{ color: textMuted }}>
            ℹ {previewNote}
          </p>
        )}
      </div>

      {/* Speed slider */}
      <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: border }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>{t("aiAgent.voice.speakingSpeed")}</h2>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
            >
              {speed.toFixed(2)}×
            </span>
            <button
              onClick={() => playPreview(playing === "speed-preview" ? "speed-preview" : selectedVoice)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isDark ? "#1E2130" : "#F3F4F6",
                color: textMuted,
                border: `1px solid ${border}`,
              }}
              title="Preview current speed with selected voice"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>
              </svg>
              {t("aiAgent.voice.previewSpeed")}
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #FF6B35 ${((speed - 0.5) / 1) * 100}%, ${isDark ? "#2A2D3A" : "#E5E7EB"} ${((speed - 0.5) / 1) * 100}%)`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px]" style={{ color: textMuted }}>Slower (0.5×)</span>
          <span className="text-[10px]" style={{ color: textMuted }}>Default (1.0×)</span>
          <span className="text-[10px]" style={{ color: textMuted }}>Faster (1.5×)</span>
        </div>
        <p className="text-xs mt-3" style={{ color: textMuted }}>
          {speed < 0.8
            ? "Very slow — great for complex topics or international callers"
            : speed < 0.95
            ? "Slightly slower — authoritative and clear"
            : speed <= 1.05
            ? "Natural conversational speed"
            : speed < 1.2
            ? "Slightly faster — energetic and efficient"
            : "Fast — concise, high-paced conversations"}
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-500 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("aiAgent.voice.saved")}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
        >
          {saving ? t("common.saving") : t("aiAgent.voice.save")}
        </button>
      </div>
    </div>
  );
}
