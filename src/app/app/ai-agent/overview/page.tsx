"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_VOICE_ID,
  clampSpeed,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  getAssistantFirstMessage,
} from "@/lib/vapi-agent-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";

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

/* Wave path */
const WAVE_D = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 560; x += 2) {
    const y = (20 + 12 * Math.sin((x / 70) * Math.PI)).toFixed(1);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ");
})();

/* Circle ring */
function CircleRing({ value, size = 64, isDark }: { value: number; size?: number; isDark: boolean }) {
  const r    = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const light = isDark ? "#1E2235" : "#F1F5F9";
  const txt   = isDark ? "#F1F5F9" : "#0F172A";
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
        {value > 0 ? `${value}%` : "—"}
      </text>
    </svg>
  );
}

/* Bar chart */
function BarChart({ data, isDark }: { data: number[]; isDark: boolean }) {
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today  = new Date().getDay();
  const labels = Array.from({ length: 7 }, (_, i) => DAY_LABELS[(today - 6 + i + 7) % 7]);
  const maxVal = Math.max(...data, 1);
  const hasData = data.some(v => v > 0);
  const W = 320; const H = 90; const barW = 28;
  const gap = (W - 7 * barW) / 8;
  const gridColor = isDark ? "#1A1D2B" : "#F1F5F9";
  const axisColor = isDark ? "#2A2D3A" : "#E5E7EB";
  const labelColor = isDark ? "#4A5568" : "#9CA3AF";
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="bar-ov" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#FF3366" stopOpacity="0.5"/>
          </linearGradient>
        </defs>
        {[0,.25,.5,.75,1].map(f => (
          <line key={f} x1="0" y1={H - f*H} x2={W} y2={H - f*H} stroke={gridColor} strokeWidth="1"/>
        ))}
        <line x1="0" y1={H} x2={W} y2={H} stroke={axisColor} strokeWidth="1.5"/>
        {data.map((val, i) => {
          const barH = hasData ? Math.max((val/maxVal)*H, val>0?4:0) : 0;
          const x = gap + i*(barW+gap);
          return (
            <g key={i}>
              <rect x={x} y={H-2} width={barW} height={2} rx="1" fill={isDark?"#1E2235":"#E9EBF0"}/>
              {val > 0 && <rect x={x} y={H-barH} width={barW} height={barH} rx="4" fill="url(#bar-ov)"/>}
              <text x={x+barW/2} y={H+18} textAnchor="middle" fontSize="9" fill={labelColor}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pb-4 pointer-events-none">
          <p className="text-xs" style={{ color: isDark?"#4A5568":"#9CA3AF" }}>No calls yet — activity will appear here</p>
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

interface CallRecord { id: string; created_at: string; duration_seconds?: number; outcome?: string }

function buildContextString(ctx: LiveContext): string {
  const lines = [
    `Business: ${ctx.business.name}`,
    `Leads: ${ctx.leads.total} total${ctx.leads.recent.length > 0 ? ` — latest: ${ctx.leads.recent.map((l:any)=>l.name||"Unknown").join(", ")}` : ""}`,
    `Appointments: ${ctx.appointments.total} total${ctx.appointments.upcoming.length>0 ? ` — upcoming: ${ctx.appointments.upcoming.map((a:any)=>`${a.customer_name||"?"} (${a.service||"?"}) at ${a.scheduled_at?new Date(a.scheduled_at).toLocaleDateString():""}`).join(", ")}` : " (none upcoming)"}`,
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
  const [loadingCalls, setLoadingCalls] = useState(true);

  /* Appointments from Supabase */
  const [apptCount, setApptCount] = useState(0);

  /* Vapi state */
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callError, setCallError]   = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const voiceIdRef     = useRef(DEFAULT_VOICE_ID);
  const speedRef       = useRef(0.85);
  const convStyleRef   = useRef("warm");
  const liveContextRef = useRef<LiveContext | null>(null);
  const prefLangRef    = useRef<string | undefined>(undefined);
  const vapiRef = useRef<VapiInstance>(null);
  const { t } = useI18n();

  /* Volume bars (DOM-direct) */
  const barRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const BAR_BASES = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35, 0.6, 0.85];
  const scaleRef = useRef<HTMLDivElement>(null);

  /* Theme */
  const bg          = isDark ? "#0B0D14" : "#F8F9FF";
  const cardBg      = isDark ? "#111420" : "#FFFFFF";
  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textSub     = isDark ? "#94A3B8" : "#475569";
  const accentBg    = isDark ? "rgba(255,107,53,0.07)" : "rgba(255,107,53,0.05)";
  const accentBorder = isDark ? "rgba(255,107,53,0.2)" : "rgba(255,107,53,0.15)";

  /* Load calls */
  useEffect(() => {
    async function loadCalls() {
      try {
        const res = await fetch("/api/ai-agent/calls");
        if (res.ok) {
          const data = await res.json() as { calls: CallRecord[] };
          setCallRecords(data.calls ?? []);
        }
      } catch { /* table may not exist yet */ }
      setLoadingCalls(false);
    }
    loadCalls();
  }, []);

  /* Load appointments + voice */
  useEffect(() => {
    async function loadMisc() {
      try {
        const db = getSupabase() as any;
        const { data: { user } } = await db.auth.getUser();
        if (!user) return;
        const { data: tenant } = await db.from("tenants").select("id").eq("owner_id", user.id).single();
        if (!tenant) return;
        const { count } = await db.from("appointments")
          .select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
        setApptCount((count as number) ?? 0);
      } catch { /* ignore */ }
    }
    loadMisc();
    fetch("/api/ai-agent/assistant-settings")
      .then(r => r.json())
      .then((d: { voiceId?: string; speed?: number; conversationStyle?: string; preferredLanguage?: string }) => {
        if (d.voiceId) voiceIdRef.current = d.voiceId;
        if (typeof d.speed === "number") speedRef.current = clampSpeed(d.speed);
        if (d.conversationStyle) convStyleRef.current = d.conversationStyle;
        if (d.preferredLanguage) prefLangRef.current = d.preferredLanguage;
      })
      .catch(() => {});
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
    if (!s) return "—";
    return s < 60 ? `${s}s` : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
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
    BAR_BASES.forEach((b, i) => { const el = barRefs.current[i]; if (el) el.style.height = `${b*5}px`; });
    if (scaleRef.current) scaleRef.current.style.transform = "scaleY(0.2)";
  }

  const startCall = useCallback(async () => {
    if (callStatus !== "idle") return;
    setCallStatus("connecting");
    setCallError(null);
    const STYLE_LINES: Record<string, string> = {
      direct:   "Be direct. Answer immediately with no preamble. Skip filler phrases like \"Great question\" or \"Of course\". One clear answer, nothing more.",
      warm:     "Be warm and conversational. Natural, friendly language — like a trusted colleague. A brief acknowledgment before answering is fine.",
      thorough: "Be thorough. Provide full context when it adds value. Walk through reasoning where helpful. Err on the side of completeness over brevity.",
      brief:    "Be maximally brief. Every word must earn its place. Compress to the minimum required for clarity and accuracy.",
    };
    const ctx  = liveContextRef.current;
    const lang = prefLangRef.current;
    const langInstruction = lang
      ? `Always speak in ${lang === "ar" ? "Arabic (العربية)" : lang === "fr" ? "French" : lang === "de" ? "German" : lang === "es" ? "Spanish" : "English"} throughout the entire conversation. Never switch languages.`
      : "Ask the owner which language they prefer upfront, then use ONLY that language for the rest of the conversation. Support Arabic, French, German, Spanish, and English fluently.";
    const velaSystem = `You are Vela — a warm, insightful AI business partner built into a phone agent platform. You are talking directly with the business owner in a voice session.

## YOUR ROLE
You have read-only access to the owner's live account data. Help them understand their business performance, answer data questions, and give actionable insights about their Vela phone agent. Think like a trusted advisor — give real insights, not just data readouts.

Vela is a phone-only service: it answers inbound business calls 24/7, handles inquiries, qualifies leads, and books appointments via voice. Not chat or messaging.

## LANGUAGE
${langInstruction}

## COMMUNICATION STYLE
${STYLE_LINES[convStyleRef.current] ?? STYLE_LINES.warm}

## VELA PLANS
Starter $79/mo · Pro $159/mo (most popular) · Premium $299/mo. Annual saves 20%.

## LIVE ACCOUNT DATA
${ctx ? buildContextString(ctx) : "Account data loading — answer general questions about Vela."}

Do not read raw data aloud — synthesize it into natural, helpful insights.`;
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;
      vapi.on("call-start", () => setCallStatus("active"));
      vapi.on("call-end",   () => { setCallStatus("ended"); resetBars(); });
      vapi.on("call-start-failed", (e: any) => {
        console.error("[vapi call-start-failed]", e);
        setCallError(toErrorText(e));
        setCallStatus("idle");
        resetBars();
      });
      vapi.on("error", (e: any) => {
        console.error("[vapi error]", e);
        setCallError(toErrorText(e));
        setCallStatus("idle");
        resetBars();
      });
      vapi.on("volume-level", (vol: number) => {
        BAR_BASES.forEach((b, i) => { const el = barRefs.current[i]; if (el) el.style.height = `${Math.max(3, b*(5+vol*18))}px`; });
        if (scaleRef.current) scaleRef.current.style.transform = `scaleY(${Math.max(0.25, 1+vol*5)})`;
      });
      const { stopSpeakingPlan, startSpeakingPlan } = getSpeakingPlanConfig();
      await vapi.start({
        model: { provider: "openai", model: "gpt-4o", messages: [{ role: "system", content: velaSystem }] },
        voice: getVoiceConfig(voiceIdRef.current, speedRef.current),
        firstMessage: getAssistantFirstMessage(prefLangRef.current),
        firstMessageInterruptionsEnabled: true,
        transcriber: getTranscriberConfig(),
        stopSpeakingPlan,
        startSpeakingPlan,
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
    setCallStatus("idle"); setCallError(null); setMuted(false); resetBars(); vapiRef.current = null;
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

  const isActive     = callStatus === "active";
  const isConnecting = callStatus === "connecting";

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <style>{`
        @keyframes waveFlow { from{transform:translateX(0)} to{transform:translateX(-280px)} }
        @keyframes pulse2 { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(min-width:768px) { .ov-pad { padding: 20px 24px 32px; margin: -20px -24px -32px; } }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-5">

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Answer Rate ring */}
          <div className="rounded-2xl border p-4 flex flex-col" style={{ background: cardBg, borderColor: border }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>{t("aiAgent.overview.answerRate")}</p>
            <div className="flex items-center gap-3">
              {loadingCalls
                ? <div className="w-[60px] h-[60px] rounded-full border-4 animate-pulse" style={{ borderColor: isDark?"#1E2235":"#F1F5F9" }}/>
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
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"#1E2235":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{totalCalls}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>Training + live calls</p>
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
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"#1E2235":"#F1F5F9" }}/>
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
              ? <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: isDark?"#1E2235":"#F1F5F9" }}/>
              : <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{voiceMins > 0 ? `${voiceMins}` : "0"}</p>
            }
            <p className="text-[10px]" style={{ color: textMuted }}>Total minutes used</p>
          </div>
        </div>

        {/* Main row */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Chart + appointments */}
          <div className="lg:col-span-2 space-y-4">

            {/* Call activity chart */}
            <div className="rounded-2xl border" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.callActivity")}</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{t("aiAgent.overview.callActivitySub")}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                  style={{ background: isDark?"#1A1D2B":"#F9FAFB", color: textMuted }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}/>
                  Calls
                </div>
              </div>
              <div className="px-5 py-5">
                {loadingCalls
                  ? <div className="h-28 rounded-xl animate-pulse" style={{ background: isDark?"#161927":"#F9FAFB" }}/>
                  : <BarChart data={weeklyData} isDark={isDark}/>
                }
              </div>
            </div>

            {/* Appointments + Recent calls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="white" strokeWidth="1.3"/>
                      <path d="M9 1v2M5 1v2M2 5h10" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M5 7.5h.01M7 7.5h.01M9 7.5h.01M5 9.5h.01" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>{t("aiAgent.overview.appointments")}</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>{t("aiAgent.overview.appointmentsSub")}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: textPrimary }}>{apptCount}</p>
                <p className="text-[10px] mt-1" style={{ color: textMuted }}>
                  {apptCount === 0 ? "None booked yet" : `${apptCount} appointment${apptCount!==1?"s":""}`}
                </p>
              </div>

              <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
                <div className="flex items-center gap-2 mb-3">
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
                  ? <p className="text-xs" style={{ color: textMuted }}>No calls yet</p>
                  : <div className="space-y-1">
                      {callRecords.slice(0,3).map((c, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: textSub }}>
                            {new Date(c.created_at).toLocaleDateString(undefined, { month:"short", day:"numeric" })}
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: "#FF3366" }}>
                            {fmtDuration(c.duration_seconds ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Phone status */}
            <div className="rounded-2xl border" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: border }}>
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
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: isDark?"#1E2235":"#F3F4F6", color: textMuted }}>Soon</span>
                </div>
              </div>
            </div>

            {/* Vela Voice card */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: isDark ? "linear-gradient(135deg,#111420,#161928)" : "linear-gradient(135deg,#FFFAF8,#FFF5F0)",
                borderColor: accentBorder,
                boxShadow: isDark ? "0 0 24px rgba(255,107,53,0.08)" : "0 0 16px rgba(255,107,53,0.06)",
              }}
            >
              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF6B35" }}>Talk to Vela</p>
                    <p className="text-[9px]" style={{ color: textMuted }}>
                      {isActive ? (muted?"Muted":"Listening…") : isConnecting?"Connecting…" : callStatus==="ended"?"Call ended" : "Your business advisor"}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{
                    background: isActive?"#22C55E":isConnecting?"#F59E0B":callStatus==="ended"?"#6B7280":"#FF6B35",
                    boxShadow: isActive?"0 0 6px #22C55E":"none",
                  }}/>
                </div>

                {/* Volume bars */}
                <div className="flex items-end justify-center gap-[3px] mb-3" style={{ height: 28 }}>
                  {BAR_BASES.map((b, i) => (
                    <div key={i} ref={el => { barRefs.current[i] = el; }}
                      style={{ width:4, height:b*5, borderRadius:2, alignSelf:"flex-end",
                        background: isActive ? "linear-gradient(to top,#FF6B35,#FF3366)" : isConnecting ? "#FF6B35" : isDark?"#1E2235":"#E9EBF0",
                        transition: "background 0.3s",
                        animation: isConnecting ? `pulse2 ${0.8+i*0.1}s ease-in-out infinite` : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Wave (active only) */}
                {isActive && (
                  <div className="mb-3" style={{ height:24, overflow:"hidden", borderRadius:3 }}>
                    <div style={{ width:560, height:24, animation:"waveFlow 1.8s linear infinite" }}>
                      <div ref={scaleRef} style={{ width:560, height:24, transform:"scaleY(0.2)", transformOrigin:"280px 12px", transition:"transform 0.05s" }}>
                        <svg viewBox="0 0 560 24" width="560" height="24">
                          <defs>
                            <linearGradient id="wg-ov" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#FF6B35"/>
                              <stop offset="50%" stopColor="#FF3366"/>
                              <stop offset="100%" stopColor="#FF6B35"/>
                            </linearGradient>
                          </defs>
                          <path d={WAVE_D.replace(/,(\d+\.?\d*)/g, (_,n) => `,${(parseFloat(n)*12/20).toFixed(1)}`)}
                            fill="none" stroke="url(#wg-ov)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls */}
                {callStatus === "idle" && (
                  <>
                    <button onClick={startCall}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                      style={{ background:"linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow:"0 3px 12px rgba(255,107,53,0.4)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.3"/>
                        <path d="M4.8 4l3.2 2-3.2 2V4z" fill="white"/>
                      </svg>
                      {t("aiAgent.overview.talkToVela")}
                    </button>
                  </>
                )}
                {isConnecting && (
                  <div className="flex items-center justify-center gap-2 py-2.5">
                    <div style={{ width:12, height:12, borderRadius:"50%", border:"1.5px solid #FF6B35", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                    <span className="text-[10px]" style={{ color: textMuted }}>Connecting…</span>
                  </div>
                )}
                {isActive && (
                  <div className="flex gap-2">
                    <button onClick={toggleMute}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: muted?accentBg:isDark?"#1E2235":"#F3F4F6", color: muted?"#FF6B35":textMuted, border:`1px solid ${muted?accentBorder:border}` }}>
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button onClick={endCall}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: isDark?"rgba(239,68,68,0.12)":"#FEF2F2", color:"#EF4444", border:"1px solid rgba(239,68,68,0.25)" }}>
                      End
                    </button>
                  </div>
                )}
                {callStatus === "ended" && (
                  <button onClick={resetCall}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background: isDark?"#1E2235":"#F3F4F6", color: textSub }}>
                    {t("aiAgent.overview.newCall")}
                  </button>
                )}
                {callError && (
                  <div className="mt-2 rounded-xl p-2.5" style={{ background: isDark?"rgba(239,68,68,0.08)":"#FFF5F5", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-[10px] font-semibold text-red-400 mb-0.5">Call failed</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>{typeof callError === "string" ? callError : "An unexpected error occurred."}</p>
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
                  { label: t("aiAgent.overview.viewCalls"),    href: "/app/ai-agent/calls",    sub: t("aiAgent.overview.viewCallsSub"),   color: "#FF6B35" },
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
    </div>
  );
}
