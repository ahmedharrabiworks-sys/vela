"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { HATCH } from "./TimeGrid";
import { ChannelBadge, Icons, WeekStartContext, addDays, dayHeading, fmtDay, fmtTime, inputCls, labelCls, quietBtn, weekStartOf, type Appt, type ApptChannel, type ApptStatus, type Translate } from "./shared";

const NO_DATES = new Set<string>();
const NEVER = () => false;

/** A date field whose calendar starts the week where the business does (native pickers can't). */
export function DateField({ id, value, min, onChange, today, locale, t }: { id: string; value: string; min?: string; onChange: (date: string) => void; today: string; locale: string; t: Translate }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc, true); };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button id={id} type="button" data-testid={`${id}-field`} data-value={value} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`${inputCls} flex items-center justify-between gap-2 text-start`}>
        <span className={value ? "" : "text-[#9CA3AF]"}>{value ? fmtDay(value, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : t("appointmentsV2.form.pickDate")}</span>
        <span className="text-[#9CA3AF]">{Icons.calendar}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={t("appointmentsV2.form.pickDate")} className="mt-1.5 w-full max-w-[320px] rounded-xl border border-black/[0.08] bg-white shadow-sm p-3">
          <MiniMonth bare anchor={value} today={today} min={min} bookedDates={NO_DATES} isBlocked={NEVER} locale={locale} t={t} onPick={(d) => { onChange(d); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

export function UpNext({ rows, today, locale, t, onOpen }: { rows: Appt[]; today: string; locale: string; t: Translate; onOpen: (a: Appt) => void }) {
  return (
    <section className="glass rounded-2xl p-4" aria-label={t("appointmentsV2.upNext.title")}>
      <h2 className="text-sm font-bold text-[#111111] mb-2.5">{t("appointmentsV2.upNext.title")}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-[#9CA3AF] py-1">{t("appointmentsV2.upNext.nothing")}</p>
      ) : (
        <ul className="-mx-1.5">
          {rows.map((a) => (
            <li key={a.id}>
              <button type="button" data-testid="up-next-row" onClick={() => onOpen(a)} className="w-full min-h-[52px] flex items-center gap-2.5 rounded-lg px-1.5 py-2 text-start hover:bg-black/[0.03] transition-colors">
                <span className="flex-1 min-w-0">
                  <span dir="auto" className="block text-[13px] font-semibold text-[#111111] truncate text-start">{a.name || t("appointmentsV2.noName")}</span>
                  <span className="block text-[11px] text-[#6B7280] truncate">
                    {dayHeading(a.date, today, locale, t)} · <span dir="ltr">{fmtTime(a.time, locale)}</span> · <span dir="auto">{a.service}</span>
                  </span>
                </span>
                <ChannelBadge channel={a.channel} t={t} size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MiniMonth({ anchor, today, bookedDates, isBlocked, locale, t, onPick, min, bare = false }: { anchor: string; today: string; bookedDates: Set<string>; isBlocked: (date: string) => boolean; locale: string; t: Translate; onPick: (date: string) => void; min?: string; bare?: boolean }) {
  const weekStart = useContext(WeekStartContext);
  const [month, setMonth] = useState((anchor || today).slice(0, 7));
  useEffect(() => setMonth((anchor || today).slice(0, 7)), [anchor, today]);

  const shift = (n: number) => {
    const d = new Date(`${month}-15T12:00:00.000Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const start = weekStartOf(first, weekStart);
    const out: string[] = [];
    for (let i = 0; i < 42; i++) out.push(addDays(start, i));
    // Drop a last row that belongs entirely to the next month.
    return out[35].slice(0, 7) === month ? out : out.slice(0, 35);
  }, [month, weekStart]);

  const headers = cells.slice(0, 7).map((d) => fmtDay(d, locale, { weekday: "narrow" }));

  return (
    <section data-testid="mini-month" data-week-start={weekStart} className={bare ? "" : "glass rounded-2xl p-4"} aria-label={t("appointmentsV2.month.title")}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-bold text-[#111111]">{fmtDay(`${month}-15`, locale, { month: "long", year: "numeric" })}</h2>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => shift(-1)} aria-label={t("appointmentsV2.month.previous")} className={`${bare ? "h-10 w-10" : "h-7 w-7"} rounded-md flex items-center justify-center text-[#6B7280] hover:bg-black/[0.04]`}><span className="rotate-180 rtl:rotate-0">{Icons.chevron}</span></button>
          <button type="button" onClick={() => shift(1)} aria-label={t("appointmentsV2.month.next")} className={`${bare ? "h-10 w-10" : "h-7 w-7"} rounded-md flex items-center justify-center text-[#6B7280] hover:bg-black/[0.04]`}><span className="rtl:rotate-180">{Icons.chevron}</span></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {headers.map((h, i) => <span key={i} className="text-[10px] font-medium text-[#9CA3AF] pb-1">{h}</span>)}
        {cells.map((d) => {
          const selected = d === anchor, isToday = d === today, inMonth = d.slice(0, 7) === month, booked = bookedDates.has(d), blocked = isBlocked(d);
          const tooEarly = !!min && d < min;
          return (
            <button
              key={d}
              type="button"
              disabled={tooEarly}
              onClick={() => onPick(d)}
              aria-label={fmtDay(d, locale, { weekday: "long", day: "numeric", month: "long" })}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={selected}
              data-blocked={blocked ? "true" : undefined}
              className={`relative mx-auto ${bare ? "h-10 w-10" : "h-8 w-8"} rounded-lg text-xs tabular-nums transition-colors disabled:opacity-30 disabled:pointer-events-none ${selected ? "text-white font-semibold" : blocked ? "text-[#9CA3AF] line-through" : isToday ? "text-[#C2410C] font-bold" : inMonth ? "text-[#374151] hover:bg-black/[0.04]" : "text-[#D1D5DB] hover:bg-black/[0.04]"}`}
              style={selected ? { background: "var(--vela-gradient)" } : blocked ? HATCH : undefined}
            >
              {fmtDay(d, locale, { day: "numeric" })}
              {booked && <span data-testid="booked-dot" aria-hidden="true" className={`absolute bottom-[3px] start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-1 h-1 rounded-full ${selected ? "bg-white" : "bg-[#FF6B35]"}`} />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const STATUSES: ApptStatus[] = ["confirmed", "pending", "completed", "no_show", "cancelled"];

export function FilterPopover({ search, setSearch, status, setStatus, channel, setChannel, channels, showCancelled, setShowCancelled, t }: {
  search: string;
  setSearch: (v: string) => void;
  status: ApptStatus | "all";
  setStatus: (v: ApptStatus | "all") => void;
  channel: ApptChannel | "all";
  setChannel: (v: ApptChannel | "all") => void;
  channels: ApptChannel[];
  showCancelled: boolean;
  setShowCancelled: (v: boolean) => void;
  t: Translate;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = (search.trim() ? 1 : 0) + (status !== "all" ? 1 : 0) + (channel !== "all" ? 1 : 0) + (showCancelled ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button type="button" data-testid="filter-button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t("appointmentsV2.filter.button")} title={t("appointmentsV2.filter.button")} className={`${quietBtn} relative h-11 w-11 md:h-10 md:w-10 ${active ? "!border-[#FF6B35] !text-[#C2410C]" : ""}`}>
        {Icons.filter}
        {active > 0 && <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B35] text-[10px] font-bold leading-4 text-white">{active}</span>}
      </button>
      {open && (
        <div data-testid="filter-panel" className="z-40 md:absolute md:end-0 md:top-full md:mt-2 md:w-[300px] max-md:fixed max-md:inset-x-4 max-md:top-[128px] rounded-xl border border-black/[0.08] bg-white shadow-xl p-3.5 space-y-3">
          <div>
            <label htmlFor="appt-search" className={labelCls}>{t("appointmentsV2.filter.search")}</label>
            <input id="appt-search" type="search" dir="auto" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("appointmentsV2.search")} className={inputCls} />
          </div>
          <div>
            <label htmlFor="appt-status" className={labelCls}>{t("appointmentsV2.filter.status")}</label>
            <select id="appt-status" value={status} onChange={(e) => setStatus(e.target.value as ApptStatus | "all")} className={inputCls}>
              <option value="all">{t("appointmentsV2.filter.allStatuses")}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`appointmentsV2.status.${s}`)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="appt-channel" className={labelCls}>{t("appointmentsV2.filter.channel")}</label>
            <select id="appt-channel" value={channel} onChange={(e) => setChannel(e.target.value as ApptChannel | "all")} className={inputCls}>
              <option value="all">{t("appointmentsV2.channels.all")}</option>
              {channels.map((c) => <option key={c} value={c}>{t(`appointmentsV2.channels.${c}`)}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2.5 min-h-[44px] text-sm text-[#374151] cursor-pointer">
            <input type="checkbox" data-testid="show-cancelled" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="w-5 h-5 accent-[#FF6B35]" />
            {t("appointmentsV2.filter.showCancelled")}
          </label>
          {active > 0 && (
            <button type="button" onClick={() => { setSearch(""); setStatus("all"); setChannel("all"); setShowCancelled(false); }} className="min-h-[32px] text-xs font-semibold text-[#C2410C] hover:underline">{t("appointmentsV2.filter.clear")}</button>
          )}
        </div>
      )}
    </div>
  );
}
