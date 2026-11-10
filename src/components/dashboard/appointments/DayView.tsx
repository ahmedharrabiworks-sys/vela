"use client";

import { useMemo } from "react";
import type { OpeningHours } from "@/lib/opening-hours";
import { freeSlots, partialOffs, toTimeText, type DayStatus, type TimeOff } from "@/lib/time-off";
import { BLOCK_TONE, HATCH, minutesOf, placeDay } from "./TimeGrid";
import { ChannelBadge, Icons, StatusPill, fmtDay, fmtTime, type Appt, type Translate } from "./shared";

const HOUR_PX = 112;
const MIN_CARD_PX = 54;
const GUTTER = 52;
const FULL_WARNING_PX = 80;
const SLOT_MINUTES = 30;

const isActive = (a: Appt) => a.status === "pending" || a.status === "confirmed";

function Warning({ t }: { t: Translate }) {
  return <p data-testid="outside-warning" className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">{Icons.warning}{t("appointmentsV2.outsideHours")}</p>;
}

export function DayTimeline({ date, rows, hours, timeOff, now, locale, t, onOpen, onAdd, selectedId, showEmptyHint }: {
  date: string;
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  now: { date: string; time: string };
  locale: string;
  t: Translate;
  onOpen: (a: Appt) => void;
  onAdd: (time: string) => void;
  selectedId: string | null;
  showEmptyHint: boolean;
}) {
  const windows = useMemo(() => (hours ? hours[new Date(`${date}T12:00:00.000Z`).getUTCDay()] : null), [hours, date]);

  // Only this day's working hours, stretched just enough for a stray booking.
  const { startHour, endHour } = useMemo(() => {
    const opens = windows?.length ? windows.map((w) => w.open) : [8 * 60];
    const closes = windows?.length ? windows.map((w) => w.close) : [20 * 60];
    rows.forEach((a) => { opens.push(minutesOf(a.time)); closes.push(minutesOf(a.time) + a.durationMinutes); });
    return { startHour: Math.floor(Math.min(...opens) / 60), endHour: Math.min(24, Math.ceil(Math.max(...closes) / 60)) };
  }, [windows, rows]);

  const hourMarks = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const height = (endHour - startHour) * HOUR_PX;
  const y = (m: number) => ((Math.min(Math.max(m, startHour * 60), endHour * 60) - startHour * 60) / 60) * HOUR_PX;

  const breaks = useMemo(() => {
    if (!windows || windows.length === 0) return [];
    const out: Array<[number, number]> = [];
    let cursor = startHour * 60;
    for (const w of [...windows].sort((a, b) => a.open - b.open)) {
      if (w.open > cursor) out.push([cursor, w.open]);
      cursor = Math.max(cursor, w.close);
    }
    if (cursor < endHour * 60) out.push([cursor, endHour * 60]);
    return out;
  }, [windows, startHour, endHour]);

  const free = freeSlots({ date, hours, timeOff, booked: rows.filter(isActive), now, step: SLOT_MINUTES });
  const nowM = minutesOf(now.time);
  const isToday = date === now.date;

  return (
    <div data-testid="day-timeline" className="grid" style={{ gridTemplateColumns: `${GUTTER}px minmax(0, 1fr)`, height }}>
      <div className="relative">
        {hourMarks.map((h) => (
          <span key={h} dir="ltr" className="absolute end-1.5 text-[10px] text-[#9CA3AF] tabular-nums whitespace-nowrap" style={{ top: y(h * 60) + 4 }}>
            {fmtTime(`${String(h).padStart(2, "0")}:00`, locale).replace(":00", "")}
          </span>
        ))}
      </div>
      <div className="relative border-s border-black/[0.05]">
        {hourMarks.map((h) => <div key={h} className="absolute inset-x-0 border-t border-black/[0.05]" style={{ top: y(h * 60) }} />)}
        {breaks.map(([from, to]) => <div key={from} data-testid="break-band" className="absolute inset-x-0" style={{ ...HATCH, top: y(from), height: y(to) - y(from) }} />)}
        {partialOffs(date, timeOff).map(({ entry, band }) => (
          <div key={entry.id} data-testid="time-off-band" className="absolute inset-x-0 z-[2] flex items-start justify-center overflow-hidden" style={{ ...HATCH, top: y(band.open), height: y(band.close) - y(band.open) }}>
            <p dir="auto" className="pt-1 text-[11px] font-medium text-[#6B7280] truncate">{entry.reason || t("appointmentsV2.day.timeOffShort")}</p>
          </div>
        ))}
        {free.map((slot) => (
          <button key={slot} type="button" data-testid="free-slot" onClick={() => onAdd(slot)} aria-label={t("appointmentsV2.day.addAt").replace("{time}", fmtTime(slot, locale))} className="absolute inset-x-1 z-[1] rounded-md flex items-center justify-center text-[#C2410C] bg-[#FF6B35]/[0.07] opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity" style={{ top: y(minutesOf(slot)) + 1, height: (SLOT_MINUTES / 60) * HOUR_PX - 2 }}>
            {Icons.plus}
          </button>
        ))}
        {isToday && showEmptyHint && <p data-testid="empty-hint" className="absolute inset-x-0 px-2 text-center text-[11px] text-[#9CA3AF] pointer-events-none" style={{ top: y(windows?.[0]?.open ?? startHour * 60) + 14 }}>{t("appointmentsV2.aiBooksHere")}</p>}
        {isToday && nowM >= startHour * 60 && nowM <= endHour * 60 && (
          <div data-testid="now-line" aria-hidden="true" className="absolute inset-x-0 z-[4] h-[1.5px] bg-[#FF6B35] pointer-events-none" style={{ top: y(nowM) }}>
            <span className="absolute -start-1 -top-[3px] w-[7.5px] h-[7.5px] rounded-full bg-[#FF6B35]" />
          </div>
        )}
        {placeDay(rows).map(({ appt, lane, lanes }) => {
          const cardHeight = Math.max(MIN_CARD_PX, (appt.durationMinutes / 60) * HOUR_PX - 3);
          const end = toTimeText(minutesOf(appt.time) + appt.durationMinutes);
          return (
            <button
              key={appt.id}
              type="button"
              data-testid="day-card"
              onClick={() => onOpen(appt)}
              aria-pressed={selectedId === appt.id}
              className={`absolute z-[3] rounded-lg border-s-[3px] px-2.5 py-1.5 text-start overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/50 ${BLOCK_TONE[appt.status] ?? BLOCK_TONE.pending} ${selectedId === appt.id ? "ring-2 ring-[#FF6B35]/50" : ""}`}
              style={{
                top: y(minutesOf(appt.time)) + 1,
                height: cardHeight,
                insetInlineStart: `calc(${(lane / lanes) * 100}% + 4px)`,
                width: `calc(${100 / lanes}% - 8px)`,
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span dir="auto" className="min-w-0 truncate text-[13px] font-semibold leading-[18px]">{appt.name || t("appointmentsV2.noName")}</span>
                <span className="flex items-center gap-1.5 shrink-0 no-underline">
                  {appt.outsideHours && cardHeight < FULL_WARNING_PX && <span data-testid="outside-warning" className="text-amber-600" title={t("appointmentsV2.outsideHours")}>{Icons.warning}</span>}
                  <ChannelBadge channel={appt.channel} t={t} size={18} />
                  <StatusPill status={appt.status} t={t} />
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] leading-[16px] opacity-80 mt-0.5 min-w-0">
                <span dir="ltr" className="tabular-nums whitespace-nowrap">{fmtTime(appt.time, locale)} {t("appointmentsV2.day.to")} {fmtTime(end, locale)}</span>
                {appt.phone && <span dir="ltr" className="truncate">· {appt.phone}</span>}
                <span dir="auto" className="truncate">· {appt.service}</span>
              </span>
              {appt.outsideHours && cardHeight >= FULL_WARNING_PX && <span className="block mt-1"><Warning t={t} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClosedDayCard({ date, status, rows, nextOpen, locale, t, onGo, onOpen }: {
  date: string;
  status: Exclude<DayStatus, { kind: "open" }>;
  rows: Appt[];
  nextOpen: string | null;
  locale: string;
  t: Translate;
  onGo: (date: string) => void;
  onOpen: (a: Appt) => void;
}) {
  const weekday = fmtDay(date, locale, { weekday: "long" });
  const title = status.kind === "closed"
    ? t("appointmentsV2.day.closedOn").replace("{day}", locale === "en" ? `${weekday}s` : weekday)
    : status.entry.reason ? `${t("appointmentsV2.day.timeOffShort")}: ${status.entry.reason}` : t("appointmentsV2.day.timeOffShort");
  return (
    <div data-testid="closed-card" className="space-y-4 max-w-xl mx-auto w-full py-6">
      <div className="glass rounded-2xl px-6 py-9 flex flex-col items-center text-center">
        <p dir="auto" className="text-base font-bold text-[#111111]">{title}</p>
        {nextOpen && (
          <button type="button" data-testid="go-next-open" onClick={() => onGo(nextOpen)} className="btn-primary h-11 px-5 text-sm mt-4">
            {t("appointmentsV2.day.goTo").replace("{date}", fmtDay(nextOpen, locale, { weekday: "short", day: "numeric", month: "short" }))}
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <ul className="glass rounded-2xl divide-y divide-black/[0.06] overflow-hidden">
          {[...rows].sort((a, b) => a.time.localeCompare(b.time)).map((a) => (
            <li key={a.id}>
              <button type="button" data-testid="closed-day-row" onClick={() => onOpen(a)} className="w-full min-h-[60px] px-4 py-3 text-start hover:bg-white/50 transition-colors">
                <span className="flex items-center justify-between gap-2">
                  <span dir="auto" className="min-w-0 truncate text-sm font-semibold text-[#111111]">{a.name || t("appointmentsV2.noName")}</span>
                  <StatusPill status={a.status} t={t} />
                </span>
                <span className="block text-xs text-[#6B7280] mt-0.5"><span dir="ltr">{fmtTime(a.time, locale)}</span> · <span dir="auto">{a.service}</span></span>
                {a.outsideHours && <span className="block mt-1"><Warning t={t} /></span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DaySummary({ date, rows, hours, timeOff, now, locale, t }: {
  date: string;
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  now: { date: string; time: string };
  locale: string;
  t: Translate;
}) {
  const active = rows.filter(isActive);
  const free = freeSlots({ date, hours, timeOff, booked: active, now, step: SLOT_MINUTES });
  const tiles = [
    { label: t("appointmentsV2.day.booked"), value: String(active.length), id: "booked" },
    { label: t("appointmentsV2.day.freeLeft"), value: String(free.length), id: "free" },
    { label: t("appointmentsV2.day.nextFree"), value: free[0] ? fmtTime(free[0], locale) : t("appointmentsV2.day.noneFree"), id: "next" },
  ];
  return (
    <div data-testid="day-summary" className="space-y-4">
      <h2 className="text-sm font-bold text-[#111111]">{fmtDay(date, locale, { weekday: "long", day: "numeric", month: "long" })}</h2>
      {tiles.map((x) => (
        <div key={x.id}>
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{x.label}</p>
          <p data-testid={`summary-${x.id}`} dir={x.id === "next" ? "ltr" : undefined} className="text-[22px] font-bold text-[#111111] leading-none tabular-nums text-start">{x.value}</p>
        </div>
      ))}
    </div>
  );
}
