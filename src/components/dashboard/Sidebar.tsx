"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";

const NAV = [
  {
    label: "Dashboard",
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
    label: "Conversations",
    href: "/app/conversations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.25 15V4.5A1.5 1.5 0 013.75 3h9.75A1.5 1.5 0 0115 4.5v6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    badge: 3,
  },
  {
    label: "Leads / CRM",
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
    label: "Appointments",
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
    label: "Website Builder",
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
    label: "Analytics",
    href: "/app/analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 15V9.75M7.5 15V6.75M12 15V3.75M16.5 15V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Marketing",
    href: "/app/marketing",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2.25 9h1.5M14.25 9h1.5M9 2.25v1.5M9 14.25v1.5M4.397 4.397l1.06 1.06M12.543 12.543l1.06 1.06M4.397 13.603l1.06-1.06M12.543 5.457l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.697 3.697l1.06 1.06M13.243 13.243l1.06 1.06M3.697 14.303l1.06-1.06M13.243 4.757l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  const [collapsed, setCollapsed] = useState(false);

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

        {/* X button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all"
          aria-label="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Toggle sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d={collapsed ? "M5 2l5 5-5 5" : "M9 2L4 7l5 5"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                active
                  ? "bg-[#FF6B35]/15 text-[#FF6B35]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", color: "white" }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {/* On mobile, always show label (sidebar is full-width) */}
              {collapsed && (
                <>
                  <span className="flex-1 md:hidden">{item.label}</span>
                  {item.badge && (
                    <>
                      <span className="md:hidden w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", color: "white" }}>
                        {item.badge}
                      </span>
                      <span className="hidden md:block absolute top-1 right-1 w-3 h-3 rounded-full bg-[#FF6B35]" />
                    </>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA — hidden when collapsed on desktop */}
      {!collapsed && (
        <div className="p-3 border-t border-white/5">
          <div className="rounded-xl p-4 bg-gradient-to-br from-[#FF6B35]/15 to-[#FF3366]/10 border border-[#FF6B35]/20">
            <p className="text-xs font-bold text-white mb-1">Upgrade to Premium</p>
            <p className="text-[10px] text-white/40 mb-3">Unlock 3 businesses + AI training</p>
            <Link
              href="/pricing"
              onClick={onClose}
              className="block text-center text-xs font-bold py-2 rounded-lg text-white"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* User */}
      <div className={`p-3 border-t border-white/5 flex items-center gap-3 ${collapsed ? "md:justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
          A
        </div>
        {(!collapsed) && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Ahmed Al-Rashid</p>
            <p className="text-[10px] text-white/40 truncate">Pro Plan</p>
          </div>
        )}
        {collapsed && (
          <div className="flex-1 min-w-0 md:hidden">
            <p className="text-xs font-semibold text-white truncate">Ahmed Al-Rashid</p>
            <p className="text-[10px] text-white/40 truncate">Pro Plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}
