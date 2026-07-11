"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

type AgentTheme = { isDark: boolean };
export const AgentThemeContext = createContext<AgentTheme>({ isDark: false });
export function useAgentTheme() { return useContext(AgentThemeContext); }

interface Tab { label: string; href: string; badge?: string; }

const ASSISTANT_HREFS = ["/app/ai-agent/overview", "/app/ai-agent/assistant-settings"];
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
  const cardBg      = isDark ? "#111420" : "#FFFFFF";

  const isAssistantSection = pathname === "/app/ai-agent" || ASSISTANT_HREFS.includes(pathname);
  const isPhoneSection     = PHONE_HREFS.includes(pathname);

  const ASSISTANT_TABS: Tab[] = [
    { label: t("aiAgent.tabs.overview"),   href: "/app/ai-agent/overview" },
    { label: "Assistant Settings",          href: "/app/ai-agent/assistant-settings" },
  ];

  const PHONE_TABS: Tab[] = [
    { label: t("aiAgent.tabs.training"), href: "/app/ai-agent/training" },
    { label: t("aiAgent.tabs.voice"),    href: "/app/ai-agent/voice" },
    { label: t("aiAgent.tabs.phone"),    href: "/app/ai-agent/phone", badge: t("aiAgent.tabs.soon") },
    { label: t("aiAgent.tabs.calls"),    href: "/app/ai-agent/calls" },
    { label: t("aiAgent.tabs.settings"), href: "/app/ai-agent/settings" },
  ];

  const activeTabs: Tab[] = isPhoneSection ? PHONE_TABS : ASSISTANT_TABS;
  const tabCls = "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors";

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

        {/* Agent switcher — two side-by-side cards; single column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">

          {/* Card A — Vela · Your Assistant */}
          <button
            onClick={() => router.push("/app/ai-agent/overview")}
            className="flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all hover:opacity-90"
            style={{
              background:  isAssistantSection
                ? (isDark ? "rgba(255,107,53,0.09)" : "#FFF8F5")
                : cardBg,
              borderColor: isAssistantSection ? "#FF6B35" : border,
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: isAssistantSection
                  ? "linear-gradient(135deg,#FF6B35,#FF3366)"
                  : (isDark ? "#1A1D2A" : "#F3F4F6"),
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="4" y="0.5" width="5" height="7.5" rx="2.5" stroke={isAssistantSection ? "white" : textMuted} strokeWidth="1.2"/>
                <path d="M1.5 6c0 3 2.25 5 5 5s5-2 5-5M6.5 11v1.5" stroke={isAssistantSection ? "white" : textMuted} strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight" style={{ color: isAssistantSection ? "#FF6B35" : textPrimary }}>
                Vela · Your Assistant
              </p>
              <p className="text-[10px] mt-0.5 leading-snug" style={{ color: textMuted }}>
                Talks to you. Reads your live data.
              </p>
            </div>
          </button>

          {/* Card B — Your Phone Agent */}
          <button
            onClick={() => router.push("/app/ai-agent/training")}
            className="flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all hover:opacity-90"
            style={{
              background:  isPhoneSection
                ? (isDark ? "rgba(255,107,53,0.09)" : "#FFF8F5")
                : cardBg,
              borderColor: isPhoneSection ? "#FF6B35" : border,
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: isPhoneSection
                  ? "linear-gradient(135deg,#FF6B35,#FF3366)"
                  : (isDark ? "#1A1D2A" : "#F3F4F6"),
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 3.5c.5 1.8 2.2 3.5 4 4l1-1c.2-.2.4-.2.6-.1.5.2 1.1.3 1.7.3.3 0 .5.2.5.5v1.6c0 .3-.2.5-.5.5C4.5 9.3 2.7 5.5 2.7 3c0-.3.2-.5.5-.5H4.8c.3 0 .5.2.5.5 0 .6.1 1.2.3 1.7.1.2.1.4-.1.6l-1 1z" fill={isPhoneSection ? "white" : textMuted}/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight" style={{ color: isPhoneSection ? "#FF6B35" : textPrimary }}>
                Your Phone Agent
              </p>
              <p className="text-[10px] mt-0.5 leading-snug" style={{ color: textMuted }}>
                Answers customers. Books appointments.
              </p>
            </div>
          </button>
        </div>

        {/* Contextual tab row — tabs for the active agent only */}
        <div className="flex items-end overflow-x-auto scrollbar-none" style={{ marginBottom: -1 }}>
          {activeTabs.map((tab) => {
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
