"use client";

import { useState, useEffect, useCallback } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";

interface CallRecord {
  id: string;
  call_type: "training" | "live" | "overview" | string;
  created_at: string;
  ended_at?: string;
  duration_seconds?: number;
  language?: string;
  caller_number?: string;
  transcript?: Array<{ role: string; text: string }>;
  summary?: string;
  outcome?: string;
  kb_extracted?: Record<string, unknown>;
  appointment_booked?: Record<string, unknown> | null;
}

function fmtDuration(secs?: number) {
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute: "2-digit",
  });
}

function LangFlag({ lang }: { lang?: string }) {
  const map: Record<string, string> = { ar: "🇸🇦", en: "🇺🇸", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸" };
  const label: Record<string, string> = { ar: "AR", en: "EN", fr: "FR", de: "DE", es: "ES" };
  if (!lang) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="flex items-center gap-1 text-xs">
      {map[lang] ?? ""} {label[lang] ?? lang.toUpperCase()}
    </span>
  );
}

function OutcomeBadge({ outcome, isDark }: { outcome?: string; isDark: boolean }) {
  if (!outcome || outcome === "—") return <span className="text-xs" style={{ color: isDark ? "#64748B" : "#9CA3AF" }}>—</span>;
  const isBooked = /book|appointment|schedule/i.test(outcome);
  const isComp   = outcome === "completed";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: isBooked
          ? "rgba(34,197,94,0.12)"
          : isComp
          ? (isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0")
          : (isDark ? "#1E2130" : "#F3F4F6"),
        color: isBooked ? "#22C55E" : isComp ? "#FF6B35" : (isDark ? "#64748B" : "#9CA3AF"),
      }}
    >
      {isBooked ? "Booked" : isComp ? "Complete" : outcome}
    </span>
  );
}

export default function CallsPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [calls, setCalls]       = useState<CallRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const headerBg    = isDark ? "#0D1017" : "#F8F9FB";
  const cardBg      = isDark ? "#13161F" : "#FFFFFF";
  const rowHover    = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const rowExpanded = isDark ? "#0F1117" : "#F9FAFB";
  const border      = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textSub     = isDark ? "#94A3B8" : "#6B7280";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-agent/calls");
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to load calls");
        return;
      }
      const data = await res.json() as { calls: CallRecord[] };
      setCalls(data.calls ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError("Could not load call records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  const thClass = "text-[10px] font-bold uppercase tracking-wider text-left px-4 py-3 select-none";
  const thStyle = { color: textMuted, whiteSpace: "nowrap" as const };
  const tdClass = "px-4 py-3 text-xs align-middle";
  const tdStyle = { color: textSub };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textPrimary }}>{t("aiAgent.calls.pageTitle")}</h1>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>
            {calls.length === 0 ? "No calls yet" : `${calls.length} record${calls.length !== 1 ? "s" : ""}`}
            {" · "}
            <span>Updated {lastRefresh.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: isDark ? "#1E2130" : "#F3F4F6", color: textMuted, border: `1px solid ${border}` }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9.5 2A5 5 0 109 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9.5 2v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("aiAgent.calls.refresh")}
        </button>
      </div>

      {/* SQL hint */}
      {error && error.includes("migration") && (
        <div className="rounded-2xl border p-5" style={{ background: isDark ? "rgba(255,107,53,0.05)" : "#FFF5F0", borderColor: "rgba(255,107,53,0.3)" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#FF6B35" }}>{t("aiAgent.calls.dbRequired")}</p>
          <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: isDark ? "#0F1117" : "#F3F4F6", color: textSub }}>
{`CREATE TABLE IF NOT EXISTS agent_calls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  call_type        TEXT NOT NULL DEFAULT 'training',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  language         TEXT,
  caller_number    TEXT,
  transcript       JSONB DEFAULT '[]'::jsonb,
  summary          TEXT,
  outcome          TEXT DEFAULT 'completed',
  kb_extracted     JSONB,
  appointment_booked JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_calls_tenant_idx
  ON agent_calls(tenant_id, created_at DESC);`}
          </pre>
        </div>
      )}

      {/* Zero state */}
      {!error && calls.length === 0 && (
        <div className="rounded-2xl border p-12 text-center" style={{ background: cardBg, borderColor: border }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-bold mb-2" style={{ color: textPrimary }}>{t("aiAgent.calls.emptyTitle")}</h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: textMuted }}>
            {t("aiAgent.calls.emptyDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a href="/app/ai-agent/training" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}>
              {t("aiAgent.calls.startTraining")}
            </a>
            <a href="/app/ai-agent/phone" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: isDark ? "#1E2130" : "#F3F4F6", color: textSub }}>
              {t("aiAgent.calls.setupPhone")}
            </a>
          </div>
        </div>
      )}

      {/* Spreadsheet table */}
      {calls.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: cardBg, borderColor: border }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr style={{ background: headerBg, borderBottom: `1px solid ${border}` }}>
                  <th className={thClass} style={thStyle}>Date / Time</th>
                  <th className={thClass} style={thStyle}>Caller</th>
                  <th className={thClass} style={thStyle}>Duration</th>
                  <th className={thClass} style={thStyle}>Lang</th>
                  <th className={thClass} style={{ ...thStyle, minWidth: 180 }}>Summary</th>
                  <th className={thClass} style={thStyle}>Outcome</th>
                  <th className={thClass} style={thStyle}>Appt</th>
                  <th className={thClass} style={{ ...thStyle, width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {calls.map((call, idx) => {
                  const isOpen = expanded === call.id;
                  const isLive = call.call_type === "live";
                  const lines  = call.transcript ?? [];
                  const hasAppt = !!call.appointment_booked;

                  return (
                    <>
                      <tr
                        key={call.id}
                        onClick={() => setExpanded(isOpen ? null : call.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          background: isOpen ? rowExpanded : idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)") : "transparent",
                          borderBottom: `1px solid ${border}`,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = isOpen ? rowExpanded : rowHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isOpen ? rowExpanded : idx % 2 === 1 ? (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)") : "transparent"; }}
                      >
                        {/* Date/Time */}
                        <td className={tdClass} style={tdStyle}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isLive ? "#FF3366" : "#FF6B35" }}
                            />
                            <span style={{ whiteSpace: "nowrap" }}>{fmtDate(call.created_at)}</span>
                          </div>
                        </td>

                        {/* Caller */}
                        <td className={tdClass} style={tdStyle}>
                          {isLive && call.caller_number
                            ? <span className="font-mono text-[11px]" style={{ color: textPrimary }}>{call.caller_number}</span>
                            : <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0",
                                  color: "#FF6B35",
                                }}
                              >
                                {call.call_type === "training" ? "Training" : call.call_type === "overview" ? "Overview" : "Live"}
                              </span>
                          }
                        </td>

                        {/* Duration */}
                        <td className={tdClass} style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          {fmtDuration(call.duration_seconds)}
                        </td>

                        {/* Language */}
                        <td className={tdClass} style={tdStyle}>
                          <LangFlag lang={call.language} />
                        </td>

                        {/* Summary */}
                        <td className={tdClass} style={{ ...tdStyle, maxWidth: 220 }}>
                          {call.summary
                            ? <span className="line-clamp-2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{call.summary}</span>
                            : lines.length > 0
                            ? <span style={{ color: textMuted }}>{lines.length} messages</span>
                            : <span style={{ color: textMuted }}>—</span>
                          }
                        </td>

                        {/* Outcome */}
                        <td className={tdClass}>
                          <OutcomeBadge outcome={call.outcome} isDark={isDark} />
                        </td>

                        {/* Appointment */}
                        <td className={tdClass}>
                          {hasAppt ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400">
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                                <path d="M3 4.5l1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Yes
                            </span>
                          ) : (
                            <span style={{ color: textMuted }}>—</span>
                          )}
                        </td>

                        {/* Expand chevron */}
                        <td className={tdClass} style={{ paddingRight: 16 }}>
                          <svg
                            width="12" height="12" viewBox="0 0 12 12" fill="none"
                            className="transition-transform"
                            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: textMuted }}
                          >
                            <path d="M2.5 4.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </td>
                      </tr>

                      {/* Expanded transcript row */}
                      {isOpen && (
                        <tr key={call.id + "-exp"} style={{ background: rowExpanded, borderBottom: `1px solid ${border}` }}>
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid md:grid-cols-2 gap-5">
                              {/* Summary block */}
                              {call.summary && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: textMuted }}>AI Summary</p>
                                  <p className="text-xs leading-relaxed" style={{ color: textSub }}>{call.summary}</p>
                                  {call.appointment_booked && (
                                    <div className="mt-3 rounded-xl border p-3" style={{ background: isDark ? "rgba(34,197,94,0.05)" : "#F0FDF4", borderColor: "rgba(34,197,94,0.2)" }}>
                                      <p className="text-[10px] font-bold text-green-500 mb-1">Appointment detected</p>
                                      <p className="text-[11px]" style={{ color: textSub }}>
                                        {(call.appointment_booked as { summary?: string }).summary ?? "Booking detected in call summary"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Transcript */}
                              {lines.length > 0 && (
                                <div className={call.summary ? "" : "md:col-span-2"}>
                                  <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: textMuted }}>
                                    Transcript ({lines.length} messages)
                                  </p>
                                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                    {lines.map((line, i) => (
                                      <div key={i} className={`flex gap-2 ${line.role === "user" ? "flex-row-reverse" : ""}`}>
                                        <div
                                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold"
                                          style={{
                                            background: line.role === "assistant"
                                              ? "linear-gradient(135deg,#FF3366,#FF6B35)"
                                              : (isDark ? "#2A2D3A" : "#F3F4F6"),
                                            color: line.role === "assistant" ? "white" : textMuted,
                                          }}
                                        >
                                          {line.role === "assistant" ? "V" : "C"}
                                        </div>
                                        <div
                                          className="max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed"
                                          style={{
                                            background: line.role === "assistant"
                                              ? (isDark ? "rgba(255,51,102,0.07)" : "#FFF0F5")
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

                              {/* KB extracted (training only) */}
                              {call.kb_extracted && Object.keys(call.kb_extracted).length > 0 && (
                                <div className="md:col-span-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wide mb-2 text-green-500">Knowledge Captured</p>
                                  <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-words p-3 rounded-xl" style={{ background: isDark ? "rgba(34,197,94,0.05)" : "#F0FDF4", color: textSub }}>
                                    {JSON.stringify(call.kb_extracted, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Empty expanded state */}
                              {!call.summary && lines.length === 0 && (
                                <p className="text-xs md:col-span-2" style={{ color: textMuted }}>No transcript available for this call.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: border, background: headerBg }}>
            <p className="text-[10px]" style={{ color: textMuted }}>
              {calls.length} record{calls.length !== 1 ? "s" : ""} · auto-refreshes every 30s
            </p>
            <p className="text-[10px]" style={{ color: textMuted }}>
              Total voice time: <span style={{ color: "#FF6B35", fontWeight: 600 }}>{fmtDuration(calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0))}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
