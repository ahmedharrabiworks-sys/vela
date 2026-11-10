/**
 * Recurring changes to the weekly hours ("lunch break 12 to 1:30 every day",
 * "we open 9 to 5 on Saturdays", "closed on Fridays"), applied to the one
 * structured week. Pure, so the assistant and the tests share it.
 */
import { normalizeSchedule, type HoursWindow, type OpeningHours } from "./opening-hours";

export type WeeklyAction = "set_break" | "remove_breaks" | "set_hours" | "close";
export interface WeeklyChange { action?: unknown; days?: unknown; start?: unknown; end?: unknown }
export type WeeklyResult = { ok: true; week: OpeningHours } | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
const span = (windows: HoursWindow[]): HoursWindow[] => (windows.length === 0 ? [] : [{ open: Math.min(...windows.map((w) => w.open)), close: Math.max(...windows.map((w) => w.close)) }]);

export function applyWeeklyChange(week: OpeningHours, change: WeeklyChange): WeeklyResult {
  const action = change.action as WeeklyAction;
  if (!["set_break", "remove_breaks", "set_hours", "close"].includes(action)) return { ok: false, error: "Unknown action." };

  let days: number[];
  if (change.days === undefined || change.days === null) {
    if (action === "set_hours" || action === "close") return { ok: false, error: "Say which days." };
    days = week.map((w, i) => (w.length > 0 ? i : -1)).filter((i) => i >= 0);
  } else {
    if (!Array.isArray(change.days) || change.days.length === 0 || change.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return { ok: false, error: "Days must be numbers from 0 (Sunday) to 6 (Saturday)." };
    days = Array.from(new Set(change.days as number[]));
  }

  const needsTimes = action === "set_break" || action === "set_hours";
  if (needsTimes && (typeof change.start !== "string" || typeof change.end !== "string" || !TIME.test(change.start) || !TIME.test(change.end) || change.start >= change.end)) {
    return { ok: false, error: "Give a start and end as 24-hour HH:MM, start before end." };
  }
  const start = needsTimes ? toMin(change.start as string) : 0;
  const end = needsTimes ? toMin(change.end as string) : 0;

  const next = week.map((windows, day) => {
    if (!days.includes(day)) return windows;
    if (action === "close") return [];
    if (action === "set_hours") return [{ open: start, close: end }];
    if (action === "remove_breaks") return span(windows);
    // set_break: the day's full span with exactly this break taken out.
    return span(windows).flatMap((w) => {
      if (end <= w.open || start >= w.close) return [w];
      const parts: HoursWindow[] = [];
      if (start > w.open) parts.push({ open: w.open, close: start });
      if (end < w.close) parts.push({ open: end, close: w.close });
      return parts;
    });
  });
  const valid = normalizeSchedule(next);
  return valid ? { ok: true, week: valid } : { ok: false, error: "Those hours don't fit together." };
}
