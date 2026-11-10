"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import GlassBlobs from "@/components/ui/GlassBlobs";
import Toast from "@/components/ui/Toast";
import TimeGrid from "@/components/dashboard/appointments/TimeGrid";
import MobileDay from "@/components/dashboard/appointments/MobileDay";
import { FilterPopover, MiniMonth, UpNext } from "@/components/dashboard/appointments/ScheduleParts";
import { AppointmentDrawer, NewAppointmentDrawer, type DrawerMode } from "@/components/dashboard/appointments/AppointmentDrawer";
import { ClosedDayCard, DayTable } from "@/components/dashboard/appointments/DayView";
import TimeOffDrawer from "@/components/dashboard/appointments/TimeOffDrawer";
import { dayStatus, fullDayOff, nextOpenDay } from "@/lib/time-off";
import { Icons, addDays, fmtDay, fmtTime, quietBtn, weekStartOf, type Appt, type ApptChannel, type ApptPayload, type ApptStatus } from "@/components/dashboard/appointments/shared";

type View = "day" | "week";
const UP_NEXT_COUNT = 5;
const BASE_CHANNELS: ApptChannel[] = ["phone", "whatsapp", "instagram", "manual"];

// Spreadsheets run a cell that starts with these, and names come from customers.
function csvCell(value: string, isPhone = false): string {
  const safe = !isPhone && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** The server's wall clock, moved forward while the page stays open. */
function useLiveNow(base: { date: string; time: string } | null) {
  const [tick, setTick] = useState(0);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  useEffect(() => { setLoadedAt(Date.now()); setTick(0); }, [base]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setTick((n) => n + 1); }, 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!base) return null;
    const moved = new Date(Date.parse(`${base.date}T${base.time}:00.000Z`) + (Date.now() - loadedAt)).toISOString();
    return { date: moved.slice(0, 10), time: moved.slice(11, 16) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, loadedAt, tick]);
}

export default function AppointmentsPage() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<ApptPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApptStatus | "all">("all");
  const [channel, setChannel] = useState<ApptChannel | "all">("all");
  const [drawer, setDrawer] = useState<string | "new" | "timeoff" | null>(null);
  const [newAt, setNewAt] = useState<{ date: string; time?: string } | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
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
        setAnchor(payload.now.date);
        const saved = localStorage.getItem(`vela_appt_view:${payload.viewKey}`);
        if (saved === "week" || saved === "day") setView(saved);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [load]);

  const chooseView = (v: View) => {
    setView(v);
    if (data) try { localStorage.setItem(`vela_appt_view:${data.viewKey}`, v); } catch { /* private mode */ }
  };

  const now = useLiveNow(data?.now ?? null);
  const all = useMemo(() => data?.appointments ?? [], [data]);
  const today = now?.date ?? "";

  const matching = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (channel !== "all" && a.channel !== channel) return false;
      return !q || [a.name, a.phone, a.service].some((v) => v.toLowerCase().includes(q));
    });
  }, [all, search, status, channel]);

  const upNext = useMemo(() => {
    if (!now) return [];
    const nowKey = `${now.date}T${now.time}`;
    return all
      .filter((a) => (a.status === "pending" || a.status === "confirmed") && `${a.date}T${a.time}` >= nowKey)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, UP_NEXT_COUNT);
  }, [all, now]);

  const bookedDates = useMemo(() => new Set(all.filter((a) => a.status !== "cancelled").map((a) => a.date)), [all]);
  // Older website chat bookings stay findable; the option only exists if they do.
  const channels = useMemo<ApptChannel[]>(() => (all.some((a) => a.channel === "website") ? [...BASE_CHANNELS, "website"] : BASE_CHANNELS), [all]);

  const weekStart = anchor ? weekStartOf(anchor) : "";
  const weekDays = useMemo(() => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []), [weekStart]);

  const step = (direction: 1 | -1) => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    setAnchor(addDays(anchor, direction * (wide && view === "week" ? 7 : 1)));
  };

  const rangeLabel = !anchor ? "" : view === "week"
    ? `${fmtDay(weekDays[0], locale, { day: "numeric", month: "short" })} · ${fmtDay(weekDays[6], locale, { day: "numeric", month: "short" })}`
    : fmtDay(anchor, locale, { weekday: "short", day: "numeric", month: "short" });

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
    }
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

  const openAppt = drawer && drawer !== "new" && drawer !== "timeoff" ? all.find((a) => a.id === drawer) ?? null : null;
  const showEmptyHint = !loading && all.length === 0;
  const timeOff = useMemo(() => data?.timeOff ?? [], [data]);
  const anchorStatus = anchor ? dayStatus(anchor, data?.hours ?? null, timeOff) : ({ kind: "open" } as const);
  const dayRows = useMemo(() => matching.filter((a) => a.date === anchor), [matching, anchor]);
  const open = (a: Appt, mode: DrawerMode = "view") => { setDrawerMode(mode); setDrawer(a.id); };
  const confirmRow = (a: Appt) => { runAction(a, "confirm").then((problem) => { if (problem) setToast({ msg: t(`appointmentsV2.errors.${problem}`), type: "error" }); }); };
  const addAt = (date: string, time?: string) => { setNewAt({ date, time }); setDrawer("new"); };
  const ready = !!(data && now && anchor);

  return (
    <div className="max-w-[1400px] mx-auto pb-24 relative">
      <GlassBlobs variant="spread" />
      <div className="relative z-10 space-y-4">

        <header className="flex flex-wrap items-center gap-x-2 md:gap-x-4 gap-y-3">
          <h1 className="text-xl font-bold text-[#111111] order-1">{t("appointments.title")}</h1>

          <div className="flex items-center gap-1 order-3 md:order-2">
            <button type="button" disabled={!anchor} onClick={() => step(-1)} aria-label={t("appointmentsV2.navigator.previous")} className={`${quietBtn} h-11 w-11 md:h-10 md:w-10`}><span className="rotate-180 rtl:rotate-0">{Icons.chevron}</span></button>
            <button type="button" disabled={!anchor} onClick={() => setAnchor(today)} className={`${quietBtn} h-11 md:h-10 px-3.5`}>{t("appointmentsV2.today")}</button>
            <button type="button" data-testid="nav-next" disabled={!anchor} onClick={() => step(1)} aria-label={t("appointmentsV2.navigator.next")} className={`${quietBtn} h-11 w-11 md:h-10 md:w-10`}><span className="rtl:rotate-180">{Icons.chevron}</span></button>
            <p data-testid="range-label" className="hidden md:block ms-2 text-sm font-semibold text-[#111111] tabular-nums whitespace-nowrap">{rangeLabel}</p>
          </div>

          <div className="flex items-center gap-2 order-2 md:order-3 ms-auto">
            <div className="hidden md:flex glass items-center gap-1 rounded-xl p-1">
              {(["day", "week"] as View[]).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)} className={`px-3.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold transition-all ${view === v ? "text-white" : "text-[#6B7280] hover:text-[#111111]"}`} style={view === v ? { background: "var(--vela-gradient)" } : undefined}>
                  {t(`appointmentsV2.views.${v}`)}
                </button>
              ))}
            </div>
            <button type="button" data-testid="time-off-button" onClick={() => setDrawer("timeoff")} disabled={!ready} aria-label={t("appointmentsV2.timeOff.button")} title={t("appointmentsV2.timeOff.button")} className={`${quietBtn} h-11 w-11 md:h-10 md:w-auto md:px-3`}>
              {Icons.timeOff}<span className="hidden md:inline">{t("appointmentsV2.timeOff.button")}</span>
            </button>
            <FilterPopover search={search} setSearch={setSearch} status={status} setStatus={setStatus} channel={channel} setChannel={setChannel} channels={channels} t={t} />
            <span title={all.length === 0 ? t("appointmentsV2.exportEmpty") : t("appointments.exportCsv")}>
              <button type="button" data-testid="export-button" onClick={exportCSV} disabled={all.length === 0} aria-label={t("appointments.exportCsv")} className={`${quietBtn} h-11 w-11 md:h-10 md:w-10`}>{Icons.download}</button>
            </span>
          </div>

          <button type="button" onClick={() => addAt(anchor && now && anchor >= now.date ? anchor : (now?.date ?? ""))} disabled={loading || failed} className="btn-primary h-11 md:h-10 px-3.5 md:px-4 text-sm gap-1.5 order-4 ms-auto md:ms-0 disabled:opacity-60">
            {Icons.plus}{t("appointmentsV2.newAppointment")}
          </button>
        </header>

        {failed && (
          <div className="glass rounded-2xl flex items-center gap-3 p-4">
            <p className="text-sm text-red-700 flex-1">{t("appointmentsV2.loadFailed")}</p>
            <button type="button" onClick={() => { setFailed(false); setLoading(true); load().then((p) => setAnchor(p.now.date)).catch(() => setFailed(true)).finally(() => setLoading(false)); }} className="text-xs font-bold text-red-700 px-3 h-9 border border-red-300 rounded-lg hover:bg-red-100 transition-colors">{t("dashboardV2.retry")}</button>
          </div>
        )}

        {!failed && !ready && <div className="glass rounded-2xl animate-pulse h-[560px]" />}

        {ready && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_288px] gap-4 items-start">
            <div className="min-w-0 space-y-4">
              {!data.hours && (
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  {t("appointmentsV2.week.noHours")}{" "}
                  <Link href="/app/ai-agent/knowledge-base" className="font-semibold text-[#C2410C] hover:underline">{t("appointmentsV2.week.addHours")}</Link>
                </p>
              )}
              {view === "week" ? (
                <div className="hidden md:block glass rounded-2xl overflow-hidden">
                  <TimeGrid days={weekDays} rows={matching} hours={data.hours} timeOff={timeOff} now={now} locale={locale} t={t} onOpen={open} showEmptyHint={showEmptyHint} />
                </div>
              ) : anchorStatus.kind !== "open" ? (
                <div className="hidden md:block">
                  <ClosedDayCard date={anchor} status={anchorStatus} rows={dayRows} nextOpen={nextOpenDay(anchor, data.hours, timeOff)} locale={locale} t={t} onGo={setAnchor} onOpen={open} />
                </div>
              ) : (
                <div data-testid="day-layout" className="hidden md:block">
                  <DayTable date={anchor} rows={dayRows} hours={data.hours} timeOff={timeOff} now={now} slotMinutes={data.slotMinutes ?? 30} locale={locale} t={t} onOpen={open} onAdd={(time) => addAt(anchor, time)} onConfirm={confirmRow} showEmptyHint={showEmptyHint} />
                </div>
              )}
              <MobileDay anchor={anchor} onAnchor={setAnchor} onAdd={addAt} onConfirm={confirmRow} slotMinutes={data.slotMinutes ?? 30} rows={matching} hours={data.hours} timeOff={timeOff} now={now} locale={locale} t={t} onOpen={open} showEmptyHint={showEmptyHint} />
              <div className="xl:hidden"><UpNext rows={upNext} today={today} locale={locale} t={t} onOpen={open} /></div>
            </div>
            <aside className="hidden xl:block space-y-4">
              <UpNext rows={upNext} today={today} locale={locale} t={t} onOpen={open} />
              <MiniMonth anchor={anchor} today={today} bookedDates={bookedDates} isBlocked={(d) => !!fullDayOff(d, timeOff)} locale={locale} t={t} onPick={setAnchor} />
            </aside>
          </div>
        )}
      </div>

      {openAppt && data && now && (
        <AppointmentDrawer key={`${openAppt.id}:${drawerMode}`} appt={openAppt} initialMode={drawerMode} today={now.date} nowTime={now.time} locale={locale} t={t} onClose={() => setDrawer(null)} onAction={runAction} />
      )}
      {drawer === "new" && data && now && (
        <NewAppointmentDrawer key={`${newAt?.date}:${newAt?.time}`} services={data.services} today={now.date} initialDate={newAt?.date || now.date} initialTime={newAt?.time} locale={locale} t={t} onClose={() => setDrawer(null)} onCreate={createAppointment} />
      )}
      {drawer === "timeoff" && now && (
        <TimeOffDrawer list={timeOff} today={now.date} locale={locale} t={t} onClose={() => setDrawer(null)} onChanged={load} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
