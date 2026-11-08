"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// Dark mode has been removed from Vela entirely (see git history). This
// context is kept only so the AI Agent section's consumer pages don't each
// need a separate edit -- isDark is permanently false.
type AgentTheme = { isDark: boolean };
export const AgentThemeContext = createContext<AgentTheme>({ isDark: false });
export function useAgentTheme() { return useContext(AgentThemeContext); }

export default function AIAgentLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  const tabs = [
    { label: t("aiAgent.tabs.overview"),      href: "/app/ai-agent/overview" },
    { label: t("agentUi.tabs.phone"),         href: "/app/ai-agent/phone" },
    { label: t("aiAgent.tabs.knowledgeBase"), href: "/app/ai-agent/knowledge-base" },
    { label: t("aiAgent.tabs.settings"),      href: "/app/ai-agent/settings" },
  ];

  return (
    <AgentThemeContext.Provider value={{ isDark: false }}>
      <nav aria-label={t("aiAgent.title")} className="-mx-4 md:-mx-6 px-4 md:px-6 border-b border-[#E5E7EB] mb-5">
        <div className="flex items-end gap-3 sm:gap-5 overflow-x-auto scrollbar-none" style={{ marginBottom: -1 }}>
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`py-3 text-[13px] sm:text-sm whitespace-nowrap border-b-2 transition-colors ${active ? "border-[#FF6B35] text-[#111111] font-medium" : "border-transparent text-[#6B7280] hover:text-[#111111]"}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </AgentThemeContext.Provider>
  );
}
