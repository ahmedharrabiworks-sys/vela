"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";

interface CallRecord {
  id: string;
  call_type: "training" | "overview" | string;
  created_at: string;
  ended_at?: string;
  duration_seconds?: number;
  language?: string;
  transcript?: Array<{ role: string; text: string }>;
  summary?: string;
  outcome?: string;
  kb_extracted?: Record<string, unknown>;
}

function formatDuration(secs?: number) {
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute: "2-digit",
  });
}

function CallTypeTag({ type, isDark }: { type: string; isDark: boolean }) {
  const isTraining = type === "training";
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{
        background: isTraining
          ? (isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0")
          : (isDark ? "rgba(255,51,102,0.15)" : "#FFF0F5"),
        color: isTraining ? "#FF6B35" : "#FF3366",
      }}
    >
      {isTraining ? "Training" : "Live Call"}
    </span>
  );
}

export default function CallsPage() {
  const { isDark } = useAgentTheme();
  const [calls, setCalls]     = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cardBg      = isDark ? "#13161F" : "#FFFFFF";
  const cardBg2     = isDark ? "#0F1117" : "#F9FAFB";
  const border      = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textSub     = isDark ? "#94A3B8" : "#6B7280";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/calls");
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? "Failed to load calls");
          setLoading(false);
          return;
        }
        const data = await res.json() as { calls: CallRecord[] };
        setCalls(data.calls ?? []);
      } catch {
        setError("Could not load call records.");
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textPrimary }}>Calls & Appointments</h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>
            {calls.length === 0 ? "No calls yet" : `${calls.length} call${calls.length !== 1 ? "s" : ""} recorded`}
          </p>
        </div>
        {calls.length > 0 && (
          <div className="text-right">
            <p className="text-xs" style={{ color: textMuted }}>Total voice time</p>
            <p className="text-sm font-bold" style={{ color: "#FF6B35" }}>
              {formatDuration(calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0))}
            </p>
          </div>
        )}
      </div>

      {/* SQL hint if table missing */}
      {error && error.includes("migration") && (
        <div className="rounded-2xl border p-5" style={{ background: isDark ? "rgba(255,107,53,0.05)" : "#FFF5F0", borderColor: "rgba(255,107,53,0.3)" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#FF6B35" }}>Database setup required</p>
          <p className="text-xs mb-3" style={{ color: textMuted }}>Run this SQL in your Supabase dashboard to enable call records:</p>
          <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: isDark ? "#0F1117" : "#F3F4F6", color: textSub }}>
{`CREATE TABLE IF NOT EXISTS agent_calls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  call_type        TEXT NOT NULL DEFAULT 'training',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  language         TEXT,
  transcript       JSONB DEFAULT '[]'::jsonb,
  summary          TEXT,
  outcome          TEXT DEFAULT 'completed',
  kb_extracted     JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_calls_tenant_idx
  ON agent_calls(tenant_id, created_at DESC);`}
          </pre>
        </div>
      )}

      {/* Zero state */}
      {!error && calls.length === 0 && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: cardBg, borderColor: border }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: textPrimary }}>No calls yet</h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: textMuted }}>
            Call records will appear here after your first training interview or when your phone agent handles a live call.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="/app/ai-agent/training"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
            >
              Start training interview
            </a>
            <a
              href="/app/ai-agent/phone"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: isDark ? "#1E2130" : "#F3F4F6", color: textSub }}
            >
              Set up phone number
            </a>
          </div>
        </div>
      )}

      {/* Call list */}
      {calls.map((call) => {
        const isOpen = expanded === call.id;
        const lines  = call.transcript ?? [];
        return (
          <div
            key={call.id}
            className="rounded-2xl border overflow-hidden transition-all"
            style={{ background: cardBg, borderColor: border }}
          >
            {/* Card header */}
            <button
              className="w-full flex items-center gap-4 px-5 py-4 text-left"
              onClick={() => setExpanded(isOpen ? null : call.id)}
            >
              {/* Call icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: call.call_type === "training" ? (isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0") : (isDark ? "rgba(255,51,102,0.1)" : "#FFF0F5") }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4.4 7.2c.93 1.87 2.53 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V13.33c0 .4-.27.67-.67.67C4.4 14 2 7.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L4.4 7.2z" fill={call.call_type === "training" ? "#FF6B35" : "#FF3366"}/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                    {call.call_type === "training" ? "Training Interview" : "Voice Call"}
                  </span>
                  <CallTypeTag type={call.call_type} isDark={isDark} />
                  {call.outcome === "completed" && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      Completed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs" style={{ color: textMuted }}>{formatDate(call.created_at)}</span>
                  {call.duration_seconds && (
                    <span className="text-xs" style={{ color: textMuted }}>
                      • {formatDuration(call.duration_seconds)}
                    </span>
                  )}
                  {call.language && (
                    <span className="text-xs" style={{ color: textMuted }}>• {call.language}</span>
                  )}
                  {lines.length > 0 && (
                    <span className="text-xs" style={{ color: textMuted }}>• {lines.length} messages</span>
                  )}
                </div>
              </div>

              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="shrink-0 transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: textMuted }}
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t px-5 pb-5 pt-4 space-y-4" style={{ borderColor: border }}>
                {/* Summary */}
                {call.summary && (
                  <div className="rounded-xl p-4" style={{ background: cardBg2 }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: textMuted }}>Summary</p>
                    <p className="text-sm leading-relaxed" style={{ color: textSub }}>{call.summary}</p>
                  </div>
                )}

                {/* Transcript */}
                {lines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: textMuted }}>Transcript</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {lines.map((line, i) => (
                        <div key={i} className={`flex gap-2 ${line.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold"
                            style={{
                              background: line.role === "assistant"
                                ? "linear-gradient(135deg, #FF3366, #FF6B35)"
                                : (isDark ? "#2A2D3A" : "#F3F4F6"),
                              color: line.role === "assistant" ? "white" : textMuted,
                            }}
                          >
                            {line.role === "assistant" ? "V" : "Y"}
                          </div>
                          <div
                            className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                            style={{
                              background: line.role === "assistant"
                                ? (isDark ? "rgba(255,51,102,0.08)" : "#FFF0F5")
                                : (isDark ? "#1E2130" : "#F3F4F6"),
                              color: textSub,
                            }}
                          >
                            {line.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KB extracted */}
                {call.kb_extracted && Object.keys(call.kb_extracted).length > 0 && (
                  <div className="rounded-xl border p-4" style={{ background: isDark ? "rgba(34,197,94,0.05)" : "#F0FDF4", borderColor: isDark ? "rgba(34,197,94,0.2)" : "#BBF7D0" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-green-600">Knowledge Captured</p>
                    <pre className="text-[10px] leading-relaxed text-green-700 whitespace-pre-wrap break-words">
                      {JSON.stringify(call.kb_extracted, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
