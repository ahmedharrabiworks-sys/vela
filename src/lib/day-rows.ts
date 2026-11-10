/**
 * The Day table, as data. One row per slot; a booking that runs longer than a
 * slot is one row spanning those slots; a slot that holds a booking is never
 * also Free; cancelled bookings never hold a slot (they ride along inside the
 * row of their time, shown only when asked); earlier slots are Past, never Free.
 * The summary is counted from these same rows, so it always matches them.
 */
import type { OpeningHours } from "./opening-hours";
import { partialOffs, toMinutes, type DayStatus, type TimeOff } from "./time-off";

export interface DayAppt { id: string; time: string; durationMinutes: number; status: string }

export type BlockReason =
  | { type: "off"; label: string }
  | { type: "break" }
  | { type: "closed" }
  | { type: "closedDay" }
  | { type: "offDay"; label: string };

export type DayRow<T extends DayAppt> =
  | { kind: "booked"; start: number; end: number; appt: T; cancelled: T[] }
  | { kind: "free"; start: number; end: number; cancelled: T[] }
  | { kind: "past"; start: number; end: number; cancelled: T[] }
  | { kind: "blocked"; start: number; end: number; reason: BlockReason; cancelled: T[] };

export interface DaySummary { booked: number; free: number; nextFree: number | null }

const UNKNOWN_HOURS = [{ open: 8 * 60, close: 20 * 60 }];
const holdsSlot = (a: DayAppt) => a.status !== "cancelled";
const endOf = (a: DayAppt) => toMinutes(a.time) + Math.max(1, a.durationMinutes);

export function buildDayRows<T extends DayAppt>(p: {
  date: string;
  appts: T[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
  status: DayStatus;
  now: { date: string; time: string };
  slotMinutes: number;
}): DayRow<T>[] {
  const slot = Math.max(5, Math.round(p.slotMinutes) || 30);
  const holding = p.appts.filter(holdsSlot).sort((a, b) => a.time.localeCompare(b.time));
  const cancelled = p.appts.filter((a) => !holdsSlot(a));
  const out: DayRow<T>[] = [];

  if (p.status.kind !== "open") {
    out.push({ kind: "blocked", start: 0, end: 24 * 60, reason: p.status.kind === "off" ? { type: "offDay", label: p.status.entry.reason ?? "" } : { type: "closedDay" }, cancelled: [] });
    for (const appt of holding) out.push({ kind: "booked", start: toMinutes(appt.time), end: endOf(appt), appt, cancelled: [] });
  } else {
    const windows = p.hours ? p.hours[new Date(`${p.date}T12:00:00.000Z`).getUTCDay()] : UNKNOWN_HOURS;
    const offs = partialOffs(p.date, p.timeOff);
    const anchor = windows.length ? Math.min(...windows.map((w) => w.open)) : 9 * 60;
    const earliest = Math.min(anchor, ...holding.map((a) => toMinutes(a.time)));
    const first = anchor - Math.ceil((anchor - earliest) / slot) * slot;
    const last = Math.min(24 * 60, Math.max(...windows.map((w) => w.close), ...holding.map(endOf), anchor));
    const snapUp = (m: number) => first + Math.ceil((m - first) / slot) * slot;
    const nowKey = `${p.now.date}T${p.now.time}`;
    const isPast = (m: number) => `${p.date}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` < nowKey;

    const reasonAt = (m: number): { key: string; reason: BlockReason } | null => {
      const off = offs.find(({ band }) => m >= band.open && m < band.close);
      if (off) return { key: `off:${off.entry.id}`, reason: { type: "off", label: off.entry.reason ?? "" } };
      if (windows.some((w) => m >= w.open && m < w.close)) return null;
      const inside = windows.length > 0 && m > Math.min(...windows.map((w) => w.open)) && m < Math.max(...windows.map((w) => w.close));
      return inside ? { key: "break", reason: { type: "break" } } : { key: "closed", reason: { type: "closed" } };
    };

    let block: { key: string; reason: BlockReason; start: number } | null = null;
    const closeBlock = (end: number) => {
      if (block && end > block.start) out.push({ kind: "blocked", start: block.start, end, reason: block.reason, cancelled: [] });
      block = null;
    };
    let m = first;
    while (m < last) {
      // A slot that any booking touches belongs to the booking(s), never to Free.
      const touching = holding.filter((a) => toMinutes(a.time) < m + slot && endOf(a) > m);
      if (touching.length > 0) {
        closeBlock(m);
        let clusterEnd = Math.max(...touching.map(endOf));
        const cluster = new Set(touching);
        for (let grew = true; grew;) {
          grew = false;
          for (const a of holding) if (!cluster.has(a) && toMinutes(a.time) < clusterEnd && endOf(a) > m) { cluster.add(a); clusterEnd = Math.max(clusterEnd, endOf(a)); grew = true; }
        }
        for (const appt of Array.from(cluster).sort((a, b) => a.time.localeCompare(b.time))) out.push({ kind: "booked", start: toMinutes(appt.time), end: endOf(appt), appt, cancelled: [] });
        m = snapUp(clusterEnd);
        continue;
      }
      const why = reasonAt(m);
      if (why) {
        if (block && block.key !== why.key) closeBlock(m);
        if (!block) block = { ...why, start: m };
        m += slot;
        continue;
      }
      closeBlock(m);
      if (windows.some((w) => m >= w.open && m + slot <= w.close)) out.push({ kind: isPast(m) ? "past" : "free", start: m, end: m + slot, cancelled: [] });
      m += slot;
    }
    closeBlock(Math.min(m, last));
  }

  // Cancelled bookings sit inside the row that covers their start time.
  for (const c of cancelled) {
    const at = toMinutes(c.time);
    const row = out.find((r) => at >= r.start && at < r.end) ?? [...out].reverse().find((r) => r.start <= at) ?? out[0];
    if (row) row.cancelled.push(c);
  }
  return out;
}

export function summarizeDay<T extends DayAppt>(rows: DayRow<T>[]): DaySummary {
  const free = rows.filter((r) => r.kind === "free");
  return { booked: rows.filter((r) => r.kind === "booked").length, free: free.length, nextFree: free[0]?.start ?? null };
}
