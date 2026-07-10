"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";

interface PhoneState {
  phoneNumber:   string | null;
  phoneNumberId: string | null;
  assistantId:   string | null;
}

export default function PhonePage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [state, setState]         = useState<PhoneState>({ phoneNumber: null, phoneNumberId: null, assistantId: null });
  const [loading, setLoading]     = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  const cardBg      = isDark ? "#13161F" : "#FFFFFF";
  const border      = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textSub     = isDark ? "#94A3B8" : "#6B7280";
  const inputBg     = isDark ? "#0F1117" : "#F9FAFB";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/phone");
        if (res.ok) {
          const data = await res.json() as PhoneState;
          setState(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const provision = async () => {
    setProvisioning(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-agent/phone", { method: "POST" });
      const data = await res.json() as PhoneState & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to provision phone number");
      } else {
        setState(data);
      }
    } catch {
      setError("Network error — please try again.");
    }
    setProvisioning(false);
  };

  const copyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>{t("aiAgent.phone.pageTitle")}</h1>
        <p className="text-sm" style={{ color: textMuted }}>{t("aiAgent.phone.subtitle")}</p>
      </div>

      {/* Active number card */}
      {state.phoneNumber && (
        <div
          className="rounded-2xl border p-6"
          style={{
            background: isDark ? "linear-gradient(135deg,#111420,#161928)" : "linear-gradient(135deg,#FFFAF8,#FFF5F0)",
            borderColor: "rgba(255,107,53,0.3)",
            boxShadow: isDark ? "0 0 24px rgba(255,107,53,0.08)" : "0 0 16px rgba(255,107,53,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
              <span className="text-xs font-semibold text-green-400">{t("aiAgent.phone.active")}</span>
            </div>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
            >
              Vapi
            </span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="white"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Your business number</p>
              <p className="text-2xl font-bold tracking-wide" style={{ color: textPrimary }}>{state.phoneNumber}</p>
            </div>
            <button
              onClick={() => copyNumber(state.phoneNumber!)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0"
              style={{
                background: copied ? (isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4") : inputBg,
                border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : border}`,
                color: copied ? "#22C55E" : textMuted,
              }}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l2.5 2.5 5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t("aiAgent.phone.copied")}
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-5A1.5 1.5 0 000 2.5v5A1.5 1.5 0 001.5 9H3" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  {t("aiAgent.phone.copy")}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Answers calls", value: "24/7 automatically" },
              { label: "Languages", value: "EN, AR, FR, DE + more" },
              { label: "Interruption", value: "Instant barge-in" },
              { label: "Transcription", value: "Full + logged" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>{item.label}</p>
                <p className="text-xs font-semibold" style={{ color: textSub }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provision card */}
      {!state.phoneNumber && (
        <div className="rounded-2xl border p-8 text-center" style={{ background: cardBg, borderColor: border }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M7.7 12.6c1.63 3.27 4.43 5.97 7.7 7.7l2.57-2.57c.35-.35.82-.47 1.17-.23 1.28.47 2.68.7 4.2.7.7 0 1.17.47 1.17 1.17v3.97c0 .7-.47 1.17-1.17 1.17C12.37 24.5 3.5 15.63 3.5 4.67c0-.7.47-1.17 1.17-1.17H8.63c.7 0 1.17.47 1.17 1.17 0 1.52.23 2.92.7 4.2.12.35.08.82-.23 1.17L7.7 12.6z" fill="#FF6B35"/>
              <path d="M18.67 3.5v3.5M16.33 5.83h4.67" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: textPrimary }}>{t("aiAgent.phone.getTitle")}</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: textMuted }}>
            {t("aiAgent.phone.getDesc")}
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6 text-left max-w-sm mx-auto">
            {[
              "Answers every call 24/7",
              "Detects caller language",
              "Books appointments",
              "Logs every call",
              "Full transcripts",
              "Instant barge-in",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,107,53,0.15)" }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.5 1.5 3.5-3.5" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-xs" style={{ color: textSub }}>{feat}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border p-3 mb-4 text-left" style={{ background: isDark ? "rgba(239,68,68,0.07)" : "#FFF5F5", borderColor: "rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-semibold mb-0.5 text-red-400">Provisioning failed</p>
              <p className="text-xs" style={{ color: textMuted }}>{error}</p>
            </div>
          )}

          <button
            onClick={provision}
            disabled={provisioning}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 6px 24px rgba(255,107,53,0.35)" }}
          >
            {provisioning ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Provisioning…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4.4 7.2c.93 1.87 2.53 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V13.33c0 .4-.27.67-.67.67C4.4 14 2 7.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L4.4 7.2z" fill="white"/>
                  <path d="M10 2v2.5M8.67 3.33h2.67" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {t("aiAgent.phone.getBtn")}
              </>
            )}
          </button>
          <p className="text-[10px] mt-3" style={{ color: textMuted }}>
            Powered by Vapi · US number provisioned instantly
          </p>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border p-6" style={{ background: cardBg, borderColor: border }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: textPrimary }}>How inbound calls work</h2>
        <div className="space-y-3">
          {[
            { step: "1", title: "Customer calls your number", desc: "Vela answers immediately — no hold music, no voicemail." },
            { step: "2", title: "Language detection", desc: "Vela detects the caller's language in the first few words and switches automatically." },
            { step: "3", title: "Uses your training", desc: "Vela answers using the business knowledge you taught it in the Training interview." },
            { step: "4", title: "Books appointments", desc: "If the caller wants to book, Vela collects details and confirms the appointment." },
            { step: "5", title: "Call logged automatically", desc: "Full transcript, summary, duration, and language saved to your Calls page." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
              >
                {item.step}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: textPrimary }}>{item.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {state.assistantId && (
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: textPrimary }}>Technical details</h2>
          <div className="space-y-0 divide-y" style={{ borderColor: border }}>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs" style={{ color: textMuted }}>Vapi Assistant ID</span>
              <span className="text-xs font-mono" style={{ color: textSub }}>{state.assistantId.slice(0, 18)}…</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs" style={{ color: textMuted }}>Phone Number ID</span>
              <span className="text-xs font-mono" style={{ color: textSub }}>{state.phoneNumberId?.slice(0, 18)}…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
