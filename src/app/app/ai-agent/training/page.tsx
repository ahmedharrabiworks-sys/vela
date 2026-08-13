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
  isVapiEjection,
  vapiErrorText,
  requestMicrophoneAccess,
  DEFAULT_SPEED,
  type TrainingContext,
} from "@/lib/vapi-agent-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";
type TLine = { role: "user" | "assistant"; text: string };

const toErrorText = vapiErrorText;

interface LearnedKb {
  services?: Array<{ name: string; price?: string }>;
  business?: { hours?: string; address?: string; bookingPolicy?: string };
  extra?: string;
}

// Same 5-bar volume-driven waveform as the Overview "Talk to Vela" panel, for a
// consistent call status indicator across both surfaces.
const BAR_BASES = [0.4, 0.7, 1.0, 0.7, 0.4];

/* ── Knowledge field definitions ── */
function KbIcon({ field, filled, current }: { field: string; filled: boolean; current: boolean }) {
  const { isDark } = useAgentTheme();
  const color = filled ? "white" : current ? "#FF6B35" : (isDark ? "var(--dm-faint)" : "#64748B");
  const icons: Record<string, JSX.Element> = {
    businessAndCustomers: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="4" width="10" height="7" rx="1" stroke={color} strokeWidth="1.2"/>
        <path d="M4 4V3a2 2 0 0 1 4 0v1" stroke={color} strokeWidth="1.2"/>
        <circle cx="6" cy="7" r="1.1" stroke={color} strokeWidth="1"/>
      </svg>
    ),
    availability: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.2"/>
        <path d="M6 3.5V6l2 1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    locationArea: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.63 3.5 6.5 3.5 6.5s3.5-3.87 3.5-6.5C9.5 2.57 7.93 1 6 1z" stroke={color} strokeWidth="1.2"/>
        <circle cx="6" cy="4.5" r="1.2" stroke={color} strokeWidth="1.1"/>
      </svg>
    ),
    rulesEscalation: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1.5L10 3v3c0 2.5-1.7 4.2-4 4.5-2.3-.3-4-2-4-4.5V3l4-1.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M4.3 6l1.2 1.2 2.2-2.4" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    brandVoice: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 3h8a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H6l-2.2 1.8v-1.8H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.2"/>
        <path d="M3.5 5.2h5M3.5 6.8h3" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  };
  return icons[field] ?? null;
}

const KB_FIELDS = [
  { key: "businessAndCustomers", label: "Business & Customers",        desc: "What you do, who you serve, and what the agent should know",  q: 1 },
  { key: "availability",         label: "Availability & Schedule",     desc: "Hours, appointments, holidays, and unavailable times",         q: 2 },
  { key: "locationArea",         label: "Location & Service Area",     desc: "Where you are, and where or how you serve customers",          q: 3 },
  { key: "rulesEscalation",      label: "Rules, Escalation & Handoff", desc: "What to avoid, and when to transfer or escalate",              q: 4 },
  { key: "brandVoice",           label: "Brand Voice & Style",         desc: "Tone, personality, language, and communication style",         q: 5 },
];

export default function TrainingPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [status, setStatus]       = useState<CallStatus>("idle");
  const [callError, setCallError]         = useState<string | null>(null);
  const [wasEjected, setWasEjected]       = useState(false);
  const [ejectedEarly, setEjectedEarly]   = useState(false);
  const [muted, setMuted]                 = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [learnedKb, setLearnedKb] = useState<LearnedKb | null>(null);
  const [liveKb, setLiveKb]       = useState<Record<string, string>>({});
  const [extracting, setExtracting] = useState(false);
  const [callStart, setCallStart] = useState<number>(0);
  const [callDuration, setCallDuration] = useState(0);
  const [noMicSignal, setNoMicSignal] = useState(false);

  /* ── Additional Information (optional Magic Import-style analysis) ── */
  const [materialFile, setMaterialFile]   = useState<File | null>(null);
  const [websiteUrl, setWebsiteUrl]       = useState("");
  const [socialUrl, setSocialUrl]         = useState("");
  const [analyzing, setAnalyzing]         = useState(false);
  const [materialResults, setMaterialResults] = useState<Array<{ label: string; ok: boolean; message: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voiceIdRef           = useRef(DEFAULT_VOICE_ID);
  const speedRef             = useRef(DEFAULT_SPEED);
  const agentLanguageRef     = useRef<string | undefined>(undefined);
  const trainingContextRef   = useRef<TrainingContext>({});
  const linesRef             = useRef<TLine[]>([]);
  const toolKbRef            = useRef<Record<string, string>>({});
  const vapiRef      = useRef<VapiInstance>(null);
  const barRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  // Set on call-start, read inside the error handler to tell a genuine mid-call
  // drop apart from an immediate voice/transcription provider failure.
  const activeSinceRef = useRef<number | null>(null);
  // Tracks whether any real signal has come from the mic since the call went
  // active -- the SDK's local-volume-level event is the documented way to
  // detect "the mic isn't picking up audio" (wrong device, OS mute, etc.).
  const heardLocalAudioRef = useRef(false);
  const micCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fmtTimer(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  function resetBars() {
    BAR_BASES.forEach((b, i) => { const el = barRefs.current[i]; if (el) el.style.height = `${b * 6}px`; });
  }

  const bg          = isDark ? "var(--dm-bg)" : "#F8F9FF";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#111111";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub     = isDark ? "var(--dm-text2)" : "#6B7280";

  useEffect(() => {
    // Voice/speed come from the phone agent settings (owner hears what callers hear).
    // Language comes from the owner's personal assistant settings — same source as
    // the Overview page — so Training and Overview always match on language.
    // The phone agent settings default language to "en", which would lock training
    // to English even when the owner has set Arabic in their Assistant Settings.
    Promise.all([
      fetch("/api/ai-agent/settings").then(r => r.json()).catch(() => ({})),
      fetch("/api/ai-agent/assistant-settings").then(r => r.json()).catch(() => ({})),
      fetch("/api/ai-agent/training-context").then(r => r.json()).catch(() => ({})),
    ]).then(([d, a, tc]: [{ voiceId?: string; speed?: number }, { preferredLanguage?: string }, TrainingContext]) => {
      const lang = a.preferredLanguage ?? undefined;
      // Owner's explicit choice wins; smart Arabic default only when nothing is saved
      voiceIdRef.current = d.voiceId || getDefaultVoiceId(lang);
      if (typeof d.speed === "number") speedRef.current = clampSpeed(d.speed);
      agentLanguageRef.current = lang;
      trainingContextRef.current = tc ?? {};
      setSettingsReady(true);
    }).catch(() => { setSettingsReady(true); });
  }, []);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  /* ── Live KB: populated by GPT tool-call events, not positional transcript slicing ── */
  const filledCount     = Object.keys(liveKb).length;
  const progressPct     = Math.round((filledCount / 5) * 100);
  const velaCount       = transcript.filter(l => l.role === "assistant").length;
  const currentQuestion = Math.min(velaCount, 5);

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
          body: JSON.stringify({ transcript: transcriptText, toolCallKb }),
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

  /* ── Additional Information: reuses the existing AI Training "Magic Import"
     routes (/api/ai-training/upload + /api/ai-training/import) to extract
     business knowledge from an uploaded file, a website URL, or a social
     profile link, then merges the result into the same knowledge_base the
     5 interview questions feed into (never overwrites — see /api/ai-training
     ?merge=true). Fully optional; nothing here blocks completing training. ── */
  const EMPTY_KB = {
    services: [] as Array<{ name: string; price: string; duration: string; description: string }>,
    faqs: [] as Array<{ q: string; a: string }>,
    business: { hours: "", address: "", bookingPolicy: "", tone: "professional" as const },
    extra: "",
  };

  const mergeIntoKb = useCallback(async (kb: typeof EMPTY_KB) => {
    const res = await fetch("/api/ai-training?merge=true", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(kb),
    });
    return res.ok;
  }, []);

  const analyzeMaterials = useCallback(async () => {
    if (!materialFile && !websiteUrl.trim() && !socialUrl.trim()) return;
    setAnalyzing(true);
    const results: Array<{ label: string; ok: boolean; message: string }> = [];

    if (materialFile) {
      try {
        const fd = new FormData();
        fd.append("file", materialFile);
        const res = await fetch("/api/ai-training/upload", { method: "POST", body: fd });
        const data = await res.json() as { text?: string; error?: string };
        if (res.ok && data.text) {
          const saved = await mergeIntoKb({ ...EMPTY_KB, extra: data.text });
          results.push({ label: materialFile.name, ok: saved, message: saved ? "Analyzed and added to knowledge base" : "Extracted, but saving failed" });
        } else {
          results.push({ label: materialFile.name, ok: false, message: data.error ?? "Couldn't analyze this file" });
        }
      } catch {
        results.push({ label: materialFile.name, ok: false, message: "Upload failed" });
      }
    }

    const importUrl = async (label: string, url: string) => {
      try {
        const res = await fetch("/api/ai-training/import", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ input: url }),
        });
        const data = await res.json() as { kb?: typeof EMPTY_KB; instagram?: boolean; error?: string };
        if (data.instagram) {
          results.push({ label, ok: false, message: "Social profile analysis isn't supported yet — add key details via the questions above" });
        } else if (res.ok && data.kb) {
          const saved = await mergeIntoKb(data.kb);
          results.push({ label, ok: saved, message: saved ? "Analyzed and added to knowledge base" : "Extracted, but saving failed" });
        } else {
          results.push({ label, ok: false, message: data.error ?? "Couldn't analyze this link" });
        }
      } catch {
        results.push({ label, ok: false, message: "Couldn't reach that link" });
      }
    };

    if (websiteUrl.trim()) await importUrl(websiteUrl.trim(), websiteUrl.trim());
    if (socialUrl.trim())  await importUrl(socialUrl.trim(), socialUrl.trim());

    setMaterialResults(results);
    setMaterialFile(null);
    setWebsiteUrl("");
    setSocialUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAnalyzing(false);
  }, [materialFile, websiteUrl, socialUrl, mergeIntoKb]);

  const startCall = useCallback(async () => {
    if (status !== "idle") return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
    setStatus("connecting");
    setTranscript([]);
    setLearnedKb(null);
    setLiveKb({});
    linesRef.current = [];
    toolKbRef.current = {};
    const started = Date.now();
    setCallStart(started);
    setCallDuration(0);
    setCallError(null);
    setWasEjected(false);
    setEjectedEarly(false);
    setNoMicSignal(false);
    heardLocalAudioRef.current = false;

    // Request the mic ourselves first -- if it's denied, blocked, or missing,
    // this surfaces a specific error immediately instead of a call that
    // connects fine but the assistant never receives any audio.
    const micCheck = await requestMicrophoneAccess();
    if (!micCheck.ok) {
      setCallError(micCheck.message);
      setStatus("idle");
      return;
    }

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setStatus("active");
        setCallDuration(0);
        activeSinceRef.current = Date.now();
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        // Give the mic a few seconds to register real signal before warning --
        // avoids a false positive during the brief silence right after connecting.
        micCheckTimeoutRef.current = setTimeout(() => {
          if (!heardLocalAudioRef.current) setNoMicSignal(true);
        }, 6000);
      });
      vapi.on("call-end",   () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
        activeSinceRef.current = null;
        setStatus("ended");
        resetBars();
        extractKb([...linesRef.current], started, { ...toolKbRef.current });
      });
      vapi.on("call-start-failed", (e: any) => {
        console.error("[vapi call-start-failed]", e);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setCallError(toErrorText(e));
        setStatus("idle");
        resetBars();
      });
      vapi.on("error", (e: any) => {
        console.error("[vapi error]", e);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
        if (isVapiEjection(e)) {
          // A drop within seconds of connecting is essentially never caused by the
          // tab being backgrounded -- it means the call never properly established,
          // almost always a voice/transcription provider failure.
          const activeMs = activeSinceRef.current ? Date.now() - activeSinceRef.current : 0;
          setEjectedEarly(activeMs < 15000);
          activeSinceRef.current = null;
          setWasEjected(true);
          setStatus("ended");
        } else {
          setCallError(toErrorText(e));
          setStatus("idle");
        }
        resetBars();
      });

      vapi.on("volume-level", (vol: number) => {
        BAR_BASES.forEach((b, i) => { const el = barRefs.current[i]; if (el) el.style.height = `${Math.max(4, b * (8 + vol * 22))}px`; });
      });

      // The SDK's documented mechanism for detecting "the mic isn't picking up
      // audio" (wrong input device, OS-level mute, etc.) -- see getLocalAudioLevel
      // in @vapi-ai/web. Any real signal clears the warning immediately.
      vapi.on("local-volume-level", (vol: number) => {
        if (vol > 0.02) {
          heardLocalAudioRef.current = true;
          setNoMicSignal(false);
        }
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
          messages: [{ role: "system", content: buildTrainingSystem(agentLanguageRef.current, trainingContextRef.current) }],
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
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCallError(toErrorText(err));
      setStatus("idle");
      resetBars();
    }
  }, [status, extractKb]);

  const endCall    = useCallback(() => { vapiRef.current?.stop(); }, []);
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted; setMuted(next); vapiRef.current.setMuted(next);
  }, [muted]);
  const reset = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
    setStatus("idle"); setCallError(null); setWasEjected(false); setEjectedEarly(false); setTranscript([]); setTypedAnswer(""); setLearnedKb(null); setLiveKb({}); setMuted(false); setCallDuration(0); setNoMicSignal(false); vapiRef.current = null;
    resetBars();
  }, []);

  useEffect(() => {
    function onVisChange() {
      if (!document.hidden && vapiRef.current && status === "active") {
        vapiRef.current.setMuted(muted);
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [status, muted]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
        @keyframes pulse2 { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
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
              background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : status==="ended" ? "#6B7280" : isDark?"var(--dm-border)":"#E5E7EB",
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

              {/* Call status header — same pattern as the Overview "Talk to Vela" panel */}
              <div className="flex flex-col gap-3 px-5 pt-5 pb-5 border-b shrink-0" style={{ borderColor: border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF6B35" }}>Business Interview</p>
                    <p className="text-[11px]" style={{ color: textMuted }}>
                      {isActive
                        ? (muted ? t("aiAgent.training.muted") : t("aiAgent.training.speakNaturally"))
                        : isConnecting ? t("common.connecting")
                        : status === "ended" ? (wasEjected ? (ejectedEarly ? "Couldn't connect" : "Connection lost") : t("aiAgent.training.complete"))
                        : extracting ? t("aiAgent.training.saving")
                        : t("aiAgent.training.ready")}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{
                    background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : status === "ended" ? "#6B7280" : "#FF6B35",
                    boxShadow: isActive ? "0 0 6px #22C55E" : "none",
                  }}/>
                </div>

                {/* Waveform — 5 bars, volume-driven when active, same as Overview */}
                <div className="flex items-end justify-center gap-[5px]" style={{ height: 32 }}>
                  {BAR_BASES.map((b, i) => (
                    <div key={i} ref={el => { barRefs.current[i] = el; }}
                      style={{
                        width: 5,
                        height: b * 6,
                        borderRadius: 3,
                        alignSelf: "flex-end",
                        background: isActive
                          ? "linear-gradient(to top,#FF6B35,#FF3366)"
                          : isConnecting ? "#FF6B35" : isDark ? "var(--dm-card2)" : "#E9EBF0",
                        transition: "background 0.3s, height 0.05s",
                        animation: isConnecting ? `pulse2 ${0.7 + i * 0.12}s ease-in-out infinite` : "none",
                      }}
                    />
                  ))}
                </div>

                {status === "idle" && (
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={startCall}
                      disabled={!settingsReady}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 3px 12px rgba(255,107,53,0.4)" }}>
                      {!settingsReady
                        ? <div className="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                        : <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2.5 6.9c1.3 2.6 3.6 4.8 6.6 6.1l2-2a.7.7 0 0 1 .7-.1c.9.3 1.8.5 2.8.5a.7.7 0 0 1 .7.7v2.8a.7.7 0 0 1-.7.7C6.1 15.6 1 10.5 1 4.2a.7.7 0 0 1 .7-.7h2.8a.7.7 0 0 1 .7.7c0 1 .2 2 .5 2.9a.7.7 0 0 1-.1.7l-2.1 2.1z" fill="white"/>
                          </svg>
                      }
                    </button>
                    <span className="text-[10px] font-medium" style={{ color: textMuted }}>
                      {!settingsReady ? "Loading…" : t("aiAgent.training.start")}
                    </span>
                  </div>
                )}

                {isConnecting && (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}/>
                      <span className="text-[10px]" style={{ color: textMuted }}>Connecting…</span>
                    </div>
                    <button onClick={endCall}
                      className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: "#EF4444", boxShadow: "0 3px 10px rgba(239,68,68,0.4)" }}
                      title="Cancel"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={toggleMute}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: muted ? "linear-gradient(135deg,#FF6B35,#FF3366)" : isDark ? "var(--dm-card2)" : "#F3F4F6",
                        boxShadow: muted ? "0 2px 8px rgba(255,107,53,0.35)" : "none",
                        border: muted ? "none" : `1.5px solid ${border}`,
                      }}
                      title={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V3a2 2 0 0 1 2-2z" fill="white"/>
                          <path d="M3 7a4 4 0 0 0 8 0M7 11v2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                          <path d="M2 2l10 10" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0V3a2 2 0 0 1 2-2z" fill={textMuted}/>
                          <path d="M3 7a4 4 0 0 0 8 0M7 11v2" stroke={textMuted} strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>

                    <span className="text-sm font-mono font-bold tabular-nums min-w-[44px] text-center" style={{ color: textPrimary }}>
                      {fmtTimer(callDuration)}
                    </span>

                    <button onClick={endCall}
                      className="flex items-center justify-center w-10 h-10 rounded-full text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: "#EF4444", boxShadow: "0 3px 12px rgba(239,68,68,0.4)" }}
                      title="End call"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2.5 6.9c1.3 2.6 3.6 4.8 6.6 6.1l2-2a.7.7 0 0 1 .7-.1c.9.3 1.8.5 2.8.5a.7.7 0 0 1 .7.7v2.8a.7.7 0 0 1-.7.7C6.1 15.6 1 10.5 1 4.2a.7.7 0 0 1 .7-.7h2.8a.7.7 0 0 1 .7.7c0 1 .2 2 .5 2.9a.7.7 0 0 1-.1.7l-2.1 2.1z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 2l4 4M14 2l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                )}

                {isActive && noMicSignal && (
                  <p className="text-[9px] text-center mt-2" style={{ color: "#F59E0B" }}>
                    Can't hear you — check your microphone input
                  </p>
                )}

                {status === "ended" && wasEjected && (
                  <div className="space-y-2">
                    <p className="text-[9px] text-center" style={{ color: textMuted }}>
                      {ejectedEarly
                        ? "The call disconnected right after connecting. This usually points to a voice service configuration issue rather than your connection."
                        : "Call dropped. This can happen if the tab was hidden too long, or the connection was interrupted."}
                    </p>
                    <button onClick={startCall}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 3px 12px rgba(255,107,53,0.35)" }}
                    >
                      Reconnect
                    </button>
                    <button onClick={reset} className="w-full text-[9px] text-center hover:underline" style={{ color: textMuted }}>
                      Dismiss
                    </button>
                  </div>
                )}

                {status === "ended" && !wasEjected && !extracting && (
                  <button onClick={reset}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textSub }}>
                    {t("aiAgent.training.newInterview")}
                  </button>
                )}

                {extracting && (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}/>
                    <span className="text-xs" style={{ color: "#FF6B35" }}>{t("aiAgent.training.saving")}</span>
                  </div>
                )}

                {callError && (
                  <div className="rounded-xl p-2.5" style={{ background: isDark ? "rgba(239,68,68,0.08)" : "#FFF5F5", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[10px] font-semibold text-red-400 mb-0.5">Call failed</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>{callError}</p>
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
                        style={{ background: line.role==="assistant"?"linear-gradient(135deg,#FF3366,#FF6B35)":isDark?"var(--dm-card2)":"#F3F4F6", color: line.role==="assistant"?"white":textMuted }}>
                        {line.role === "assistant" ? "V" : "Y"}
                      </div>
                      <div className="max-w-[88%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed"
                        style={{ background: line.role==="assistant"?(isDark?"rgba(255,51,102,0.08)":"#FFF0F5"):(isDark?"var(--dm-card2)":"#F3F4F6"), color: textSub }}>
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
                    style={{ background: isDark ? "var(--dm-bg)" : "#F9FAFB", border: `1px solid ${border}`, color: textPrimary }}
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
                    <div className="h-1 rounded-full mt-3" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}>
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
                      {filledCount}<span style={{ fontSize: "1.5rem", opacity: 0.55 }}>/5</span>
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: textMuted }}>
                      {filledCount === 5 ? "complete" : "filled"}
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
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: isDark?"var(--dm-card2)":"#F3F4F6" }}>
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
                                  : isDark?"var(--dm-card2)":"#F3F4F6",
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
                                  {isCurrent ? "Answer this question…" : isPending ? `Question ${f.q}: coming up` : "Waiting…"}
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
                          <p key={i} className="text-[10px]" style={{ color: textSub }}>• {s.name}{s.price?`: ${s.price}`:""}</p>
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

        {/* Additional Information — optional Magic Import-style upload */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <p className="text-sm font-semibold" style={{ color: textPrimary }}>Additional Information</p>
          <p className="text-xs mt-1 mb-4 leading-relaxed" style={{ color: textMuted }}>
            Have a website, documents, images, menus, brochures, price lists, or any other files? Upload them or provide your website link. Vela will analyze and extract the relevant information automatically to help train your Phone Agent.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold block mb-1.5" style={{ color: textMuted }}>File (image or PDF)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setMaterialFile(e.target.files?.[0] ?? null)}
                disabled={analyzing}
                className="w-full text-[11px] rounded-lg px-2.5 py-2 disabled:opacity-50"
                style={{ background: isDark ? "var(--dm-bg)" : "#F9FAFB", border: `1px solid ${border}`, color: textPrimary }}
              />
              {materialFile && (
                <p className="text-[10px] mt-1 truncate" style={{ color: "#FF6B35" }}>{materialFile.name}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1.5" style={{ color: textMuted }}>Website link</label>
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="yourbusiness.com"
                disabled={analyzing}
                className="w-full text-xs rounded-lg px-2.5 py-2 outline-none disabled:opacity-50"
                style={{ background: isDark ? "var(--dm-bg)" : "#F9FAFB", border: `1px solid ${border}`, color: textPrimary }}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1.5" style={{ color: textMuted }}>Social profile link</label>
              <input
                type="text"
                value={socialUrl}
                onChange={e => setSocialUrl(e.target.value)}
                placeholder="instagram.com/yourbusiness"
                disabled={analyzing}
                className="w-full text-xs rounded-lg px-2.5 py-2 outline-none disabled:opacity-50"
                style={{ background: isDark ? "var(--dm-bg)" : "#F9FAFB", border: `1px solid ${border}`, color: textPrimary }}
              />
            </div>
          </div>

          <button
            onClick={analyzeMaterials}
            disabled={analyzing || (!materialFile && !websiteUrl.trim() && !socialUrl.trim())}
            className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            {analyzing ? (
              <>
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                Analyzing…
              </>
            ) : "Analyze & Save"}
          </button>
          <p className="text-[10px] mt-2" style={{ color: textMuted }}>Optional — you can complete training without this.</p>

          {materialResults.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {materialResults.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span style={{ color: r.ok ? "#22C55E" : "#EF4444" }}>{r.ok ? "✓" : "✕"}</span>
                  <span className="flex-1 min-w-0" style={{ color: textSub }}>
                    <span className="font-semibold truncate" style={{ color: r.ok ? "#22C55E" : "#EF4444" }}>{r.label}:</span> {r.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
