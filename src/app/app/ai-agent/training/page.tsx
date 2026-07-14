"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_VOICE_ID,
  clampSpeed,
  getDefaultVoiceId,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  buildTrainingSystem,
  RECORD_ANSWER_TOOL,
  CALL_LIMITS,
} from "@/lib/vapi-agent-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";
type TLine = { role: "user" | "assistant"; text: string };

function toErrorText(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const anyE = e as Record<string, unknown>;
    if (typeof anyE.message === "string") return anyE.message;
    if (typeof anyE.error === "string") return anyE.error;
    if (anyE.error && typeof anyE.error === "object") {
      const inner = anyE.error as Record<string, unknown>;
      if (typeof inner.message === "string") return inner.message;
      if (typeof inner.msg === "string") return inner.msg;
      try { return JSON.stringify(anyE.error); } catch { /* ignore */ }
    }
    try { return JSON.stringify(e); } catch { /* ignore */ }
  }
  return "An unexpected error occurred. Please try again.";
}

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
function KbIcon({ field, filled, current }: { field: string; filled: boolean; current: boolean }) {
  const color = filled ? "white" : current ? "#FF6B35" : "#64748B";
  const icons: Record<string, JSX.Element> = {
    businessType: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="4" width="10" height="7" rx="1" stroke={color} strokeWidth="1.2"/>
        <path d="M4 4V3a2 2 0 0 1 4 0v1" stroke={color} strokeWidth="1.2"/>
        <path d="M1 7h10" stroke={color} strokeWidth="1.2"/>
      </svg>
    ),
    services: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="3" width="10" height="7" rx="1" stroke={color} strokeWidth="1.2"/>
        <path d="M4 3V2.5a2 1.5 0 0 1 4 0V3" stroke={color} strokeWidth="1.2"/>
        <path d="M4 6h4M4 8h2" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    hours: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.2"/>
        <path d="M6 3.5V6l2 1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    location: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.63 3.5 6.5 3.5 6.5s3.5-3.87 3.5-6.5C9.5 2.57 7.93 1 6 1z" stroke={color} strokeWidth="1.2"/>
        <circle cx="6" cy="4.5" r="1.2" stroke={color} strokeWidth="1.1"/>
      </svg>
    ),
    booking: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1.5" y="2.5" width="9" height="8" rx="1" stroke={color} strokeWidth="1.2"/>
        <path d="M4 1.5v2M8 1.5v2M1.5 5.5h9" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M4 7.5h1M7 7.5h1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    faqs: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 2h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H7l-2 2V9H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.2"/>
        <path d="M4.5 5h3M4.5 7h2" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    special: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1.5l1.3 2.7 2.9.4-2.1 2 .5 2.9L6 8.1l-2.6 1.4.5-2.9-2.1-2 2.9-.4L6 1.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return icons[field] ?? null;
}

const KB_FIELDS = [
  { key: "businessType", label: "Business Type",          desc: "What you do and who your customers are",           q: 1 },
  { key: "services",     label: "Services & Prices",      desc: "What you offer and what it costs",                 q: 2 },
  { key: "hours",        label: "Working Hours",          desc: "When customers can reach you",                     q: 3 },
  { key: "location",     label: "Location / Area",        desc: "Where you are, or where you go",                   q: 4 },
  { key: "booking",      label: "How to Book",            desc: "How customers get in touch or make a booking",     q: 5 },
  { key: "faqs",         label: "Common Questions",       desc: "What callers ask most often",                      q: 6 },
  { key: "special",      label: "What Makes You Special", desc: "Your edge over similar businesses nearby",         q: 7 },
];

export default function TrainingPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [status, setStatus]       = useState<CallStatus>("idle");
  const [callError, setCallError]         = useState<string | null>(null);
  const [muted, setMuted]                 = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [learnedKb, setLearnedKb] = useState<LearnedKb | null>(null);
  const [liveKb, setLiveKb]       = useState<Record<string, string>>({});
  const [extracting, setExtracting] = useState(false);
  const [callStart, setCallStart] = useState<number>(0);
  const voiceIdRef       = useRef(DEFAULT_VOICE_ID);
  const speedRef         = useRef(0.85);
  const agentLanguageRef = useRef<string | undefined>(undefined);
  const linesRef         = useRef<TLine[]>([]);
  const toolKbRef        = useRef<Record<string, string>>({});
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
    // Voice/speed come from the phone agent settings (owner hears what callers hear).
    // Language comes from the owner's personal assistant settings — same source as
    // the Overview page — so Training and Overview always match on language.
    // The phone agent settings default language to "en", which would lock training
    // to English even when the owner has set Arabic in their Assistant Settings.
    Promise.all([
      fetch("/api/ai-agent/settings").then(r => r.json()).catch(() => ({})),
      fetch("/api/ai-agent/assistant-settings").then(r => r.json()).catch(() => ({})),
    ]).then(([d, a]: [{ voiceId?: string; speed?: number }, { preferredLanguage?: string }]) => {
      const lang = a.preferredLanguage ?? undefined;
      // Owner's explicit choice wins; smart Arabic default only when nothing is saved
      voiceIdRef.current = d.voiceId || getDefaultVoiceId(lang);
      if (typeof d.speed === "number") speedRef.current = clampSpeed(d.speed);
      agentLanguageRef.current = lang;
      setSettingsReady(true);
    }).catch(() => { setSettingsReady(true); });
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
    linesRef.current = [];
    toolKbRef.current = {};
    const started = Date.now();
    setCallStart(started);
    setCallError(null);
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end",   () => {
        setStatus("ended");
        if (scaleRef.current) scaleRef.current.style.transform = "scaleY(0.2)";
        extractKb([...linesRef.current], started, { ...toolKbRef.current });
      });
      vapi.on("call-start-failed", (e: any) => {
        console.error("[vapi call-start-failed]", e);
        setCallError(toErrorText(e));
        setStatus("idle");
      });
      vapi.on("error", (e: any) => {
        console.error("[vapi error]", e);
        setCallError(toErrorText(e));
        setStatus("idle");
      });

      vapi.on("volume-level", (vol: number) => {
        if (scaleRef.current) scaleRef.current.style.transform = `scaleY(${Math.max(0.2, 1 + vol * 5)})`;
      });

      vapi.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          const line: TLine = { role: msg.role, text: msg.transcript };
          linesRef.current.push(line);
          setTranscript(prev => [...prev, line]);
        }
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
                  toolKbRef.current[topic] = value;
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
          messages: [{ role: "system", content: buildTrainingSystem(agentLanguageRef.current) }],
          tools: [RECORD_ANSWER_TOOL],
        },
        voice: getVoiceConfig(voiceIdRef.current, speedRef.current),
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        transcriber: getTranscriberConfig(agentLanguageRef.current),
        stopSpeakingPlan,
        startSpeakingPlan,
        ...CALL_LIMITS,
      });
    } catch (err: unknown) {
      console.error("[call]", err);
      setCallError(toErrorText(err));
      setStatus("idle");
    }
  }, [status, extractKb]);

  const endCall    = useCallback(() => { vapiRef.current?.stop(); }, []);
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted; setMuted(next); vapiRef.current.setMuted(next);
  }, [muted]);
  const reset = useCallback(() => {
    setStatus("idle"); setCallError(null); setTranscript([]); setTypedAnswer(""); setLearnedKb(null); setLiveKb({}); setMuted(false); vapiRef.current = null;
  }, []);

  const sendTypedAnswer = useCallback(() => {
    const text = typedAnswer.trim();
    if (!text || !vapiRef.current) return;
    vapiRef.current.send({
      type: "add-message",
      message: { role: "user", content: text },
      triggerResponseEnabled: true,
    });
    const line: TLine = { role: "user", text };
    linesRef.current.push(line);
    setTranscript(prev => [...prev, line]);
    setTypedAnswer("");
  }, [typedAnswer]);

  useEffect(() => {
    function onVisChange() {
      if (!document.hidden && vapiRef.current && status === "active") {
        vapiRef.current.setMuted(muted);
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [status, muted]);

  const isActive     = status === "active";
  const isConnecting = status === "connecting";
  const showFinalKb  = status === "ended" && learnedKb !== null;
  const showLiveKb   = isActive || isConnecting;

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <style>{`
        @keyframes waveFlow { from{transform:translateX(0)} to{transform:translateX(-280px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes kbPop {
          0%   { opacity:0; transform:scale(0.92) translateY(6px); }
          60%  { opacity:1; transform:scale(1.03) translateY(-1px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
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
        <div className="grid md:grid-cols-5 gap-5 md:min-h-[560px]">

          {/* LEFT: unified card — waveform + controls + transcript + typed input (2/5) */}
          <div className="md:col-span-2 flex flex-col">
            <div className="rounded-2xl border flex flex-col flex-1 h-full" style={{ background: cardBg, borderColor: border }}>

              {/* Waveform */}
              <div className="flex flex-col items-center gap-4 px-5 pt-6 pb-5 border-b shrink-0" style={{ borderColor: border }}>
                <div className="relative flex items-center justify-center" style={{ width: 240, height: 48 }}>
                  <div className="absolute inset-0 rounded-full blur-2xl" style={{
                    background: "radial-gradient(ellipse, rgba(255,51,102,0.22) 0%, transparent 70%)",
                    opacity: isActive ? 0.9 : 0.1,
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

                <p className="text-sm text-center" style={{ color: isConnecting?"#FF6B35":isActive?textPrimary:textMuted }}>
                  {isConnecting ? t("common.connecting") : isActive ? (muted ? t("aiAgent.training.muted") : t("aiAgent.training.speakNaturally")) : status==="ended" ? t("aiAgent.training.complete") : extracting ? t("aiAgent.training.saving") : t("aiAgent.training.ready")}
                </p>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {status === "idle" && (
                    <button onClick={startCall}
                      disabled={!settingsReady}
                      className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                      style={{ background:"linear-gradient(135deg,#FF3366,#FF6B35)", boxShadow:"0 4px 20px rgba(255,51,102,0.35)" }}>
                      {!settingsReady
                        ? <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white border-t-transparent animate-spin" />
                        : <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.3"/>
                            <path d="M5.5 5l3.5 2-3.5 2V5z" fill="white"/>
                          </svg>
                      }
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

                {callError && (
                  <div className="w-full rounded-xl p-3" style={{ background: isDark?"rgba(239,68,68,0.08)":"#FFF5F5", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[10px] font-semibold text-red-400 mb-0.5">Call failed to start</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>{typeof callError === "string" ? callError : "An unexpected error occurred."}</p>
                    <button onClick={() => setCallError(null)} className="text-[9px] font-medium text-red-400 mt-1 hover:underline">Dismiss</button>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: border }}>
                <span className="text-xs font-semibold" style={{ color: textPrimary }}>{t("aiAgent.training.transcript")}</span>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-[9px]" style={{ color: "#22C55E" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>{t("aiAgent.training.recording")}
                  </span>
                )}
              </div>
              <div ref={transcriptRef} className="overflow-y-auto px-4 py-3 space-y-2 flex-1" style={{ minHeight: 80 }}>
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

              {/* Typed input — always visible, active when call is live */}
              <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: border }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendTypedAnswer(); }}
                    placeholder={isActive ? "Type your answer…" : "Start the session to type…"}
                    disabled={!isActive}
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none disabled:opacity-40"
                    style={{ background: isDark ? "#0B0D14" : "#F9FAFB", border: `1px solid ${border}`, color: textPrimary }}
                  />
                  <button
                    onClick={sendTypedAnswer}
                    disabled={!typedAnswer.trim() || !isActive}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: "linear-gradient(135deg,#FF3366,#FF6B35)" }}
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Business Knowledge panel (3/5 — the centerpiece) */}
          <div className="md:col-span-3 flex flex-col">
            <div className="rounded-2xl border flex flex-col flex-1 h-full" style={{ background: cardBg, borderColor: border }}>

              {/* Panel header — 4xl counter as emotional anchor */}
              <div className="px-6 py-5 border-b shrink-0" style={{ borderColor: border }}>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: textMuted }}>Business Knowledge</p>
                    <p className="text-sm" style={{ color: textMuted }}>
                      {status === "idle"
                        ? t("aiAgent.training.idleDesc")
                        : status === "ended"
                        ? t("aiAgent.training.savedToKb")
                        : t("aiAgent.training.knowledgeSub")}
                    </p>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full mt-3" style={{ background: isDark?"#1E2235":"#F1F5F9" }}>
                      <div
                        className="h-1 rounded-full transition-all duration-700"
                        style={{ width:`${progressPct}%`, background:"linear-gradient(to right,#FF6B35,#FF3366)" }}
                      />
                    </div>
                  </div>
                  {/* The big counter */}
                  <div className="text-right shrink-0">
                    <p
                      className="font-black leading-none"
                      style={{
                        fontSize: "2.75rem",
                        background: filledCount > 0 ? "linear-gradient(135deg,#FF6B35,#FF3366)" : "none",
                        WebkitBackgroundClip: filledCount > 0 ? "text" : "unset",
                        WebkitTextFillColor: filledCount > 0 ? "transparent" : textMuted,
                        color: filledCount > 0 ? "transparent" : textMuted,
                        transition: "color 0.4s",
                      }}
                    >
                      {filledCount}<span style={{ fontSize: "1.5rem", opacity: 0.55 }}>/7</span>
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: textMuted }}>
                      {filledCount === 7 ? "complete" : "filled"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Knowledge cards — flex-1 fills remaining panel height */}
              <div className="p-5 flex-1 overflow-y-auto">
                {status === "idle" && (
                  <div className="space-y-2">
                    {KB_FIELDS.map((f, i) => (
                      <div
                        key={f.key}
                        className="flex items-start gap-3 p-3 rounded-xl border"
                        style={{ background: isDark?"rgba(255,255,255,0.02)":"#F9FAFB", borderColor: border }}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: isDark?"#1E2235":"#F3F4F6" }}>
                          <KbIcon field={f.key} filled={false} current={false}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight" style={{ color: textSub }}>
                            <span className="text-[9px] font-bold uppercase tracking-wide mr-1.5" style={{ color: textMuted }}>Q{i+1}</span>
                            {f.label}
                          </p>
                          <p className="text-[10px] mt-0.5 leading-snug" style={{ color: textMuted }}>{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(showLiveKb || status === "ended") && (
                  <div className="space-y-2.5">
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
                              ? "rgba(255,107,53,0.3)"
                              : isCurrent
                              ? "rgba(255,107,53,0.45)"
                              : border,
                            animation: answered ? "kbPop 0.38s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
                          }}
                        >
                          <div className="flex items-start gap-3 p-3.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
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
                                <KbIcon field={f.key} filled={false} current={isCurrent}/>
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

                {/* Post-call AI-extracted summary */}
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
