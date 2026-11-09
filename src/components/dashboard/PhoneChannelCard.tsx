"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { fmtTimeAgo } from "@/components/dashboard/CallTranscript";
import ChannelIcon from "@/components/ui/ChannelIcon";

interface PhoneStatus {
  status: "live" | "needs_setup" | "issue";
  reason: "plan" | "webhook" | "number_missing" | "service" | null;
  voicePlan: boolean;
  number: string | null;
  callsThisWeek: number;
  minutes: { used: number; limit: number | null };
  lastCallAt: string | null;
}

const PILL = {
  live: { box: "bg-green-50 text-green-700", dot: "bg-green-500", key: "live" },
  needs_setup: { box: "bg-amber-50 text-amber-700", dot: "bg-amber-400", key: "needsSetup" },
  issue: { box: "bg-red-50 text-red-700", dot: "bg-red-500", key: "issue" },
} as const;

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export default function PhoneChannelCard() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PhoneStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/channels/phone-status")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: PhoneStatus) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (!data && !failed) return <div className="glass rounded-2xl animate-pulse h-full min-h-[280px]" />;

  const pill = data ? PILL[data.status] : null;
  const limit = data?.minutes.limit ?? null;
  const pct = data && limit ? Math.min(100, Math.round((data.minutes.used / limit) * 100)) : 0;
  const barColor = pct >= 100 ? "#DC2626" : pct >= 80 ? "#F59E0B" : "#FF6B35";

  return (
    <div data-testid="channel-phone" className="glass glass-warm rounded-2xl p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--vela-gradient)" }}>
          <ChannelIcon channel="phone" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[#111111]">{t("channels.phoneAgent.name")}</h2>
            {pill && (
              <span data-testid="phone-status" className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill.box}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
                {t(`channelsV2.${pill.key}`)}
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280] mt-1 leading-relaxed">{t("channels.phoneAgent.desc")}</p>
        </div>
      </div>

      {failed ? (
        <p className="text-sm text-red-700 mt-6">{t("channelsV2.loadFailed")}</p>
      ) : data && (
        <>
          {data.status === "issue" && data.reason && (
            <p role="status" data-testid="phone-reason" className="mt-4 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{t(`channelsV2.reasons.${data.reason}`)}</p>
          )}
          <div className="mt-6">
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{t("channelsV2.customersCall")}</p>
            {data.status === "needs_setup" ? (
              <p className="text-sm text-[#6B7280]">{t("channelsV2.noNumber")}</p>
            ) : (
              <p data-testid="phone-number" dir="ltr" className="text-[26px] sm:text-[32px] font-bold text-[#111111] leading-tight tabular-nums text-start break-all">{data.number}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-black/[0.06]">
            <Tile label={t("channelsV2.callsThisWeek")}>
              <p data-testid="phone-calls" className="text-[22px] font-bold text-[#111111] leading-none tabular-nums">{data.callsThisWeek.toLocaleString("en-US")}</p>
            </Tile>
            <Tile label={t("channelsV2.minutesUsed")}>
              <p data-testid="phone-minutes" dir="ltr" className="text-[22px] font-bold text-[#111111] leading-none tabular-nums text-start">
                {data.minutes.used.toLocaleString("en-US")}
                {limit !== null && <span className="text-sm font-medium text-[#9CA3AF]"> / {limit.toLocaleString("en-US")}</span>}
              </p>
              {limit !== null && limit > 0 && (
                <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden mt-2"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} /></div>
              )}
            </Tile>
            <Tile label={t("channelsV2.lastCall")}>
              <p data-testid="phone-last" className="text-sm font-semibold text-[#111111] pt-1">{data.lastCallAt ? fmtTimeAgo(data.lastCallAt, locale) : t("channelsV2.noCalls")}</p>
            </Tile>
          </div>

          <div className="mt-auto pt-6">
            <Link href={data.voicePlan ? "/app/ai-agent/phone" : "/pricing"} className="btn-primary h-11 px-6 text-sm w-full sm:w-auto">
              {!data.voicePlan ? t("channelsV2.upgrade") : data.status === "needs_setup" ? t("channelsV2.setUp") : t("channelsV2.manage")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
