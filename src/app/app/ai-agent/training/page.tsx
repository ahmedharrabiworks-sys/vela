"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_VOICE_ID,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  TRAINING_SYSTEM,
  RECORD_ANSWER_TOOL,
} from "@/lib/vapi-agent-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";
type TLine = { role: "user" | "assistant"; text: string };

interface LearnedKb {
  services?: Array<{ name: string; price?: string }>;
  business?: { hours?: string; address?: string; bookingPolicy?: string };
  extra?: string;
}

const WAVE_D = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 560; x += 2) {
    const y = (20 + 12 * Math.sin((x / 70) * Math.PI)).toFixed(1);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ");
})();

/* ── Knowledge field definitions ── */
const KB_FIELDS = [
  { key: "businessType", label: "Business Type",     icon: "🏢", q: 1 },
  { key: "services",     label: "Services & Prices", icon: "💼", q: 2 },
  { key: "hours",        label: "Working Hours",     icon: "🕐", q: 3 },
  { key: "location",     label: "Location / Area",   icon: "📍", q: 4 },
  { key: "booking",      label: "How to Book",       icon: "📅", q: 5 },
  { key: "faqs",         label: "Common Questions",  icon: "💬", q: 6 },
  { key: "special",      label: "What Makes You Special", icon: "⭐", q: 7 },
];

export default function TrainingPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [status, setStatus]       = useState<CallStatus>("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [muted, setMuted]         = useState(false);
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [voiceId, setVoiceId]     = useState(DEFAULT_VOICE_ID);
  const [speed, setSpeed]         = useState(0.85);
  const [learnedKb, setLearnedKb] = useState<LearnedKb | null>(null);
  const [liveKb, setLiveKb]       = useState<Record<string, string>>({});
  const [extracting, setExtracting] = useState(false);
  const [callStart, setCallStart] = useState<number>(0);
  const vapiRef      = useRef<VapiInstance>(null);
  const scaleRef     = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const bg          = isDark ? "#0B0D14" : "#F8F9FF";
  const cardBg      = isDark ? "#111420" : "#FFFFFF";
  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textSub     = isDark ? "#94A3B8" : "#6B7280";

  useEffect(() => {
    fetch("/api/ai-agent/settings")
      .then(r => r.json())
      .then((d: { voiceId?: string; speed?: number }) => {
        if (d.voiceId) setVoiceId(d.voiceId);
        if (typeof d.speed === "number") setSpeed(d.speed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  /* ── Live KB: populated by GPT tool-call events, not positional transcript slicing ── */
  const filledCount     = Object.keys(liveKb).length;
  const progressPct     = Math.round((filledCount / 7) * 100);
  const velaCount       = transcript.filter(l => l.role === "assistant").length;
  const currentQuestion = Math.min(velaCount, 7);

  /* ── After call: extract + save ── */
  const extractKb = useCallback(async (
    lines: TLine[],
    startedAt: number,
    toolCallKb: Record<string, string>
  ) => {
    if (lines.length === 0) return;
    setExtracting(true);
    try {
      const transcriptText = lines.map(l => `${l.role === "assistant" ? "Vela" : "Owner"}: ${l.text}`).join("\n");
      const durationSecs = Math.round((Date.now() - startedAt) / 1000);

      const [saveCallRes, kbRes] = await Promise.all([
        fetch("/api/ai-agent/calls", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_type:        "training",
            duration_seconds: durationSecs,
            transcript:       lines,
            outcome:          "completed",
            kb_extracted:     toolCallKb,
          }),
        }),
        fetch("/api/ai-agent/save-call", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: transcriptText }),
        }),
      ]);

      if (kbRes.ok) {
        const data = await kbRes.json() as { ok: boolean; extracted?: LearnedKb };
        if (data.extracted) setLearnedKb(data.extracted);
      }
      void saveCallRes;
    } catch (err) {
      console.error("[extract]", err);
    }
    setExtracting(false);
  }, []);

  const startCall = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("connecting");
    setTranscript([]);
    setLearnedKb(null);
    setLiveKb({});
    const started = Date.now();
    setCallStart(started);

    setCallError(null);
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;
      const lines: TLine[] = [];
      // Accumulate tool-call KB in a local ref so call-end closure always sees latest
      const toolKb: Record<string, string> = {};

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end",   () => {
        setStatus("ended");
        if (scaleRef.current) scaleRef.current.style.transform = "scaleY(0.2)";
        extractKb(lines, started, { ...toolKb });
      });
      vapi.on("call-start-failed", (e: any) => {
        const msg = e?.error || "Call failed to start — check mic permissions and try again.";
        console.error("[vapi call-start-failed]", e);
        setCallError(msg);
        setStatus("idle");
      });
      vapi.on("error", (e: any) => {
        const msg = typeof e === "string" ? e : (e?.message || e?.error || "An unexpected error occurred");
        console.error("[vapi error]", e);
        setCallError(msg);
        setStatus("idle");
      });

      vapi.on("volume-level", (vol: number) => {
        if (scaleRef.current) scaleRef.current.style.transform = `scaleY(${Math.max(0.2, 1 + vol * 5)})`;
      });

      vapi.on("message", (msg: any) => {
        // Transcript lines
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          const line: TLine = { role: msg.role, text: msg.transcript };
          lines.push(line);
          setTranscript(prev => [...prev, line]);
        }
        // GPT function/tool calls — recordBusinessAnswer fired by the model
        if (msg.type === "tool-calls" && Array.isArray(msg.toolCallList)) {
          msg.toolCallList.forEach((tc: any) => {
            if (tc?.function?.name === "recordBusinessAnswer") {
              try {
                const args = typeof tc.function.arguments === "string"
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments;
                const topic = args?.topic as string | undefined;
                const value = args?.value as string | undefined;
                if (topic && value) {
                  toolKb[topic] = value;
                  setLiveKb(prev => ({ ...prev, [topic]: value }));
                }
              } catch { /* ignore malformed args */ }
            }
          });
        }
      });

      const { stopSpeakingPlan, startSpeakingPlan } = getSpeakingPlanConfig();
      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: TRAINING_SYSTEM }],
          tools: [RECORD_ANSWER_TOOL],
        },
        voice: getVoiceConfig(voiceId, speed),
        firstMessage: "Hi! I'm Vela — I'll learn your business through a quick conversation covering 7 topics. Which language would you prefer?",
        transcriber: getTranscriberConfig(),
        stopSpeakingPlan,
        startSpeakingPlan,
      });
    } catch (err: any) {
      console.error("[call]", err);
      setCallError(err?.message || "Failed to start call — please try again.");
      setStatus("idle");
    }
  }, [status, voiceId, speed, extractKb]);

  const endCall    = useCallback(() => { vapiRef.current?.stop(); }, []);
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted; setMuted(next); vapiRef.current.setMuted(next);
  }, [muted]);
  const reset = useCallback(() => {
    setStatus("idle"); setCallError(null); setTranscript([]); setLearnedKb(null); setLiveKb({}); setMuted(false); vapiRef.current = null;
  }, []);

  const isActive     = status === "active";
  const isConnecting = status === "connecting";
  const showFinalKb  = status === "ended" && learnedKb !== null;
  const showLiveKb   = isActive || isConnecting;

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <style>{`
        @keyframes waveFlow { from{transform:translateX(0)} to{transform:translateX(-280px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes kbFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @media(min-width:768px) { .tr-pad { padding: 20px 24px 32px; margin: -20px -24px -32px; } }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: textPrimary }}>{t("aiAgent.training.pageTitle")}</h1>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              {isActive ? t("aiAgent.training.subtitle").replace("{q}", String(currentQuestion)) : t("aiAgent.training.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{
              background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : status==="ended" ? "#6B7280" : isDark?"#1E2235":"#E5E7EB",
              boxShadow: isActive ? "0 0 8px #22C55E" : "none",
            }}/>
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              {isActive ? t("aiAgent.training.live") : isConnecting ? t("common.connecting") : status==="ended" ? t("aiAgent.training.complete") : t("aiAgent.training.ready")}
            </span>
          </div>
        </div>

        {/* Main 2-col grid */}
        <div className="grid md:grid-cols-5 gap-5">

          {/* LEFT: waveform + controls + compact transcript (2/5) */}
          <div className="md:col-span-2 space-y-4">
            {/* Waveform card */}
            <div className="rounded-2xl border p-5 flex flex-col items-center gap-4" style={{ background: cardBg, borderColor: border }}>
              {/* Wave container */}
              <div className="relative flex items-center justify-center" style={{ width: 240, height: 48 }}>
                <div className="absolute inset-0 rounded-full blur-2xl" style={{
                  background: "radial-gradient(ellipse, rgba(255,51,102,0.2) 0%, transparent 70%)",
                  opacity: isActive ? 0.8 : 0.1,
                  transition: "opacity 0.3s",
                }}/>
                <div style={{ width: 240, height: 36, overflow: "hidden", borderRadius: 4 }}>
                  <div style={{ width: 560, height: 36, animation: (isActive||isConnecting) ? "waveFlow 2.2s linear infinite" : "none", opacity: isActive ? 1 : isConnecting ? 0.5 : 0.12, transition: "opacity 0.4s" }}>
                    <div ref={scaleRef} style={{ width: 560, height: 36, transform: "scaleY(0.2)", transformOrigin: "280px 18px", transition: "transform 0.05s" }}>
                      <svg viewBox="0 0 560 40" width="560" height="40">
                        <defs>
                          <linearGradient id="wg-tr" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FF6B35"/>
                            <stop offset="50%" stopColor="#FF3366"/>
                            <stop offset="100%" stopColor="#FF6B35"/>
                          </linearGradient>
                        </defs>
                        <path d={WAVE_D} fill="none" stroke="url(#wg-tr)" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status text */}
              <p className="text-sm text-center" style={{ color: isConnecting?"#FF6B35":isActive?textPrimary:textMuted }}>
                {isConnecting ? t("common.connecting") : isActive ? (muted ? t("aiAgent.training.muted") : t("aiAgent.training.speakNaturally")) : status==="ended" ? t("aiAgent.training.complete") : extracting ? t("aiAgent.training.saving") : t("aiAgent.training.ready")}
              </p>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {status === "idle" && (
                  <button onClick={startCall}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background:"linear-gradient(135deg,#FF3366,#FF6B35)", boxShadow:"0 4px 20px rgba(255,51,102,0.35)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.3"/>
                      <path d="M5.5 5l3.5 2-3.5 2V5z" fill="white"/>
                    </svg>
                    {t("aiAgent.training.start")}
                  </button>
                )}
                {isConnecting && (
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #FF6B35", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                    <span className="text-sm" style={{ color: textMuted }}>Connecting…</span>
                  </div>
                )}
                {isActive && (
                  <>
                    <button onClick={toggleMute}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: muted?(isDark?"rgba(255,107,53,0.15)":"#FFF5F0"):(isDark?"#1E2235":"#F3F4F6"), color: muted?"#FF6B35":textMuted, border:`1px solid ${muted?"#FF6B35":border}` }}>
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button onClick={endCall}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: isDark?"rgba(239,68,68,0.1)":"#FEF2F2", color:"#EF4444", border:"1px solid rgba(239,68,68,0.3)" }}>
                      {t("aiAgent.training.end")}
                    </button>
                  </>
                )}
                {status === "ended" && !extracting && (
                  <button onClick={reset}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: isDark?"#1E2235":"#F3F4F6", color: textSub }}>
                    {t("aiAgent.training.newInterview")}
                  </button>
                )}
                {extracting && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div style={{ width:12, height:12, borderRadius:"50%", border:"1.5px solid #FF6B35", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                    <span className="text-xs" style={{ color: "#FF6B35" }}>{t("aiAgent.training.saving")}</span>
                  </div>
                )}
              </div>

              {/* Visible error below controls */}
              {callError && (
                <div className="mx-5 mb-4 rounded-xl p-3" style={{ background: isDark?"rgba(239,68,68,0.08)":"#FFF5F5", border:"1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-[10px] font-semibold text-red-400 mb-0.5">Call failed to start</p>
                  <p className="text-[10px]" style={{ color: textMuted }}>{callError}</p>
                  <button onClick={() => setCallError(null)} className="text-[9px] font-medium text-red-400 mt-1 hover:underline">Dismiss</button>
                </div>
              )}
            </div>

            {/* Compact transcript */}
            <div className="rounded-2xl border flex flex-col" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
                <span className="text-xs font-semibold" style={{ color: textPrimary }}>{t("aiAgent.training.transcript")}</span>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-[9px]" style={{ color: "#22C55E" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>{t("aiAgent.training.recording")}
                  </span>
                )}
              </div>
              <div ref={transcriptRef} className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 240 }}>
                {transcript.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: textMuted }}>
                    {status === "idle" ? t("aiAgent.training.noTranscript") : t("aiAgent.training.saving")}
                  </p>
                ) : (
                  transcript.slice(-20).map((line, i) => (
                    <div key={i} className={`flex gap-2 ${line.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[7px] font-bold"
                        style={{ background: line.role==="assistant"?"linear-gradient(135deg,#FF3366,#FF6B35)":isDark?"#2A2D3A":"#F3F4F6", color: line.role==="assistant"?"white":textMuted }}>
                        {line.role === "assistant" ? "V" : "Y"}
                      </div>
                      <div className="max-w-[88%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed"
                        style={{ background: line.role==="assistant"?(isDark?"rgba(255,51,102,0.08)":"#FFF0F5"):(isDark?"#1E2235":"#F3F4F6"), color: textSub }}>
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Live Business Knowledge panel (3/5 — the star) */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border h-full" style={{ background: cardBg, borderColor: border }}>
              {/* Panel header */}
              <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1L8.5 5H13L9.5 7.5l1.5 4L7 9l-4 2.5 1.5-4L1 5h4.5L7 1z" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: textPrimary }}>{t("aiAgent.training.knowledgeTitle")}</p>
                      <p className="text-[10px]" style={{ color: textMuted }}>{t("aiAgent.training.knowledgeSub")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: filledCount > 0 ? "#FF6B35" : textMuted }}>
                      {progressPct}%
                    </p>
                    <p className="text-[9px]" style={{ color: textMuted }}>{filledCount}/7 complete</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full" style={{ background: isDark?"#1E2235":"#F1F5F9" }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width:`${progressPct}%`, background:"linear-gradient(to right,#FF6B35,#FF3366)" }}
                  />
                </div>
              </div>

              {/* Knowledge cards grid */}
              <div className="p-5">
                {status === "idle" && (
                  <div className="py-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="6.5" r="3" stroke="white" strokeWidth="1.3"/>
                          <path d="M3 13s0-2.5 5-2.5 5 2.5 5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: textPrimary }}>{t("aiAgent.training.idlePlaceholder")}</p>
                        <p className="text-xs" style={{ color: textMuted }}>{t("aiAgent.training.idleDesc")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {KB_FIELDS.map((f, i) => (
                        <div key={f.key} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: isDark?"rgba(255,255,255,0.02)":"#F9FAFB", border:`1px solid ${border}` }}>
                          <span className="text-base opacity-35">{f.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: textMuted }}>Q{i+1}</p>
                            <p className="text-[10px] font-medium truncate" style={{ color: textSub }}>{f.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(showLiveKb || status === "ended") && (
                  <div className="space-y-3">
                    {KB_FIELDS.map((f) => {
                      const answered = liveKb[f.key];
                      const isCurrent = currentQuestion === f.q && isActive;
                      const isPending = !answered && currentQuestion < f.q;
                      return (
                        <div
                          key={f.key}
                          className="rounded-xl border transition-all"
                          style={{
                            background: answered
                              ? (isDark?"rgba(255,107,53,0.06)":"rgba(255,107,53,0.03)")
                              : isCurrent
                              ? (isDark?"rgba(255,107,53,0.10)":"#FFF5F0")
                              : (isDark?"rgba(255,255,255,0.02)":"#FAFAFA"),
                            borderColor: answered
                              ? "rgba(255,107,53,0.25)"
                              : isCurrent
                              ? "rgba(255,107,53,0.4)"
                              : border,
                            animation: answered ? "kbFadeIn 0.4s ease-out" : "none",
                          }}
                        >
                          <div className="flex items-start gap-3 p-3.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                              style={{
                                background: answered
                                  ? "linear-gradient(135deg,#FF6B35,#FF3366)"
                                  : isCurrent
                                  ? "rgba(255,107,53,0.15)"
                                  : isDark?"#1E2235":"#F3F4F6",
                              }}
                            >
                              {answered ? (
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                  <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <span style={{ opacity: isCurrent ? 1 : 0.4 }}>{f.icon}</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: answered?"#FF6B35":isCurrent?"#FF6B35":textMuted }}>
                                  {f.label}
                                </p>
                                {isCurrent && !answered && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                                    style={{ background:"rgba(255,107,53,0.15)", color:"#FF6B35" }}>
                                    Listening…
                                  </span>
                                )}
                              </div>
                              {answered ? (
                                <p className="text-xs leading-relaxed line-clamp-3" style={{ color: textSub }}>
                                  {answered}
                                </p>
                              ) : (
                                <p className="text-[10px]" style={{ color: isDark?"#374151":textMuted }}>
                                  {isCurrent ? "Answer this question…" : isPending ? `Question ${f.q} — coming up` : "Waiting…"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Post-call final KB from AI extraction */}
                {showFinalKb && (
                  <div className="mt-4 rounded-xl border p-4" style={{ background: isDark?"rgba(34,197,94,0.05)":"#F0FDF4", borderColor: isDark?"rgba(34,197,94,0.2)":"#BBF7D0" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-green-600">{t("aiAgent.training.savedToKb")}</span>
                    </div>
                    {learnedKb?.services && learnedKb.services.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: textMuted }}>Services</p>
                        {learnedKb.services.slice(0,4).map((s, i) => (
                          <p key={i} className="text-[10px]" style={{ color: textSub }}>• {s.name}{s.price?` — ${s.price}`:""}</p>
                        ))}
                      </div>
                    )}
                    {learnedKb?.business?.hours && (
                      <div className="mb-1">
                        <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: textMuted }}>Hours</p>
                        <p className="text-[10px]" style={{ color: textSub }}>{learnedKb.business.hours}</p>
                      </div>
                    )}
                    {learnedKb?.extra && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: textMuted }}>Extra notes</p>
                        <p className="text-[10px] line-clamp-2" style={{ color: textSub }}>{learnedKb.extra}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
