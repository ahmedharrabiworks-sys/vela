"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAgentTheme } from "../layout";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";
type TLine = { role: "user" | "assistant"; text: string };

const DEFAULT_VOICE = "PIGsltMj3gFMR34aFDI3";

// Pre-computed 560-wide sine wave path (4 complete cycles), period=140px
const WAVE_D = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 560; x += 2) {
    const y = (20 + 12 * Math.sin((x / 70) * Math.PI)).toFixed(1);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ");
})();

const VELA_SYSTEM = `You are Vela — a warm, knowledgeable AI business partner built into this owner's Vela dashboard. You speak like a trusted friend who also happens to be a smart business consultant.

## MANDATORY OPENING
Start EVERY call with exactly: "Welcome, boss. I've been waiting for you."
Then immediately ask: "Before we dive in — which language would you like to continue in?"

## LANGUAGE RULE — CRITICAL
After they choose a language, use ONLY that language for the ENTIRE conversation. Never switch. Never mix. If they said Arabic, respond in Arabic. If French, in French. This is permanent and non-negotiable.

## YOUR ROLE — OVERVIEW MODE
You are the owner's AI companion. Help them understand their business, navigate Vela, review their performance, and get the most from the platform. You are warm, insightful, and encouraging.

## WHAT VELA IS
Vela is an AI Business Operating System that automatically answers customer messages on WhatsApp, Instagram, and website chat 24/7, qualifies leads, books appointments, and runs customer communications — so the owner can focus on their work.

## DASHBOARD PAGES
- Dashboard (/app): KPI overview — leads, appointments today, revenue trends, recent messages
- Conversations (/app/conversations): Unified inbox — WhatsApp, Instagram, website chat all in one place. AI replies automatically; owner can take over anytime.
- Leads / CRM (/app/leads): Kanban pipeline (New → Contacted → Qualified → Booked → Client). Everyone who messages becomes a lead automatically.
- Appointments (/app/appointments): Full table of all bookings with export to CSV.
- Channels (/app/channels): Connect and manage WhatsApp, Instagram, website chat.
- Website Builder (/app/website): AI generates a full website from a description. Refine by chatting.
- Analytics (/app/analytics): Leads over time, channel breakdown, conversion rates, revenue trends.
- Marketing (/app/marketing): Social post generator, video script generator, WhatsApp broadcast.
- Train AI (/app/ai-training): Teach your AI about services, prices, FAQs, hours, address.
- Settings (/app/settings): Business profile, AI personality, team members, billing.

## VELA PLANS
- Starter ($79/mo): 1 channel, 50 bookings/month, basic CRM, 1 team member
- Pro ($159/mo): All 3 channels, unlimited bookings, AI trained on business, full pipeline, auto follow-up, white label, 15 team members — most popular
- Premium ($299/mo): Everything in Pro + dedicated account manager, advanced AI, unlimited team members, priority support

## WHAT YOU DON'T DO
- Do NOT conduct structured interviews or ask "Step 1, Step 2" questions
- Do NOT ask the owner to list their services/hours/address in sequence — that's what the Training section is for
- Do NOT be robotic or formal — be real, warm, and helpful

## CONVERSATION STYLE
- Keep answers short and conversational (2-3 sentences by default)
- Use the owner's language level and match their energy
- If they seem stressed, be encouraging. If they're excited, match that energy.
- You can ask follow-up questions to understand what they need`;

export default function OverviewPage() {
  const { isDark } = useAgentTheme();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
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

  // Load saved voice
  useEffect(() => {
    fetch("/api/ai-agent/settings")
      .then((r) => r.json())
      .then((d: { voiceId?: string }) => { if (d.voiceId) setVoiceId(d.voiceId); })
      .catch(() => {});
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const startCall = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("connecting");
    setTranscript([]);
    setVolume(0);

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
      const vapi: VapiInstance = new Vapi(key);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end",   () => { setStatus("ended"); setVolume(0); });
      vapi.on("error",      (e: unknown) => { console.error("[vapi]", e); setStatus("idle"); });

      vapi.on("volume-level", (vol: number) => {
        setVolume(vol);
        if (scaleRef.current) {
          const s = status === "active" ? Math.max(0.2, 1 + vol * 5) : 0.2;
          scaleRef.current.style.transform = `scaleY(${s})`;
        }
      });

      vapi.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          setTranscript((prev) => [...prev, { role: msg.role, text: msg.transcript }]);
        }
      });

      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: VELA_SYSTEM }],
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
        firstMessage: "Welcome, boss. I've been waiting for you. Before we dive in — which language would you like to continue in?",
        transcriber: { provider: "deepgram", model: "nova-2", smartFormat: true },
        stopSpeakingPlan: { numWords: 0, voiceSeconds: 0.2, backoffSeconds: 1.5 },
      });
    } catch (err) {
      console.error("[call]", err);
      setStatus("idle");
    }
  }, [status, voiceId]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    setStatus("ended");
    setVolume(0);
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
    setMuted(false);
    setVolume(0);
    vapiRef.current = null;
  }, []);

  const isActive = status === "active";
  const isConnecting = status === "connecting";

  return (
    <div className="flex flex-col p-5 md:p-8" style={{ background: bg, minHeight: "calc(100vh - 64px)" }}>
      {/* Inline waveform animation style */}
      <style>{`
        @keyframes waveFlow { from { transform: translateX(0); } to { transform: translateX(-280px); } }
        @keyframes dotPulse { 0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: textPrimary }}>Overview</h1>
            <p className="text-xs" style={{ color: textMuted }}>Your personal Vela AI — ask anything about your business</p>
          </div>
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : status === "ended" ? "#6B7280" : "#E5E7EB",
                boxShadow: isActive ? "0 0 8px #22C55E" : "none",
              }}
            />
            <span className="text-xs font-medium" style={{ color: textMuted }}>
              {isActive ? "Live" : isConnecting ? "Connecting…" : status === "ended" ? "Call ended" : "Ready"}
            </span>
          </div>
        </div>

        {/* Main grid: 3 columns on md */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Left column: waveform core + controls */}
          <div className="md:col-span-2 space-y-5">
            {/* Waveform card */}
            <div
              className="rounded-2xl border p-6 flex flex-col items-center gap-4"
              style={{ background: cardBg, borderColor: border }}
            >
              {/* Waveform */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: 280, height: 56 }}
              >
                {/* Glow */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    background: "radial-gradient(ellipse, rgba(255,107,53,0.3) 0%, transparent 70%)",
                    opacity: isActive ? Math.max(0.3, volume * 2) : 0.1,
                    transition: "opacity 0.1s",
                  }}
                />
                {/* Animated wave */}
                <div style={{ width: 280, height: 40, overflow: "hidden", borderRadius: 4 }}>
                  <div
                    style={{
                      width: 560,
                      height: 40,
                      animation: (isActive || isConnecting) ? "waveFlow 2s linear infinite" : "none",
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
                          <linearGradient id="wg-ov" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={isDark ? "#FF6B35" : "#FF6B35"}/>
                            <stop offset="50%" stopColor="#FF3366"/>
                            <stop offset="100%" stopColor="#FF6B35"/>
                          </linearGradient>
                        </defs>
                        <path d={WAVE_D} fill="none" stroke="url(#wg-ov)" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status text */}
              <div className="text-center">
                {isConnecting && (
                  <p className="text-sm animate-pulse" style={{ color: "#FF6B35" }}>
                    Connecting to Vela…
                  </p>
                )}
                {isActive && (
                  <p className="text-sm font-medium" style={{ color: textPrimary }}>
                    {muted ? "🔇 Microphone muted" : "Listening…"}
                  </p>
                )}
                {status === "idle" && (
                  <p className="text-sm" style={{ color: textMuted }}>
                    Press Start Call to speak with Vela
                  </p>
                )}
                {status === "ended" && (
                  <p className="text-sm" style={{ color: textMuted }}>
                    Call ended
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {status === "idle" && (
                  <button
                    onClick={startCall}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)", boxShadow: "0 4px 20px rgba(255,107,53,0.35)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.4"/>
                      <path d="M6.5 5.5l4 2.5-4 2.5V5.5z" fill="white"/>
                    </svg>
                    Start Call
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
                        <path d="M1.5 4.5c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2h-7c-1.1 0-2-.9-2-2v-5z" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M1.5 7h11" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 9.5l4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      End Call
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
                    New Call
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
                    {status === "idle" ? "Transcript will appear here once the call starts" : "Listening…"}
                  </p>
                ) : (
                  transcript.map((line, i) => (
                    <div key={i} className={`flex gap-2.5 ${line.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                        style={{
                          background: line.role === "assistant" ? "linear-gradient(135deg, #FF6B35, #FF3366)" : (isDark ? "#2A2D3A" : "#F3F4F6"),
                          color: line.role === "assistant" ? "white" : textMuted,
                        }}
                      >
                        {line.role === "assistant" ? "V" : "Y"}
                      </div>
                      <div
                        className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                        style={{
                          background: line.role === "assistant"
                            ? (isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0")
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

          {/* Right column: info panels */}
          <div className="space-y-4">
            {/* Vela intro card */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: cardBg, borderColor: border }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="white" strokeWidth="1.4"/>
                  <path d="M1.5 8h1.5M13 8h1.5M8 1.5v1.5M8 13v1.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="1" fill="white"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Your AI Companion</h3>
              <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                Ask Vela anything — how to connect channels, understand your metrics, or what to focus on next.
              </p>
            </div>

            {/* Quick topics */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: cardBg, borderColor: border }}
            >
              <h3 className="text-xs font-semibold mb-3" style={{ color: textPrimary }}>Try asking…</h3>
              <div className="space-y-2">
                {[
                  "How do I connect WhatsApp?",
                  "Show me my top leads",
                  "What's my best-performing channel?",
                  "How do I train my AI?",
                  "Explain the pricing plans",
                ].map((q) => (
                  <div
                    key={q}
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: isDark ? "#1E2130" : "#F9FAFB", color: textMuted }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            </div>

            {/* Voice info */}
            <div
              className="rounded-2xl border p-4"
              style={{ background: isDark ? "rgba(255,107,53,0.05)" : "#FFF9F7", borderColor: isDark ? "rgba(255,107,53,0.15)" : "#FFD6C7" }}
            >
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#FF6B35" }}>Voice Mode</p>
              <p className="text-[10px] leading-relaxed" style={{ color: textMuted }}>
                Powered by ElevenLabs multilingual voice AI. Interrupt naturally — just speak and Vela will stop and listen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
