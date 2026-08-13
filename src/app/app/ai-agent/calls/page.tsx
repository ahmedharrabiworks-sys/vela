"use client";

import { useState, useEffect, useCallback } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { fmtDuration, fmtDate, LangFlag, OutcomeBadge, CallTranscriptContent, type CallRecord as SharedCallRecord } from "@/components/dashboard/CallTranscript";

interface CallRecord extends SharedCallRecord {
  call_type: "training" | "live" | "overview" | string;
  kb_extracted?: Record<string, unknown>;
  appointment_booked?: Record<string, unknown> | null;
}

export default function CallsPage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [calls, setCalls]       = useState<CallRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const headerBg    = isDark ? "var(--dm-bg)" : "#F8F9FB";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const rowHover    = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const rowExpanded = isDark ? "var(--dm-card2)" : "#F9FAFB";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#111111";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub     = isDark ? "var(--dm-text2)" : "#6B7280";

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
          style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textMuted, border: `1px solid ${border}` }}
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
          <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textSub }}>
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
            <a href="/app/ai-agent/phone" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textSub }}>
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
                  <th className={thClass} style={{ ...thStyle, width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {calls.map((call, idx) => {
                  const isOpen = expanded === call.id;
                  const isLive = call.call_type === "live";
                  const lines  = call.transcript ?? [];

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
                          <td colSpan={7} className="px-6 py-5">
                            <CallTranscriptContent call={call} isDark={isDark} />
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
