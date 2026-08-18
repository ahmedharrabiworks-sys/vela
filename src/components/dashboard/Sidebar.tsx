"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { getProfile } from "@/lib/business-profile";
import { getSupabase } from "@/lib/supabase";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const NAV = [
  {
    labelKey: "nav.aiAgent",
    href: "/app/ai-agent",
    badge: "NEW",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 9h2M14.5 9h2M9 1.5v2M9 14.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M4.1 4.1l1.4 1.4M12.5 12.5l1.4 1.4M4.1 13.9l1.4-1.4M12.5 5.5l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="1.2" fill="currentColor"/>
      </svg>
    ),
  },
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
    // Mobile-only dedicated entry point for the owner-facing Vela Assistant
    // (helps the owner manage their account -- distinct from the embedded
    // customer-facing site widget). On mobile, a business owner is checking
    // analytics/appointments, not casually chatting, so it gets a real nav
    // slot instead of only a floating bubble that can sit on top of other
    // UI. Desktop keeps the floating bubble only -- no nav entry there.
    labelKey: "nav.velaAssistant",
    href: "#vela-assistant",
    mobileOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 7.5L9 12.5L12 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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
    // badge is real (needs-attention conversations count), set dynamically below — never a static placeholder
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
    labelKey: "nav.aiTraining",
    href: "/app/ai-training",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6.75 7.5a2.25 2.25 0 014.5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="9" cy="7.5" r="1" fill="currentColor"/>
        <path d="M6 12.75l1.5-1.5M12 12.75l-1.5-1.5M9 11.25v2.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M5.25 13.5h7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  {
    labelKey: "sidebar.settings",
    href: "/app/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.45 3.45l1.07 1.07M13.48 13.48l1.07 1.07M3.45 14.55l1.07-1.07M13.48 4.52l1.07-1.07" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Base path prefix for nav links. Defaults to "/app". Demo passes "/demo". */
  pathPrefix?: string;
  /** When set, skips Supabase calls and uses these values for the user area. */
  demoProfile?: { name: string; initials: string; plan: string; email: string };
}

export default function Sidebar({ isOpen, onClose, pathPrefix = "/app", demoProfile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, langName, setLocale } = useI18n();

  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState("Your Account");
  const [displayEmail, setDisplayEmail] = useState("");
  const [displayPlan, setDisplayPlan] = useState("starter");
  const [initials, setInitials] = useState("V");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  // Real needs-attention conversations count for the Conversations nav badge
  // (was a hardcoded "3" that never reflected real data). null = not loaded
  // yet / no real tenant (badge hidden); demo mode shows a fixed fixture
  // number since Hard Rule 3 allows fake data only in /demo.
  const [needsAttentionCount, setNeedsAttentionCount] = useState<number | null>(demoProfile ? 3 : null);
  // FIX 8: real unseen-activity dots on Dashboard/Appointments/Analytics/
  // Leads -- reuses the exact same notifications table already powering the
  // bell (see NotificationBell.tsx), never a second tracking system. Leads
  // and Appointments have their own dedicated notification type + link, so
  // their dot clears by marking those specific notifications read (the same
  // action the bell itself performs on click). Dashboard and Analytics are
  // aggregate views with no dedicated notification type -- their dot clears
  // via a local "last seen" timestamp instead of mutating the underlying
  // read state that Leads/Appointments independently depend on, so visiting
  // one page's dot never silently clears another's.
  type NotificationRow = { id: string; link: string | null; read: boolean; created_at: string };
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const agentCollapseRef = useRef<{ wasCollapsed: boolean } | null>(null); // unused; kept for ref stability

  // Rewrite "/app/..." hrefs to use the configured prefix
  const lk = (href: string) =>
    href === "/app" ? pathPrefix : href.replace(/^\/app/, pathPrefix);

  useEffect(() => {
    if (demoProfile) {
      setDisplayName(demoProfile.name);
      setInitials(demoProfile.initials);
      setDisplayPlan(demoProfile.plan);
      setDisplayEmail(demoProfile.email);
      return;
    }
    const profile = getProfile();
    if (profile?.ownerName) {
      const parts = profile.ownerName.split(" ");
      setInitials(parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase());
    }
    // Show company name if set; fall back to owner's personal name
    const nameToShow = profile?.businessName || profile?.ownerName;
    if (nameToShow) setDisplayName(nameToShow);
    if (profile?.plan) setDisplayPlan(profile.plan.toLowerCase());
    if (profile?.email) setDisplayEmail(profile.email);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (demoProfile) return;
    async function loadAuth() {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setDisplayEmail(user.email);
        const name = (user?.user_metadata?.full_name || user?.user_metadata?.name) as string | undefined;
        if (name) {
          // Personal name drives initials; business_name overrides display below
          const parts = name.split(" ");
          setInitials(parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase());
          setDisplayName(name);
        }
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: tenant } = await (supabase as any)
            .from("tenants").select("id, plan, business_name").eq("owner_id", user.id).single();
          if (tenant?.plan) setDisplayPlan((tenant.plan as string).toLowerCase());
          // Prefer business_name over personal name; falls back to personal name already set above
          if (tenant?.business_name) setDisplayName(tenant.business_name as string);

          if (tenant?.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (supabase as any)
              .from("conversations")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id)
              .eq("needs_human", true);
            setNeedsAttentionCount(count ?? 0);
          }
        }
      } catch { /* no auth session */ }
    }
    loadAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX 8: load real notifications for the nav dots. Same endpoint the bell
  // already polls -- a second, independent fetch here (not shared state)
  // keeps this component decoupled, matching how needs_human above is also
  // fetched independently rather than threaded through from elsewhere.
  useEffect(() => {
    if (demoProfile) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json() as { notifications?: NotificationRow[] };
        if (!cancelled) setNotifications(data.notifications ?? []);
      } catch { /* dots just stay off */ }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [demoProfile]);

  const LAST_SEEN_KEY = (page: string) => `vela_nav_seen_${page}`;
  const [dashboardLastSeen, setDashboardLastSeen] = useState(0);
  const [analyticsLastSeen, setAnalyticsLastSeen] = useState(0);
  useEffect(() => {
    if (demoProfile) return;
    setDashboardLastSeen(Number(localStorage.getItem(LAST_SEEN_KEY("dashboard")) || 0));
    setAnalyticsLastSeen(Number(localStorage.getItem(LAST_SEEN_KEY("analytics")) || 0));
  }, [demoProfile]);

  const leadsUnread = notifications.some((n) => !n.read && n.link === "/app/leads");
  const apptsUnread = notifications.some((n) => !n.read && n.link === "/app/appointments");
  const dashboardUnread = notifications.some((n) => new Date(n.created_at).getTime() > dashboardLastSeen);
  const analyticsUnread = notifications.some((n) => new Date(n.created_at).getTime() > analyticsLastSeen);

  // Clear dots for whichever page the owner is currently on.
  useEffect(() => {
    if (demoProfile) return;
    const onDashboard = pathname === pathPrefix;
    const onLeads = pathname.startsWith(lk("/app/leads"));
    const onAppts = pathname.startsWith(lk("/app/appointments"));
    const onAnalytics = pathname.startsWith(lk("/app/analytics"));

    if (onDashboard) {
      localStorage.setItem(LAST_SEEN_KEY("dashboard"), String(Date.now()));
      setDashboardLastSeen(Date.now());
    }
    if (onAnalytics) {
      localStorage.setItem(LAST_SEEN_KEY("analytics"), String(Date.now()));
      setAnalyticsLastSeen(Date.now());
    }
    if (onLeads || onAppts) {
      const link = onLeads ? "/app/leads" : "/app/appointments";
      const toClear = notifications.filter((n) => !n.read && n.link === link);
      if (toClear.length > 0) {
        setNotifications((prev) => prev.map((n) => (n.link === link ? { ...n, read: true } : n)));
        toClear.forEach((n) => {
          fetch("/api/notifications/mark-read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: n.id }),
          }).catch(() => { /* next poll reconciles */ });
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, demoProfile]);

  // agentCollapseRef kept for potential future use

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
    if (demoProfile) {
      router.push("/auth/signup");
      return;
    }
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
      dir="ltr"
      className={`
        flex flex-col h-screen shrink-0
        fixed inset-y-0 left-0 md:relative md:inset-auto
        z-50 md:z-auto
        bg-white border-r border-[#E5E7EB]
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        w-72 md:w-auto
        ${collapsed ? "md:w-16" : "md:w-60"}
      `}
    >
      {/* Logo row */}
      <div className="h-14 md:h-16 flex items-center justify-between px-4 border-b border-[#E5E7EB] shrink-0">
        {/* Wordmark height is controlled by Logo.tsx CSS (32px mobile / 40px desktop) */}
        {!collapsed && <Link href="/" onClick={onClose}><Logo showText light={theme === "dark"} /></Link>}
        {collapsed && <span className="hidden md:block"><Link href="/"><Logo showText={false} size={28} light={theme === "dark"} /></Link></span>}
        {collapsed && <span className="md:hidden"><Link href="/" onClick={onClose}><Logo showText light={theme === "dark"} /></Link></span>}

        <button onClick={onClose} className="md:hidden p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] transition-all" aria-label="Close sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-all" aria-label="Toggle sidebar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={collapsed ? "M5 2l5 5-5 5" : "M9 2L4 7l5 5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const effectiveHref = lk(item.href);
          const active = effectiveHref === pathPrefix ? pathname === pathPrefix : pathname.startsWith(effectiveHref);
          // Real count badge for Conversations (needs-attention), capped at
          // "99+" per standing convention (see NotificationBell). Every other
          // item's badge (e.g. the static "NEW" label) is unaffected. isCount
          // decides render style explicitly -- "99+" is a string but must
          // still render as a count pill, not the text-label pill.
          const isConversationsItem = item.href === "/app/conversations";
          const badge: string | number | undefined = isConversationsItem
            ? (needsAttentionCount && needsAttentionCount > 0 ? (needsAttentionCount > 99 ? "99+" : needsAttentionCount) : undefined)
            : ("badge" in item ? item.badge : undefined);
          const isCount = isConversationsItem || typeof badge === "number";
          const isVelaAssistantEntry = item.href === "#vela-assistant";
          const isMobileOnly = "mobileOnly" in item && item.mobileOnly;
          // FIX 8: real unseen-activity dot -- see the notifications effects
          // above for how each of these is derived and cleared. Distinct
          // from `badge` (which is a count or a static "NEW" label): this is
          // always a plain dot, and only ever appears on the icon itself so
          // it's visible in both collapsed and expanded sidebar states.
          const showActivityDot =
            (item.href === "/app" && dashboardUnread) ||
            (item.href === "/app/appointments" && apptsUnread) ||
            (item.href === "/app/analytics" && analyticsUnread) ||
            (item.href === "/app/leads" && leadsUnread);
          return (
            <Link
              key={item.href}
              href={effectiveHref}
              onClick={(e) => {
                if (isVelaAssistantEntry) {
                  e.preventDefault();
                  window.dispatchEvent(new Event("vela-open-assistant"));
                }
                onClose();
              }}
              className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${isMobileOnly ? "md:hidden" : ""} ${
                active
                  ? "bg-[#FFF5F0] text-[#FF6B35] border-l-2 border-[#FF6B35]"
                  : "text-[#374151] hover:text-[#111111] hover:bg-[#F9FAFB]"
              }`}
              style={{ paddingLeft: active ? "10px" : "12px", paddingRight: "12px" }}
            >
              <span className="shrink-0 relative">
                {item.icon}
                {showActivityDot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF3366] border border-white" aria-hidden="true" />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {badge && (
                    isCount ? (
                      <span className="min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#FF3366] text-white">
                        {badge}
                      </span>
                    ) : (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#FF6B35] text-white uppercase tracking-wide leading-none">
                        {badge}
                      </span>
                    )
                  )}
                </>
              )}
              {collapsed && (
                <>
                  <span className="flex-1 md:hidden">{t(item.labelKey)}</span>
                  {badge && (
                    <>
                      {isCount ? (
                        <span className="md:hidden min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#FF3366] text-white">
                          {badge}
                        </span>
                      ) : (
                        <span className="md:hidden text-[8px] font-black px-1.5 py-0.5 rounded bg-[#FF6B35] text-white uppercase tracking-wide leading-none">
                          {badge}
                        </span>
                      )}
                      <span className="hidden md:block absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />
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
        <div className="p-3 border-t border-[#E5E7EB]">
          <div className="rounded-xl p-4 bg-white border border-[#FF6B35]">
            <p className="text-xs font-bold text-[#111111] mb-1">{t("sidebar.upgradePremium")}</p>
            <p className="text-[10px] text-[#6B7280] mb-3">{t("sidebar.unlockFeatures")}</p>
            <Link href="/pricing" onClick={onClose} className="block text-center text-xs font-bold py-2 rounded-lg text-white" style={{ background: "var(--vela-gradient)" }}>
              {t("sidebar.upgradeNow")}
            </Link>
          </div>
        </div>
      )}

      {/* User area with dropdown */}
      <div ref={dropRef} className="relative border-t border-[#E5E7EB]">
        {dropdownOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[#F3F4F6]">
              <p className="text-sm font-semibold text-[#111111] truncate">{displayName}</p>
              {displayEmail && <p className="text-xs text-[#6B7280] truncate mt-0.5">{displayEmail}</p>}
              <span className="mt-2 inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--vp-10)", color: "var(--vp-color)" }}>
                {planLabel}
              </span>
            </div>

            <div className="py-1">
              {/* Settings */}
              <Link
                href={lk("/app/settings")}
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
                      className="w-full flex items-center justify-between ps-11 pe-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
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
                  href="/pricing"
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${demoProfile ? "text-[#FF6B35] font-semibold hover:bg-[#FFF5F0]" : "text-red-500 hover:bg-red-50"}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 12H3a1 1 0 01-1-1V3a1 1 0 011-1h2M9.5 10l3-3-3-3M12.5 7H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {demoProfile ? "Create Free Account →" : t("sidebar.logout")}
              </button>
            </div>
          </div>
        )}

        {/* User button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center gap-3 p-3 transition-all ${dropdownOpen ? "bg-[#FFF5F0]" : "hover:bg-[#F9FAFB]"} ${collapsed ? "md:justify-center" : ""}`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--vela-gradient)" }}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-[#111111] truncate">{displayName}</p>
                <p className="text-[10px] text-[#6B7280] truncate">{planLabel}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#9CA3AF] shrink-0">
                <path d={dropdownOpen ? "M2 7.5l4-4 4 4" : "M2 4.5l4 4 4-4"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
          {collapsed && (
            <div className="flex-1 min-w-0 md:hidden text-left">
              <p className="text-xs font-semibold text-[#111111] truncate">{displayName}</p>
              <p className="text-[10px] text-[#6B7280] truncate">{planLabel}</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
