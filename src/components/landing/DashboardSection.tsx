"use client";

import AmbientGlow from "@/components/landing/AmbientGlow";
import CtaButton from "@/components/landing/CtaButton";
import { useI18n } from "@/lib/i18n";

// Real markup, not an image -- see git history for the old
// dashboard-mockup.png version. Same layout/colors/copy as the original
// image, including its exact numbers (Leads Today 18, Pipeline Value
// $12.4K, Unread Messages 9, Appointments 7) -- none invented here. The
// "This Week's Bookings" bar heights are visually approximated from the
// original image (not exact pixel values, no source data for them exists).
// Checklist/headline/subtext/CTA are real page copy and route through the
// site's i18n system (FIX 2, polish pass #2). The tiny in-mockup labels
// (STATS/ACTIVITY/NAV_ICONS below) stay English -- they're decorative
// "device screenshot" chrome at 7-9px, not real page content.
const CHECKLIST_KEYS = ["aiPhoneAgent", "everyChannel", "automation"] as const;

const STATS = [
  { label: "Leads Today", value: "18" },
  { label: "Pipeline Value", value: "$12.4K" },
  { label: "Unread Messages", value: "9" },
  { label: "Appointments", value: "7" },
];

const ACTIVITY = [
  { text: "New lead from Instagram", time: "2m ago", color: "#3B82F6" },
  { text: "Appointment booked", time: "8m ago", color: "#22C55E" },
  { text: "AI answered a call", time: "14m ago", color: "#FF6B35" },
];

// Approximated relative bar heights (0-1) read off the original image --
// not exact source data, see note above.
const BOOKINGS = [
  { day: "Sun", h: 0.35 },
  { day: "Mon", h: 0.55 },
  { day: "Tue", h: 0.7 },
  { day: "Wed", h: 0.85 },
  { day: "Thu", h: 0.95 },
  { day: "Fri", h: 1 },
  { day: "Sat", h: 0.5 },
];

const NAV_ICONS = [
  { label: "Calls", icon: <path d="M3.2 5.3c.5 2 1.9 3.6 3.5 4.4l1.2-1.2c.2-.2.4-.2.6-.1.7.2 1.5.3 2.2.3.4 0 .6.2.6.6v1.9c0 .4-.2.6-.6.6C6.2 11.8 2.2 7.8 2.2 3.4c0-.4.2-.6.6-.6h1.9c.4 0 .6.2.6.6 0 .8.1 1.5.3 2.2.1.2.1.4-.1.6l-1.3 1.1z" /> },
  { label: "Messages", icon: <path d="M12.5 8.5a1.2 1.2 0 01-1.2 1.2H4.5L2.5 11.5V3.2A1.2 1.2 0 013.7 2h7.6a1.2 1.2 0 011.2 1.2v5.3z" /> },
  { label: "Website", icon: <path d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM1.7 7h10.6M7 1.6c-1.4 1.4-2.2 3.4-2.2 5.4s.8 4 2.2 5.4c1.4-1.4 2.2-3.4 2.2-5.4S8.4 3 7 1.6z" /> },
  { label: "Automations", icon: <path d="M11.5 7A4.5 4.5 0 013 8.7M2.5 7A4.5 4.5 0 0111 5.3M2.5 3.3V6h2.7M11.5 10.7V8h-2.7" /> },
  { label: "Reports", icon: <path d="M2 12h10M4 12V7M7 12V4M10 12V9" /> },
];

function PhoneMockupDashboard() {
  return (
    <div className="relative select-none mx-auto" style={{ width: 260, maxWidth: "100%" }}>
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "100%",
          borderRadius: 36,
          paddingBottom: 8,
          background: "#FFFFFF",
          border: "1.5px solid #E2E8F0",
          boxShadow: "0 24px 56px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Dynamic island */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-16 h-5 rounded-full bg-[#0F172A]" />
        </div>

        {/* App header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-2 shrink-0">
          <span className="text-[13px] font-bold text-[#0F172A]">Dashboard</span>
          <div className="w-6 h-6 rounded-full bg-[#FFF0E8] flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5a3.5 3.5 0 00-3.5 3.5v1.8L2 9.5h10L10.5 6.8V5A3.5 3.5 0 007 1.5zM5.7 11.5a1.3 1.3 0 002.6 0" stroke="#FF6B35" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-1.5 px-3 shrink-0">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-[#F1F5F9] bg-[#FAFAFA] px-2 py-1.5">
              <p className="text-[8px] text-[#94A3B8] font-medium leading-tight">{s.label}</p>
              <p className="text-[13px] font-bold text-[#0F172A] leading-tight mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="px-3 mt-2 shrink-0">
          <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Recent Activity</p>
          <div className="flex flex-col gap-1">
            {ACTIVITY.map((a) => (
              <div key={a.text} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                <span className="text-[8.5px] text-[#334155] flex-1 truncate">{a.text}</span>
                <span className="text-[7.5px] text-[#94A3B8] shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* This Week's Bookings */}
        <div className="px-3 mt-2 flex-1 min-h-0">
          <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide mb-1">This Week&apos;s Bookings</p>
          <div className="flex items-end justify-between gap-1" style={{ height: 44 }}>
            {BOOKINGS.map((b) => (
              <div key={b.day} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${b.h * 34}px`, background: "linear-gradient(180deg,#FF6B35,#FF3366)" }}
                />
                <span className="text-[6.5px] text-[#94A3B8]">{b.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#F1F5F9] shrink-0">
          {NAV_ICONS.map((n) => (
            <div key={n.label} className="flex flex-col items-center gap-0.5">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#94A3B8" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                {n.icon}
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardSection() {
  const { t } = useI18n();
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="relative">
          <AmbientGlow pos="start" />
          <div
            className="relative overflow-hidden rounded-2xl grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-6 px-6 py-10 sm:px-10 sm:py-12"
            style={{ background: "linear-gradient(135deg,#FFF3E9 0%,#FFE0CC 100%)", zIndex: 1 }}
          >
            {/* Text panel */}
            <div className="flex flex-col justify-center order-2 lg:order-1">
              <h2 className="font-display font-extrabold text-[24px] sm:text-[30px] lg:text-[32px] text-[#2A1200] leading-tight">
                {t("landing.dashboardSection.headline")}
              </h2>
              <p className="text-[#6B4A33] text-base mt-3 leading-relaxed max-w-md">
                {t("landing.dashboardSection.subtext")}
              </p>

              <div className="flex flex-col gap-3 mt-6">
                {CHECKLIST_KEYS.map((key) => (
                  <div key={key} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FF6B35" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="text-sm sm:text-base text-[#2A1200] leading-snug">
                      <span className="font-bold">{t(`landing.dashboardSection.checklist.${key}.label`)}:</span> {t(`landing.dashboardSection.checklist.${key}.desc`)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-7">
                <CtaButton size="md" />
              </div>
            </div>

            {/* Phone mockup panel */}
            <div className="order-1 lg:order-2 flex items-center justify-center">
              <PhoneMockupDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
