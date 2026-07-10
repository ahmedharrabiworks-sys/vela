"use client";

import { useAgentTheme } from "../layout";

export default function CallsPage() {
  const { isDark } = useAgentTheme();
  const bg = isDark ? "#0F1117" : "#F8F9FF";
  const cardBg = isDark ? "#13161F" : "#FFFFFF";
  const border = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted = isDark ? "#64748B" : "#9CA3AF";

  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: bg, minHeight: "calc(100vh - 128px)" }}>
      <div
        className="text-center rounded-2xl border p-12 max-w-md w-full"
        style={{ background: cardBg, borderColor: border }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: isDark ? "rgba(255,51,102,0.1)" : "#FFF0F5" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#FF3366" strokeWidth="1.5"/>
            <path d="M16 2v4M8 2v4M3 9h18" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 13h.01M12 13h.01M17 13h.01M7 17h.01M12 17h.01" stroke="#FF3366" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: textPrimary }}>Calls & Appointments</h2>
        <p className="text-sm mb-6" style={{ color: textMuted }}>
          View a log of every call your AI Agent handles, along with any appointments booked during those calls.
        </p>
        <span
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #FF3366, #FF6B35)", color: "white" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v4l2.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="1.3"/>
          </svg>
          Coming Soon
        </span>
        <p className="text-[10px] mt-4" style={{ color: textMuted }}>
          Call history and appointment integration is on the roadmap.
        </p>
      </div>
    </div>
  );
}
