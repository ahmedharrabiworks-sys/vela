"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import type { OpeningHours } from "@/lib/opening-hours";
import { toTimeText, type DayStatus, type TimeOff } from "@/lib/time-off";
import { buildDayRows, summarizeDay, type BlockReason, type DayRow } from "@/lib/day-rows";
import { HATCH } from "./TimeGrid";
import { ChannelBadge, Icons, StatusPill, dangerBtn, fmtDay, fmtTime, quietBtn, type Appt, type Translate } from "./shared";

const isActive = (a: Appt) => a.status === "pending" || a.status === "confirmed";

function Warning({ t }: { t: Translate }) {
  return <span data-testid="outside-warning" className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">{Icons.warning}{t("appointmentsV2.outsideHours")}</span>;
}

/** Cancelled bookings, only when the owner asks to see them: one muted line inside the slot. */
function CancelledLines({ list, locale, t, onOpen }: { list: Appt[]; locale: string; t: Translate; onOpen: (a: Appt) => void }) {
  if (list.length === 0) return null;
  return (
    <span className="block w-full lg:col-span-7 space-y-0.5 pb-1">
      {list.map((c) => (
        <button key={c.id} type="button" data-testid="day-cancelled" onClick={(e) => { e.stopPropagation(); onOpen(c); }} className="block max-w-full truncate text-start text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
          <span dir="ltr">{fmtTime(c.time, locale)}</span> · {t("appointmentsV2.status.cancelled")} · <span dir="auto">{c.name || t("appointmentsV2.noName")}</span> · <span dir="auto">{c.service}</span>
        </button>
      ))}
    </span>
  );
}

export function DayTable({ date, rows, hours, timeOff, status, nextOpen, now, slotMinutes, locale, t, onOpen, onAdd, onConfirm, onGo, showEmptyHint }: {
  date: string;
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  status: DayStatus;
  nextOpen: string | null;
  now: { date: string; time: string };
  slotMinutes: number;
  locale: string;
  t: Translate;
  onOpen: (a: Appt, mode?: "view" | "reschedule" | "cancel") => void;
  onAdd: (time: string) => void;
  onConfirm: (a: Appt) => void;
  onGo: (date: string) => void;
  showEmptyHint: boolean;
}) {
  const list = useMemo(() => buildDayRows({ date, appts: rows, hours, timeOff, status, now, slotMinutes }), [date, rows, hours, timeOff, status, now, slotMinutes]);
  const counts = summarizeDay(list);
  const closedDay = status.kind !== "open";
  const weekday = fmtDay(date, locale, { weekday: "long" });

  const blockLabel = (reason: BlockReason) => {
    switch (reason.type) {
      case "off": return reason.label || t("appointmentsV2.day.timeOffShort");
      case "break": return t("appointmentsV2.day.break");
      case "closed": return t("appointmentsV2.week.closed");
      case "closedDay": return t("appointmentsV2.day.closedOn").replace("{day}", locale === "en" ? `${weekday}s` : weekday);
      case "offDay": return reason.label ? `${t("appointmentsV2.day.timeOffShort")}: ${reason.label}` : t("appointmentsV2.day.timeOffShort");
    }
  };

  const bookedText = t("appointmentsV2.day.bookedCount").replace("{n}", String(counts.booked));
  const summary = closedDay
    ? [blockLabel(list[0].kind === "blocked" ? list[0].reason : { type: "closedDay" }), ...(counts.booked ? [bookedText] : [])].join(" · ")
    : [
        bookedText,
        t("appointmentsV2.day.freeCount").replace("{n}", String(counts.free)),
        counts.nextFree !== null ? t("appointmentsV2.day.nextFreeAt").replace("{time}", fmtTime(toTimeText(counts.nextFree), locale)) : t("appointmentsV2.day.noFreeLeft"),
      ].join(" · ");
  const table = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLDivElement>, act: () => void) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = Array.from(table.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []).filter((el) => el.offsetParent !== null);
    const i = all.indexOf(e.currentTarget);
    all[Math.max(0, Math.min(all.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };
  const timeCell = (m: number) => <span dir="ltr" className="tabular-nums whitespace-nowrap">{fmtTime(toTimeText(m), locale)}</span>;
  const rowBase = "group outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B35]/50";
  const cols = "lg:grid lg:grid-cols-[88px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_76px_112px_236px] lg:items-center lg:gap-x-3 lg:px-4";

  const renderRow = (r: DayRow<Appt>, i: number) => {
    const zebra = i % 2 === 1 ? "bg-black/[0.018]" : "";
    if (r.kind === "blocked") {
      const wholeDay = r.reason.type === "closedDay" || r.reason.type === "offDay";
      return (
        <div key={`b${r.start}`} data-row tabIndex={0} role="row" data-testid="day-blocked" onKeyDown={(e) => onKey(e, () => {})} className={`${rowBase} px-4 py-2.5 min-h-[44px] text-xs text-[#6B7280] border-b border-black/[0.04]`} style={HATCH}>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span dir="auto" className={wholeDay ? "text-sm font-semibold text-[#374151]" : "font-medium"}>{blockLabel(r.reason)}</span>
            {!wholeDay && <span dir="ltr" className="tabular-nums">{fmtTime(toTimeText(r.start), locale)} {t("appointmentsV2.day.to")} {fmtTime(toTimeText(Math.min(r.end, 24 * 60 - 1)), locale)}</span>}
            {wholeDay && nextOpen && (
              <button type="button" data-testid="go-next-open" onClick={() => onGo(nextOpen)} className="ms-auto inline-flex items-center gap-1 min-h-[32px] text-xs font-semibold text-[#C2410C] hover:underline">
                {t("appointmentsV2.day.nextOpenLink").replace("{date}", fmtDay(nextOpen, locale, { weekday: "short", day: "numeric", month: "short" }))}
                <span className="rtl:rotate-180">{Icons.chevron}</span>
              </button>
            )}
          </span>
          <CancelledLines list={r.cancelled} locale={locale} t={t} onOpen={onOpen} />
        </div>
      );
    }
    if (r.kind === "free" || r.kind === "past") {
      const past = r.kind === "past";
      const label = t("appointmentsV2.day.addAt").replace("{time}", fmtTime(toTimeText(r.start), locale));
      return (
        <div key={`f${r.start}`} data-row tabIndex={past ? -1 : 0} role="row" data-testid={past ? "day-past" : "day-free"} aria-label={past ? undefined : label} aria-disabled={past || undefined}
          onClick={() => !past && onAdd(toTimeText(r.start))} onKeyDown={(e) => onKey(e, () => !past && onAdd(toTimeText(r.start)))}
          className={`${rowBase} ${zebra} flex flex-wrap lg:grid items-center gap-x-3 px-4 min-h-[44px] lg:min-h-[40px] border-b border-black/[0.04] ${cols} ${past ? "text-[#C9CDD3] cursor-default" : "text-[#9CA3AF] cursor-pointer hover:bg-[#FF6B35]/[0.04]"}`}>
          <span className="text-xs w-[72px] lg:w-auto shrink-0">{timeCell(r.start)}</span>
          <span className="text-xs flex-1 lg:col-span-5">{t(past ? "appointmentsV2.day.past" : "appointmentsV2.day.free")}</span>
          {!past && <span className="text-[#C2410C] opacity-60 lg:opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 justify-self-end">{Icons.plus}</span>}
          <CancelledLines list={r.cancelled} locale={locale} t={t} onOpen={onOpen} />
        </div>
      );
    }
    const a = r.appt;
    const warn = closedDay || a.outsideHours;
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
        className={`${rowBase} ${zebra} cursor-pointer border-b border-black/[0.04] px-4 py-2.5 lg:py-1.5 lg:min-h-[44px] ${cols} hover:bg-white/60 text-[#111111]`}>
        {/* Phones: two compact lines and the actions */}
        <div className="lg:hidden space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold min-w-0 truncate">{timeCell(r.start)} · <span dir="auto">{a.name || t("appointmentsV2.noName")}</span></span>
            <StatusPill status={a.status} t={t} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6B7280] min-w-0">
            <ChannelBadge channel={a.channel} t={t} size={18} />
            <span dir="auto" className="truncate">{a.service}</span>
            {a.phone && <span dir="ltr" className="truncate">· {a.phone}</span>}
          </div>
          {warn && <Warning t={t} />}
          {(isActive(a) || a.phone) && actions}
        </div>
        {/* Wide screens: one line per booking */}
        <span role="cell" className="hidden lg:block text-sm font-semibold">{timeCell(r.start)}<span className="block text-[10px] font-normal text-[#9CA3AF]">{t("appointmentsV2.day.to")} {fmtTime(toTimeText(r.end), locale)}</span></span>
        <span role="cell" className="hidden lg:block min-w-0">
          <span dir="auto" className="block text-sm font-semibold truncate">{a.name || t("appointmentsV2.noName")}</span>
          {warn && <Warning t={t} />}
        </span>
        <span role="cell" dir="ltr" className="hidden lg:block text-xs text-[#6B7280] truncate text-start">{a.phone || t("appointmentsV2.noPhone")}</span>
        <span role="cell" dir="auto" className="hidden lg:block text-sm truncate text-start">{a.service}</span>
        <span role="cell" className="hidden lg:block"><ChannelBadge channel={a.channel} t={t} size={22} /></span>
        <span role="cell" className="hidden lg:block"><StatusPill status={a.status} t={t} /></span>
        <span role="cell" className="hidden lg:block">{actions}</span>
        <CancelledLines list={r.cancelled} locale={locale} t={t} onOpen={onOpen} />
      </div>
    );
  };

  return (
    <div data-testid="day-table" data-date={date} className="space-y-2">
      <p data-testid="day-summary" className="text-sm text-[#6B7280] tabular-nums">{summary}</p>
      {showEmptyHint && date === now.date && !closedDay && <p className="text-xs text-[#9CA3AF]">{t("appointmentsV2.aiBooksHere")}</p>}
      <div ref={table} role="table" aria-label={fmtDay(date, locale, { weekday: "long", day: "numeric", month: "long" })} className="glass rounded-2xl">
        <div role="row" className={`hidden ${cols} sticky top-0 z-10 h-10 rounded-t-2xl bg-white/95 border-b border-black/[0.07] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]`}>
          {["time", "customer", "phone", "service", "channel", "status", "actions"].map((c) => <span key={c} role="columnheader" className="truncate">{t(`appointmentsV2.table.${c}`)}</span>)}
        </div>
        {list.map(renderRow)}
      </div>
    </div>
  );
}
