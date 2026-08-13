"use client";

// Shared between the AI Agent Calls tab (inline row expansion) and the Overview
// page's Recent Calls list (modal) -- single source of truth for how a call's
// outcome badge and full transcript are rendered, so both surfaces show exactly
// the same thing and there's one place to update.

export interface CallRecord {
  id: string;
  call_type?: "training" | "live" | "overview" | string;
  created_at: string;
  ended_at?: string;
  duration_seconds?: number;
  language?: string;
  caller_number?: string;
  transcript?: Array<{ role: string; text: string }>;
  summary?: string;
  outcome?: string;
}

export function fmtDuration(secs?: number) {
  if (!secs) return "0s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute: "2-digit",
  });
}

export function fmtTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function LangFlag({ lang }: { lang?: string }) {
  const map: Record<string, string> = { ar: "🇸🇦", en: "🇺🇸", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸" };
  const label: Record<string, string> = { ar: "AR", en: "EN", fr: "FR", de: "DE", es: "ES" };
  if (!lang) return <span className="text-xs text-gray-400">N/A</span>;
  return (
    <span className="flex items-center gap-1 text-xs">
      {map[lang] ?? ""} {label[lang] ?? lang.toUpperCase()}
    </span>
  );
}

export function OutcomeBadge({ outcome, isDark }: { outcome?: string; isDark: boolean }) {
  if (!outcome || outcome === "N/A") return <span className="text-xs" style={{ color: isDark ? "var(--dm-muted)" : "#9CA3AF" }}>N/A</span>;
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
          : (isDark ? "var(--dm-card2)" : "#F3F4F6"),
        color: isBooked ? "#22C55E" : isComp ? "#FF6B35" : (isDark ? "var(--dm-muted)" : "#9CA3AF"),
      }}
    >
      {isBooked ? "Booked" : isComp ? "Complete" : outcome}
    </span>
  );
}

// Derives a short one-line summary label for list rows when no AI summary exists yet.
export function callHeadline(call: CallRecord): string {
  if (call.summary) return call.summary;
  const lines = call.transcript ?? [];
  if (lines.length > 0) return `${lines.length} message${lines.length !== 1 ? "s" : ""}`;
  return "No transcript available";
}

// The actual summary + transcript content -- no "Knowledge Captured" block (removed
// per product decision: too technical/debug-looking for the business owner to see).
export function CallTranscriptContent({ call, isDark }: { call: CallRecord; isDark: boolean }) {
  const textMuted = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub   = isDark ? "var(--dm-text2)" : "#6B7280";
  const lines = call.transcript ?? [];

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {call.summary && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: textMuted }}>AI Summary</p>
          <p className="text-xs leading-relaxed" style={{ color: textSub }}>{call.summary}</p>
        </div>
      )}

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
                      : (isDark ? "var(--dm-card2)" : "#F3F4F6"),
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
                      : (isDark ? "var(--dm-card2)" : "#F3F4F6"),
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

      {!call.summary && lines.length === 0 && (
        <p className="text-xs md:col-span-2" style={{ color: textMuted }}>No transcript available for this call.</p>
      )}
    </div>
  );
}

// Full-screen modal wrapper around CallTranscriptContent -- used by Overview's
// Recent Calls list, where rows open a standalone view rather than expanding inline.
export function CallTranscriptModal({ call, isDark, onClose }: { call: CallRecord; isDark: boolean; onClose: () => void }) {
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(10,12,20,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border p-5"
        style={{ background: cardBg, borderColor: border, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold" style={{ color: textPrimary }}>Call transcript</p>
            <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
              {fmtDate(call.created_at)} · {fmtDuration(call.duration_seconds)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textMuted }}
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <CallTranscriptContent call={call} isDark={isDark} />
      </div>
    </div>
  );
}
