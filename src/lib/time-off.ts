/**
 * Closed days and time off: the pure rules every booking path shares (text
 * AI, phone agent, manual booking, the calendar). Dates are plain YYYY-MM-DD
 * and times HH:MM in the business's own wall clock, so nothing here depends
 * on a server or browser timezone. Safe in the browser and on the server.
 */
import { addDaysISO, weekdayOf, type HoursWindow, type OpeningHours } from "./opening-hours";

export interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export type TimeOffInput = Omit<TimeOff, "id">;
export type HoursProblem = "past" | "closed" | "time_off" | "outside_hours";
export interface WallClock { date: string; time: string }

const MINUTES_IN_DAY = 24 * 60;
// With no readable opening hours, the picker still needs a sensible range.
const UNKNOWN_HOURS: HoursWindow[] = [{ open: 8 * 60, close: 22 * 60 }];

export const toMinutes = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
export const toTimeText = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const covers = (o: TimeOff, date: string) => date >= o.start_date && date <= o.end_date;
const isAllDay = (o: TimeOff) => !o.start_time || !o.end_time;
const offBand = (o: TimeOff): HoursWindow => ({ open: toMinutes(o.start_time as string), close: toMinutes(o.end_time as string) });

export function fullDayOff(date: string, list: TimeOff[]): TimeOff | null {
  return list.find((o) => covers(o, date) && isAllDay(o)) ?? null;
}

export function partialOffs(date: string, list: TimeOff[]): Array<{ entry: TimeOff; band: HoursWindow }> {
  return list.filter((o) => covers(o, date) && !isAllDay(o)).map((entry) => ({ entry, band: offBand(entry) }));
}

export type DayStatus = { kind: "open" } | { kind: "closed" } | { kind: "off"; entry: TimeOff };

export function dayStatus(date: string, hours: OpeningHours | null, list: TimeOff[]): DayStatus {
  const off = fullDayOff(date, list);
  if (off) return { kind: "off", entry: off };
  if (hours && hours[weekdayOf(date)].length === 0) return { kind: "closed" };
  return { kind: "open" };
}

/** The day's opening windows with any partial time off cut out. */
export function availableWindows(date: string, hours: OpeningHours | null, list: TimeOff[]): HoursWindow[] {
  if (dayStatus(date, hours, list).kind !== "open") return [];
  let windows = hours ? hours[weekdayOf(date)] : UNKNOWN_HOURS;
  for (const { band } of partialOffs(date, list)) {
    windows = windows.flatMap((w) => {
      if (band.close <= w.open || band.open >= w.close) return [w];
      const parts: HoursWindow[] = [];
      if (band.open > w.open) parts.push({ open: w.open, close: band.open });
      if (band.close < w.close) parts.push({ open: band.close, close: w.close });
      return parts;
    });
  }
  return windows;
}

/** Why a start time can't be booked, ignoring clashes with other bookings. */
export function slotProblem(p: { date: string; time: string; durationMinutes: number; now: WallClock; hours: OpeningHours | null; timeOff: TimeOff[] }): HoursProblem | null {
  if (`${p.date}T${p.time}` < `${p.now.date}T${p.now.time}`) return "past";
  if (fullDayOff(p.date, p.timeOff)) return "time_off";
  const start = toMinutes(p.time), end = start + p.durationMinutes;
  if (partialOffs(p.date, p.timeOff).some(({ band }) => start < band.close && band.open < end)) return "time_off";
  if (!p.hours) return end > MINUTES_IN_DAY ? "outside_hours" : null;
  const windows = p.hours[weekdayOf(p.date)];
  if (windows.length === 0) return "closed";
  return windows.some((w) => start >= w.open && end <= w.close) ? null : "outside_hours";
}

/**
 * One client per slot: true when [date time, + duration) overlaps any booking that
 * still holds its time (pending or confirmed). Back-to-back is not an overlap.
 */
export function clashesWithBooked(date: string, time: string, durationMinutes: number, booked: Array<{ date: string; time: string; durationMinutes: number }>): boolean {
  const start = Date.parse(`${date}T${time}:00.000Z`), end = start + durationMinutes * 60_000;
  return booked.some((b) => {
    const s = Date.parse(`${b.date}T${b.time}:00.000Z`);
    return start < s + b.durationMinutes * 60_000 && s < end;
  });
}

export function isOutsideHours(date: string, time: string, durationMinutes: number, hours: OpeningHours | null, timeOff: TimeOff[]): boolean {
  return slotProblem({ date, time, durationMinutes, now: { date: "0000-01-01", time: "00:00" }, hours, timeOff }) !== null;
}

export function nextOpenDay(date: string, hours: OpeningHours | null, list: TimeOff[], maxDays = 90): string | null {
  for (let i = 1; i <= maxDays; i++) {
    const d = addDaysISO(date, i);
    if (availableWindows(d, hours, list).length > 0) return d;
  }
  return null;
}

/** Free start times on a day, on a fixed grid. */
export function freeSlots(p: { date: string; hours: OpeningHours | null; timeOff: TimeOff[]; booked: Array<{ time: string; durationMinutes: number }>; now: WallClock; step?: number; duration?: number }): string[] {
  const step = p.step ?? 30, duration = p.duration ?? step;
  const out: string[] = [];
  for (const w of availableWindows(p.date, p.hours, p.timeOff)) {
    for (let m = w.open; m + duration <= w.close; m += step) {
      if (`${p.date}T${toTimeText(m)}` < `${p.now.date}T${p.now.time}`) continue;
      if (p.booked.some((b) => m < toMinutes(b.time) + b.durationMinutes && toMinutes(b.time) < m + duration)) continue;
      out.push(toTimeText(m));
    }
  }
  return out;
}

const realDate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00.000Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const realTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const MAX_RANGE_DAYS = 366;

export type TimeOffValidation = { ok: true; value: TimeOffInput } | { ok: false; error: "invalid_date" | "invalid_time" | "range_too_long" | "past" };

/** Everything the server accepts, whoever sent it: the owner's form or the assistant. */
export function validateTimeOff(raw: { startDate?: unknown; endDate?: unknown; startTime?: unknown; endTime?: unknown; reason?: unknown }, today: string): TimeOffValidation {
  const start = raw.startDate;
  const end = raw.endDate === undefined || raw.endDate === null || raw.endDate === "" ? start : raw.endDate;
  if (!realDate(start) || !realDate(end) || end < start) return { ok: false, error: "invalid_date" };
  if (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`) > MAX_RANGE_DAYS * 86_400_000) return { ok: false, error: "range_too_long" };
  if (end < today) return { ok: false, error: "past" };

  const hasStart = raw.startTime !== undefined && raw.startTime !== null && raw.startTime !== "";
  const hasEnd = raw.endTime !== undefined && raw.endTime !== null && raw.endTime !== "";
  let start_time: string | null = null, end_time: string | null = null;
  if (hasStart || hasEnd) {
    // "Close early at 1pm" has only a start; "open late at 11" only an end.
    start_time = hasStart ? (raw.startTime as string) : "00:00";
    end_time = hasEnd ? (raw.endTime as string) : "23:59";
    if (!realTime(start_time) || !realTime(end_time) || start_time >= end_time) return { ok: false, error: "invalid_time" };
  }
  const reason = typeof raw.reason === "string" ? raw.reason.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) : "";
  return { ok: true, value: { start_date: start, end_date: end, start_time, end_time, reason: reason || null } };
}

/** Same day and month next year, when a date already passed. */
export const nextOccurrence = (date: string) => `${parseInt(date.slice(0, 4), 10) + 1}${date.slice(4)}`;

// ── Words for the voice and the owner ────────────────────────────────────────
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_NUM = ["", "واحد", "اثنين", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثني عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر", "عشرين", "واحد وعشرين", "اثنين وعشرين", "ثلاثة وعشرين", "أربعة وعشرين", "خمسة وعشرين", "ستة وعشرين", "سبعة وعشرين", "ثمانية وعشرين", "تسعة وعشرين", "ثلاثين", "واحد وثلاثين"];

const dayNum = (d: string) => parseInt(d.slice(8), 10);
const monthIdx = (d: string) => parseInt(d.slice(5, 7), 10) - 1;

function clock12(time: string): string {
  const h = parseInt(time.slice(0, 2), 10), m = time.slice(3, 5);
  return `${h % 12 || 12}${m === "00" ? "" : `:${m}`} ${h < 12 ? "AM" : "PM"}`;
}

function arClockWords(time: string): string {
  const h = parseInt(time.slice(0, 2), 10), m = parseInt(time.slice(3, 5), 10);
  const part = h < 12 ? "الصبح" : h < 15 ? "الظهر" : h < 18 ? "العصر" : "المساء";
  const minutes = m === 30 ? " ونص" : m === 15 ? " وربع" : m === 45 ? " إلا ربع" : "";
  return `الساعة ${AR_NUM[(m === 45 ? h + 1 : h) % 12 || 12]}${minutes} ${part}`;
}

/** "Tue 2 to Thu 4 Dec, all day" for confirmations and lists. */
export function timeOffLabel(o: Pick<TimeOff, "start_date" | "end_date" | "start_time" | "end_time">, locale: "en" | "ar"): string {
  const ar = locale === "ar";
  const day = (d: string) => `${(ar ? AR_DAYS : EN_DAYS)[weekdayOf(d)].slice(0, ar ? undefined : 3)} ${dayNum(d)}`;
  const month = (d: string) => (ar ? AR_MONTHS[monthIdx(d)] : EN_MONTHS[monthIdx(d)].slice(0, 3));
  const sameMonth = o.start_date.slice(0, 7) === o.end_date.slice(0, 7);
  const dates = o.start_date === o.end_date
    ? `${day(o.start_date)} ${month(o.start_date)}`
    : `${day(o.start_date)}${sameMonth ? "" : ` ${month(o.start_date)}`} ${ar ? "إلى" : "to"} ${day(o.end_date)} ${month(o.end_date)}`;
  const allDay = !o.start_time || !o.end_time;
  if (allDay) return `${dates}${ar ? "، طوال اليوم" : ", all day"}`;
  const from = (o.start_time as string).slice(0, 5), to = (o.end_time as string).slice(0, 5);
  if (to === "23:59") return `${dates}${ar ? "، من" : ", from"} ${clock12(from)}`;
  if (from === "00:00") return `${dates}${ar ? "، حتى" : ", until"} ${clock12(to)}`;
  return `${dates}${ar ? "، من" : ", from"} ${clock12(from)} ${ar ? "إلى" : "to"} ${clock12(to)}`;
}

function spokenRange(o: TimeOff, ar: boolean): string {
  const same = o.start_date === o.end_date;
  const sameMonth = o.start_date.slice(0, 7) === o.end_date.slice(0, 7);
  if (ar) {
    const dates = same
      ? `يوم ${AR_DAYS[weekdayOf(o.start_date)]} ${AR_NUM[dayNum(o.start_date)]} ${AR_MONTHS[monthIdx(o.start_date)]}`
      : `من ${AR_NUM[dayNum(o.start_date)]}${sameMonth ? "" : ` ${AR_MONTHS[monthIdx(o.start_date)]}`} إلى ${AR_NUM[dayNum(o.end_date)]} ${AR_MONTHS[monthIdx(o.end_date)]}`;
    if (!o.start_time || !o.end_time) return dates;
    const from = o.start_time.slice(0, 5), to = o.end_time.slice(0, 5);
    if (to === "23:59") return `${dates} من ${arClockWords(from)}`;
    if (from === "00:00") return `${dates} حتى ${arClockWords(to)}`;
    return `${dates} من ${arClockWords(from)} إلى ${arClockWords(to)}`;
  }
  const dates = same
    ? `${EN_DAYS[weekdayOf(o.start_date)]} ${dayNum(o.start_date)} ${EN_MONTHS[monthIdx(o.start_date)]}`
    : `from ${dayNum(o.start_date)}${sameMonth ? "" : ` ${EN_MONTHS[monthIdx(o.start_date)]}`} to ${dayNum(o.end_date)} ${EN_MONTHS[monthIdx(o.end_date)]}`;
  if (!o.start_time || !o.end_time) return dates;
  const from = o.start_time.slice(0, 5), to = o.end_time.slice(0, 5);
  if (to === "23:59") return `${dates} from ${clock12(from)}`;
  if (from === "00:00") return `${dates} until ${clock12(to)}`;
  return `${dates} from ${clock12(from)} to ${clock12(to)}`;
}

/**
 * The next 60 days of closures, as ready-made sentences so the model never
 * has to work out a date or say a number as digits. The owner's reason stays
 * private: callers only hear that the business is closed.
 */
export function closuresForPrompt(list: TimeOff[], hours: OpeningHours | null, today: string, horizonDays = 60): string {
  const limit = addDaysISO(today, horizonDays);
  const upcoming = list.filter((o) => o.end_date >= today && o.start_date <= limit).sort((a, b) => a.start_date.localeCompare(b.start_date));
  if (upcoming.length === 0) return "";
  const lines = upcoming.map((o) => {
    const fromDay = o.end_date >= today ? o.end_date : today;
    const next = nextOpenDay(fromDay, hours, list);
    const en = `We're closed ${spokenRange(o, false)}${next ? `, the next available day is ${EN_DAYS[weekdayOf(next)]} ${dayNum(next)} ${EN_MONTHS[monthIdx(next)]}` : ""}.`;
    const ar = `مغلقين ${spokenRange(o, true)}${next ? `، وأقرب يوم متاح ${AR_DAYS[weekdayOf(next)]} ${AR_NUM[dayNum(next)]} ${AR_MONTHS[monthIdx(next)]}` : ""}.`;
    return `- ${o.start_date} to ${o.end_date}. English: "${en}" Arabic: "${ar}"`;
  });
  return `Upcoming closures (never offer or book these; if someone asks about these dates, say the matching sentence politely in their language, with Arabic numbers as words):\n${lines.join("\n")}`;
}
