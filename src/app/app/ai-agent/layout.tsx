"use client";

import { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ── Agent theme context (local dark mode, independent of global theme) ── */
type AgentTheme = { isDark: boolean; toggleDark: () => void };
export const AgentThemeContext = createContext<AgentTheme>({ isDark: false, toggleDark: () => {} });
export function useAgentTheme() { return useContext(AgentThemeContext); }

/* ── Sub-navigation ── */
const AGENT_NAV = [
  {
    label: "Overview",
    href: "/app/ai-agent/overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 8h1.5M13 8h1.5M8 1.5v1.5M8 13v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M3.5 12.5l1.1-1.1M11.4 4.6l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Training",
    href: "/app/ai-agent/training",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 6a2 2 0 014 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="8" cy="6" r="1" fill="currentColor"/>
        <path d="M5.5 10.5l1-1M10.5 10.5l-1-1M8 9.5v2.5M5.5 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Voice",
    href: "/app/ai-agent/voice",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2.5 8c0 3.038 2.462 5.5 5.5 5.5s5.5-2.462 5.5-5.5M8 13.5V15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Phone Number",
    href: "/app/ai-agent/phone",
    badge: "Soon",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5.5 2.5h5M3 4.5h10M4 6.5h1M7.5 6.5h1M11 6.5h1M4 8.5h1M7.5 8.5h1M11 8.5h1M4 10.5h1M7.5 10.5h1M11 10.5h1M7.5 12.5h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <rect x="2" y="2" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    label: "Calls & Appointments",
    href: "/app/ai-agent/calls",
    badge: "Soon",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11 1.5v2M5 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5 9.5h.01M8 9.5h.01M11 9.5h.01M5 12h.01M8 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/app/ai-agent/settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function AIAgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vela_agent_dark");
    if (saved === "true") setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("vela_agent_dark", String(next));
      return next;
    });
  };

  const bg = isDark ? "#0F1117" : "#F8F9FF";
  const navBg = isDark ? "#13161F" : "#FFFFFF";
  const navBorder = isDark ? "#1E2130" : "#E5E7EB";
  const textPrimary = isDark ? "#F1F5F9" : "#111111";
  const textMuted = isDark ? "#64748B" : "#9CA3AF";
  const activeBg = isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0";
  const activeText = "#FF6B35";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB";

  return (
    <AgentThemeContext.Provider value={{ isDark, toggleDark }}>
      <div
        className="flex"
        style={{
          margin: "-16px -16px -32px",
          minHeight: "calc(100vh - 64px)",
          background: bg,
          transition: "background 0.3s",
        }}
      >
        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Left sub-nav */}
        <aside
          className="flex flex-col shrink-0 border-r"
          style={{
            width: 220,
            background: navBg,
            borderColor: navBorder,
            transition: "background 0.3s, border-color 0.3s",
            // Mobile: off-canvas
            position: "fixed" as const,
            top: 64,
            left: 0,
            bottom: 0,
            zIndex: 45,
            transform: mobileNavOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {/* Header: back + dark toggle */}
          <div
            className="flex items-center justify-between px-4 py-4 border-b"
            style={{ borderColor: navBorder }}
          >
            <Link
              href="/app"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: textMuted }}
              onClick={() => setMobileNavOpen(false)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#F3F4F6", color: isDark ? "#FF6B35" : textMuted }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.8 2.8l.7.7M9.5 9.5l.7.7M2.8 10.2l.7-.7M9.5 3.5l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M11 7.8A5 5 0 015.2 2C2.8 2.5 1 4.7 1 7.2A5.3 5.3 0 006.5 12.5 5 5 0 0011 7.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          {/* AI Agent label */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="2.5" stroke="white" strokeWidth="1.3"/>
                  <path d="M1 6.5h1.5M10 6.5h1.5M6.5 1v1.5M6.5 10v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="6.5" cy="6.5" r="0.9" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold" style={{ color: textPrimary }}>AI Agent</p>
                <p className="text-[9px]" style={{ color: textMuted }}>Command Center</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2 pb-4 flex flex-col gap-0.5 overflow-y-auto">
            {AGENT_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                  style={{
                    background: active ? activeBg : "transparent",
                    color: active ? activeText : textMuted,
                    borderLeft: active ? `2px solid #FF6B35` : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: isDark ? "rgba(100,116,139,0.2)" : "#F3F4F6", color: textMuted }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer hint */}
          <div className="px-4 py-4 border-t" style={{ borderColor: navBorder }}>
            <p className="text-[10px]" style={{ color: textMuted }}>
              Voice calls use ElevenLabs + Vapi
            </p>
          </div>
        </aside>

        {/* Desktop left nav (non-fixed, in flow) */}
        <aside
          className="hidden md:flex flex-col shrink-0 border-r"
          style={{
            width: 220,
            background: navBg,
            borderColor: navBorder,
            transition: "background 0.3s, border-color 0.3s",
            position: "sticky" as const,
            top: 0,
            height: "calc(100vh - 64px)",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: navBorder }}>
            <Link
              href="/app"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: textMuted }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </Link>
            <button
              onClick={toggleDark}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
              style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#F3F4F6", color: isDark ? "#FF6B35" : textMuted }}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M6.5 1v1M6.5 11v1M1 6.5h1M11 6.5h1M2.8 2.8l.7.7M9.5 9.5l.7.7M2.8 10.2l.7-.7M9.5 3.5l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M11 7.8A5 5 0 015.2 2C2.8 2.5 1 4.7 1 7.2A5.3 5.3 0 006.5 12.5 5 5 0 0011 7.8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          {/* AI Agent label */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="2.5" stroke="white" strokeWidth="1.3"/>
                  <path d="M1 6.5h1.5M10 6.5h1.5M6.5 1v1.5M6.5 10v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="6.5" cy="6.5" r="0.9" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold" style={{ color: textPrimary }}>AI Agent</p>
                <p className="text-[9px]" style={{ color: textMuted }}>Command Center</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 pb-4 flex flex-col gap-0.5 overflow-y-auto">
            {AGENT_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                  style={{
                    background: active ? activeBg : "transparent",
                    color: active ? activeText : textMuted,
                    borderLeft: active ? `2px solid #FF6B35` : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: isDark ? "rgba(100,116,139,0.2)" : "#F3F4F6", color: textMuted }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t" style={{ borderColor: navBorder }}>
            <p className="text-[10px]" style={{ color: textMuted }}>
              Voice calls use ElevenLabs + Vapi
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b md:hidden"
            style={{ background: navBg, borderColor: navBorder }}
          >
            <button
              onClick={() => setMobileNavOpen(true)}
              className="p-2 rounded-lg"
              style={{ color: textMuted, background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="text-sm font-semibold" style={{ color: textPrimary }}>AI Agent</span>
            <button
              onClick={toggleDark}
              className="ml-auto p-2 rounded-lg"
              style={{ color: isDark ? "#FF6B35" : textMuted, background: isDark ? "rgba(255,107,53,0.15)" : "#F3F4F6" }}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 1v1M7 12v1M1 7h1M12 7h1M3 3l.7.7M10.3 10.3l.7.7M3 11l.7-.7M10.3 3.7l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12 8.4A5.5 5.5 0 015.6 2C3 2.5 1 4.8 1 7.5A6 6 0 007.5 13.5 5.5 5.5 0 0012 8.4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>

          {children}
        </div>
      </div>
    </AgentThemeContext.Provider>
  );
}
