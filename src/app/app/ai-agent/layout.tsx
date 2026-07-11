"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type AgentTheme = { isDark: boolean };
export const AgentThemeContext = createContext<AgentTheme>({ isDark: false });
export function useAgentTheme() { return useContext(AgentThemeContext); }

const ASSISTANT_HREFS = ["/app/ai-agent/overview", "/app/ai-agent/assistant-voice"];
const PHONE_HREFS = [
  "/app/ai-agent/training",
  "/app/ai-agent/voice",
  "/app/ai-agent/phone",
  "/app/ai-agent/calls",
  "/app/ai-agent/settings",
];

export default function AIAgentLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";
  const pathname = usePathname();
  const router = useRouter();

  const border      = isDark ? "#1E2235" : "#E5E7EB";
  const textMuted   = isDark ? "#64748B" : "#9CA3AF";
  const textPrimary = isDark ? "#F1F5F9" : "#0F172A";

  const isAssistantSection = pathname === "/app/ai-agent" || ASSISTANT_HREFS.includes(pathname);
  const isPhoneSection     = PHONE_HREFS.includes(pathname);

  const ASSISTANT_TABS = [
    { label: t("aiAgent.tabs.overview"), href: "/app/ai-agent/overview" },
    { label: "Assistant Voice",           href: "/app/ai-agent/assistant-voice" },
  ];

  const PHONE_TABS = [
    { label: t("aiAgent.tabs.training"), href: "/app/ai-agent/training" },
    { label: t("aiAgent.tabs.voice"),    href: "/app/ai-agent/voice" },
    { label: t("aiAgent.tabs.phone"),    href: "/app/ai-agent/phone", badge: t("aiAgent.tabs.soon") },
    { label: t("aiAgent.tabs.calls"),    href: "/app/ai-agent/calls" },
    { label: t("aiAgent.tabs.settings"), href: "/app/ai-agent/settings" },
  ];

  const tabCls = "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors";

  /* ── Chevron icon — right when collapsed, down when expanded ── */
  function Chevron({ open }: { open: boolean }) {
    return (
      <svg
        width="8" height="8" viewBox="0 0 8 8" fill="none"
        style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
      >
        <path d="M2.5 1.5L5.5 4l-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  return (
    <AgentThemeContext.Provider value={{ isDark }}>
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 border-b mb-3" style={{ borderColor: border }}>

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
          <span className="text-sm font-bold" style={{ color: textPrimary }}>{t("aiAgent.title")}</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: isDark ? "rgba(255,107,53,0.15)" : "#FFF5F0", color: "#FF6B35" }}
          >
            {t("aiAgent.badge")}
          </span>
        </div>

        {/* Two-group nav — scrollable on mobile */}
        <div className="flex items-end overflow-x-auto scrollbar-none" style={{ marginBottom: -1 }}>

          {/* ── Your Assistant ── */}
          <button
            onClick={() => router.push("/app/ai-agent/overview")}
            className="flex items-center gap-1 px-2 py-2.5 whitespace-nowrap border-b-2 transition-colors hover:opacity-80"
            style={{
              borderBottomColor: isAssistantSection ? "#FF6B35" : "transparent",
              color: isAssistantSection ? "#FF6B35" : textMuted,
              cursor: "pointer",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.06em]">Your Assistant</span>
            <Chevron open={isAssistantSection} />
          </button>

          {isAssistantSection && ASSISTANT_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={tabCls}
                style={{ borderBottomColor: active ? "#FF6B35" : "transparent", color: active ? "#FF6B35" : textMuted }}
              >
                {tab.label}
              </Link>
            );
          })}

          {/* Separator */}
          <div className="self-stretch flex items-center px-2" style={{ borderBottom: "2px solid transparent" }}>
            <div className="w-px h-3.5" style={{ background: border, opacity: 0.4 }} />
          </div>

          {/* ── Phone Agent ── */}
          <button
            onClick={() => router.push("/app/ai-agent/training")}
            className="flex items-center gap-1 px-2 py-2.5 whitespace-nowrap border-b-2 transition-colors hover:opacity-80"
            style={{
              borderBottomColor: isPhoneSection ? "#FF6B35" : "transparent",
              color: isPhoneSection ? "#FF6B35" : textMuted,
              cursor: "pointer",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.06em]">Phone Agent</span>
            <Chevron open={isPhoneSection} />
          </button>

          {isPhoneSection && PHONE_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={tabCls}
                style={{ borderBottomColor: active ? "#FF6B35" : "transparent", color: active ? "#FF6B35" : textMuted }}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: isDark ? "rgba(100,116,139,0.2)" : "#F3F4F6", color: textMuted }}
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
