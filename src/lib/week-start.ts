/**
 * Which day a week starts on: 0 Sunday, 1 Monday, 6 Saturday.
 * The owner's choice wins. Otherwise it follows the country of the business
 * number: Qatar, Saudi Arabia, Kuwait, Bahrain and Oman work Sunday to
 * Thursday; the UAE moved to a Monday week in 2022, like most countries.
 * No number yet: Sunday (Qatar first).
 */
export type WeekStart = 0 | 1 | 6;

export const WEEK_STARTS: readonly WeekStart[] = [0, 1, 6];
const SUNDAY_COUNTRY_CODES = ["974", "966", "965", "973", "968"];

export function isWeekStart(v: unknown): v is WeekStart {
  return v === 0 || v === 1 || v === 6;
}

export function defaultWeekStart(businessPhone: string | null | undefined): WeekStart {
  const digits = (businessPhone ?? "").replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return 0;
  return SUNDAY_COUNTRY_CODES.some((cc) => digits.startsWith(`+${cc}`)) ? 0 : 1;
}

export function resolveWeekStart(saved: unknown, businessPhone: string | null | undefined): WeekStart {
  return isWeekStart(saved) ? saved : defaultWeekStart(businessPhone);
}

/** The first day (YYYY-MM-DD) of the week that contains `date`. */
export function startOfWeek(date: string, weekStart: WeekStart): string {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  const back = (day - weekStart + 7) % 7;
  return new Date(Date.parse(`${date}T12:00:00.000Z`) - back * 86_400_000).toISOString().slice(0, 10);
}
