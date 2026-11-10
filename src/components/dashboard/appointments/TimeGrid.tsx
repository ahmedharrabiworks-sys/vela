"use client";

import { useMemo, type CSSProperties } from "react";
import type { OpeningHours } from "@/lib/opening-hours";
import { dayStatus, partialOffs, type TimeOff } from "@/lib/time-off";
import { ChannelBadge, Icons, fmtDay, fmtTime, type Appt, type ApptStatus, type Translate } from "./shared";

const HOUR_PX = 64;
const MIN_BLOCK_PX = 30;
const GUTTER = 52;

export const HATCH: CSSProperties = { background: "repeating-linear-gradient(135deg, rgba(17,17,17,0.035) 0 6px, transparent 6px 12px), rgba(243,244,246,0.7)" };

export const BLOCK_TONE: Record<ApptStatus, string> = {
  confirmed: "bg-[#FFF5F0] border-[#FF6B35] text-[#111111]",
  pending: "bg-amber-50 border-amber-400 text-[#111111]",
  cancelled: "bg-[#F3F4F6] border-[#D1D5DB] text-[#9CA3AF] line-through",
  completed: "bg-[#F3F4F6] border-[#6B7280] text-[#374151]",
  no_show: "bg-rose-50 border-rose-400 text-[#374151]",
};

export const minutesOf = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);

export type Placed = { appt: Appt; lane: number; lanes: number };

/** Bookings that overlap sit side by side. */
export function placeDay(rows: Appt[]): Placed[] {
  const sorted = [...rows].sort((a, b) => a.time.localeCompare(b.time));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const close = () => { for (const p of cluster) p.lanes = laneEnds.length || 1; cluster = []; laneEnds = []; };
  for (const appt of sorted) {
    const start = minutesOf(appt.time);
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

export default function TimeGrid({ days, rows, hours, timeOff, now, locale, t, onOpen, showEmptyHint }: {
  days: string[];
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  now: { date: string; time: string };
  locale: string;
  t: Translate;
  onOpen: (a: Appt) => void;
  showEmptyHint: boolean;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of rows) if (days.includes(a.date)) map.set(a.date, [...(map.get(a.date) ?? []), a]);
    return map;
  }, [rows, days]);

  // Rows run from opening to closing, and always fit every booking shown.
  const { startHour, endHour } = useMemo(() => {
    const opens = hours ? hours.flat().map((w) => w.open) : [];
    const closes = hours ? hours.flat().map((w) => w.close) : [];
    if (opens.length === 0) { opens.push(8 * 60); closes.push(20 * 60); }
    Array.from(byDay.values()).flat().forEach((a) => { opens.push(minutesOf(a.time)); closes.push(minutesOf(a.time) + a.durationMinutes); });
    return { startHour: Math.floor(Math.min(...opens) / 60), endHour: Math.min(24, Math.ceil(Math.max(...closes) / 60)) };
  }, [hours, byDay]);

  const hourMarks = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = (endHour - startHour) * HOUR_PX;
  const y = (m: number) => ((Math.min(Math.max(m, startHour * 60), endHour * 60) - startHour * 60) / 60) * HOUR_PX;
  const windowsFor = (date: string) => (hours ? hours[new Date(`${date}T12:00:00.000Z`).getUTCDay()] : null);
  const columns = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;

  const shutBands = (date: string): Array<[number, number]> => {
    const windows = windowsFor(date);
    if (!windows || windows.length === 0) return [];
    const bands: Array<[number, number]> = [];
    let cursor = startHour * 60;
    for (const w of [...windows].sort((a, b) => a.open - b.open)) {
      if (w.open > cursor) bands.push([cursor, w.open]);
      cursor = Math.max(cursor, w.close);
    }
    if (cursor < endHour * 60) bands.push([cursor, endHour * 60]);
    return bands;
  };
  const nowM = minutesOf(now.time);

  return (
    <div data-testid="schedule-week">
      <div className="grid border-b border-black/[0.06]" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((d) => (
          <div key={d} className={`px-2 py-2.5 text-center border-s border-black/[0.05] ${d === now.date ? "bg-[#FF6B35]/[0.05]" : ""}`}>
            <p className={`text-[11px] font-medium ${d === now.date ? "text-[#C2410C]" : "text-[#6B7280]"}`}>{fmtDay(d, locale, { weekday: "short" })}</p>
            <p className={`text-sm font-bold tabular-nums ${d === now.date ? "text-[#C2410C]" : "text-[#111111]"}`}>{fmtDay(d, locale, { day: "numeric" })}</p>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: columns, height }}>
        <div className="relative">
          {hourMarks.map((h) => (
            <span key={h} dir="ltr" className="absolute end-1.5 text-[10px] text-[#9CA3AF] tabular-nums whitespace-nowrap" style={{ top: y(h * 60) + 3 }}>
              {fmtTime(`${String(h).padStart(2, "0")}:00`, locale).replace(":00", "")}
            </span>
          ))}
        </div>
        {days.map((d) => {
          const status = dayStatus(d, hours, timeOff);
          const blocked = status.kind !== "open";
          const isToday = d === now.date;
          const firstOpen = windowsFor(d)?.[0]?.open ?? startHour * 60;
          const label = status.kind === "off" ? (status.entry.reason || t("appointmentsV2.day.timeOffShort")) : t("appointmentsV2.week.closed");
          return (
            <div
              key={d}
              data-testid={status.kind === "closed" ? "closed-day" : status.kind === "off" ? "time-off-day" : isToday ? "today-column" : undefined}
              className={`relative border-s border-black/[0.05] ${isToday && !blocked ? "bg-[#FF6B35]/[0.035]" : ""}`}
              style={blocked ? HATCH : undefined}
            >
              {hourMarks.map((h) => <div key={h} className="absolute inset-x-0 border-t border-black/[0.045]" style={{ top: y(h * 60) }} />)}
              {shutBands(d).map(([from, to]) => <div key={from} className="absolute inset-x-0 bg-[#F3F4F6]/70" style={{ top: y(from), height: y(to) - y(from) }} />)}
              {!blocked && partialOffs(d, timeOff).map(({ entry, band }) => (
                <div key={entry.id} data-testid="time-off-band" className="absolute inset-x-0 z-[2] overflow-hidden" style={{ ...HATCH, top: y(band.open), height: y(band.close) - y(band.open) }}>
                  <p className="px-1 pt-0.5 text-center text-[10px] font-medium text-[#6B7280] truncate">{entry.reason || t("appointmentsV2.day.timeOffShort")}</p>
                </div>
              ))}
              {blocked && <p dir="auto" className="absolute inset-x-0 top-3 px-1 text-center text-[11px] font-medium text-[#9CA3AF] truncate">{label}</p>}
              {isToday && showEmptyHint && (
                <p data-testid="empty-hint" className="absolute inset-x-0 px-2 text-center text-[11px] leading-snug text-[#9CA3AF]" style={{ top: blocked ? 36 : y(firstOpen) + 14 }}>{t("appointmentsV2.aiBooksHere")}</p>
              )}
              {isToday && nowM >= startHour * 60 && nowM <= endHour * 60 && (
                <div data-testid="now-line" aria-hidden="true" className="absolute inset-x-0 z-[4] h-[1.5px] bg-[#FF6B35]" style={{ top: y(nowM) }}>
                  <span className="absolute -start-1 -top-[3px] w-[7.5px] h-[7.5px] rounded-full bg-[#FF6B35]" />
                </div>
              )}
              {placeDay(byDay.get(d) ?? []).map(({ appt, lane, lanes }) => {
                const name = appt.name || t("appointmentsV2.noName");
                return (
                  <button
                    key={appt.id}
                    type="button"
                    data-testid="schedule-block"
                    onClick={() => onOpen(appt)}
                    title={`${fmtTime(appt.time, locale)} ${name} · ${appt.service}${appt.outsideHours ? ` · ${t("appointmentsV2.outsideHours")}` : ""}`}
                    className={`absolute z-[3] rounded-md border-s-2 px-1.5 py-0.5 text-start overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/50 ${BLOCK_TONE[appt.status] ?? BLOCK_TONE.pending}`}
                    style={{
                      top: y(minutesOf(appt.time)) + 1,
                      height: Math.max(MIN_BLOCK_PX, (appt.durationMinutes / 60) * HOUR_PX - 2),
                      insetInlineStart: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span dir="auto" className="min-w-0 truncate text-[11px] font-semibold leading-[13px]">{name}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        {appt.outsideHours && <span data-testid="outside-warning" className="text-amber-600">{Icons.warning}</span>}
                        <ChannelBadge channel={appt.channel} t={t} size={14} />
                      </span>
                    </span>
                    <span dir="auto" className="block truncate text-[10px] leading-[13px] opacity-75 text-start">{appt.service}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
