"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const CHANNEL_COLORS: Record<string, string> = { instagram: "#E1306C", whatsapp: "#25D366", website: "#FF6B35" };

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { confirmed: "#16A34A", pending: "#FF6B35", cancelled: "#DC2626" };
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: colors[status] || "#9CA3AF" }} />;
}

export type DashUIConv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
export type DashUIAppt = { id: string; time: string; name: string; service: string; status: string };
export type DashUIKPI  = { label: string; value: string; change?: number };

interface Props {
  loading: boolean;
  firstName: string;
  bName: string;
  kpis: DashUIKPI[];
  convs: DashUIConv[];
  appts: DashUIAppt[];
  basePath?: string;
  showBanner?: boolean;
  onDismissBanner?: () => void;
  showKbBanner?: boolean;
  kbScore?: number;
  onDismissKbBanner?: () => void;
}

export default function DashboardPageUI({
  loading, firstName, bName, kpis, convs, appts,
  basePath = "/app",
  showBanner = false, onDismissBanner,
  showKbBanner = false, kbScore = 0, onDismissKbBanner,
}: Props) {
  const { t } = useI18n();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "greeting.morning" : hour < 17 ? "greeting.afternoon" : "greeting.evening";
  const displayName = firstName || t("greeting.there");

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">

      {/* KB low-score banner */}
      {showKbBanner && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.3L10.5 12h-7L5 7.3A3 3 0 0 1 4 5a3 3 0 0 1 3-3z" stroke="#D97706" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M5.5 12h3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111111]">{t("dashboard.kbBannerPre")}{kbScore}{t("dashboard.kbBannerPost")}</p>
              <p className="text-[11px] text-[#6B7280] truncate">{t("dashboard.kbBannerSub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`${basePath}/ai-training`}
              className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vela-gradient)" }}>
              {t("dashboard.trainAI")}
            </Link>
            <button onClick={onDismissKbBanner} className="p-1.5 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Onboarding banner */}
      {showBanner && !loading && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[#FF6B35]/30 bg-[#FFF8F5]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v11M1.5 7h11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111111]">{t("dashboard.onboardingTitle")}</p>
              <p className="text-[11px] text-[#6B7280] truncate">{t("dashboard.onboardingDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`${basePath}/welcome`}
              className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vela-gradient)" }}>
              {t("dashboard.continueSetup")}
            </Link>
            <button onClick={onDismissBanner} className="p-1.5 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#111111]">
          {loading ? t("common.loading") : `${t(greetKey)}, ${displayName}`}
        </h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{bName ? `${bName} · ` : ""}{today}</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5 animate-pulse">
                <div className="h-2.5 bg-[#F3F4F6] rounded w-2/3 mb-3" />
                <div className="h-7 bg-[#F3F4F6] rounded w-1/3 mb-2" />
              </div>
            ))
          : kpis.map((k) => (
              <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5">
                <p className="text-[11px] text-[#6B7280] mb-3">{t(`dashboard.${k.label}`)}</p>
                <p className="text-2xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
                {k.change !== undefined && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    k.change > 0 ? "bg-green-50 text-green-600" : k.change < 0 ? "bg-red-50 text-red-500" : "bg-[#F3F4F6] text-[#9CA3AF]"
                  }`}>
                    {k.change > 0 ? "↑" : k.change < 0 ? "↓" : "–"}
                    {k.change !== 0 ? `${Math.abs(k.change)}% ${t("dashboard.vsLastWeek")}` : t("dashboard.sameAsLastWeek")}
                  </span>
                )}
              </div>
            ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Conversations — 2 cols */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111111]">{t("dashboard.recentMessages")}</h2>
            <a href={`${basePath}/conversations`} className="text-xs text-[#FF6B35] font-semibold hover:underline">{t("dashboard.viewAll")}</a>
          </div>
          {loading ? (
            <div className="divide-y divide-[#F9FAFB]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] rounded w-2/3" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M16 2H2a1 1 0 0 0-1 1v12l3-3h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="#9CA3AF" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#374151] mb-1">{t("dashboard.noConversations")}</p>
              <p className="text-xs text-[#9CA3AF] mb-3">{t("dashboard.connectToReceive")}</p>
              <Link href={`${basePath}/channels`} className="text-xs font-bold px-3.5 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                {t("dashboard.connectChannel")}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F9FAFB]">
              {convs.map((c) => (
                <a key={c.id} href={`${basePath}/conversations`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">
                      {(c.customer_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                      style={{ background: CHANNEL_COLORS[c.channel] || "#9CA3AF" }}>
                    </div>
                    {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#111111] truncate">{c.customer_name ?? t("dashboard.unknown")}</span>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-2">{c.time}</span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{c.preview || t("dashboard.noMessages")}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Appointments — 3 cols */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111111]">{t("dashboard.todayAppointments")}</h2>
            <a href={`${basePath}/appointments`} className="text-xs text-[#FF6B35] font-semibold hover:underline">{t("dashboard.viewAll")}</a>
          </div>
          {loading ? (
            <div className="divide-y divide-[#F9FAFB]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-5 px-6 py-4 animate-pulse">
                  <div className="h-2.5 bg-[#F3F4F6] rounded w-12" />
                  <div className="w-px h-8 bg-[#F3F4F6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] rounded w-1/2" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : appts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="#9CA3AF" strokeWidth="1.3"/>
                  <path d="M6 2v2M12 2v2M2 7h14" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#374151] mb-1">{t("dashboard.noAppointments")}</p>
              <p className="text-xs text-[#9CA3AF]">{t("dashboard.appointmentsHint")}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F9FAFB]">
              {appts.map((a) => (
                <div key={a.id} className="flex items-center gap-5 px-6 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                  <span className="text-xs font-mono text-[#6B7280] w-12 shrink-0">{a.time}</span>
                  <div className="w-px h-8 bg-[#FF6B35] rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111111] truncate">{a.name}</p>
                    <p className="text-[11px] text-[#6B7280] truncate">{a.service}</p>
                  </div>
                  <StatusDot status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
