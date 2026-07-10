"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";

type AgentTheme = { isDark: boolean };
export const AgentThemeContext = createContext<AgentTheme>({ isDark: false });
export function useAgentTheme() { return useContext(AgentThemeContext); }

const TABS = [
  { label: "Overview",             href: "/app/ai-agent/overview" },
  { label: "Training",             href: "/app/ai-agent/training" },
  { label: "Voice",                href: "/app/ai-agent/voice" },
  { label: "Phone Number",         href: "/app/ai-agent/phone",   badge: "Soon" },
  { label: "Calls & Appointments", href: "/app/ai-agent/calls" },
  { label: "Settings",             href: "/app/ai-agent/settings" },
];

export default function AIAgentLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const pathname = usePathname();

  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";

  return (
    <AgentThemeContext.Provider value={{ isDark }}>
      {/* Header + horizontal tab bar */}
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 border-b mb-5" style={{ borderColor: border }}>
        {/* Identity row */}
        <div className="flex items-center gap-3 pt-1 pb-3">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="2.5" stroke="white" strokeWidth="1.3"/>
              <path d="M1 6.5h1.5M10 6.5h1.5M6.5 1v1.5M6.5 10v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <circle cx="6.5" cy="6.5" r="0.9" fill="white"/>
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: textPrimary }}>AI Agent</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
          >
            Voice Phone Agent
          </span>
        </div>

        {/* Scrollable tab row */}
        <div className="flex items-end overflow-x-auto scrollbar-none" style={{ marginBottom: -1 }}>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderBottomColor: active ? "#FF6B35" : "transparent",
                  color: active ? "#FF6B35" : textMuted,
                }}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: isDark ? "rgba(100,116,139,0.2)" : "#F3F4F6",
                      color: textMuted,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </AgentThemeContext.Provider>
  );
}
