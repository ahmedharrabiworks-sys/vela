"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import CountUp from "@/components/ui/CountUp";
import GlassBlobs from "@/components/ui/GlassBlobs";
import Toast from "@/components/ui/Toast";
import AgendaView, { type RowAction } from "@/components/dashboard/appointments/AgendaView";
import WeekView from "@/components/dashboard/appointments/WeekView";
import { AppointmentDrawer, NewAppointmentDrawer, type DrawerMode } from "@/components/dashboard/appointments/AppointmentDrawer";
import { ChannelBadge, Icons, addDays, fmtDay, fmtTime, quietBtn, weekStartOf, type Appt, type ApptChannel, type ApptPayload } from "@/components/dashboard/appointments/shared";

type View = "agenda" | "week";
type DateFilter = "all" | "today" | "week" | "upcoming" | "past";
const DATE_FILTERS: DateFilter[] = ["all", "today", "week", "upcoming", "past"];
const CHANNELS: ApptChannel[] = ["phone", "website", "whatsapp", "instagram", "manual"];
const AI_CHANNELS: ApptChannel[] = ["phone", "website", "whatsapp", "instagram"];

// Spreadsheets run a cell that starts with these, and names come from customers.
function csvCell(value: string, isPhone = false): string {
  const safe = !isPhone && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`glass rounded-2xl animate-pulse ${className}`} />;
}

export default function AppointmentsPage() {
  const { t, locale } = useI18n();
  const { isStarter, config } = usePlan();
  const [data, setData] = useState<ApptPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("agenda");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [channel, setChannel] = useState<ApptChannel | "all">("all");
  const [drawer, setDrawer] = useState<{ id: string; mode: DrawerMode } | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/appointments");
    if (!res.ok) throw new Error("load");
    const payload = await res.json() as ApptPayload;
    setData(payload);
    return payload;
  }, []);

  useEffect(() => {
    load()
      .then((payload) => {
        const saved = localStorage.getItem(`vela_appt_view:${payload.viewKey}`);
        if (saved === "week" || saved === "agenda") setView(saved);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [load]);

  const chooseView = (v: View) => {
    setView(v);
    if (data) try { localStorage.setItem(`vela_appt_view:${data.viewKey}`, v); } catch { /* private mode */ }
  };

  const all = useMemo(() => data?.appointments ?? [], [data]);
  const today = data?.now.date ?? "";
  const weekStart = today ? weekStartOf(today) : "";
  const weekEnd = today ? addDays(weekStart, 6) : "";

  const stats = useMemo(() => {
    const live = all.filter((a) => a.status !== "cancelled");
    const ai = live.filter((a) => a.channel !== "manual");
    return {
      today: live.filter((a) => a.date === today).length,
      week: live.filter((a) => a.date >= weekStart && a.date <= weekEnd).length,
      ai: ai.length,
      split: AI_CHANNELS.map((c) => ({ channel: c, count: ai.filter((a) => a.channel === c).length })),
    };
  }, [all, today, weekStart, weekEnd]);

  const bookingsThisMonth = useMemo(() => all.filter((a) => a.status !== "cancelled" && a.date.slice(0, 7) === today.slice(0, 7)).length, [all, today]);

  const matching = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      if (channel !== "all" && a.channel !== channel) return false;
      if (!q) return true;
      return [a.name, a.phone, a.service].some((v) => v.toLowerCase().includes(q));
    });
  }, [all, search, channel]);

  const { upcoming, past } = useMemo(() => {
    const nowKey = data ? `${data.now.date}T${data.now.time}` : "";
    const inFilter = matching.filter((a) => {
      if (dateFilter === "today") return a.date === today;
      if (dateFilter === "week") return a.date >= weekStart && a.date <= weekEnd;
      if (dateFilter === "upcoming") return `${a.date}T${a.time}` >= nowKey;
      if (dateFilter === "past") return a.date < today;
      return true;
    });
    return { upcoming: inFilter.filter((a) => a.date >= today), past: inFilter.filter((a) => a.date < today) };
  }, [matching, dateFilter, today, weekStart, weekEnd, data]);

  const exportCSV = () => {
    const header = ["name", "phone", "service", "date", "time", "channel", "status"].map((k) => csvCell(t(`appointmentsV2.csv.${k}`))).join(",");
    const lines = all.map((a) => [
      csvCell(a.name), csvCell(a.phone, true), csvCell(a.service), csvCell(a.date), csvCell(a.time),
      csvCell(t(`appointmentsV2.channels.${a.channel}`)), csvCell(t(`appointmentsV2.status.${a.status}`)),
    ].join(","));
    const url = URL.createObjectURL(new Blob([`﻿${[header, ...lines].join("\n")}`], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runAction = async (appt: Appt, action: string, extra?: { date: string; time: string }): Promise<string | null> => {
    setBusyId(appt.id);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        return body.error ?? "save_failed";
      }
      // A chat customer hears about the new time and can answer in the same thread.
      if (action === "reschedule" && extra && appt.conversationId) {
        const whenDay = fmtDay(extra.date, "en", { weekday: "short", day: "numeric", month: "short" });
        const proposal = `Hi ${appt.name.split(" ")[0]}, we'd like to move your ${appt.service} to ${whenDay} at ${fmtTime(extra.time, "en")}. Does that work for you? Reply to confirm or let us know if another time is better.`;
        await fetch(`/api/conversations/${appt.conversationId}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: proposal }),
        }).catch(() => {});
      }
      await load().catch(() => {});
      setDrawer(null);
      setToast({ msg: t(`appointmentsV2.toast.${action}`), type: "success" });
      return null;
    } catch {
      return "save_failed";
    } finally {
      setBusyId(null);
    }
  };

  const onRowAction = (appt: Appt, action: RowAction) => {
    if (action === "confirm") {
      runAction(appt, "confirm").then((problem) => { if (problem) setToast({ msg: t(`appointmentsV2.errors.${problem}`), type: "error" }); });
      return;
    }
    setDrawer({ id: appt.id, mode: action === "open" ? "view" : action });
  };

  const createAppointment = async (body: Record<string, string>): Promise<string | null> => {
    try {
      const res = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const out = await res.json().catch(() => ({})) as { error?: string };
        return out.error ?? "save_failed";
      }
      await load().catch(() => {});
      setDrawer(null);
      setToast({ msg: t("appointmentsV2.toast.created"), type: "success" });
      return null;
    } catch {
      return "save_failed";
    }
  };

  const openAppt = drawer && drawer !== "new" ? all.find((a) => a.id === drawer.id) ?? null : null;
  const isEmpty = !loading && !failed && all.length === 0;
  const summary = all.length === 0
    ? t("appointmentsV2.summaryEmpty")
    : [
        t("appointmentsV2.summaryToday").replace("{n}", String(stats.today)),
        t("appointmentsV2.summaryWeek").replace("{n}", String(stats.week)),
        t("appointmentsV2.summaryAi").replace("{n}", String(stats.ai)),
      ].join(" · ");
  const nothingMatches = upcoming.length === 0 && past.length === 0;

  return (
    <div className="max-w-6xl mx-auto pb-24 relative">
      <GlassBlobs variant="spread" />
      <div className="relative z-10 space-y-5">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#111111]">{t("appointments.title")}</h1>
            <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
              {loading ? <div className="h-4 w-56 rounded bg-black/[0.05] animate-pulse" /> : <p data-testid="appt-summary" className="text-sm text-[#6B7280]">{summary}</p>}
              {!loading && isStarter && Number.isFinite(config.bookingsPerMonth) && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] tabular-nums">
                  <span dir="ltr">{bookingsThisMonth} / {config.bookingsPerMonth}</span> {t("appointments.bookingCounter")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span title={all.length === 0 ? t("appointmentsV2.exportEmpty") : undefined}>
              <button type="button" onClick={exportCSV} disabled={all.length === 0} className={`${quietBtn} h-11 px-3.5`}>
                {Icons.download}{t("appointments.exportCsv")}
              </button>
            </span>
            <button type="button" onClick={() => setDrawer("new")} disabled={loading || failed} className="btn-primary h-11 px-5 text-sm gap-1.5 disabled:opacity-60">
              {Icons.plus}{t("appointmentsV2.newAppointment")}
            </button>
          </div>
        </div>

        {failed && (
          <div className="glass rounded-2xl flex items-center gap-3 p-4">
            <p className="text-sm text-red-700 flex-1">{t("appointmentsV2.loadFailed")}</p>
            <button type="button" onClick={() => { setFailed(false); setLoading(true); load().catch(() => setFailed(true)).finally(() => setLoading(false)); }} className="text-xs font-bold text-red-700 px-3 h-9 border border-red-300 rounded-lg hover:bg-red-100 transition-colors">{t("dashboardV2.retry")}</button>
          </div>
        )}

        {/* Stats: three cards, a sideways strip on phones */}
        <div data-testid="appt-stats" className="flex gap-3 overflow-x-auto snap-x scrollbar-none -mx-4 px-4 py-0.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0">
          {loading ? [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-[112px] min-w-[72%] sm:min-w-0" />) : (
            <>
              <div className="glass rounded-2xl p-4 sm:p-5 min-w-[72%] sm:min-w-0 snap-start">
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{t("appointmentsV2.stats.today")}</p>
                <p className="text-[28px] sm:text-[32px] font-bold text-[#111111] leading-none tabular-nums"><CountUp value={stats.today} /></p>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">{today ? fmtDay(today, locale, { weekday: "long", day: "numeric", month: "long" }) : ""}</p>
              </div>
              <div className="glass rounded-2xl p-4 sm:p-5 min-w-[72%] sm:min-w-0 snap-start">
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{t("appointmentsV2.stats.week")}</p>
                <p className="text-[28px] sm:text-[32px] font-bold text-[#111111] leading-none tabular-nums"><CountUp value={stats.week} /></p>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5 tabular-nums">{today ? `${fmtDay(weekStart, locale, { day: "numeric", month: "short" })} · ${fmtDay(weekEnd, locale, { day: "numeric", month: "short" })}` : ""}</p>
              </div>
              <div className="glass rounded-2xl p-4 sm:p-5 min-w-[72%] sm:min-w-0 snap-start">
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">{t("appointmentsV2.stats.ai")}</p>
                <p className="text-[28px] sm:text-[32px] font-bold text-[#111111] leading-none tabular-nums"><CountUp value={stats.ai} /></p>
                <div className="flex items-center gap-3 mt-1.5">
                  {stats.split.map((s) => (
                    <span key={s.channel} data-testid={`ai-split-${s.channel}`} className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${s.count > 0 ? "text-[#374151]" : "text-[#9CA3AF] opacity-60"}`}>
                      <ChannelBadge channel={s.channel} t={t} size={16} />{s.count}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {isEmpty ? (
          <div className="glass rounded-2xl px-6 py-14 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF5F0] text-[#C2410C] flex items-center justify-center mb-4">{Icons.calendar}</div>
            <p className="text-sm font-semibold text-[#111111] max-w-md leading-relaxed">{t("appointmentsV2.emptyTitle")}</p>
            <div className="flex items-center justify-center flex-wrap gap-2.5 mt-5">
              {data?.phoneLinked ? (
                <span className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-green-50 text-sm font-semibold text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />{t("appointmentsV2.phoneLive")}
                </span>
              ) : (
                <Link href="/app/ai-agent/phone" className="btn-primary h-11 px-5 text-sm">{t("appointmentsV2.setUpPhone")}</Link>
              )}
              <button type="button" onClick={() => setDrawer("new")} className={`${quietBtn} h-11 px-4 text-sm`}>{t("appointmentsV2.addManually")}</button>
            </div>
          </div>
        ) : !failed && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="glass flex items-center gap-1 rounded-xl p-1 self-start shrink-0">
                {(["agenda", "week"] as View[]).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)} className={`px-3.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-all ${view === v ? "text-white" : "text-[#6B7280] hover:text-[#111111]"}`} style={view === v ? { background: "var(--vela-gradient)" } : undefined}>
                    {t(`appointmentsV2.views.${v}`)}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-0 lg:max-w-xs">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">{Icons.search}</span>
                <input type="search" aria-label={t("appointmentsV2.search")} placeholder={t("appointmentsV2.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 ps-9 pe-3 text-sm bg-white/70 border border-black/[0.07] !rounded-xl text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50" />
              </div>
              <div className="flex items-center gap-1 flex-wrap lg:ms-auto">
                {view === "agenda" && DATE_FILTERS.map((k) => (
                  <button key={k} type="button" aria-pressed={dateFilter === k} onClick={() => setDateFilter(k)} className={`px-2.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${dateFilter === k ? "bg-[#FFF5F0] text-[#C2410C]" : "text-[#6B7280] hover:text-[#111111]"}`}>
                    {t(`appointmentsV2.filters.${k}`)}
                  </button>
                ))}
                <select aria-label={t("appointmentsV2.channelFilter")} value={channel} onChange={(e) => setChannel(e.target.value as ApptChannel | "all")} className="h-9 ms-1 px-2 !rounded-lg border border-black/[0.07] bg-white/70 text-xs font-medium text-[#374151] focus:outline-none focus:border-[#FF6B35]/50">
                  <option value="all">{t("appointmentsV2.channels.all")}</option>
                  {CHANNELS.map((c) => <option key={c} value={c}>{t(`appointmentsV2.channels.${c}`)}</option>)}
                </select>
              </div>
            </div>

            {loading || !data ? (
              <SkeletonCard className="h-[280px]" />
            ) : view === "week" ? (
              <WeekView rows={matching} hours={data.hours} now={data.now} locale={locale} t={t} onOpen={(a) => setDrawer({ id: a.id, mode: "view" })} />
            ) : nothingMatches ? (
              <div className="glass rounded-2xl px-6 py-12 text-center">
                <p className="text-sm text-[#9CA3AF]">{t("appointmentsV2.noMatch")}</p>
              </div>
            ) : (
              <AgendaView key={dateFilter} upcoming={upcoming} past={past} pastOpenByDefault={dateFilter === "past"} today={today} locale={locale} t={t} busyId={busyId} onAction={onRowAction} />
            )}
          </>
        )}
      </div>

      {openAppt && drawer && drawer !== "new" && data && (
        <AppointmentDrawer key={`${openAppt.id}:${drawer.mode}`} appt={openAppt} initialMode={drawer.mode} today={data.now.date} nowTime={data.now.time} locale={locale} t={t} onClose={() => setDrawer(null)} onAction={runAction} />
      )}
      {drawer === "new" && data && (
        <NewAppointmentDrawer services={data.services} today={data.now.date} locale={locale} t={t} onClose={() => setDrawer(null)} onCreate={createAppointment} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
