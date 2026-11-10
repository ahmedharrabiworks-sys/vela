/**
 * Reads the free-text opening hours from the knowledge base ("Mon-Fri
 * 9:00-17:00", "Available every day except Tuesdays, from 9:00 to 18:00",
 * "السبت إلى الخميس 9 صباحا إلى 9 مساء، الجمعة مغلق") into real windows.
 * Used by the week calendar and by the server when it checks a booking.
 * Returns null when the text has no usable times: callers must then say the
 * hours are unknown, never guess them.
 */

export interface HoursWindow { open: number; close: number }
/** Index 0 is Sunday. Empty list means closed that day. */
export type OpeningHours = HoursWindow[][];

const DAYS: Array<[RegExp, number]> = [
  [/^(sun(day)?s?|الأحد|الاحد)$/, 0],
  [/^(mon(day)?s?|الإثنين|الاثنين)$/, 1],
  [/^(tue(s|sday|sdays)?|الثلاثاء)$/, 2],
  [/^(wed(nesday)?s?|الأربعاء|الاربعاء)$/, 3],
  [/^(thu(r|rs|rsday|rsdays)?|الخميس)$/, 4],
  [/^(fri(day)?s?|الجمعة|الجمعه)$/, 5],
  [/^(sat(urday)?s?|السبت)$/, 6],
];

const DAY_WORDS = "sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sun|mon|tues?|wed|thurs?|thu|fri|sat|الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت";
const MERIDIEM = "a\\.?m\\.?|p\\.?m\\.?|صباحًا|صباحا|صباح|مساءً|مساء|ظهرًا|ظهرا|عصرًا|عصرا|ص|م";
const TIME = `(\\d{1,2})(?:[:.](\\d{2}))?\\s*(${MERIDIEM})?(?![\\u0600-\\u06FFa-z])`;
const JOIN = "\\s*(?:-|to|till|until|through|thru|إلى|الى|لغاية|حتى)\\s*";
const TOKEN = new RegExp(
  [
    `(?<always>24\\s*/\\s*7|24\\s*(?:hours|hrs|ساعة))`,
    `(?<all>every\\s*day|everyday|daily|all\\s*(?:week|days)|7\\s*days|كل\\s*يوم|كل\\s*الأيام|طوال\\s*الأسبوع)`,
    `(?<except>except|excluding|ما\\s*عدا|ماعدا|عدا|باستثناء)`,
    `(?<![a-z\\u0600-\\u06FF])(?<closed>closed|off|مغلق|مغلقة|مقفل|عطلة|إجازة)(?![a-z\\u0600-\\u06FF])`,
    `(?<range>${TIME}${JOIN}${TIME})`,
    `(?<![a-z\\u0600-\\u06FF])و?(?<day>${DAY_WORDS})(?![a-z\\u0600-\\u06FF])`,
  ].join("|"),
  "gi",
);

function toMinutes(hourText: string, minuteText: string | undefined, meridiem: string | undefined): { h: number; m: number; mer: "am" | "pm" | null } {
  const raw = (meridiem ?? "").toLowerCase().replace(/\./g, "");
  const mer = !raw ? null : /^(am|ص)/.test(raw) ? "am" : "pm";
  return { h: parseInt(hourText, 10), m: minuteText ? parseInt(minuteText, 10) : 0, mer };
}

function resolveWindow(a: ReturnType<typeof toMinutes>, b: ReturnType<typeof toMinutes>): HoursWindow | null {
  if (a.h > 24 || b.h > 24 || a.m > 59 || b.m > 59) return null;
  const with12 = (t: typeof a, pm: boolean) => (t.h % 12) + (pm ? 12 : 0);
  let open = a.mer ? with12(a, a.mer === "pm") : a.h;
  let close = b.mer ? with12(b, b.mer === "pm") : b.h;
  // "9-5pm": only the end says pm, so the start is morning unless that is impossible.
  if (!a.mer && b.mer === "pm" && a.h < 12 && a.h + 12 < close) open = a.h + 12;
  // "9am-5" or "9-5": a plain end at or before the start means the afternoon.
  if (!b.mer && close <= open && close < 12) close += 12;
  let openM = open * 60 + a.m;
  let closeM = close * 60 + b.m;
  if (closeM <= openM) closeM += 24 * 60; // Runs past midnight.
  closeM = Math.min(closeM, 24 * 60);
  openM = Math.min(openM, 24 * 60);
  return closeM > openM ? { open: openM, close: closeM } : null;
}

function dayIndex(word: string): number {
  const w = word.toLowerCase();
  for (const [re, i] of DAYS) if (re.test(w)) return i;
  return -1;
}

export function parseOpeningHours(text: string | null | undefined): OpeningHours | null {
  if (!text || !text.trim()) return null;
  const s = text
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[‐-―]/g, "-");

  const set: Array<HoursWindow[] | undefined> = new Array(7).fill(undefined);
  const general: HoursWindow[] = [];
  let current = null as number[] | null;
  let last: "day" | "time" | "closed" | "all" | "except" | null = null;
  let lastDay = -1;
  let lastDayEnd = 0;
  let excepting = false;
  let closedNext = false;
  let sawTime = false;
  let clauseEnd = 0;

  const assign = (days: number[], windows: HoursWindow[]) => {
    for (const d of days) set[d] = [...(set[d] ?? []), ...windows];
  };

  const found: RegExpExecArray[] = [];
  TOKEN.lastIndex = 0;
  for (let hit = TOKEN.exec(s); hit; hit = TOKEN.exec(s)) found.push(hit);

  for (const m of found) {
    const g = m.groups ?? {};
    const index = m.index ?? 0;
    if (g.always) {
      assign([0, 1, 2, 3, 4, 5, 6], [{ open: 0, close: 24 * 60 }]);
      sawTime = true;
      last = "time";
    } else if (g.all) {
      current = [0, 1, 2, 3, 4, 5, 6];
      last = "all";
    } else if (g.except) {
      if (!current) current = [0, 1, 2, 3, 4, 5, 6];
      excepting = true;
      last = "except";
    } else if (g.closed) {
      if (current && (last === "day" || last === "all")) {
        for (const d of current) set[d] = [];
        current = null;
        closedNext = false;
      } else {
        closedNext = true;
      }
      excepting = false;
      last = "closed";
    } else if (g.day) {
      const d = dayIndex(g.day);
      if (d < 0) continue;
      if (excepting) {
        current = (current ?? []).filter((x) => x !== d);
      } else if (closedNext) {
        set[d] = [];
      } else {
        const between = s.slice(lastDayEnd, index);
        const isRange = last === "day" && lastDay >= 0 && /^\s*(-|to|through|thru|till|until|إلى|الى|حتى)\s*$/.test(between);
        if (isRange) {
          const days: number[] = [];
          for (let x = lastDay, n = 0; n < 7; n++) {
            days.push(x);
            if (x === d) break;
            x = (x + 1) % 7;
          }
          current = Array.from(new Set([...(current ?? []), ...days]));
        } else if (last === "day" && current) {
          current = [...current, d];
        } else {
          current = [d];
        }
      }
      clauseEnd = 0;
      lastDay = d;
      lastDayEnd = index + m[0].length;
      last = "day";
    } else if (g.range) {
      const parts = g.range.match(new RegExp(`^${TIME}${JOIN}${TIME}$`, "i"));
      if (!parts) continue;
      const w = resolveWindow(toMinutes(parts[1], parts[2], parts[3]), toMinutes(parts[4], parts[5], parts[6]));
      if (!w) continue;
      // "9-1, 4-9": a second plain shift that would start before the first ends is the afternoon.
      if (!parts[3] && !parts[6] && w.open < clauseEnd) { w.open += 12 * 60; w.close = Math.min(w.close + 12 * 60, 24 * 60); }
      clauseEnd = w.close;
      sawTime = true;
      excepting = false;
      closedNext = false;
      if (current) assign(current, [w]);
      else general.push(w);
      last = "time";
    }
  }

  if (!sawTime) return null;
  return set.map((v) => v ?? (general.length > 0 ? general : []));
}

/** YYYY-MM-DD to weekday index, 0 is Sunday. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

export function addDaysISO(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** The stored weekly editor value, or null when it isn't a valid week. */
export function normalizeSchedule(raw: unknown): OpeningHours | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  const week: OpeningHours = [];
  for (const day of raw) {
    if (!Array.isArray(day) || day.length > 4) return null;
    const windows = day.map((w) => ({ open: Number((w as HoursWindow)?.open), close: Number((w as HoursWindow)?.close) })).sort((a, b) => a.open - b.open);
    const bad = windows.some((w, i) => !Number.isInteger(w.open) || !Number.isInteger(w.close) || w.open < 0 || w.close > 24 * 60 || w.close <= w.open || (i > 0 && w.open < windows[i - 1].close));
    if (bad) return null;
    week.push(windows);
  }
  return week;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const clockText = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

/** The readable version kept in sync with the weekly editor. */
export function formatWeeklyHours(week: OpeningHours): string {
  const describe = (w: HoursWindow[]) => (w.length === 0 ? "closed" : w.map((x) => `${clockText(x.open)} to ${clockText(x.close)}`).join(" and "));
  const parts: string[] = [];
  for (let i = 0; i < 7;) {
    let j = i;
    while (j + 1 < 7 && describe(week[j + 1]) === describe(week[i])) j++;
    parts.push(`${i === j ? DAY_NAMES[i] : `${DAY_NAMES[i]} to ${DAY_NAMES[j]}`} ${describe(week[i])}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/** The one place every booking path gets opening hours from. */
export function resolveOpeningHours(business: { hours?: string; schedule?: OpeningHours | null }): OpeningHours | null {
  // The structured week only. Free text is never read for booking rules.
  void business.hours;
  return business.schedule ?? null;
}
