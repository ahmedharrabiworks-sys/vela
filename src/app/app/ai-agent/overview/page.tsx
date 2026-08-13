"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_VOICE_ID,
  clampSpeed,
  getDefaultVoiceId,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  CALL_LIMITS,
  isVapiEjection,
  vapiErrorText,
  requestMicrophoneAccess,
  DEFAULT_SPEED,
} from "@/lib/vapi-agent-config";
import { fmtDuration as fmtCallDuration, fmtTimeAgo, OutcomeBadge, CallTranscriptModal, callHeadline } from "@/components/dashboard/CallTranscript";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";

const toErrorText = vapiErrorText;

/* Circle ring */
function CircleRing({ value, size = 64, isDark }: { value: number; size?: number; isDark: boolean }) {
  const r    = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const light = isDark ? "var(--dm-card2)" : "#F1F5F9";
  const txt   = isDark ? "var(--dm-text)" : "#0F172A";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-ov" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35"/>
          <stop offset="100%" stopColor="#FF3366"/>
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={light} strokeWidth="5.5"/>
      {value > 0 && (
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#ring-ov)" strokeWidth="5.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      )}
      <text x={size/2} y={size/2+5} textAnchor="middle"
        fontSize={size < 56 ? 10 : 13} fontWeight="700" fill={txt}>
        {value > 0 ? `${value}%` : "N/A"}
      </text>
    </svg>
  );
}

/* Smooth line/area chart with hover tooltip — hand-rolled SVG (no charting
   library is installed in this project; matches this file's existing
   hand-rolled CircleRing pattern rather than adding a new dependency). */
function LineChart({ data, isDark }: { data: number[]; isDark: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today  = new Date().getDay();
  const labels = Array.from({ length: 7 }, (_, i) => DAY_LABELS[(today - 6 + i + 7) % 7]);
  const maxVal = Math.max(...data, 1);
  const hasData = data.some(v => v > 0);
  const W = 320, H = 90, PAD_TOP = 10;
  const gridColor  = isDark ? "var(--dm-border2)" : "#F1F5F9";
  const axisColor  = isDark ? "var(--dm-border)" : "#E5E7EB";
  const labelColor = isDark ? "var(--dm-faint)" : "#9CA3AF";

  const n = data.length;
  const stepX = W / (n - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: PAD_TOP + (H - PAD_TOP) * (1 - v / maxVal),
    v,
  }));

  // Catmull-Rom -> cubic-bezier smoothing through each point, for a curved
  // (not straight-segment) line.
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[n - 1].x} ${H} L ${points[0].x} ${H} Z`;
  const hover = hoverIdx !== null ? points[hoverIdx] : null;
  const tooltipLeftPct = hover ? Math.min(92, Math.max(8, (hover.x / W) * 100)) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H + 22}`}
        className="w-full overflow-visible"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * W;
          setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(relX / stepX))));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="line-fill-ov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.32"/>
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="line-stroke-ov" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF6B35"/>
            <stop offset="100%" stopColor="#FF3366"/>
          </linearGradient>
        </defs>
        {[0,.25,.5,.75,1].map(f => (
          <line key={f} x1="0" y1={PAD_TOP + (H-PAD_TOP)*(1-f)} x2={W} y2={PAD_TOP + (H-PAD_TOP)*(1-f)} stroke={gridColor} strokeWidth="1"/>
        ))}
        <line x1="0" y1={H} x2={W} y2={H} stroke={axisColor} strokeWidth="1.5"/>
        {hasData && <path d={areaPath} fill="url(#line-fill-ov)"/>}
        {hasData && <path d={linePath} fill="none" stroke="url(#line-stroke-ov)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {hasData && hover && (
          <line x1={hover.x} y1={PAD_TOP} x2={hover.x} y2={H} stroke={axisColor} strokeWidth="1" strokeDasharray="2,2"/>
        )}
        {points.map((p, i) => (
          <g key={i}>
            {hasData && (
              <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 4 : 2.5}
                fill={hoverIdx === i ? "#fff" : "#FF6B35"} stroke="#FF6B35" strokeWidth="2"
                style={{ transition: "r .12s" }}/>
            )}
            <text x={p.x} y={H + 17} textAnchor="middle" fontSize="9" fill={labelColor}>{labels[i]}</text>
          </g>
        ))}
      </svg>
      {hasData && hover && (
        <div
          className="absolute px-2 py-1 rounded-lg text-[10px] font-semibold pointer-events-none whitespace-nowrap"
          style={{
            left: `${tooltipLeftPct}%`,
            top: `${(hover.y / (H + 22)) * 100}%`,
            transform: "translate(-50%, -135%)",
            background: isDark ? "#0B0D14" : "#111111",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {hover.v} call{hover.v !== 1 ? "s" : ""}
        </div>
      )}
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pb-4 pointer-events-none">
          <p className="text-xs" style={{ color: isDark?"var(--dm-faint)":"#9CA3AF" }}>No calls yet. Activity will appear here</p>
        </div>
      )}
    </div>
  );
}

/* ── Context types ── */
interface LiveContext {
  business: { name: string; services: any[] };
  leads: { total: number; recent: any[] };
  appointments: { total: number; upcoming: any[] };
  calls: { total: number; totalMinutes: number };
  agentSettings: { tone?: string; language?: string };
}

interface CallRecord {
  id: string;
  created_at: string;
  duration_seconds?: number;
  outcome?: string;
  call_type?: string;
  caller_number?: string;
  summary?: string;
  transcript?: Array<{ role: string; text: string }>;
  language?: string;
}

// Overview's stats (Answer Rate, Calls Handled, Avg Duration, Voice Minutes, Call
// Activity, Recent Calls) must reflect only real inbound customer calls to the
// business's phone number -- never internal Training interviews or "Talk to Vela"
// business-advisor sessions. Real customer calls are tagged call_type:"live" by
// the Vapi end-of-call webhook (call-webhook/route.ts); Training tags its own
// call_type:"training" explicitly (training/page.tsx). Any call_type other than
// "live" is internal/testing and is excluded here.
function isCustomerCall(c: CallRecord): boolean {
  return c.call_type === "live";
}

function buildContextString(ctx: LiveContext): string {
  const lines = [
    `Business: ${ctx.business.name}`,
    `Leads: ${ctx.leads.total} total${ctx.leads.recent.length > 0 ? `. Latest: ${ctx.leads.recent.map((l:any)=>l.name||"Unknown").join(", ")}` : ""}`,
    `Appointments: ${ctx.appointments.total} total${ctx.appointments.upcoming.length>0 ? `. Upcoming: ${ctx.appointments.upcoming.map((a:any)=>`${a.customer_name||"?"} (${a.service||"?"}) at ${a.scheduled_at?new Date(a.scheduled_at).toLocaleDateString():""}`).join(", ")}` : " (none upcoming)"}`,
    `Training calls recorded: ${ctx.calls.total} (${ctx.calls.totalMinutes} voice minutes)`,
  ];
  if (ctx.business.services?.length > 0) {
    const names = ctx.business.services.slice(0,5).map((s:any)=>s.name||String(s)).join(", ");
    lines.push(`Services in KB: ${names}`);
  }
  return lines.join("\n");
}

/* ── Overview page ── */
export default function OverviewPage() {
  const { isDark } = useAgentTheme();

  /* Call stats from agent_calls */
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [openCall, setOpenCall] = useState<CallRecord | null>(null);
  const [loadingCalls, setLoadingCalls] = useState(true);

  /* Appointments from Supabase */

  /* Vapi state */
  const [callStatus, setCallStatus]     = useState<CallStatus>("idle");
  const [callError, setCallError]       = useState<string | null>(null);
  const [muted, setMuted]               = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [wasEjected, setWasEjected]     = useState(false);
  const [ejectedEarly, setEjectedEarly] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [noMicSignal, setNoMicSignal]   = useState(false);
  const voiceIdRef     = useRef(DEFAULT_VOICE_ID);
  const speedRef       = useRef(DEFAULT_SPEED);
  const convStyleRef   = useRef("warm");
  const liveContextRef = useRef<LiveContext | null>(null);
  const prefLangRef    = useRef<string | undefined>(undefined);
  const vapiRef  = useRef<VapiInstance>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set on call-start, read (not via stale state) inside the error handler to
  // tell a genuine mid-call drop apart from an immediate provider failure.
  const activeSinceRef = useRef<number | null>(null);
  // Tracks whether any real signal has come from the mic since the call went
  // active -- the SDK's local-volume-level event is the documented way to
  // detect "the mic isn't picking up audio" (wrong device, OS mute, etc.).
  const heardLocalAudioRef = useRef(false);
  const micCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useI18n();

  /* Volume bars (DOM-direct) — 5 bars */
  const barRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const BAR_BASES = [0.4, 0.7, 1.0, 0.7, 0.4];

  /* Theme */
  const bg          = isDark ? "var(--dm-bg)" : "#F8F9FF";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub     = isDark ? "var(--dm-text2)" : "#475569";
  const accentBg    = isDark ? "rgba(255,107,53,0.07)" : "rgba(255,107,53,0.05)";
  const accentBorder = isDark ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.15)";

  /* Load calls */
  useEffect(() => {
    async function loadCalls() {
      try {
        const res = await fetch("/api/ai-agent/calls");
        if (res.ok) {
          const data = await res.json() as { calls: CallRecord[] };
          setCallRecords((data.calls ?? []).filter(isCustomerCall));
        }
      } catch { /* table may not exist yet */ }
      setLoadingCalls(false);
    }
    loadCalls();
  }, []);

  /* Load voice settings */
  useEffect(() => {
    fetch("/api/ai-agent/assistant-settings")
      .then(r => r.json())
      .then((d: { voiceId?: string; speed?: number; conversationStyle?: string; preferredLanguage?: string }) => {
        const lang = d.preferredLanguage ?? undefined;
        // Owner's explicit choice wins; smart Arabic default only when nothing is saved
        voiceIdRef.current = d.voiceId || getDefaultVoiceId(lang);
        if (typeof d.speed === "number") speedRef.current = clampSpeed(d.speed);
        if (d.conversationStyle) convStyleRef.current = d.conversationStyle;
        prefLangRef.current = lang;
        setSettingsReady(true);
      })
      .catch(() => { setSettingsReady(true); });
  }, []);

  /* Prefetch agent context (for smart system prompt) */
  useEffect(() => {
    fetch("/api/ai-agent/context")
      .then(r => r.ok ? r.json() : null)
      .then((ctx: LiveContext | null) => { if (ctx) liveContextRef.current = ctx; })
      .catch(() => {});
  }, []);

  /* Derive call stats */
  const totalCalls = callRecords.length;
  const totalSecs  = callRecords.reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
  const avgSecs    = totalCalls > 0 ? Math.round(totalSecs / totalCalls) : 0;
  const voiceMins  = Math.round(totalSecs / 60);

  function fmtDuration(s: number) {
    if (!s) return "0s";
    return s < 60 ? `${s}s` : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  }

  function fmtTimer(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  /* Weekly call bucketing */
  const weeklyData = (() => {
    const buckets = Array(7).fill(0);
    const now = Date.now();
    callRecords.forEach(c => {
      const diff = Math.floor((now - new Date(c.created_at).getTime()) / 86400000);
      const idx  = 6 - Math.min(diff, 6);
      if (idx >= 0) buckets[idx]++;
    });
    return buckets;
  })();

  /* Vapi */
  function resetBars() {
    BAR_BASES.forEach((b, i) => { const el = barRefs.current[i]; if (el) el.style.height = `${b * 6}px`; });
  }

  const startCall = useCallback(async () => {
    if (callStatus === "connecting" || callStatus === "active") return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
    if (vapiRef.current) { try { vapiRef.current.stop(); } catch { /* ignore */ } vapiRef.current = null; }
    setCallStatus("connecting");
    setCallError(null);
    setCallDuration(0);
    setWasEjected(false);
    setEjectedEarly(false);
    setMuted(false);
    setNoMicSignal(false);
    heardLocalAudioRef.current = false;

    // Request the mic ourselves first -- if it's denied, blocked, or missing,
    // this surfaces a specific error immediately instead of a call that
    // connects fine but the assistant never receives any audio.
    const micCheck = await requestMicrophoneAccess();
    if (!micCheck.ok) {
      setCallError(micCheck.message);
      setCallStatus("idle");
      return;
    }

    const STYLE_LINES: Record<string, string> = {
      direct:   "Be direct. Answer immediately with no preamble. Skip filler phrases like \"Great question\" or \"Of course\". One clear answer, nothing more.",
      warm:     "Be warm and conversational. Natural, friendly language. Like a trusted colleague. A brief acknowledgment before answering is fine.",
      thorough: "Be thorough. Provide full context when it adds value. Walk through reasoning where helpful. Err on the side of completeness over brevity.",
      brief:    "Be maximally brief. Every word must earn its place. Compress to the minimum required for clarity and accuracy.",
    };
    const ctx  = liveContextRef.current;
    const businessName = ctx?.business?.name?.trim() || "your business";
    const lang = prefLangRef.current;
    const LANG_NAMES: Record<string, string> = {
      ar: "Arabic (العربية)", fr: "French", de: "German", es: "Spanish", en: "English",
    };
    const langInstruction = lang
      ? `MANDATORY: Speak ONLY in ${LANG_NAMES[lang] ?? lang} throughout the entire conversation. Never switch languages. Not mid-sentence, not ever.`
      : "Ask the owner which language they prefer upfront, then use ONLY that language for the rest of the conversation. Support Arabic (العربية), French, German, Spanish, and English fluently.";
    const velaSystem = `You are Vela. A warm, insightful AI business partner built into a phone agent platform. You are talking directly with the business owner in a voice session.

## YOUR ROLE
You have read-only access to the owner's live account data. Help them understand their business performance, answer data questions, and give actionable insights about their Vela phone agent. Think like a trusted advisor. Give real insights, not just data readouts.

Vela is a phone-only service: it answers inbound business calls 24/7, handles inquiries, qualifies leads, and books appointments via voice. Not chat or messaging.

## OPENING
Your first sentence MUST name the business: "${businessName}". Example: "Hi, I'm Vela, your business advisor for ${businessName} — what can I help with?" Open immediately, one sentence, then wait for their question. You speak first. Vary your exact wording every session. Never open with "مرحبا" or any other fixed phrase two sessions in a row.

## LANGUAGE
${langInstruction}

## COMMUNICATION STYLE
${STYLE_LINES[convStyleRef.current] ?? STYLE_LINES.warm}

## VELA PLANS
Starter $79/mo · Pro $159/mo (most popular) · Premium $299/mo. Annual saves 20%.

## LIVE ACCOUNT DATA
${ctx ? buildContextString(ctx) : "Account data loading. Answer general questions about Vela."}

Do not read raw data aloud. Synthesize it into natural, helpful insights.`;
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;
      vapi.on("call-start", () => {
        setCallStatus("active");
        setCallDuration(0);
        activeSinceRef.current = Date.now();
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        // Give the mic a few seconds to register real signal before warning --
        // avoids a false positive during the brief silence right after connecting.
        micCheckTimeoutRef.current = setTimeout(() => {
          if (!heardLocalAudioRef.current) setNoMicSignal(true);
        }, 6000);
      });
      vapi.on("call-end", () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
        activeSinceRef.current = null;
        setCallStatus("ended");
        resetBars();
      });
      vapi.on("call-start-failed", (e: any) => {
        console.error("[vapi call-start-failed]", e);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setCallError(toErrorText(e));
        setCallStatus("idle");
        resetBars();
      });
      vapi.on("error", (e: any) => {
        console.error("[vapi error]", e);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
        const isEjected = isVapiEjection(e);
        if (isEjected) {
          // A drop within seconds of connecting is essentially never caused by the
          // tab being backgrounded (that requires the tab to have been hidden for a
          // real stretch of time first) -- it means the call never properly
          // established, almost always a voice/transcription provider failure.
          const activeMs = activeSinceRef.current ? Date.now() - activeSinceRef.current : 0;
          setEjectedEarly(activeMs < 15000);
          activeSinceRef.current = null;
          setWasEjected(true);
          setCallStatus("ended");
        } else {
          setCallError(toErrorText(e));
          setCallStatus("idle");
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
      const { stopSpeakingPlan, startSpeakingPlan } = getSpeakingPlanConfig();
      await vapi.start({
        model: { provider: "openai", model: "gpt-4o", messages: [{ role: "system", content: velaSystem }] },
        voice: getVoiceConfig(voiceIdRef.current, speedRef.current),
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        transcriber: getTranscriberConfig(prefLangRef.current),
        stopSpeakingPlan,
        startSpeakingPlan,
        ...CALL_LIMITS,
      });
    } catch (err: unknown) {
      console.error("[call]", err);
      setCallError(toErrorText(err));
      setCallStatus("idle");
      resetBars();
    }
  }, [callStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const endCall    = useCallback(() => { vapiRef.current?.stop(); }, []);
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted; setMuted(next); vapiRef.current.setMuted(next);
  }, [muted]);
  const resetCall = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (micCheckTimeoutRef.current) { clearTimeout(micCheckTimeoutRef.current); micCheckTimeoutRef.current = null; }
    setCallStatus("idle");
    setCallError(null);
    setMuted(false);
    setCallDuration(0);
    setWasEjected(false);
    setEjectedEarly(false);
    setNoMicSignal(false);
    resetBars();
    vapiRef.current = null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onVisChange() {
      if (!document.hidden && vapiRef.current && callStatus === "active") {
        vapiRef.current.setMuted(muted);
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [callStatus, muted]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const isActive     = callStatus === "active";
  const isConnecting = callStatus === "connecting";

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <style>{`
        @keyframes pulse2 { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(min-width:768px) { .ov-pad { padding: 20px 24px 32px; margin: -20px -24px -32px; } }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>{t("aiAgent.overview.pageTitle")}</h1>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>{t("aiAgent.overview.subtitle")}</p>
          </div>
          <div
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border mt-0.5"
            style={{
              background: isActive ? "rgba(34,197,94,0.08)" : accentBg,
              borderColor: isActive ? "rgba(34,197,94,0.3)" : accentBorder,
              color: isActive ? "#22C55E" : "#FF6B35",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ background: isActive ? "#22C55E" : "#FF6B35", boxShadow: `0 0 6px ${isActive?"#22C55E":"#FF6B35"}`, animation: "pulse2 2s ease-in-out infinite" }}
            />
            {isActive ? t("aiAgent.overview.statusActive") : t("aiAgent.overview.statusOnline")}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Answer Rate ring */}
          <div className="rounded-2xl border p-4 flex flex-col" style={{ background: cardBg, borderColor: border }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>{t("aiAgent.overview.answerRate")}</p>
            <div className="flex items-center gap-3">
              {loadingCalls
                ? <div className="w-[60px] h-[60px] rounded-full border-4 animate-pulse" style={{ borderColor: isDark?"var(--dm-border)":"#F1F5F9" }}/>
                : <CircleRing value={totalCalls > 0 ? 100 : 0} size={60} isDark={isDark}/>
              }
              <div>
                <p className="text-xs font-semibold leading-tight" style={{ color: textPrimary }}>
                  {loadingCalls ? "…" : totalCalls > 0 ? "Answering calls" : "Not active yet"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: textMuted }}>
                  {totalCalls > 0 ? `${totalCalls} call${totalCalls!==1?"s":""} logged` : "Set up phone number"}
                </p>
              </div>
            </div>
          </div>

          {/* Calls Handled */}
          <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: cardBg, borderColor: border }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.callsHandled")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="#FF6B35"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{totalCalls}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>Customer calls handled by Vela</p>
          </div>

          {/* Avg Duration */}
          <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: cardBg, borderColor: border }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.avgDuration")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,51,102,0.12)", color: "#FF3366" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#FF3366" strokeWidth="1.3"/>
                  <path d="M7 4v3l2 2" stroke="#FF3366" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{fmtDuration(avgSecs)}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>Per call average</p>
          </div>

          {/* Voice Minutes */}
          <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: cardBg, borderColor: border }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{t("aiAgent.overview.voiceMinutes")}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,107,53,0.12)", color: "#FF6B35" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="#FF6B35" strokeWidth="1.3"/>
                  <path d="M2 6.5c0 2.76 2.24 5 5 5s5-2.24 5-5M7 11.5v1.5" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            {loadingCalls
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"var(--dm-card2)":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{voiceMins > 0 ? `${voiceMins}` : "0"}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>Total minutes used</p>
          </div>
        </div>

        {/* Main row */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Chart + appointments */}
          <div className="lg:col-span-2 space-y-3">

            {/* Call activity chart */}
            <div className="rounded-2xl border" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.callActivity")}</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{t("aiAgent.overview.callActivitySub")}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                  style={{ background: isDark?"var(--dm-card2)":"#F9FAFB", color: textMuted }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}/>
                  Calls
                </div>
              </div>
              <div className="px-4 py-4">
                {loadingCalls
                  ? <div className="h-28 rounded-xl animate-pulse" style={{ background: isDark?"#161927":"#F9FAFB" }}/>
                  : <LineChart data={weeklyData} isDark={isDark}/>
                }
              </div>
            </div>

            {/* Recent calls — larger, richer list; each row opens the full transcript */}
            <div className="rounded-2xl border p-4" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,51,102,0.12)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="#FF3366"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.recentCalls")}</p>
                  <p className="text-[10px]" style={{ color: textMuted }}>{t("aiAgent.overview.recentCallsSub")}</p>
                </div>
              </div>
              {totalCalls === 0
                ? <p className="text-xs py-2" style={{ color: textMuted }}>No calls yet</p>
                : <div className="space-y-1.5">
                    {callRecords.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setOpenCall(c)}
                        className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: "#FF3366" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold truncate" style={{ color: textPrimary }}>
                                {c.caller_number || "Unknown caller"}
                              </span>
                              <OutcomeBadge outcome={c.outcome} isDark={isDark} />
                            </div>
                            <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: textPrimary }}>
                              {fmtCallDuration(c.duration_seconds)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-[11px] truncate flex-1" style={{ color: textMuted }}>{callHeadline(c)}</p>
                            <span className="text-[10px] shrink-0" style={{ color: textMuted }}>{fmtTimeAgo(c.created_at)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-3">

            {/* Phone status */}
            <div className="rounded-2xl border" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
                <h2 className="text-xs font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.channelStatus")}</h2>
                <Link href="/app/ai-agent/phone" className="text-[10px] font-semibold hover:underline" style={{ color: "#FF6B35" }}>
                  {t("aiAgent.overview.setUp")}
                </Link>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl" style={{ background: accentBg }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,107,53,0.15)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.33c0 .4-.27.67-.67.67C4.4 12 2 6.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" fill="#FF6B35"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: textPrimary }}>Phone Number</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>AI answers your calls 24/7</p>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: isDark?"var(--dm-card2)":"#F3F4F6", color: textMuted }}>Soon</span>
                </div>
              </div>
            </div>

            {/* Vela Voice card */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: isDark ? "linear-gradient(135deg, var(--dm-card), var(--dm-card2))" : "linear-gradient(135deg,#FFFAF8,#FFF5F0)",
                borderColor: accentBorder,
                boxShadow: isDark ? "0 0 24px rgba(255,107,53,0.08)" : "0 0 16px rgba(255,107,53,0.06)",
              }}
            >
              <div className="px-4 pt-4 pb-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF6B35" }}>Talk to Vela</p>
                    <p className="text-[9px]" style={{ color: textMuted }}>
                      {isActive
                        ? (muted ? "Muted" : "Listening…")
                        : isConnecting ? "Connecting…"
                        : callStatus === "ended" ? (wasEjected ? (ejectedEarly ? "Couldn't connect" : "Connection lost") : "Call ended")
                        : "Your business advisor"}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{
                    background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : callStatus === "ended" ? "#6B7280" : "#FF6B35",
                    boxShadow: isActive ? "0 0 6px #22C55E" : "none",
                  }}/>
                </div>

                {/* Waveform bars — 5 bars, volume-driven when active */}
                <div className="flex items-end justify-center gap-[5px] mb-3" style={{ height: 32 }}>
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

                {/* Controls */}
                {callStatus === "idle" && (
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={startCall}
                      disabled={!settingsReady}
                      className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 3px 12px rgba(255,107,53,0.4)" }}
                    >
                      {!settingsReady
                        ? <div className="w-3 h-3 rounded-full border-[1.5px] border-white border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                        : <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2.5 6.9c1.3 2.6 3.6 4.8 6.6 6.1l2-2a.7.7 0 0 1 .7-.1c.9.3 1.8.5 2.8.5a.7.7 0 0 1 .7.7v2.8a.7.7 0 0 1-.7.7C6.1 15.6 1 10.5 1 4.2a.7.7 0 0 1 .7-.7h2.8a.7.7 0 0 1 .7.7c0 1 .2 2 .5 2.9a.7.7 0 0 1-.1.7l-2.1 2.1z" fill="white"/>
                          </svg>
                      }
                    </button>
                    <span className="text-[10px] font-medium" style={{ color: textMuted }}>
                      {!settingsReady ? "Loading…" : t("aiAgent.overview.talkToVela")}
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
                    {/* Mute */}
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

                    {/* Live timer */}
                    <span className="text-sm font-mono font-bold tabular-nums min-w-[44px] text-center" style={{ color: textPrimary }}>
                      {fmtTimer(callDuration)}
                    </span>

                    {/* End */}
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
                    Can't hear you. Check your microphone input
                  </p>
                )}

                {callStatus === "ended" && wasEjected && (
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
                    <button onClick={resetCall} className="w-full text-[9px] text-center hover:underline" style={{ color: textMuted }}>
                      Dismiss
                    </button>
                  </div>
                )}

                {callStatus === "ended" && !wasEjected && (
                  <button onClick={resetCall}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textSub }}
                  >
                    {t("aiAgent.overview.newCall")}
                  </button>
                )}

                {callError && (
                  <div className="mt-2 rounded-xl p-2.5" style={{ background: isDark ? "rgba(239,68,68,0.08)" : "#FFF5F5", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[10px] font-semibold text-red-400 mb-0.5">Call failed</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>{callError}</p>
                    <button onClick={() => setCallError(null)} className="text-[9px] font-medium text-red-400 mt-1 hover:underline">Dismiss</button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border p-4" style={{ background: cardBg, borderColor: border }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>{t("aiAgent.overview.quickActions")}</p>
              <div className="space-y-1">
                {[
                  { label: t("aiAgent.overview.trainAgent"),   href: "/app/ai-agent/training", sub: t("aiAgent.overview.trainAgentSub"),  color: "#FF3366" },
                  { label: t("aiAgent.overview.setupPhone"),   href: "/app/ai-agent/phone",    sub: t("aiAgent.overview.setupPhoneSub"),  color: "#FF6B35" },
                ].map((link) => (
                  <Link key={link.href} href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={{ color: textSub }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark?"#161927":"#F9FAFB"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background:`${link.color}18`, color:link.color }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M3.5 2L7 5l-3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{ color: textPrimary }}>{link.label}</p>
                      <p className="text-[9px] truncate" style={{ color: textMuted }}>{link.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Zero-state onboarding (phone focused) */}
        {!loadingCalls && totalCalls === 0 && (
          <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ background: accentBg, borderColor: accentBorder }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-2" style={{ color: textPrimary }}>{t("aiAgent.overview.onboardingTitle")}</p>
              <div className="space-y-1.5">
                {[
                  { n:"1", text: t("aiAgent.overview.step1Pre"), link: t("aiAgent.overview.step1Link"), href:"/app/ai-agent/training" },
                  { n:"2", text: t("aiAgent.overview.step2Pre"), link: t("aiAgent.overview.step2Link"), href:"/app/ai-agent/phone" },
                  { n:"3", text: t("aiAgent.overview.step3"),    link: null,                            href: null },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background:"linear-gradient(135deg,#FF6B35,#FF3366)", color:"white" }}>
                      {step.n}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: textSub }}>
                      {step.text}{step.link&&step.href&&<> <Link href={step.href} className="font-semibold underline" style={{ color:"#FF6B35" }}>{step.link}</Link></>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {openCall && (
        <CallTranscriptModal call={openCall} isDark={isDark} onClose={() => setOpenCall(null)} />
      )}
    </div>
  );
}
