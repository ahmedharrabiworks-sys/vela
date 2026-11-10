"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { OpeningHours } from "@/lib/opening-hours";
import { dayStatus, nextOpenDay, type TimeOff } from "@/lib/time-off";
import { ClosedDayCard, DayTimeline } from "./DayView";
import { addDays, fmtDay, type Appt, type Translate } from "./shared";

const STRIP_BACK = 14;
const STRIP_AHEAD = 45;

/** Phones: a date strip over yesterday, today and tomorrow, swiped sideways. */
export default function MobileDay({ anchor, onAnchor, onAdd, rows, hours, timeOff, now, locale, t, onOpen, showEmptyHint }: {
  anchor: string;
  onAnchor: (date: string) => void;
  onAdd: (date: string, time: string) => void;
  rows: Appt[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  now: { date: string; time: string };
  locale: string;
  t: Translate;
  onOpen: (a: Appt) => void;
  showEmptyHint: boolean;
}) {
  // The strip is centred on a date window that always includes the chosen day.
  const stripDays = useMemo(() => {
    const inRange = anchor >= addDays(now.date, -STRIP_BACK) && anchor <= addDays(now.date, STRIP_AHEAD);
    const base = inRange ? now.date : anchor;
    return Array.from({ length: STRIP_BACK + STRIP_AHEAD + 1 }, (_, i) => addDays(base, i - STRIP_BACK));
  }, [anchor, now.date]);
  const panels = [addDays(anchor, -1), anchor, addDays(anchor, 1)];

  const scroller = useRef<HTMLDivElement>(null);
  const middle = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const activeChip = useRef<HTMLButtonElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Before paint: the chosen day is always the middle panel.
  useLayoutEffect(() => {
    const box = scroller.current, panel = middle.current;
    if (!box || !panel) return;
    box.scrollBy({ left: panel.getBoundingClientRect().left - box.getBoundingClientRect().left, behavior: "instant" as ScrollBehavior });
  }, [anchor]);

  useEffect(() => {
    const row = strip.current, chip = activeChip.current;
    if (!row || !chip) return;
    const a = chip.getBoundingClientRect(), b = row.getBoundingClientRect();
    row.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2) });
  }, [anchor]);

  useEffect(() => () => { if (settle.current) clearTimeout(settle.current); }, []);

  // Wait for the swipe to finish, so the page never fights the finger.
  const onScroll = () => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const box = scroller.current;
      if (!box || box.clientWidth === 0) return;
      const panel = Math.round(Math.abs(box.scrollLeft) / box.clientWidth);
      if (panel !== 1 && panels[panel]) onAnchor(panels[panel]);
    }, 120);
  };

  return (
    <div className="md:hidden space-y-3">
      <div ref={strip} data-testid="date-strip" role="tablist" aria-label={t("appointmentsV2.navigator.dates")} className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 py-0.5">
        {stripDays.map((d) => {
          const selected = d === anchor;
          return (
            <button
              key={d}
              ref={selected ? activeChip : undefined}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onAnchor(d)}
              className={`shrink-0 w-12 h-[56px] rounded-xl flex flex-col items-center justify-center transition-colors ${selected ? "text-white" : d === now.date ? "text-[#C2410C] bg-[#FFF5F0]" : "text-[#374151] bg-white/70"}`}
              style={selected ? { background: "var(--vela-gradient)" } : undefined}
            >
              <span className="text-[10px] font-medium leading-tight">{fmtDay(d, locale, { weekday: "short" })}</span>
              <span className="text-sm font-bold tabular-nums leading-tight">{fmtDay(d, locale, { day: "numeric" })}</span>
            </button>
          );
        })}
      </div>
      <div ref={scroller} onScroll={onScroll} data-testid="day-swipe" className="flex items-start overflow-x-auto snap-x snap-mandatory scrollbar-none">
        {panels.map((d, i) => {
          const status = dayStatus(d, hours, timeOff);
          const dayRows = rows.filter((a) => a.date === d);
          return (
            <div key={i} ref={i === 1 ? middle : undefined} className="w-full shrink-0 snap-start snap-always">
              {status.kind === "open" ? (
                <div className="glass rounded-2xl overflow-hidden">
                  <DayTimeline date={d} rows={dayRows} hours={hours} timeOff={timeOff} now={now} locale={locale} t={t} onOpen={onOpen} onAdd={(time) => onAdd(d, time)} selectedId={null} showEmptyHint={showEmptyHint} />
                </div>
              ) : (
                <ClosedDayCard date={d} status={status} rows={dayRows} nextOpen={nextOpenDay(d, hours, timeOff)} locale={locale} t={t} onGo={onAnchor} onOpen={onOpen} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
