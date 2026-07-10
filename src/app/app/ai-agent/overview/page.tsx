"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useAgentTheme } from "../layout";

/* eslint-disable @typescript-eslint/no-explicit-any */
type VapiInstance = any;
type CallStatus = "idle" | "connecting" | "active" | "ended";

const DEFAULT_VOICE = "PIGsltMj3gFMR34aFDI3";

const VELA_SYSTEM = `You are Vela — a warm, knowledgeable AI business partner built into this owner's Vela dashboard. You speak like a trusted friend who also happens to be a smart business consultant.

## MANDATORY OPENING
Start EVERY call with exactly: "Welcome, boss. I've been waiting for you."
Then immediately ask: "Before we dive in — which language would you like to continue in?"

## LANGUAGE RULE — CRITICAL
After they choose a language, use ONLY that language for the ENTIRE conversation. Never switch. Never mix. Permanent and non-negotiable.

## YOUR ROLE
You are the owner's AI companion. Help them understand their business, navigate Vela, review their performance, and get the most from the platform. You are warm, insightful, and encouraging. Do NOT conduct structured interviews — that's what Training mode is for.

## WHAT VELA IS
Vela is an AI Business Operating System that automatically answers customer messages on WhatsApp, Instagram, and website chat 24/7, qualifies leads, books appointments, and runs customer communications.

## DASHBOARD PAGES
Dashboard (/app), Conversations (/app/conversations), Leads (/app/leads), Appointments (/app/appointments), Channels (/app/channels), Website (/app/website), Analytics (/app/analytics), Marketing (/app/marketing), Train AI (/app/ai-training), Settings (/app/settings).

## VELA PLANS
Starter $79/mo · Pro $159/mo (most popular) · Premium $299/mo. Annual saves 20%.`;

/* ── Pre-computed sine wave path (560px wide, 8 cycles) ── */
const WAVE_D = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 560; x += 2) {
    const y = (20 + 12 * Math.sin((x / 70) * Math.PI)).toFixed(1);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y}`);
  }
  return pts.join(" ");
})();

/* ── Stats types ── */
interface ChannelStatus { instagram: boolean; whatsapp: boolean; website: boolean; phone: boolean }
interface AgentStats {
  conversations: number;
  appointments: number;
  responseRate: number;
  channelsActive: number;
  channelStatus: ChannelStatus;
  weeklyActivity: number[];
}

/* ── Helpers ── */
function c(light: string, dark: string, isDark: boolean) { return isDark ? dark : light; }

function CircleRing({ value, size = 72, isDark }: { value: number; size?: number; isDark: boolean }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#FF3366" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={c("#F1F5F9", "#1E2235", isDark)} strokeWidth="5.5" />
      {value > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ring-g)" strokeWidth="5.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      )}
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle"
        fontSize={size < 64 ? 11 : 14} fontWeight="700"
        fill={c("#0F172A", "#F1F5F9", isDark)}>
        {value}%
      </text>
    </svg>
  );
}

function BarChart({ data, isDark }: { data: number[]; isDark: boolean }) {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const labels = Array.from({ length: 7 }, (_, i) => DAY_LABELS[(today - 6 + i + 7) % 7]);
  const maxVal = Math.max(...data, 1);
  const hasData = data.some((v) => v > 0);
  const W = 320; const H = 100;
  const barW = 28;
  const gap = (W - 7 * barW) / 8;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF3366" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line key={frac}
            x1="0" y1={H - frac * H} x2={W} y2={H - frac * H}
            stroke={c("#F1F5F9", "#1A1D2B", isDark)} strokeWidth="1" />
        ))}
        {/* x-axis */}
        <line x1="0" y1={H} x2={W} y2={H}
          stroke={c("#E5E7EB", "#2A2D3A", isDark)} strokeWidth="1.5" />
        {/* Bars + labels */}
        {data.map((val, i) => {
          const barH = hasData ? Math.max((val / maxVal) * H, val > 0 ? 4 : 0) : 0;
          const x = gap + i * (barW + gap);
          return (
            <g key={i}>
              {/* Zero-floor bar (always visible as indicator) */}
              <rect x={x} y={H - 2} width={barW} height={2} rx="1"
                fill={c("#E9EBF0", "#1E2235", isDark)} />
              {/* Data bar */}
              {val > 0 && (
                <rect x={x} y={H - barH} width={barW} height={barH} rx="4"
                  fill="url(#bar-g)" />
              )}
              <text x={x + barW / 2} y={H + 18} textAnchor="middle"
                fontSize="9" fill={c("#9CA3AF", "#4A5568", isDark)}>
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {!hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-4 pointer-events-none">
          <p className="text-xs text-center" style={{ color: c("#9CA3AF", "#4A5568", isDark) }}>
            No activity yet — conversations will appear here
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function OverviewPage() {
  const { isDark } = useAgentTheme();

  /* Stats */
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  /* Vapi call state */
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE);
  const vapiRef = useRef<VapiInstance>(null);

  /* Volume bars (DOM-direct for 60fps) */
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const BAR_BASES = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35, 0.6, 0.85];

  /* Waveform scale (DOM-direct) */
  const scaleRef = useRef<HTMLDivElement>(null);

  /* Theme shortcuts */
  const bg         = c("#F8F9FF", "#0B0D14", isDark);
  const cardBg     = c("#FFFFFF", "#111420", isDark);
  const cardBg2    = c("#F9FAFB", "#161927", isDark);
  const border     = c("#E5E7EB", "#1E2235", isDark);
  const textPrimary = c("#0F172A", "#F1F5F9", isDark);
  const textMuted   = c("#9CA3AF", "#64748B", isDark);
  const textSub     = c("#475569", "#94A3B8", isDark);
  const accentBg    = c("rgba(255,107,53,0.07)", "rgba(255,107,53,0.12)", isDark);
  const accentBorder = c("rgba(255,107,53,0.2)", "rgba(255,107,53,0.25)", isDark);

  /* ── Load Supabase stats ── */
  useEffect(() => {
    async function load() {
      setLoadingStats(true);
      try {
        const db = getSupabase() as any;
        const { data: { user } } = await db.auth.getUser();
        if (!user) { setLoadingStats(false); return; }

        const { data: tenant } = await db
          .from("tenants").select("id").eq("owner_id", user.id).single();
        if (!tenant) { setLoadingStats(false); return; }

        const tenantId = tenant.id as string;
        const now = new Date();
        const sevenAgo = new Date(now.getTime() - 7 * 86400000);

        const [convRes, apptRes, cfgRes, weekRes] = await Promise.all([
          db.from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
          db.from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
          db.from("tenant_config")
            .select("instagram_connected, whatsapp_connected")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
          db.from("conversations")
            .select("created_at")
            .eq("tenant_id", tenantId)
            .gte("created_at", sevenAgo.toISOString()),
        ]);

        const cfg = cfgRes.data as { instagram_connected?: boolean; whatsapp_connected?: boolean } | null;
        const totalConvs  = (convRes.count as number) ?? 0;
        const totalAppts  = (apptRes.count as number) ?? 0;

        const channelStatus: ChannelStatus = {
          instagram: cfg?.instagram_connected ?? false,
          whatsapp:  cfg?.whatsapp_connected  ?? false,
          website:   true,
          phone:     false,
        };
        const channelsActive = [channelStatus.instagram, channelStatus.whatsapp, channelStatus.website]
          .filter(Boolean).length;

        /* Weekly buckets (index 0 = 6 days ago, index 6 = today) */
        const weekly = Array(7).fill(0);
        const rows = (weekRes.data ?? []) as Array<{ created_at: string }>;
        rows.forEach((r) => {
          const diff = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000);
          const idx  = 6 - Math.min(diff, 6);
          weekly[idx]++;
        });

        /* Response rate: 100% if AI is live on at least 1 channel with conversations */
        const responseRate = channelsActive >= 1 && totalConvs > 0 ? 100 : 0;

        setStats({ conversations: totalConvs, appointments: totalAppts, responseRate, channelsActive, channelStatus, weeklyActivity: weekly });
      } catch (err) {
        console.error("[overview stats]", err);
      }
      setLoadingStats(false);
    }
    load();
  }, []);

  /* Load saved voice */
  useEffect(() => {
    fetch("/api/ai-agent/settings")
      .then((r) => r.json())
      .then((d: { voiceId?: string }) => { if (d.voiceId) setVoiceId(d.voiceId); })
      .catch(() => {});
  }, []);

  /* ── Vapi handlers ── */
  const startCall = useCallback(async () => {
    if (callStatus !== "idle") return;
    setCallStatus("connecting");
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi: VapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "");
      vapiRef.current = vapi;

      vapi.on("call-start", () => setCallStatus("active"));
      vapi.on("call-end",   () => { setCallStatus("ended"); resetBars(); });
      vapi.on("error",      (e: unknown) => { console.error("[vapi]", e); setCallStatus("idle"); resetBars(); });

      vapi.on("volume-level", (vol: number) => {
        /* Direct DOM — no React re-render */
        BAR_BASES.forEach((base, i) => {
          const el = barRefs.current[i];
          if (el) el.style.height = `${Math.max(3, base * (5 + vol * 18))}px`;
        });
        if (scaleRef.current) {
          scaleRef.current.style.transform = `scaleY(${Math.max(0.25, 1 + vol * 5)})`;
        }
      });

      await vapi.start({
        model: { provider: "openai", model: "gpt-4o", messages: [{ role: "system", content: VELA_SYSTEM }] },
        voice: {
          provider: "11labs", voiceId,
          model: "eleven_multilingual_v2",
          stability: 0.45, similarityBoost: 0.8, style: 0.25,
          useSpeakerBoost: true, speed: 0.85,
        },
        firstMessage: "Welcome, boss. I've been waiting for you. Before we dive in — which language would you like to continue in?",
        transcriber: { provider: "deepgram", model: "nova-2", smartFormat: true },
        stopSpeakingPlan: { numWords: 0, voiceSeconds: 0.2, backoffSeconds: 1.5 },
      });
    } catch (err) { console.error("[call]", err); setCallStatus("idle"); resetBars(); }
  }, [callStatus, voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const endCall   = useCallback(() => { vapiRef.current?.stop(); }, []);
  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted;
    setMuted(next);
    vapiRef.current.setMuted(next);
  }, [muted]);
  const resetCall = useCallback(() => { setCallStatus("idle"); setMuted(false); resetBars(); vapiRef.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetBars() {
    BAR_BASES.forEach((base, i) => {
      const el = barRefs.current[i];
      if (el) el.style.height = `${base * 5}px`;
    });
    if (scaleRef.current) scaleRef.current.style.transform = "scaleY(0.2)";
  }

  const isActive     = callStatus === "active";
  const isConnecting = callStatus === "connecting";

  /* ── Stat card data ── */
  const statCards = [
    {
      label: "Conversations", sub: "AI-handled messages",
      value: loadingStats ? "—" : String(stats?.conversations ?? 0),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 9.5a1.5 1.5 0 01-1.5 1.5H4.75L2 13.5V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
      ),
      color: "#FF6B35",
      emptyNote: "0 conversations yet",
    },
    {
      label: "Appointments", sub: "Bookings in system",
      value: loadingStats ? "—" : String(stats?.appointments ?? 0),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M10.5 1.5v2M5.5 1.5v2M2 6.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M5 9.5h.01M8 9.5h.01M11 9.5h.01M5 12h.01M8 12h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
      color: "#FF3366",
      emptyNote: "0 appointments yet",
    },
    {
      label: "Channels Active", sub: "of 3 available",
      value: loadingStats ? "—" : `${stats?.channelsActive ?? 0}/3`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 6.5a2.5 2.5 0 010 3M12.5 4a5.5 5.5 0 010 8M6 9a2.5 2.5 0 010-3M3.5 12a5.5 5.5 0 010-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="8" cy="8" r="1.25" fill="currentColor"/>
        </svg>
      ),
      color: "#7C3AED",
      emptyNote: "No channels connected",
    },
  ];

  return (
    <div className="p-5 md:p-7" style={{ background: bg, minHeight: "calc(100vh - 64px)" }}>
      <style>{`
        @keyframes waveFlow { from { transform: translateX(0); } to { transform: translateX(-280px); } }
        @keyframes pulse2 { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>AI Agent Overview</h1>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              Live performance dashboard — your AI&apos;s activity at a glance
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full border"
              style={{
                background: isActive ? c("rgba(34,197,94,0.08)", "rgba(34,197,94,0.12)", isDark) : accentBg,
                borderColor: isActive ? "rgba(34,197,94,0.3)" : accentBorder,
                color: isActive ? "#22C55E" : "#FF6B35",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isActive ? "#22C55E" : "#FF6B35",
                  boxShadow: isActive ? "0 0 6px #22C55E" : "0 0 6px #FF6B35",
                  animation: isActive ? "pulse2 1.5s ease-in-out infinite" : "pulse2 3s ease-in-out infinite",
                }}
              />
              {isActive ? "Voice active" : "AI Agent online"}
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Response Rate (special — has ring) */}
          <div
            className="rounded-2xl border p-4 flex flex-col"
            style={{ background: cardBg, borderColor: border, boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.05)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
              Response Rate
            </p>
            <div className="flex items-center gap-3">
              {loadingStats ? (
                <div className="w-[60px] h-[60px] rounded-full border-4 animate-pulse" style={{ borderColor: c("#F1F5F9", "#1E2235", isDark) }} />
              ) : (
                <CircleRing value={stats?.responseRate ?? 0} size={60} isDark={isDark} />
              )}
              <div>
                <p className="text-xs font-semibold leading-tight" style={{ color: textPrimary }}>
                  {loadingStats ? "Loading…" : stats?.responseRate === 0 ? "Not active" : "100% covered"}
                </p>
                <p className="text-[10px] mt-1" style={{ color: textMuted }}>
                  {loadingStats ? "" : stats?.conversations === 0 ? "No conversations yet" : "AI answers all messages"}
                </p>
              </div>
            </div>
          </div>

          {/* 3 regular stat cards */}
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border p-4 flex flex-col gap-2"
              style={{ background: cardBg, borderColor: border, boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{card.label}</p>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${card.color}18`, color: card.color }}
                >
                  {card.icon}
                </div>
              </div>
              {loadingStats ? (
                <div className="h-7 rounded w-1/3 animate-pulse" style={{ background: c("#F1F5F9", "#1E2235", isDark) }} />
              ) : (
                <p className="text-2xl font-bold leading-none" style={{ color: textPrimary }}>{card.value}</p>
              )}
              <p className="text-[10px]" style={{ color: textMuted }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Main row: chart + sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Chart — left 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            {/* Activity chart */}
            <div
              className="rounded-2xl border"
              style={{ background: cardBg, borderColor: border, boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: textPrimary }}>AI Activity</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>Conversations handled · last 7 days</p>
                </div>
                <div
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                  style={{ background: isDark ? "#1A1D2B" : "#F9FAFB", color: textMuted }}
                >
                  <span className="w-2 h-2 rounded-sm" style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }} />
                  Conversations
                </div>
              </div>
              <div className="px-5 py-5">
                {loadingStats ? (
                  <div className="h-32 rounded-xl animate-pulse" style={{ background: c("#F9FAFB", "#161927", isDark) }} />
                ) : (
                  <BarChart data={stats?.weeklyActivity ?? Array(7).fill(0)} isDark={isDark} />
                )}
              </div>
            </div>

            {/* Performance summary row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Voice calls panel */}
              <div
                className="rounded-2xl border p-5"
                style={{ background: cardBg, borderColor: border }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.3"/>
                      <path d="M5.5 5l3 2-3 2V5z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>Voice Calls</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>Vapi sessions</p>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: textPrimary }}>0</p>
                <p className="text-[10px] leading-relaxed" style={{ color: textMuted }}>
                  Voice call history will appear here once you start using the agent
                </p>
              </div>

              {/* Avg handling time */}
              <div
                className="rounded-2xl border p-5"
                style={{ background: cardBg, borderColor: border }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.1)", color: "#7C3AED" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>Avg. Response</p>
                    <p className="text-[10px]" style={{ color: textMuted }}>Time to first reply</p>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: textPrimary }}>—</p>
                <p className="text-[10px] leading-relaxed" style={{ color: textMuted }}>
                  Response time tracking starts once the AI is handling conversations
                </p>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Channel status */}
            <div
              className="rounded-2xl border"
              style={{ background: cardBg, borderColor: border, boxShadow: isDark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: border }}>
                <h2 className="text-xs font-semibold" style={{ color: textPrimary }}>Channel Status</h2>
                <Link
                  href="/app/channels"
                  className="text-[10px] font-semibold hover:underline"
                  style={{ color: "#FF6B35" }}
                >
                  Manage
                </Link>
              </div>
              <div className="p-2">
                {loadingStats ? (
                  <div className="space-y-1.5 p-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: c("#F9FAFB", "#161927", isDark) }} />
                    ))}
                  </div>
                ) : (
                  [
                    { label: "WhatsApp",  key: "whatsapp",  icon: "W", color: "#25D366", connected: stats?.channelStatus.whatsapp },
                    { label: "Instagram", key: "instagram", icon: "I", color: "#E1306C", connected: stats?.channelStatus.instagram },
                    { label: "Website",   key: "website",   icon: "W", color: "#FF6B35", connected: stats?.channelStatus.website },
                    { label: "Phone",     key: "phone",     icon: "P", color: "#6366F1", connected: false, badge: "Soon" },
                  ].map((ch) => (
                    <div
                      key={ch.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: ch.connected ? (isDark ? "rgba(34,197,94,0.04)" : "rgba(34,197,94,0.03)") : "transparent" }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ background: `${ch.color}18`, color: ch.color }}
                      >
                        {ch.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold" style={{ color: textPrimary }}>{ch.label}</p>
                      </div>
                      {ch.badge ? (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: c("#F1F5F9", "#1E2235", isDark), color: textMuted }}>
                          {ch.badge}
                        </span>
                      ) : ch.connected ? (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: "0 0 4px #22C55E" }} />
                          <span className="text-[9px] text-green-500 font-semibold">Live</span>
                        </div>
                      ) : (
                        <span className="text-[9px]" style={{ color: textMuted }}>Off</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Mini Jarvis core ── */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: isDark ? "linear-gradient(135deg, #111420 0%, #161928 100%)" : "linear-gradient(135deg, #FFFAF8 0%, #FFF5F0 100%)",
                borderColor: accentBorder,
                boxShadow: isDark ? "0 0 24px rgba(255,107,53,0.08)" : "0 0 16px rgba(255,107,53,0.06)",
              }}
            >
              {/* Glow backdrop */}
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-3xl pointer-events-none"
                style={{ background: "rgba(255,107,53,0.15)" }}
              />

              <div className="relative px-4 pt-4 pb-4">
                {/* Label */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF6B35" }}>Vela Voice</p>
                    <p className="text-[9px]" style={{ color: textMuted }}>
                      {isActive ? (muted ? "Muted" : "Listening…") : isConnecting ? "Connecting…" : callStatus === "ended" ? "Call ended" : "Tap to talk"}
                    </p>
                  </div>
                  {/* Live dot */}
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isActive ? "#22C55E" : isConnecting ? "#F59E0B" : callStatus === "ended" ? "#6B7280" : "#FF6B35",
                      boxShadow: isActive ? "0 0 6px #22C55E" : "none",
                    }}
                  />
                </div>

                {/* Mini volume bars */}
                <div className="flex items-end justify-center gap-[3px] mb-3" style={{ height: 28 }}>
                  {BAR_BASES.map((base, i) => (
                    <div
                      key={i}
                      ref={(el) => { barRefs.current[i] = el; }}
                      style={{
                        width: 4,
                        height: base * 5,
                        borderRadius: 2,
                        background: isActive
                          ? "linear-gradient(to top, #FF6B35, #FF3366)"
                          : isConnecting
                          ? "#FF6B35"
                          : c("#E9EBF0", "#1E2235", isDark),
                        alignSelf: "flex-end",
                        transition: "background 0.3s",
                        animation: isConnecting ? `pulse2 ${0.8 + i * 0.1}s ease-in-out infinite` : "none",
                      }}
                    />
                  ))}
                </div>

                {/* Small waveform (shows only when active) */}
                {isActive && (
                  <div className="mb-3" style={{ height: 24, overflow: "hidden", borderRadius: 3 }}>
                    <div style={{ width: 560, height: 24, animation: "waveFlow 1.8s linear infinite" }}>
                      <div
                        ref={scaleRef}
                        style={{ width: 560, height: 24, transform: "scaleY(0.2)", transformOrigin: "280px 12px", transition: "transform 0.05s" }}
                      >
                        <svg viewBox="0 0 560 24" width="560" height="24">
                          <defs>
                            <linearGradient id="wg-mini" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#FF6B35"/>
                              <stop offset="50%" stopColor="#FF3366"/>
                              <stop offset="100%" stopColor="#FF6B35"/>
                            </linearGradient>
                          </defs>
                          <path d={WAVE_D.replace(/,(\d+\.?\d*)/g, (_, n) => `,${(parseFloat(n) * 12 / 20).toFixed(1)}`)}
                            fill="none" stroke="url(#wg-mini)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls */}
                {callStatus === "idle" && (
                  <button
                    onClick={startCall}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)", boxShadow: "0 3px 12px rgba(255,107,53,0.4)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.3"/>
                      <path d="M4.8 4l3.2 2-3.2 2V4z" fill="white"/>
                    </svg>
                    Talk to Vela
                  </button>
                )}
                {isConnecting && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid #FF6B35", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                    <span className="text-[10px]" style={{ color: textMuted }}>Connecting…</span>
                  </div>
                )}
                {isActive && (
                  <div className="flex gap-2">
                    <button
                      onClick={toggleMute}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: muted ? accentBg : c("#F3F4F6", "#1E2235", isDark),
                        color: muted ? "#FF6B35" : textMuted,
                        border: `1px solid ${muted ? accentBorder : border}`,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        {muted
                          ? <><rect x="3" y="1" width="4" height="5" rx="2" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5a3.5 3.5 0 007 0M5 8.5v1M8 2.5l-6 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></>
                          : <><rect x="3" y="1" width="4" height="5" rx="2" stroke="currentColor" strokeWidth="1.1"/><path d="M1.5 5a3.5 3.5 0 007 0M5 8.5v1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></>
                        }
                      </svg>
                      {muted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={endCall}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", color: "#EF4444", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      End
                    </button>
                  </div>
                )}
                {callStatus === "ended" && (
                  <button
                    onClick={resetCall}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all"
                    style={{ background: c("#F3F4F6", "#1E2235", isDark), color: textSub }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 5A4 4 0 018.2 2.5M9 1v2H7M9 5A4 4 0 011.8 7.5M1 9V7h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    New call
                  </button>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div
              className="rounded-2xl border p-4"
              style={{ background: cardBg, borderColor: border }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: textMuted }}>Quick actions</p>
              <div className="space-y-1">
                {[
                  { label: "Train the AI", href: "/app/ai-agent/training", sub: "Run business interview", color: "#FF3366" },
                  { label: "Connect channels", href: "/app/channels", sub: "Activate WhatsApp / Instagram", color: "#FF6B35" },
                  { label: "View conversations", href: "/app/conversations", sub: "See all AI messages", color: "#7C3AED" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={{ color: textSub }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = c("#F9FAFB", "#161927", isDark); }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${link.color}18`, color: link.color }}
                    >
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

        {/* ── Zero-state onboarding hint ── */}
        {!loadingStats && (stats?.conversations ?? 0) === 0 && (
          <div
            className="rounded-2xl border p-5 flex items-start gap-4"
            style={{ background: accentBg, borderColor: accentBorder }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2a4 4 0 100 8 4 4 0 000-8zM2 14s0-2 6-2 6 2 6 2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: textPrimary }}>Your AI agent is ready — here&apos;s how to get it working</p>
              <div className="space-y-1">
                {[
                  { num: "1", text: "Connect a channel (WhatsApp, Instagram, or website chat) in", link: "Channels →", href: "/app/channels" },
                  { num: "2", text: "Train the AI with your business details in", link: "Training →", href: "/app/ai-agent/training" },
                  { num: "3", text: "Customers message you → AI responds instantly → activity appears here", link: null, href: null },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)", color: "white" }}
                    >
                      {step.num}
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: textSub }}>
                      {step.text}{step.link && step.href && (
                        <> <Link href={step.href} className="font-semibold underline" style={{ color: "#FF6B35" }}>{step.link}</Link></>
                      )}
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
