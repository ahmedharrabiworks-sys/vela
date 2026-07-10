"use client";

import { useAgentTheme } from "../layout";

export default function PhonePage() {
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
          style={{ background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8.5 3.5h7M4.5 6h15M6 9.5h1.5M11 9.5h1.5M16 9.5h1.5M6 12.5h1.5M11 12.5h1.5M16 12.5h1.5M6 15.5h1.5M11 15.5h1.5M16 15.5h1.5M11 18.5h1.5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="3" y="2.5" width="18" height="19" rx="2.5" stroke="#FF6B35" strokeWidth="1.5"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: textPrimary }}>Phone Number</h2>
        <p className="text-sm mb-6" style={{ color: textMuted }}>
          Assign a dedicated phone number to your AI Agent. Customers can call this number and speak directly with your AI.
        </p>
        <span
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full"
          style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)", color: "white" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v4l2.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="1.3"/>
          </svg>
          Coming Soon
        </span>
        <p className="text-[10px] mt-4" style={{ color: textMuted }}>
          We&apos;re building deep phone integration with VAPI. Stay tuned.
        </p>
      </div>
    </div>
  );
}
