"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { OpeningHours } from "@/lib/opening-hours";
import { ChannelBadge, Icons, StatusPill, addDays, fmtDay, fmtTime, quietBtn, weekStartOf, type Appt, type ApptStatus, type Translate } from "./shared";

const HOUR_PX = 56;
const MIN_BLOCK_PX = 30;

const BLOCK_TONE: Record<ApptStatus, string> = {
  confirmed: "bg-[#FFF5F0] border-[#FF6B35] text-[#111111]",
  pending: "bg-amber-50 border-amber-400 text-[#111111]",
  cancelled: "bg-[#F3F4F6] border-[#D1D5DB] text-[#9CA3AF] line-through",
  completed: "bg-[#F3F4F6] border-[#6B7280] text-[#374151]",
  no_show: "bg-rose-50 border-rose-400 text-[#374151]",
};

const minutes = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);

type Placed = { appt: Appt; lane: number; lanes: number };

/** Side by side when bookings overlap. */
function placeDay(rows: Appt[]): Placed[] {
  const sorted = [...rows].sort((a, b) => a.time.localeCompare(b.time));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const close = () => { for (const p of cluster) p.lanes = laneEnds.length || 1; cluster = []; laneEnds = []; };
  for (const appt of sorted) {
    const start = minutes(appt.time);
    if (start >= clusterEnd) { close(); clusterEnd = -1; }
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = start + appt.durationMinutes;
    const p = { appt, lane, lanes: 1 };
    cluster.push(p);
    placed.push(p);
    clusterEnd = Math.max(clusterEnd, start + appt.durationMinutes);
  }
  close();
  return placed;
}

export default function WeekView({ rows, hours, now, locale, t, onOpen }: {
  rows: Appt[];
  hours: OpeningHours | null;
  now: { date: string; time: string };
  locale: string;
  t: Translate;
  onOpen: (a: Appt) => void;
}) {
  const [anchor, setAnchor] = useState(() => weekStartOf(now.date));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);
  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of rows) if (days.includes(a.date)) map.set(a.date, [...(map.get(a.date) ?? []), a]);
    return map;
  }, [rows, days]);

  // The visible range follows the opening hours, and always fits every booking.
  const { startHour, endHour } = useMemo(() => {
    const opens = hours ? hours.flat().map((w) => w.open) : [8 * 60];
    const closes = hours ? hours.flat().map((w) => w.close) : [20 * 60];
    Array.from(byDay.values()).flat().forEach((a) => { opens.push(minutes(a.time)); closes.push(minutes(a.time) + a.durationMinutes); });
    return {
      startHour: Math.floor(Math.min(...(opens.length ? opens : [8 * 60])) / 60),
      endHour: Math.min(24, Math.ceil(Math.max(...(closes.length ? closes : [20 * 60])) / 60)),
    };
  }, [hours, byDay]);
  const hourMarks = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_PX;
  const y = (m: number) => ((m - startHour * 60) / 60) * HOUR_PX;

  const windowsFor = (date: string) => (hours ? hours[new Date(`${date}T12:00:00.000Z`).getUTCDay()] : null);
  const isClosed = (date: string) => windowsFor(date)?.length === 0;

  // Hours inside the range where this day is shut.
  const shutBands = (date: string) => {
    const windows = windowsFor(date);
    if (!windows || windows.length === 0) return [];
    const sorted = [...windows].sort((a, b) => a.open - b.open);
    const bands: Array<[number, number]> = [];
    let cursor = startHour * 60;
    for (const w of sorted) { if (w.open > cursor) bands.push([cursor, w.open]); cursor = Math.max(cursor, w.close); }
    if (cursor < endHour * 60) bands.push([cursor, endHour * 60]);
    return bands;
  };

  const rangeLabel = `${fmtDay(days[0], locale, { day: "numeric", month: "short" })} · ${fmtDay(days[6], locale, { day: "numeric", month: "short" })}`;
  const isThisWeek = anchor === weekStartOf(now.date);

  // Phones: one day at a time, swipe sideways.
  const scroller = useRef<HTMLDivElement>(null);
  const panels = useRef<Array<HTMLDivElement | null>>([]);
  const [activeDay, setActiveDay] = useState(0);
  const jumpTo = (i: number, smooth = true) => {
    const box = scroller.current, panel = panels.current[i];
    if (!box || !panel) return;
    const offset = panel.getBoundingClientRect().left - box.getBoundingClientRect().left;
    box.scrollBy({ left: offset, behavior: smooth ? "smooth" : "auto" });
    setActiveDay(i);
  };
  useEffect(() => {
    const i = days.indexOf(now.date);
    jumpTo(i >= 0 ? i : 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);
  const onSwipe = () => {
    const box = scroller.current;
    if (box && box.clientWidth > 0) setActiveDay(Math.round(Math.abs(box.scrollLeft) / box.clientWidth));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setAnchor(addDays(anchor, -7))} aria-label={t("appointmentsV2.week.previous")} className={`${quietBtn} h-11 w-11 md:h-9 md:w-9`}><span className="rotate-180 rtl:rotate-0">{Icons.chevron}</span></button>
          <button type="button" onClick={() => setAnchor(addDays(anchor, 7))} aria-label={t("appointmentsV2.week.next")} className={`${quietBtn} h-11 w-11 md:h-9 md:w-9`}><span className="rtl:rotate-180">{Icons.chevron}</span></button>
          {!isThisWeek && <button type="button" onClick={() => setAnchor(weekStartOf(now.date))} className={`${quietBtn} h-11 md:h-9 px-3`}>{t("appointmentsV2.week.thisWeek")}</button>}
        </div>
        <p className="text-sm font-semibold text-[#111111] tabular-nums">{rangeLabel}</p>
      </div>

      {!hours && (
        <p className="text-xs text-[#6B7280] leading-relaxed">
          {t("appointmentsV2.week.noHours")}{" "}
          <Link href="/app/ai-agent/knowledge-base" className="font-semibold text-[#C2410C] hover:underline">{t("appointmentsV2.week.addHours")}</Link>
        </p>
      )}

      {/* Desktop grid */}
      <div data-testid="week-grid" className="hidden md:block glass rounded-2xl overflow-hidden">
        <div className="grid border-b border-black/[0.06]" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
          <div />
          {days.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center border-s border-black/[0.05]">
              <p className={`text-[11px] font-medium ${d === now.date ? "text-[#C2410C]" : "text-[#6B7280]"}`}>{fmtDay(d, locale, { weekday: "short" })}</p>
              <p className={`text-sm font-bold tabular-nums ${d === now.date ? "text-[#C2410C]" : "text-[#111111]"}`}>{fmtDay(d, locale, { day: "numeric" })}</p>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))", height: gridHeight }}>
          <div className="relative">
            {hourMarks.map((h) => (
              <span key={h} dir="ltr" className="absolute end-2 text-[10px] text-[#9CA3AF] tabular-nums whitespace-nowrap" style={{ top: y(h * 60) + 3 }}>{fmtTime(`${String(h).padStart(2, "0")}:00`, locale).replace(":00", "")}</span>
            ))}
          </div>
          {days.map((d) => {
            const closed = isClosed(d);
            return (
              <div key={d} data-testid={closed ? "closed-day" : undefined} className="relative border-s border-black/[0.05]" style={closed ? { background: "repeating-linear-gradient(135deg, rgba(17,17,17,0.035) 0 6px, transparent 6px 12px), rgba(243,244,246,0.75)" } : undefined}>
                {hourMarks.map((h) => <div key={h} className="absolute inset-x-0 border-t border-black/[0.045]" style={{ top: y(h * 60) }} />)}
                {shutBands(d).map(([from, to]) => <div key={from} className="absolute inset-x-0 bg-[#F3F4F6]/75" style={{ top: y(from), height: y(to) - y(from) }} />)}
                {closed && <p className="absolute inset-x-0 top-3 text-center text-[11px] font-medium text-[#9CA3AF]">{t("appointmentsV2.week.closed")}</p>}
                {d === now.date && minutes(now.time) >= startHour * 60 && minutes(now.time) <= endHour * 60 && (
                  <div aria-hidden="true" className="absolute inset-x-0 z-[2] h-px bg-[#FF6B35]" style={{ top: y(minutes(now.time)) }} />
                )}
                {placeDay(byDay.get(d) ?? []).map(({ appt, lane, lanes }) => (
                  <button
                    key={appt.id}
                    type="button"
                    data-testid="week-block"
                    onClick={() => onOpen(appt)}
                    title={`${fmtTime(appt.time, locale)} ${appt.name} · ${appt.service}`}
                    className={`absolute z-[3] rounded-md border-s-2 px-1.5 py-1 text-start overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/50 ${BLOCK_TONE[appt.status] ?? BLOCK_TONE.pending}`}
                    style={{
                      top: y(minutes(appt.time)) + 1,
                      height: Math.max(MIN_BLOCK_PX, (appt.durationMinutes / 60) * HOUR_PX - 2),
                      insetInlineStart: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  >
                    <p dir="ltr" className="text-[10px] font-semibold tabular-nums leading-tight text-start">{fmtTime(appt.time, locale)}</p>
                    <p dir="auto" className="text-[11px] font-semibold leading-tight truncate text-start">{appt.name || t("appointmentsV2.noName")}</p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phones: day by day */}
      <div className="md:hidden space-y-3">
        <div className="grid grid-cols-7 gap-1" role="tablist" aria-label={t("appointmentsV2.views.week")}>
          {days.map((d, i) => (
            <button key={d} type="button" role="tab" aria-selected={i === activeDay} onClick={() => jumpTo(i)} className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center transition-colors ${i === activeDay ? "text-white" : isClosed(d) ? "text-[#9CA3AF]" : "text-[#374151] bg-white/60"}`} style={i === activeDay ? { background: "var(--vela-gradient)" } : undefined}>
              <span className="text-[10px] font-medium leading-tight">{fmtDay(d, locale, { weekday: "narrow" })}</span>
              <span className="text-sm font-bold tabular-nums leading-tight">{fmtDay(d, locale, { day: "numeric" })}</span>
            </button>
          ))}
        </div>
        <div ref={scroller} onScroll={onSwipe} data-testid="week-swipe" className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
          {days.map((d, i) => {
            const list = [...(byDay.get(d) ?? [])].sort((a, b) => a.time.localeCompare(b.time));
            return (
              <div key={d} ref={(el) => { panels.current[i] = el; }} className="w-full shrink-0 snap-start">
                <div className="glass rounded-2xl overflow-hidden">
                  <p className="px-4 py-3 text-sm font-bold text-[#111111] border-b border-black/[0.06]">{fmtDay(d, locale, { weekday: "long", day: "numeric", month: "long" })}</p>
                  {list.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-[#9CA3AF]">{isClosed(d) ? t("appointmentsV2.week.closed") : t("appointmentsV2.week.nothingBooked")}</p>
                  ) : (
                    <ul className="divide-y divide-black/[0.06]">
                      {list.map((a) => (
                        <li key={a.id}>
                          <button type="button" onClick={() => onOpen(a)} className="w-full min-h-[60px] flex items-center gap-3 px-4 py-3 text-start">
                            <span dir="ltr" className="text-sm font-bold text-[#111111] tabular-nums w-[68px] shrink-0 text-start">{fmtTime(a.time, locale)}</span>
                            <span className="flex-1 min-w-0">
                              <span dir="auto" className="block text-sm font-semibold text-[#111111] truncate text-start">{a.name || t("appointmentsV2.noName")}</span>
                              <span dir="auto" className="block text-xs text-[#6B7280] truncate text-start">{a.service}</span>
                            </span>
                            <ChannelBadge channel={a.channel} t={t} size={22} />
                            <StatusPill status={a.status} t={t} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
