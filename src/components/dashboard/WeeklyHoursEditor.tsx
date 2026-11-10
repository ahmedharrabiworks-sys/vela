"use client";

import type { HoursWindow, OpeningHours } from "@/lib/opening-hours";
import { toMinutes, toTimeText } from "@/lib/time-off";
import { fmtDay } from "@/components/dashboard/appointments/shared";

const END_OF_DAY = 24 * 60;
const SUNDAY = "2026-11-08";
const DEFAULT_RANGE: HoursWindow = { open: 9 * 60, close: 18 * 60 };

const dayDate = (i: number) => new Date(Date.parse(`${SUNDAY}T12:00:00.000Z`) + i * 86_400_000).toISOString().slice(0, 10);
const asInput = (m: number) => (m >= END_OF_DAY ? "23:59" : toTimeText(m));
const fromInput = (v: string) => (v === "23:59" ? END_OF_DAY : toMinutes(v));

const fieldCls = "h-10 w-[136px] !rounded-lg border border-[#E5E7EB] bg-white px-2 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15";

/** Each day: open or closed, one or more ranges for split shifts. */
export default function WeeklyHoursEditor({ value, onChange, locale, t }: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
  locale: string;
  t: (key: string) => string;
}) {
  const setDay = (i: number, windows: HoursWindow[]) => onChange(value.map((d, x) => (x === i ? windows : d)));
  const setRange = (i: number, r: number, patch: Partial<HoursWindow>) => setDay(i, value[i].map((w, x) => (x === r ? { ...w, ...patch } : w)));

  return (
    <div data-testid="weekly-hours" className="divide-y divide-[#F3F4F6]">
      {value.map((windows, i) => {
        const name = fmtDay(dayDate(i), locale, { weekday: "long" });
        const open = windows.length > 0;
        return (
          <div key={i} data-testid={`hours-day-${i}`} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-2.5">
            <label className="flex items-center gap-2.5 w-[132px] min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={open} onChange={(e) => setDay(i, e.target.checked ? [{ ...DEFAULT_RANGE }] : [])} aria-label={name} className="w-5 h-5 accent-[#FF6B35]" />
              <span className="text-sm font-medium text-[#111111]">{name}</span>
            </label>
            {open ? (
              <div className="space-y-2">
                {windows.map((w, r) => (
                  <div key={r} className="flex items-center gap-2">
                    <input type="time" dir="ltr" aria-label={`${name} ${t("agentUi.kb.hoursFrom")}`} value={asInput(w.open)} onChange={(e) => e.target.value && setRange(i, r, { open: fromInput(e.target.value) })} className={fieldCls} />
                    <span className="text-xs text-[#9CA3AF]">{t("agentUi.kb.hoursTo")}</span>
                    <input type="time" dir="ltr" aria-label={`${name} ${t("agentUi.kb.hoursUntil")}`} value={asInput(w.close)} onChange={(e) => e.target.value && setRange(i, r, { close: fromInput(e.target.value) })} className={fieldCls} />
                    {windows.length > 1 && (
                      <button type="button" onClick={() => setDay(i, windows.filter((_, x) => x !== r))} aria-label={t("agentUi.kb.removeRange")} className="h-10 w-10 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-red-600 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                {windows.length < 4 && (
                  <button type="button" onClick={() => { const last = windows[windows.length - 1]; setDay(i, [...windows, { open: Math.min(last.close + 60, END_OF_DAY - 60), close: Math.min(last.close + 180, END_OF_DAY) }]); }} className="min-h-[32px] text-xs font-semibold text-[#C2410C] hover:underline">
                    {t("agentUi.kb.addRange")}
                  </button>
                )}
              </div>
            ) : (
              <p className="min-h-[40px] flex items-center text-sm text-[#9CA3AF]">{t("agentUi.kb.closedDay")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "Sun closed · Mon to Fri 8:00 to 12:00, 14:00 to 18:00 · Sat closed" */
export function summarizeWeek(week: OpeningHours, locale: string, toWord: string, closedWord: string): string {
  const clock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const describe = (w: HoursWindow[]) => (w.length === 0 ? closedWord : w.map((x) => `${clock(x.open)} ${toWord} ${clock(x.close)}`).join(", "));
  const short = (i: number) => fmtDay(dayDate(i), locale, { weekday: "short" });
  const parts: string[] = [];
  for (let i = 0; i < 7;) {
    let j = i;
    while (j + 1 < 7 && describe(week[j + 1]) === describe(week[i])) j++;
    parts.push(`${i === j ? short(i) : `${short(i)} ${toWord} ${short(j)}`} ${describe(week[i])}`);
    i = j + 1;
  }
  return parts.join(" · ");
}
