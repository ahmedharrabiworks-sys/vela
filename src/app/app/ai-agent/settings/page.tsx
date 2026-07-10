"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";

const TONES = [
  { value: "professional", label: "Professional", description: "Formal, precise, business-focused" },
  { value: "friendly",     label: "Friendly",     description: "Warm, casual, approachable" },
  { value: "luxury",       label: "Luxury",       description: "Premium, refined, exclusive feel" },
];

export default function SettingsPage() {
  const { isDark } = useAgentTheme();
  const [tone, setTone] = useState("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const bg = isDark ? "#0F1117" : "#F8F9FF";
  const cardBg = isDark ? "#13161F" : "#FFFFFF";
  const border = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted = isDark ? "#64748B" : "#9CA3AF";
  const inputBg = isDark ? "#0F1117" : "#F9FAFB";
  const inputText = isDark ? "#CBD5E1" : "#374151";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/settings");
        if (res.ok) {
          const data = await res.json() as { tone?: string; customInstructions?: string };
          if (data.tone)               setTone(data.tone);
          if (data.customInstructions) setCustomInstructions(data.customInstructions);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/ai-agent/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, customInstructions }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 p-8" style={{ background: bg }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8" style={{ background: bg }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>Agent Settings</h1>
          <p className="text-sm" style={{ color: textMuted }}>Configure how your AI Agent behaves during voice calls.</p>
        </div>

        {/* Tone */}
        <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: textPrimary }}>Personality Tone</h2>
          <div className="space-y-2">
            {TONES.map((t) => {
              const active = tone === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
                  style={{
                    background: active ? (isDark ? "rgba(255,107,53,0.08)" : "#FFF5F0") : inputBg,
                    borderColor: active ? "#FF6B35" : border,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 shrink-0"
                    style={{
                      borderColor: "#FF6B35",
                      background: active ? "#FF6B35" : "transparent",
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: textPrimary }}>{t.label}</p>
                    <p className="text-xs" style={{ color: textMuted }}>{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom instructions */}
        <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Custom Instructions</h2>
          <p className="text-xs mb-4" style={{ color: textMuted }}>
            Add specific rules or context for your AI Agent. For example: &quot;Always mention our free consultation offer.&quot;
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Enter any custom instructions for your AI Agent…"
            rows={5}
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
            style={{ background: inputBg, borderColor: border, color: inputText }}
          />
          <p className="text-xs mt-2" style={{ color: textMuted }}>
            {customInstructions.length} / 1000 characters
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
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
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
