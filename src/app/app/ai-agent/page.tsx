"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;

type CallStatus = "idle" | "connecting" | "active" | "ended";
type TranscriptLine = { role: "user" | "assistant"; text: string };

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — Female, Professional" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi — Female, Energetic" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni — Male, Well-rounded" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold — Male, Crisp" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam — Male, Deep" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly",     label: "Friendly & Warm" },
  { value: "luxury",       label: "Luxury & Premium" },
];

const ONBOARDING_SYSTEM = `You are Vela, an AI business operating system. You're conducting a friendly voice onboarding interview to learn about this business so you can serve their customers better. Be warm, conversational, and encouraging. Keep each response to 1-2 sentences.

Conduct a structured interview in this order, one question at a time:
1. Ask for the business name and what they do
2. Ask for their top 2–3 services and approximate prices
3. Ask for their working hours
4. Ask for their location or address
5. Ask about their booking or cancellation policy
6. Ask what questions customers ask them most often

After step 6 is answered, thank them warmly, briefly confirm what you learned, and let them know you're all set to help their customers.`;

export default function AIAgentPage() {
  const [status, setStatus]         = useState<CallStatus>("idle");
  const [volume, setVolume]         = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [isSaving, setIsSaving]     = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState(false);
  const [tab, setTab]               = useState<"call" | "settings">("call");

  // Settings
  const [voiceId, setVoiceId]                     = useState(VOICES[0].id);
  const [tone, setTone]                           = useState("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [settingsSaved, setSettingsSaved]         = useState(false);
  const [settingsLoading, setSettingsLoading]     = useState(true);

  const vapiRef          = useRef<VapiInstance>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fullTranscriptRef = useRef("");

  // Load saved settings on mount
  useEffect(() => {
    fetch("/api/ai-agent/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        if (d.voiceId)           setVoiceId(d.voiceId);
        if (d.tone)              setTone(d.tone);
        if (d.customInstructions !== undefined) setCustomInstructions(d.customInstructions ?? "");
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const saveTranscript = useCallback(async (text: string) => {
    setIsSaving(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/ai-agent/save-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (res.ok) setSaved(true);
      else setSaveError(true);
    } catch {
      setSaveError(true);
    }
    setIsSaving(false);
  }, []);

  const startCall = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      alert("Vapi public key not set. Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to your environment.");
      return;
    }

    setStatus("connecting");
    setTranscript([]);
    fullTranscriptRef.current = "";
    setSaved(false);
    setSaveError(false);

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(publicKey) as VapiInstance;
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end", () => {
        setStatus("ended");
        vapiRef.current = null;
        if (fullTranscriptRef.current.trim()) {
          saveTranscript(fullTranscriptRef.current.trim());
        }
      });
      vapi.on("volume-level", (vol: number) => setVolume(vol));
      vapi.on("error", (err: any) => {
        console.error("[AI Agent]", err);
        setStatus("idle");
        vapiRef.current = null;
      });
      vapi.on("message", (msg: any) => {
        if (msg?.type === "transcript" && msg?.transcriptType === "final") {
          const role = (msg.role ?? "assistant") as "user" | "assistant";
          const text = (msg.transcript ?? "") as string;
          if (!text.trim()) return;
          setTranscript((prev) => [...prev, { role, text }]);
          fullTranscriptRef.current +=
            `\n${role === "user" ? "Owner" : "Vela"}: ${text}`;
        }
      });

      const toneNote = tone !== "professional"
        ? ` Use a ${tone} tone throughout.`
        : "";
      const customNote = customInstructions.trim()
        ? `\n\nAdditional instructions: ${customInstructions.trim()}`
        : "";

      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: ONBOARDING_SYSTEM + toneNote + customNote }],
        },
        voice: {
          provider: "11labs",
          voiceId,
        },
        firstMessage:
          "Hi! I'm Vela, your AI business assistant. I'm here to learn about your business so I can better serve your customers. Let's start — what's the name of your business, and what do you do?",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
      });
    } catch (err) {
      console.error("[AI Agent] start error:", err);
      setStatus("idle");
      vapiRef.current = null;
    }
  }, [voiceId, tone, customInstructions, saveTranscript]);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* ignore */ }
      vapiRef.current = null;
    }
    setStatus("ended");
  }, []);

  const saveSettings = async () => {
    try {
      await fetch("/api/ai-agent/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, tone, customInstructions }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch { /* silent */ }
  };

  // Orb visual state
  const isActive     = status === "active";
  const isConnecting = status === "connecting";
  const orbPulse     = isActive ? `scale(${1 + volume * 0.35})` : "scale(1)";
  const ring1Pulse   = isActive ? `scale(${1 + volume * 0.6})` : isConnecting ? "scale(1.15)" : "scale(1)";
  const ring2Pulse   = isActive ? `scale(${1 + volume * 0.9})` : isConnecting ? "scale(1.3)" : "scale(1)";

  const statusLabel =
    status === "idle"       ? "Ready to start" :
    status === "connecting" ? "Connecting…" :
    status === "active"     ? "Listening" :
                              "Call ended";

  const statusColor =
    status === "active"     ? "#22C55E" :
    status === "connecting" ? "#F59E0B" :
    status === "ended"      ? "#6B7280" :
                              "#9CA3AF";

  return (
    <div className="relative -m-4 md:-m-6 -mb-8 min-h-[calc(100vh-64px)] flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #05050A 0%, #0C0C18 50%, #05050A 100%)" }}>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #FF6B35 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Tab bar */}
      <div className="relative z-10 flex items-center gap-1 p-4 md:p-6 pb-0">
        <button
          onClick={() => setTab("call")}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            tab === "call"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Voice Call
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            tab === "settings"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Settings
        </button>
      </div>

      {/* ── CALL TAB ── */}
      {tab === "call" && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-8 gap-8">

          {/* Header */}
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF6B35] mb-2">Vela AI Agent</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Voice Onboarding</h1>
            <p className="text-sm text-white/40 mt-1">
              Speak with Vela to train your AI on your business
            </p>
          </div>

          {/* Orb */}
          <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>

            {/* Outermost ring */}
            <div
              className="absolute rounded-full border border-white/5 transition-transform"
              style={{
                width: 240, height: 240,
                transform: ring2Pulse,
                transitionDuration: "80ms",
                animation: isConnecting ? "orb-spin 3s linear infinite" : undefined,
              }}
            />

            {/* Middle ring */}
            <div
              className="absolute rounded-full border border-white/10 transition-transform"
              style={{
                width: 190, height: 190,
                transform: ring1Pulse,
                transitionDuration: "80ms",
                animation: isConnecting ? "orb-pulse 1.5s ease-in-out infinite" : undefined,
              }}
            />

            {/* Inner glow ring */}
            <div
              className="absolute rounded-full transition-transform"
              style={{
                width: 145, height: 145,
                transform: orbPulse,
                transitionDuration: "50ms",
                background: "radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)",
                border: `1px solid rgba(255,107,53,${isActive ? 0.4 + volume * 0.4 : 0.2})`,
                boxShadow: isActive
                  ? `0 0 ${30 + volume * 60}px rgba(255,107,53,${0.2 + volume * 0.3})`
                  : "none",
              }}
            />

            {/* Core orb */}
            <div
              className="relative z-10 rounded-full flex items-center justify-center transition-all"
              style={{
                width: 100, height: 100,
                transform: orbPulse,
                transitionDuration: "50ms",
                background: isActive
                  ? `radial-gradient(circle at 35% 35%, rgba(255,150,80,${0.9 + volume * 0.1}) 0%, rgba(255,107,53,1) 60%, rgba(200,60,20,1) 100%)`
                  : "radial-gradient(circle at 35% 35%, rgba(180,180,200,0.8) 0%, rgba(120,120,160,0.9) 60%, rgba(80,80,120,1) 100%)",
                boxShadow: isActive
                  ? `0 0 ${20 + volume * 40}px rgba(255,107,53,${0.4 + volume * 0.4}), inset 0 1px 1px rgba(255,255,255,0.3)`
                  : "0 0 20px rgba(100,100,150,0.3), inset 0 1px 1px rgba(255,255,255,0.1)",
              }}
            >
              {status === "idle" && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M19 10a7 7 0 01-14 0M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {(status === "connecting") && (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {status === "active" && (
                <div className="flex items-end gap-0.5 h-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-white"
                      style={{
                        height: `${Math.max(4, Math.min(24, 6 + volume * 22 * Math.sin((i + 1) * 1.2 + Date.now() * 0.005) + Math.random() * 4))}px`,
                        animation: `equalizer ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              )}
              {status === "ended" && (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/60">
                  <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor, boxShadow: isActive ? `0 0 8px ${statusColor}` : "none" }} />
              <span className="text-sm font-medium text-white/60">{statusLabel}</span>
            </div>
          </div>

          {/* Transcript */}
          <div className="w-full max-w-lg flex-1 min-h-0 flex flex-col">
            {transcript.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-2 px-1"
                style={{ maxHeight: "220px", minHeight: "80px" }}>
                {transcript.map((line, i) => (
                  <div key={i} className={`flex gap-3 ${line.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
                      style={{
                        background: line.role === "assistant"
                          ? "rgba(255,107,53,0.12)"
                          : "rgba(255,255,255,0.07)",
                        color: line.role === "assistant" ? "#FFCBAA" : "rgba(255,255,255,0.8)",
                        borderRadius: line.role === "assistant" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                      }}
                    >
                      <span className="text-[10px] font-semibold opacity-60 block mb-0.5">
                        {line.role === "assistant" ? "Vela" : "You"}
                      </span>
                      {line.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                {status === "idle" && (
                  <p className="text-sm text-white/25 text-center">
                    Press Start to begin your voice onboarding interview.<br/>
                    Vela will ask you about your business.
                  </p>
                )}
                {status === "connecting" && (
                  <p className="text-sm text-white/25">Connecting to Vela…</p>
                )}
                {status === "active" && (
                  <p className="text-sm text-white/25">Listening for speech…</p>
                )}
              </div>
            )}
          </div>

          {/* Save status */}
          {(isSaving || saved || saveError) && (
            <div className="flex items-center gap-2 text-xs">
              {isSaving && <><div className="w-3 h-3 rounded-full border border-white/30 border-t-white/80 animate-spin" /><span className="text-white/40">Saving to knowledge base…</span></>}
              {saved    && <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="text-green-400">Saved to your AI knowledge base</span></>}
              {saveError && <span className="text-red-400">Save failed — try again</span>}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col items-center gap-3 pb-2">
            {(status === "idle" || status === "ended") && (
              <button
                onClick={startCall}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #FF6B35, #FF3366)",
                  boxShadow: "0 0 30px rgba(255,107,53,0.35)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M19 10a7 7 0 01-14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                {status === "ended" ? "Start New Interview" : "Start Voice Interview"}
              </button>
            )}
            {status === "active" && (
              <button
                onClick={endCall}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(239,68,68,0.85)", boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.36 6.64a9 9 0 010 10.72M15.54 9.46a5 5 0 010 5.08M6.64 6.64a9 9 0 000 10.72M9.46 9.46a5 5 0 000 5.08M12 12v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                End Call
              </button>
            )}
            {status === "connecting" && (
              <button
                onClick={endCall}
                className="px-6 py-3 rounded-xl text-white/50 text-sm border border-white/10 hover:border-white/20 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div className="relative z-10 flex-1 flex flex-col items-center py-8 px-6">
          <div className="w-full max-w-lg space-y-6">

            <div>
              <h2 className="text-lg font-bold text-white mb-1">Agent Settings</h2>
              <p className="text-sm text-white/40">Customize Vela's voice and personality for your business.</p>
            </div>

            {settingsLoading ? (
              <div className="flex items-center gap-3 text-white/30 text-sm">
                <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
                Loading settings…
              </div>
            ) : (
              <>
                {/* Voice */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Voice</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id} style={{ background: "#1a1a2e" }}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Personality Tone</label>
                  <div className="flex gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          tone === t.value
                            ? "bg-[#FF6B35]/15 border-[#FF6B35]/50 text-[#FF8C60]"
                            : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom instructions */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Custom Instructions
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Always recommend booking 3 days in advance. Mention we offer a 10% student discount."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none placeholder:text-white/20"
                  />
                  <p className="text-[11px] text-white/25 mt-1">These instructions are added to every call.</p>
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
                >
                  {settingsSaved ? "Saved ✓" : "Save Settings"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS keyframes */}
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes equalizer {
          from { height: 4px; }
          to   { height: 20px; }
        }
      `}</style>
    </div>
  );
}
