"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { getProfile } from "@/lib/business-profile";
import { getSupabase } from "@/lib/supabase";
import { useI18n, LANGUAGES } from "@/lib/i18n";

const NAV = [
  {
    labelKey: "nav.dashboard",
    href: "/app",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.conversations",
    href: "/app/conversations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.25 15V4.5A1.5 1.5 0 013.75 3h9.75A1.5 1.5 0 0115 4.5v6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    badge: 3,
  },
  {
    labelKey: "nav.leads",
    href: "/app/leads",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12 16.5v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6.75" cy="6" r="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M16.5 16.5v-1.5a3 3 0 00-2.25-2.9M12 2.1a3 3 0 010 5.81" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.appointments",
    href: "/app/appointments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M6 10.5h.008M9 10.5h.008M12 10.5h.008M6 13.5h.008M9 13.5h.008" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.channels",
    href: "/app/channels",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11.25 6.75a3 3 0 010 4.5M13.5 4.5a6 6 0 010 9M6.75 11.25a3 3 0 010-4.5M4.5 13.5a6 6 0 010-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.website",
    href: "/app/website",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1.5" y="2.25" width="15" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 15.75h6M9 12.75v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5.25 6.75h2.25M5.25 9h7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.analytics",
    href: "/app/analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 15V9.75M7.5 15V6.75M12 15V3.75M16.5 15V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    labelKey: "nav.marketing",
    href: "/app/marketing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2.25 9h1.5M14.25 9h1.5M9 2.25v1.5M9 14.25v1.5M4.397 4.397l1.06 1.06M12.543 12.543l1.06 1.06M4.397 13.603l1.06-1.06M12.543 5.457l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, langName, setLocale } = useI18n();

  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("Your Account");
  const [displayEmail, setDisplayEmail] = useState("");
  const [displayPlan, setDisplayPlan] = useState("starter");
  const [initials, setInitials] = useState("V");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile?.ownerName) {
      setDisplayName(profile.ownerName);
      const parts = profile.ownerName.split(" ");
      setInitials(parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase());
    }
    if (profile?.plan) setDisplayPlan(profile.plan.toLowerCase());
    if (profile?.email) setDisplayEmail(profile.email);
  }, []);

  useEffect(() => {
    async function loadAuth() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setDisplayEmail(user.email);
        const name = (user?.user_metadata?.full_name || user?.user_metadata?.name) as string | undefined;
        if (name) {
          setDisplayName(name);
          const parts = name.split(" ");
          setInitials(parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase());
        }
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: tenant } = await (supabase as any)
            .from("tenants").select("plan").eq("owner_id", user.id).single();
          if (tenant?.plan) setDisplayPlan((tenant.plan as string).toLowerCase());
        }
      } catch { /* no auth session */ }
    }
    loadAuth();
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setShowLangMenu(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    router.push("/");
  };

  const selectLanguage = (lang: string) => {
    setLocale(lang);
    setShowLangMenu(false);
  };

  const PLAN_LABELS: Record<string, string> = {
    starter: t("sidebar.plans.starter"),
    pro:     t("sidebar.plans.pro"),
    premium: t("sidebar.plans.premium"),
  };
  const planLabel = PLAN_LABELS[displayPlan] ?? t("sidebar.plans.starter");
  const isPremium = displayPlan === "premium";

  return (
    <aside
      className={`
        flex flex-col h-screen shrink-0
        fixed inset-y-0 left-0 md:relative md:inset-auto
        z-50 md:z-auto
        bg-[#1A0A00] border-r border-white/5
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        w-72 md:w-auto
        ${collapsed ? "md:w-16" : "md:w-60"}
      `}
    >
      {/* Logo row */}
      <div className="h-14 md:h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        {!collapsed && <Logo showText light size={28} />}
        {collapsed && <span className="hidden md:block"><Logo showText={false} light size={28} /></span>}
        {collapsed && <span className="md:hidden"><Logo showText light size={28} /></span>}

        <button onClick={onClose} className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all" aria-label="Close sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all" aria-label="Toggle sidebar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={collapsed ? "M5 2l5 5-5 5" : "M9 2L4 7l5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                active
                  ? "bg-[#FF6B35]/12 text-[#FF6B35] border-l-2 border-[#FF6B35]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              style={{ paddingLeft: active ? "10px" : "12px", paddingRight: "12px" }}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {"badge" in item && item.badge && (
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#FF3366] text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && (
                <>
                  <span className="flex-1 md:hidden">{t(item.labelKey)}</span>
                  {"badge" in item && item.badge && (
                    <>
                      <span className="md:hidden w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#FF3366] text-white">
                        {item.badge}
                      </span>
                      <span className="hidden md:block absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FF3366]" />
                    </>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      {!collapsed && !isPremium && (
        <div className="p-3 border-t border-white/5">
          <div className="rounded-xl p-4 bg-gradient-to-br from-[#FF6B35]/15 to-[#FF3366]/10 border border-[#FF6B35]/20">
            <p className="text-xs font-bold text-white mb-1">{t("sidebar.upgradePremium")}</p>
            <p className="text-[10px] text-white/40 mb-3">{t("sidebar.unlockFeatures")}</p>
            <Link href="/pricing" onClick={onClose} className="block text-center text-xs font-bold py-2 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              {t("sidebar.upgradeNow")}
            </Link>
          </div>
        </div>
      )}

      {/* User area with dropdown */}
      <div ref={dropRef} className="relative border-t border-white/5">
        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[#F3F4F6]">
              <p className="text-sm font-semibold text-[#111111] truncate">{displayName}</p>
              {displayEmail && <p className="text-xs text-[#6B7280] truncate mt-0.5">{displayEmail}</p>}
              <span className="mt-2 inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,107,53,0.1)", color: "#FF6B35" }}>
                {planLabel}
              </span>
            </div>

            <div className="py-1">
              {/* Settings */}
              <Link
                href="/app/settings"
                onClick={() => { setDropdownOpen(false); onClose(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#9CA3AF]">
                  <circle cx="7" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 1.17V2.5M7 11.5v1.33M1.17 7H2.5M11.5 7h1.33M2.64 2.64l.94.94M10.42 10.42l.94.94M2.64 11.36l.94-.94M10.42 3.58l.94-.94" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {t("sidebar.settings")}
              </Link>

              {/* Language */}
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <span className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#9CA3AF]">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1.5 7h11M7 1.5c-1.5 2-1.5 9 0 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {t("sidebar.language")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                  {langName}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d={showLangMenu ? "M2 6.5l3-3 3 3" : "M2 3.5l3 3 3-3"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
              {showLangMenu && (
                <div className="bg-[#F9FAFB] border-t border-[#F3F4F6]">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => selectLanguage(lang)}
                      className="w-full flex items-center justify-between pl-11 pr-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                    >
                      {lang}
                      {langName === lang && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* View all plans */}
              <Link
                href="/pricing"
                onClick={() => { setDropdownOpen(false); onClose(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#9CA3AF]">
                  <path d="M7 1.5L8.5 5.25 12.5 5.5 9.75 7.75l1 4.25L7 9.75 3.25 12l1-4.25L1.5 5.5 5.5 5.25z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                {t("sidebar.viewAllPlans")}
              </Link>
            </div>

            <div className="h-px bg-[#F3F4F6]" />

            <div className="py-1">
              {!isPremium && (
                <Link
                  href="/auth/signup"
                  onClick={() => { setDropdownOpen(false); onClose(); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#FF6B35] hover:bg-[#FFF5F0] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {t("sidebar.upgradePlan")}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 12H3a1 1 0 01-1-1V3a1 1 0 011-1h2M9.5 10l3-3-3-3M12.5 7H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("sidebar.logout")}
              </button>
            </div>
          </div>
        )}

        {/* User button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center gap-3 p-3 transition-all ${dropdownOpen ? "bg-white/10" : "hover:bg-white/5"} ${collapsed ? "md:justify-center" : ""}`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-white/40 truncate">{planLabel}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-white/20 shrink-0">
                <path d={dropdownOpen ? "M2 7.5l4-4 4 4" : "M2 4.5l4 4 4-4"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
          {collapsed && (
            <div className="flex-1 min-w-0 md:hidden text-left">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-white/40 truncate">{planLabel}</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
