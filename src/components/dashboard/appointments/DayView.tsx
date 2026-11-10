"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import type { OpeningHours } from "@/lib/opening-hours";
import { partialOffs, toMinutes, toTimeText, type DayStatus, type TimeOff } from "@/lib/time-off";
import { HATCH } from "./TimeGrid";
import { ChannelBadge, Icons, StatusPill, dangerBtn, fmtDay, fmtTime, quietBtn, type Appt, type Translate } from "./shared";

const isActive = (a: Appt) => a.status === "pending" || a.status === "confirmed";
const UNKNOWN_HOURS = [{ open: 8 * 60, close: 20 * 60 }];

function Warning({ t }: { t: Translate }) {
  return <span data-testid="outside-warning" className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">{Icons.warning}{t("appointmentsV2.outsideHours")}</span>;
}

type Row =
  | { kind: "booked"; start: number; appt: Appt }
  | { kind: "free"; start: number; past: boolean }
  | { kind: "blocked"; start: number; end: number; label: string };

/** Every bookable slot of one day, plus bookings and merged blocked periods, in time order. */
function buildRows(p: { date: string; rows: Appt[]; hours: OpeningHours | null; timeOff: TimeOff[]; now: { date: string; time: string }; slotMinutes: number; t: Translate; locale: string }): Row[] {
  const windows = p.hours ? p.hours[new Date(`${p.date}T12:00:00.000Z`).getUTCDay()] : UNKNOWN_HOURS;
  const offs = partialOffs(p.date, p.timeOff);
  const starts = [...windows.map((w) => w.open), ...p.rows.map((a) => toMinutes(a.time))];
  const ends = [...windows.map((w) => w.close), ...p.rows.map((a) => toMinutes(a.time) + a.durationMinutes)];
  if (starts.length === 0) return [];
  const first = Math.min(...starts), last = Math.min(24 * 60, Math.max(...ends));

  const reasonAt = (m: number): { key: string; label: string } | null => {
    const off = offs.find(({ band }) => m >= band.open && m < band.close);
    if (off) return { key: `off:${off.entry.id}`, label: off.entry.reason || p.t("appointmentsV2.day.timeOffShort") };
    if (windows.some((w) => m >= w.open && m < w.close)) return null;
    const between = m > Math.min(...windows.map((w) => w.open)) && m < Math.max(...windows.map((w) => w.close));
    return between ? { key: "break", label: p.t("appointmentsV2.day.break") } : { key: "closed", label: p.t("appointmentsV2.week.closed") };
  };
  const covered = (m: number) => p.rows.some((a) => isActive(a) && m < toMinutes(a.time) + a.durationMinutes && toMinutes(a.time) < m + p.slotMinutes);

  const out: Row[] = [];
  let open: { key: string; label: string; start: number } | null = null;
  const closeBlock = (end: number) => {
    if (open) out.push({ kind: "blocked", start: open.start, end, label: open.label });
    open = null;
  };
  for (let m = first; m < last; m += p.slotMinutes) {
    const reason = reasonAt(m);
    if (reason) {
      if (open && open.key !== reason.key) closeBlock(m);
      if (!open) open = { ...reason, start: m };
      continue;
    }
    closeBlock(m);
    const fitsWindow = windows.some((w) => m >= w.open && m + p.slotMinutes <= w.close);
    if (fitsWindow && !covered(m)) out.push({ kind: "free", start: m, past: `${p.date}T${toTimeText(m)}` < `${p.now.date}T${p.now.time}` });
  }
  closeBlock(last);
  for (const appt of p.rows) out.push({ kind: "booked", start: toMinutes(appt.time), appt });
  return out.sort((a, b) => a.start - b.start || (a.kind === "booked" ? -1 : b.kind === "booked" ? 1 : 0));
}

export function DayTable({ date, rows, hours, timeOff, now, slotMinutes, locale, t, onOpen, onAdd, onConfirm, showEmptyHint }: {
  date: string;
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  now: { date: string; time: string };
  slotMinutes: number;
  locale: string;
  t: Translate;
  onOpen: (a: Appt, mode?: "view" | "reschedule" | "cancel") => void;
  onAdd: (time: string) => void;
  onConfirm: (a: Appt) => void;
  showEmptyHint: boolean;
}) {
  const list = useMemo(() => buildRows({ date, rows, hours, timeOff, now, slotMinutes, t, locale }), [date, rows, hours, timeOff, now, slotMinutes, t, locale]);
  const free = list.filter((r): r is Extract<Row, { kind: "free" }> => r.kind === "free" && !r.past);
  const booked = rows.filter(isActive).length;
  const summary = [
    t("appointmentsV2.day.bookedCount").replace("{n}", String(booked)),
    t("appointmentsV2.day.freeCount").replace("{n}", String(free.length)),
    free[0] ? t("appointmentsV2.day.nextFreeAt").replace("{time}", fmtTime(toTimeText(free[0].start), locale)) : t("appointmentsV2.day.noFreeLeft"),
  ].join(" · ");
  const table = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLDivElement>, act: () => void) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = Array.from(table.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []).filter((el) => el.offsetParent !== null);
    const i = all.indexOf(e.currentTarget);
    all[Math.max(0, Math.min(all.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };
  const timeCell = (m: number) => <span dir="ltr" className="tabular-nums whitespace-nowrap">{fmtTime(toTimeText(m), locale)}</span>;
  const rowBase = "group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B35]/50";
  const cols = "lg:grid lg:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_76px_112px_236px] lg:items-center lg:gap-3 lg:px-4";

  return (
    <div data-testid="day-table" className="space-y-2">
      <p data-testid="day-summary" className="text-sm text-[#6B7280] tabular-nums">{summary}</p>
      {showEmptyHint && date === now.date && <p className="text-xs text-[#9CA3AF]">{t("appointmentsV2.aiBooksHere")}</p>}
      <div ref={table} role="table" aria-label={fmtDay(date, locale, { weekday: "long", day: "numeric", month: "long" })} className="glass rounded-2xl">
        <div role="row" className={`hidden ${cols} sticky top-0 z-10 h-10 rounded-t-2xl bg-white/95 border-b border-black/[0.07] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]`}>
          {["time", "customer", "phone", "service", "channel", "status", "actions"].map((c) => <span key={c} role="columnheader" className="truncate">{t(`appointmentsV2.table.${c}`)}</span>)}
        </div>
        {list.map((r, i) => {
          const zebra = i % 2 === 1 ? "bg-black/[0.018]" : "";
          if (r.kind === "blocked") {
            return (
              <div key={`b${r.start}`} data-row tabIndex={0} role="row" data-testid="day-blocked" onKeyDown={(e) => onKey(e, () => {})} className={`${rowBase} flex items-center gap-3 px-4 min-h-[40px] text-xs text-[#6B7280] border-b border-black/[0.04]`} style={HATCH}>
                <span dir="auto" className="font-medium">{r.label}</span>
                <span dir="ltr" className="tabular-nums">{fmtTime(toTimeText(r.start), locale)} {t("appointmentsV2.day.to")} {fmtTime(toTimeText(r.end), locale)}</span>
              </div>
            );
          }
          if (r.kind === "free") {
            const label = t("appointmentsV2.day.addAt").replace("{time}", fmtTime(toTimeText(r.start), locale));
            return (
              <div key={`f${r.start}`} data-row tabIndex={r.past ? -1 : 0} role="row" data-testid="day-free" aria-label={r.past ? undefined : label} aria-disabled={r.past || undefined}
                onClick={() => !r.past && onAdd(toTimeText(r.start))} onKeyDown={(e) => onKey(e, () => !r.past && onAdd(toTimeText(r.start)))}
                className={`${rowBase} ${zebra} flex lg:grid items-center gap-3 px-4 lg:px-4 min-h-[44px] lg:min-h-[40px] border-b border-black/[0.04] ${cols} ${r.past ? "text-[#D1D5DB]" : "text-[#9CA3AF] cursor-pointer hover:bg-[#FF6B35]/[0.04]"}`}>
                <span className="text-xs w-[72px] lg:w-auto shrink-0">{timeCell(r.start)}</span>
                <span className="text-xs flex-1 lg:col-span-5">{t("appointmentsV2.day.free")}</span>
                {!r.past && <span className="text-[#C2410C] opacity-60 lg:opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 justify-self-end">{Icons.plus}</span>}
              </div>
            );
          }
          const a = r.appt;
          const end = toTimeText(toMinutes(a.time) + a.durationMinutes);
          const actions = (
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 lg:justify-end lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {a.status === "pending" && <button type="button" onClick={() => onConfirm(a)} className={`${quietBtn} h-11 lg:h-8 px-2.5 !text-green-700 basis-full lg:basis-auto lg:flex-none`}>{Icons.check}<span>{t("appointmentsV2.actions.confirm")}</span></button>}
              {isActive(a) && <button type="button" onClick={() => onOpen(a, "reschedule")} className={`${quietBtn} h-11 lg:h-8 px-2.5 flex-1 lg:flex-none`} title={t("appointmentsV2.actions.reschedule")} aria-label={t("appointmentsV2.actions.reschedule")}>{Icons.clock}<span className="lg:hidden">{t("appointmentsV2.actions.reschedule")}</span></button>}
              {isActive(a) && <button type="button" onClick={() => onOpen(a, "cancel")} className={`${dangerBtn} h-11 lg:h-8 px-2.5 flex-1 lg:flex-none`} title={t("appointmentsV2.actions.cancel")} aria-label={t("appointmentsV2.actions.cancel")}>{Icons.close}<span className="lg:hidden">{t("appointmentsV2.actions.cancel")}</span></button>}
              {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className={`${quietBtn} h-11 lg:h-8 px-2.5 flex-1 lg:flex-none`} title={t("appointmentsV2.actions.call")} aria-label={t("appointmentsV2.actions.call")}>{Icons.phone}<span className="lg:hidden">{t("appointmentsV2.actions.call")}</span></a>}
            </div>
          );
          return (
            <div key={a.id} data-row tabIndex={0} role="row" data-testid="day-booked" onClick={() => onOpen(a)} onKeyDown={(e) => onKey(e, () => onOpen(a))}
              className={`${rowBase} ${zebra} cursor-pointer border-b border-black/[0.04] px-4 py-2.5 lg:py-0 lg:min-h-[44px] ${cols} hover:bg-white/60 ${a.status === "cancelled" ? "text-[#9CA3AF]" : "text-[#111111]"}`}>
              {/* Phones: two compact lines and the actions */}
              <div className="lg:hidden space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold min-w-0 truncate">{timeCell(toMinutes(a.time))} · <span dir="auto">{a.name || t("appointmentsV2.noName")}</span></span>
                  <StatusPill status={a.status} t={t} />
                </div>
                <div className="flex items-center gap-2 text-xs text-[#6B7280] min-w-0">
                  <ChannelBadge channel={a.channel} t={t} size={18} />
                  <span dir="auto" className="truncate">{a.service}</span>
                  {a.phone && <span dir="ltr" className="truncate">· {a.phone}</span>}
                </div>
                {a.outsideHours && <Warning t={t} />}
                {(isActive(a) || a.phone) && actions}
              </div>
              {/* Wide screens: one line per booking */}
              <span role="cell" className="hidden lg:block text-sm font-semibold">{timeCell(toMinutes(a.time))}<span className="block text-[10px] font-normal text-[#9CA3AF]">{t("appointmentsV2.day.to")} {fmtTime(end, locale)}</span></span>
              <span role="cell" className="hidden lg:block min-w-0">
                <span dir="auto" className="block text-sm font-semibold truncate">{a.name || t("appointmentsV2.noName")}</span>
                {a.outsideHours && <Warning t={t} />}
              </span>
              <span role="cell" dir="ltr" className="hidden lg:block text-xs text-[#6B7280] truncate text-start">{a.phone || t("appointmentsV2.noPhone")}</span>
              <span role="cell" dir="auto" className="hidden lg:block text-sm truncate text-start">{a.service}</span>
              <span role="cell" className="hidden lg:block"><ChannelBadge channel={a.channel} t={t} size={22} /></span>
              <span role="cell" className="hidden lg:block"><StatusPill status={a.status} t={t} /></span>
              <span role="cell" className="hidden lg:block">{actions}</span>
            </div>
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
