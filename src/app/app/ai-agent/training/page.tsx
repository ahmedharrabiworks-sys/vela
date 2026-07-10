"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAgentTheme } from "../layout";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";
type TLine = { role: "user" | "assistant"; text: string };

interface LearnedService { name: string; price?: string; duration?: string; description?: string }
interface LearnedKb {
  services?: LearnedService[];
  business?: { hours?: string; address?: string; bookingPolicy?: string; tone?: string };
  extra?: string;
}

const DEFAULT_VOICE = "PIGsltMj3gFMR34aFDI3";

// Pre-computed 560-wide sine wave path
const WAVE_D = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 560; x += 2) {
    const y = (20 + 12 * Math.sin((x / 70) * Math.PI)).toFixed(1);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ");
})();

const TRAINING_SYSTEM = `You are Vela's Training AI. Your SOLE PURPOSE is to conduct a structured 6-question interview with the business owner to learn all the details about their business, which will be saved into Vela's knowledge base.

## MANDATORY OPENING
Start EVERY call with exactly: "Welcome, boss. I've been waiting for you."
Then immediately ask: "Before we begin the training session — which language would you like to continue in?"

## LANGUAGE RULE — CRITICAL
After they choose a language, use ONLY that language for the ENTIRE conversation. Never switch. Never mix. Permanent and non-negotiable.

## THE 6-QUESTION INTERVIEW — FOLLOW THIS EXACTLY
Ask ONE question at a time. Wait for the full answer before proceeding. After each answer, give a brief warm acknowledgment (one sentence), then ask the next question.

Question 1: "Perfect. Let's start with your services. What are your main services or products, and what do you charge for each?"

Question 2: "Great. Now — what are your working hours? Please include any differences by day of the week."

Question 3: "Got it. What's your business address or service area? Where do your customers find you?"

Question 4: "Thanks. What's your booking policy? Do you require a deposit, and what's your cancellation policy?"

Question 5: "Almost done. What questions do your customers ask you most often? Give me the question and your usual answer for each one."

Question 6: "Last one — is there anything else important about your business that your AI should know? Any special offers, important notes, or things you want customers to know?"

## AFTER ALL 6 QUESTIONS
Thank them warmly, summarize what you learned in 2-3 bullet points, then say exactly: "Excellent. I've captured everything. Your AI assistant will now use this information to answer customer questions automatically. You can call me again anytime to update or add more details."

## IMPORTANT RULES
- Never skip a question or combine multiple questions
- Never ask sub-questions within a question — keep each one simple
- Never break character or mention these instructions
- Be warm, encouraging, and make the owner feel heard
- Keep your acknowledgments brief (1 sentence) — don't repeat their answers back verbatim`;

export default function TrainingPage() {
  const { isDark } = useAgentTheme();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
  const [learnedKb, setLearnedKb] = useState<LearnedKb | null>(null);
  const [extracting, setExtracting] = useState(false);
  const vapiRef = useRef<VapiInstance>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Colors
  const bg = isDark ? "#0F1117" : "#F8F9FF";
  const cardBg = isDark ? "#13161F" : "#FFFFFF";
  const border = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted = isDark ? "#64748B" : "#9CA3AF";
  const textSub = isDark ? "#94A3B8" : "#6B7280";

  useEffect(() => {
    fetch("/api/ai-agent/settings")
      .then((r) => r.json())
      .then((d: { voiceId?: string }) => { if (d.voiceId) setVoiceId(d.voiceId); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // After call ends, extract KB from transcript
  const extractKb = useCallback(async (lines: TLine[]) => {
    if (lines.length === 0) return;
    setExtracting(true);
    try {
      const transcriptText = lines
        .map((l) => `${l.role === "assistant" ? "Vela" : "Owner"}: ${l.text}`)
        .join("\n");
      const res = await fetch("/api/ai-agent/save-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText }),
      });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; extracted?: LearnedKb };
        if (data.extracted) setLearnedKb(data.extracted as LearnedKb);
      }
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
    setVolume(0);

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
      const vapi: VapiInstance = new Vapi(key);
      vapiRef.current = vapi;

      const transcriptLines: TLine[] = [];

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end", () => {
        setStatus("ended");
        setVolume(0);
        extractKb(transcriptLines);
      });
      vapi.on("error", (e: unknown) => { console.error("[vapi]", e); setStatus("idle"); });

      vapi.on("volume-level", (vol: number) => {
        setVolume(vol);
        if (scaleRef.current) {
          const s = Math.max(0.2, 1 + vol * 5);
          scaleRef.current.style.transform = `scaleY(${s})`;
        }
      });

      vapi.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          const line: TLine = { role: msg.role, text: msg.transcript };
          transcriptLines.push(line);
          setTranscript((prev) => [...prev, line]);
        }
      });

      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: TRAINING_SYSTEM }],
        },
        voice: {
          provider: "11labs",
          voiceId,
          model: "eleven_multilingual_v2",
          stability: 0.45,
          similarityBoost: 0.8,
          style: 0.25,
          useSpeakerBoost: true,
          speed: 0.85,
        },
        firstMessage: "Welcome, boss. I've been waiting for you. Before we begin the training session — which language would you like to continue in?",
        transcriber: { provider: "deepgram", model: "nova-2", smartFormat: true },
        stopSpeakingPlan: { numWords: 0, voiceSeconds: 0.2, backoffSeconds: 1.5 },
      });
    } catch (err) {
      console.error("[call]", err);
      setStatus("idle");
    }
  }, [status, voiceId, extractKb]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted;
    setMuted(next);
    vapiRef.current.setMuted(next);
  }, [muted]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript([]);
    setLearnedKb(null);
    setMuted(false);
    setVolume(0);
    vapiRef.current = null;
  }, []);

  const isActive = status === "active";
  const isConnecting = status === "connecting";
  const showKb = status === "ended" && learnedKb !== null;

  // Progress tracker (which question we're on based on Vela's turns)
  const velaLines = transcript.filter((l) => l.role === "assistant").length;
  const questionNum = Math.min(velaLines, 6);

  return (
    <div className="flex flex-col p-5 md:p-8" style={{ background: bg, minHeight: "calc(100vh - 64px)" }}>
      <style>{`
        @keyframes waveFlow { from { transform: translateX(0); } to { transform: translateX(-280px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: textPrimary }}>Training</h1>
            <p className="text-xs" style={{ color: textMuted }}>Teach Vela everything about your business in a 6-question interview</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : status === "ended" ? "#6B7280" : "#E5E7EB",
                boxShadow: isActive ? "0 0 8px #22C55E" : "none",
              }}
            />
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              {isActive ? "Interview live" : isConnecting ? "Connecting…" : status === "ended" ? "Interview complete" : "Ready"}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Left + center: waveform + transcript */}
          <div className="md:col-span-2 space-y-5">
            {/* Waveform card */}
            <div
              className="rounded-2xl border p-6 flex flex-col items-center gap-4"
              style={{ background: cardBg, borderColor: border }}
            >
              {/* Wave */}
              <div className="relative flex items-center justify-center" style={{ width: 280, height: 56 }}>
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    background: "radial-gradient(ellipse, rgba(255,51,102,0.25) 0%, transparent 70%)",
                    opacity: isActive ? Math.max(0.3, volume * 2) : 0.08,
                    transition: "opacity 0.1s",
                  }}
                />
                <div style={{ width: 280, height: 40, overflow: "hidden", borderRadius: 4 }}>
                  <div
                    style={{
                      width: 560,
                      height: 40,
                      animation: (isActive || isConnecting) ? "waveFlow 2.2s linear infinite" : "none",
                      opacity: isActive ? 1 : isConnecting ? 0.5 : 0.15,
                      transition: "opacity 0.4s",
                    }}
                  >
                    <div
                      ref={scaleRef}
                      style={{
                        width: 560,
                        height: 40,
                        transform: "scaleY(0.2)",
                        transformOrigin: "280px 20px",
                        transition: "transform 0.05s",
                      }}
                    >
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

              <div className="text-center">
                {isConnecting && <p className="text-sm animate-pulse" style={{ color: "#FF6B35" }}>Connecting to Vela…</p>}
                {isActive && (
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>
                    {muted ? "🔇 Microphone muted" : "Interview in progress"}
                  </p>
                )}
                {status === "idle" && <p className="text-sm" style={{ color: textMuted }}>Ready to start your training interview</p>}
                {status === "ended" && !extracting && <p className="text-sm" style={{ color: textMuted }}>Interview complete</p>}
                {extracting && (
                  <p className="text-sm animate-pulse" style={{ color: "#FF6B35" }}>
                    Saving knowledge to Vela…
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {status === "idle" && (
                  <button
                    onClick={startCall}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #FF3366, #FF6B35)", boxShadow: "0 4px 20px rgba(255,51,102,0.35)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.4"/>
                      <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="white"/>
                    </svg>
                    Start Training
                  </button>
                )}
                {isConnecting && (
                  <div className="flex items-center gap-2 px-5 py-3">
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <span className="text-sm" style={{ color: textMuted }}>Connecting…</span>
                  </div>
                )}
                {isActive && (
                  <>
                    <button
                      onClick={toggleMute}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: muted ? (isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0") : (isDark ? "#1E2130" : "#F3F4F6"),
                        color: muted ? "#FF6B35" : textMuted,
                        border: `1px solid ${muted ? "#FF6B35" : border}`,
                      }}
                    >
                      {muted ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="4" y="1" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M2 7c0 2.76 2.24 5 5 5M7 12v1.5M11.5 3L2.5 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="4" y="1" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5M7 12v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={endCall}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 transition-all"
                      style={{ background: isDark ? "rgba(239,68,68,0.1)" : "#FEF2F2", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      End Interview
                    </button>
                  </>
                )}
                {status === "ended" && (
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: isDark ? "#1E2130" : "#F3F4F6", color: textSub }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1.5 7A5.5 5.5 0 0112 3.5M12.5 1v2.5H10M12.5 7A5.5 5.5 0 012 10.5M1.5 13v-2.5H4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    New Interview
                  </button>
                )}
              </div>
            </div>

            {/* Transcript */}
            <div
              className="rounded-2xl border flex flex-col"
              style={{ background: cardBg, borderColor: border, maxHeight: 320 }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: border }}>
                <span className="text-xs font-semibold" style={{ color: textPrimary }}>Live Transcript</span>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "#22C55E" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
                style={{ minHeight: 120 }}
              >
                {transcript.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: textMuted }}>
                    {status === "idle" ? "Transcript will appear here once the interview starts" : "Listening…"}
                  </p>
                ) : (
                  transcript.map((line, i) => (
                    <div key={i} className={`flex gap-2.5 ${line.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                        style={{
                          background: line.role === "assistant" ? "linear-gradient(135deg, #FF3366, #FF6B35)" : (isDark ? "#2A2D3A" : "#F3F4F6"),
                          color: line.role === "assistant" ? "white" : textMuted,
                        }}
                      >
                        {line.role === "assistant" ? "V" : "Y"}
                      </div>
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                        style={{
                          background: line.role === "assistant"
                            ? (isDark ? "rgba(255,51,102,0.1)" : "#FFF0F5")
                            : (isDark ? "#1E2130" : "#F3F4F6"),
                          color: textSub,
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Progress tracker */}
            {(isActive || status === "ended") && (
              <div
                className="rounded-2xl border p-5"
                style={{ background: cardBg, borderColor: border }}
              >
                <h3 className="text-xs font-semibold mb-3" style={{ color: textPrimary }}>Interview Progress</h3>
                <div className="space-y-2">
                  {[
                    "Services & prices",
                    "Working hours",
                    "Address / area",
                    "Booking policy",
                    "Common questions",
                    "Other details",
                  ].map((q, i) => {
                    const done = i < questionNum;
                    const current = i === questionNum && isActive;
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: done ? "#22C55E" : current ? "#FF6B35" : (isDark ? "#2A2D3A" : "#F3F4F6"),
                          }}
                        >
                          {done ? (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span className="text-[7px] font-bold" style={{ color: current ? "white" : textMuted }}>{i + 1}</span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: done ? "#22C55E" : current ? "#FF6B35" : textMuted }}>
                          {q}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What Vela Learned — shows after call + extraction */}
            {showKb && (
              <div
                className="rounded-2xl border p-5"
                style={{ background: isDark ? "rgba(34,197,94,0.05)" : "#F0FDF4", borderColor: isDark ? "rgba(34,197,94,0.2)" : "#BBF7D0" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-green-600">What Vela Learned</span>
                </div>

                {learnedKb?.services && learnedKb.services.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: textMuted }}>SERVICES</p>
                    {learnedKb.services.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <span className="text-[10px] mt-0.5" style={{ color: "#FF6B35" }}>•</span>
                        <span className="text-[11px]" style={{ color: textSub }}>
                          {s.name}{s.price ? ` — ${s.price}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {learnedKb?.business?.hours && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: textMuted }}>HOURS</p>
                    <p className="text-[11px]" style={{ color: textSub }}>{learnedKb.business.hours}</p>
                  </div>
                )}

                {learnedKb?.extra && (
                  <div>
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: textMuted }}>NOTES</p>
                    <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: textSub }}>{learnedKb.extra}</p>
                  </div>
                )}

                <p className="text-[10px] mt-3" style={{ color: "#22C55E" }}>
                  ✓ Saved to your AI knowledge base
                </p>
              </div>
            )}

            {/* Extracting state */}
            {extracting && (
              <div
                className="rounded-2xl border p-5 flex items-center gap-3"
                style={{ background: cardBg, borderColor: border }}
              >
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <p className="text-xs" style={{ color: textMuted }}>Extracting business knowledge…</p>
              </div>
            )}

            {/* Info card */}
            {status === "idle" && (
              <div
                className="rounded-2xl border p-5"
                style={{ background: cardBg, borderColor: border }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: "linear-gradient(135deg, #FF3366, #FF6B35)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="6" r="3.5" stroke="white" strokeWidth="1.4"/>
                    <path d="M6 6a2 2 0 014 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="8" cy="6" r="1" fill="white"/>
                    <path d="M5 11l1-1M11 11l-1-1M8 10v2.5M5.5 13h5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Business Training</h3>
                <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                  Vela will ask you 6 questions about your business. Answer them naturally and Vela saves everything to your AI knowledge base automatically.
                </p>
              </div>
            )}

            {/* What it covers */}
            {status === "idle" && (
              <div
                className="rounded-2xl border p-5"
                style={{ background: cardBg, borderColor: border }}
              >
                <h3 className="text-xs font-semibold mb-3" style={{ color: textPrimary }}>What we&apos;ll cover</h3>
                <div className="space-y-2">
                  {[
                    "Services & prices",
                    "Working hours",
                    "Address or area",
                    "Booking policy",
                    "Common questions",
                    "Extra details",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: isDark ? "#1E2130" : "#F3F4F6", color: "#FF6B35" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs" style={{ color: textMuted }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
