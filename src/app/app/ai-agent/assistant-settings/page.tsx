"use client";

import { useState, useEffect, useRef } from "react";
import { useAgentTheme } from "../layout";
import { DEFAULT_VOICE_ID, clampSpeed } from "@/lib/vapi-agent-config";

const VOICES = [
  { id: "PIGsltMj3gFMR34aFDI3", name: "Marcus", description: "Deep, authoritative male",    gender: "M" },
  { id: "EST9Ui6982FZPSi7gCHi", name: "Aria",   description: "Warm, professional female",   gender: "F" },
  { id: "Wq15xSaY3gWvazBRaGEU", name: "Dylan",  description: "Clear, energetic male",       gender: "M" },
  { id: "f5HLTX707KIM4SzJYzSz", name: "Luna",   description: "Calm, elegant female",        gender: "F" },
  { id: "6aDn1KB0hjpdcocrUkmq", name: "Cole",   description: "Confident, smooth male",      gender: "M" },
];

const CONV_STYLES = [
  { value: "direct",   label: "Direct",   description: "Straight to the answer. No filler." },
  { value: "warm",     label: "Warm",     description: "Friendly and natural. Feels human." },
  { value: "thorough", label: "Thorough", description: "Full context and clear explanations." },
  { value: "brief",    label: "Brief",    description: "Ultra-short. Maximum information density." },
];

export default function AssistantSettingsPage() {
  const { isDark } = useAgentTheme();
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [speed, setSpeed]           = useState(0.85);
  const [convStyle, setConvStyle]   = useState("warm");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [playing, setPlaying]       = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const bg          = isDark ? "#0B0D14" : "#F8F9FF";
  const cardBg      = isDark ? "#111420" : "#FFFFFF";
  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const inputBg     = isDark ? "#0B0D14" : "#F9FAFB";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/assistant-settings");
        if (res.ok) {
          const data = await res.json() as { voiceId?: string; speed?: number; conversationStyle?: string };
          if (data.voiceId) setSelectedVoice(data.voiceId);
          if (typeof data.speed === "number") setSpeed(clampSpeed(data.speed));
          if (data.conversationStyle) setConvStyle(data.conversationStyle);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const playPreview = async (voiceId: string) => {
    if (generating === voiceId || playing === voiceId) {
      audioRef.current?.pause();
      setPlaying(null);
      setGenerating(null);
      return;
    }
    if (playing) { audioRef.current?.pause(); setPlaying(null); }
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
      setPreviewNote("Preview unavailable — add ELEVEN_LABS_API_KEY to .env.local to enable voice samples.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/ai-agent/assistant-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: selectedVoice, speed: clampSpeed(speed), conversationStyle: convStyle }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const speedPct = ((speed - 0.7) / 0.5) * 100;
  const speedLabel =
    speed < 0.85  ? "Slower — clear and deliberate"
    : speed <= 1.0 ? "Natural conversational speed"
    : speed <= 1.1 ? "Slightly faster — energetic and efficient"
    :                "Fast — concise, high-paced";

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
          <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>Assistant Settings</h1>
          <p className="text-sm" style={{ color: textMuted }}>
            Configure how Vela sounds and communicates when talking to you — independent from your phone agent.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Voice list — 3/5 */}
          <div className="lg:col-span-3 rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: textPrimary }}>Voice</h2>
            <div className="space-y-2">
              {VOICES.map((v) => {
                const active       = selectedVoice === v.id;
                const isPlaying    = playing    === v.id;
                const isGenerating = generating === v.id;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer"
                    style={{
                      background:  active ? (isDark ? "rgba(255,107,53,0.09)" : "#FFF5F0") : inputBg,
                      borderColor: active ? "#FF6B35" : border,
                    }}
                    onClick={() => setSelectedVoice(v.id)}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: active ? "linear-gradient(135deg,#FF6B35,#FF3366)" : (isDark ? "#1A1D2A" : "#F3F4F6"),
                        color: active ? "white" : textMuted,
                      }}
                    >
                      {v.gender}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: textPrimary }}>{v.name}</p>
                      <p className="text-xs" style={{ color: textMuted }}>{v.description}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void playPreview(v.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
                      style={{
                        background: (isPlaying || isGenerating) ? (isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0") : (isDark ? "#1A1D2A" : "#F3F4F6"),
                        color:      (isPlaying || isGenerating) ? "#FF6B35" : textMuted,
                        border:     `1px solid ${(isPlaying || isGenerating) ? "#FF6B35" : border}`,
                      }}
                    >
                      {isGenerating ? (
                        <><div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" /><span>…</span></>
                      ) : isPlaying ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="2" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                            <rect x="5.5" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>
                          </svg>
                          Test
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
            {previewNote && (
              <p className="text-xs mt-3 px-1" style={{ color: textMuted }}>&#x2139; {previewNote}</p>
            )}
          </div>

          {/* Right column — speed + style + save (2/5) */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Speed card */}
            <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>Speaking Speed</h2>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
                >
                  {speed.toFixed(2)}×
                </span>
              </div>
              <input
                type="range" min={0.7} max={1.2} step={0.05} value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #FF6B35 ${speedPct}%, ${isDark ? "#2A2D3A" : "#E5E7EB"} ${speedPct}%)` }}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px]" style={{ color: textMuted }}>0.7× Slower</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.0× Default</span>
                <span className="text-[9px]" style={{ color: textMuted }}>1.2× Faster</span>
              </div>
              <p className="text-xs mt-3" style={{ color: textMuted }}>{speedLabel}</p>
              <button
                onClick={() => void playPreview(selectedVoice)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: isDark ? "#1A1D2A" : "#F3F4F6",
                  border: `1px solid ${generating === selectedVoice || playing === selectedVoice ? "#FF6B35" : border}`,
                  color: generating === selectedVoice || playing === selectedVoice ? "#FF6B35" : textMuted,
                }}
              >
                {generating === selectedVoice ? (
                  <><div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />Generating…</>
                ) : playing === selectedVoice ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="2" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                      <rect x="5.5" y="2" width="2.5" height="6" rx="0.5" fill="currentColor"/>
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>
                    </svg>
                    Preview at this speed
                  </>
                )}
              </button>
            </div>

            {/* Conversation style card */}
            <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>How it talks</h2>
              <div className="grid grid-cols-2 gap-2">
                {CONV_STYLES.map((s) => {
                  const active = convStyle === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setConvStyle(s.value)}
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
                        <span className="text-xs font-semibold" style={{ color: textPrimary }}>{s.label}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed pl-[18px]" style={{ color: textMuted }}>{s.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save card */}
            <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ background: cardBg, borderColor: border }}>
              <p className="text-xs" style={{ color: textMuted }}>
                Changes apply to your next &ldquo;Talk to Vela&rdquo; session.
              </p>
              {saved && (
                <span className="text-sm text-green-500 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Saved
                </span>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
