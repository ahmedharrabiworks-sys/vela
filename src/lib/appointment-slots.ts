/**
 * Server-side availability for the Appointments page: the one place that
 * decides whether a date and time can be booked, shared by the slot picker,
 * reschedule and manual booking so they can never disagree.
 *
 * Time convention (same as every booking path): appointments store the local
 * wall-clock time with a Z suffix, so 15:00 in Doha is ...T15:00:00.000Z.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { resolveDurationMinutes, type ServiceDuration } from "@/lib/availability";
import { parseOpeningHours, weekdayOf, type OpeningHours } from "@/lib/opening-hours";
import { resolveTenantTimezone, wallClockNow } from "@/lib/vapi-webhook";

const SLOT_STEP_MINUTES = 30;
// Without usable opening hours the picker still needs a sensible range.
const FALLBACK_OPEN = 8 * 60;
const FALLBACK_CLOSE = 22 * 60;
const DAY_MS = 86_400_000;

export interface BookingContext {
  services: ServiceDuration[];
  hours: OpeningHours | null;
  timezone: string;
  now: { date: string; time: string; asDate: Date };
}

export async function loadBookingContext(admin: any, tenantId: string): Promise<BookingContext> {
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base, agent_settings")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const kb = parseKnowledgeBase(cfg?.knowledge_base);
  let settings: Record<string, any> = {};
  try {
    const raw = cfg?.agent_settings;
    settings = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch { /* defaults */ }
  const timezone = resolveTenantTimezone(settings);
  const now = wallClockNow(timezone);
  return {
    services: kb.services.filter((s) => s.name.trim()),
    hours: parseOpeningHours(kb.business.hours),
    timezone,
    now: { date: now.date, time: now.time, asDate: now.asDate },
  };
}

export const toMinutesOfDay = (time: string) => parseInt(time.slice(0, 2), 10) * 60 + parseInt(time.slice(3, 5), 10);
const toTimeText = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const durationFor = (ctx: BookingContext, service: string | null | undefined) => resolveDurationMinutes(ctx.services, service);

async function bookedWindows(admin: any, tenantId: string, ctx: BookingContext, date: string, excludeId?: string | null) {
  const dayStart = Date.parse(`${date}T00:00:00.000Z`);
  let query = admin
    .from("appointments")
    .select("id, datetime, service_name")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "confirmed"])
    .is("deleted_at", null)
    .gte("datetime", new Date(dayStart - DAY_MS).toISOString())
    .lt("datetime", new Date(dayStart + 2 * DAY_MS).toISOString());
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return ((data ?? []) as Array<{ datetime: string; service_name: string | null }>).map((b) => {
    const start = Date.parse(b.datetime);
    return { start, end: start + durationFor(ctx, b.service_name) * 60_000 };
  });
}

function dayWindows(ctx: BookingContext, date: string) {
  return ctx.hours ? ctx.hours[weekdayOf(date)] : [{ open: FALLBACK_OPEN, close: FALLBACK_CLOSE }];
}

export type SlotProblem = "past" | "closed" | "outside_hours" | "conflict";

/** Why this slot can't be booked, or null when it can. */
export async function checkSlot(admin: any, tenantId: string, ctx: BookingContext, date: string, time: string, service: string | null, excludeId?: string | null): Promise<SlotProblem | null> {
  const start = Date.parse(`${date}T${time}:00.000Z`);
  if (start < ctx.now.asDate.getTime()) return "past";
  const windows = dayWindows(ctx, date);
  if (windows.length === 0) return "closed";
  const startM = toMinutesOfDay(time);
  const duration = durationFor(ctx, service);
  if (ctx.hours && !windows.some((w) => startM >= w.open && startM + duration <= w.close)) return "outside_hours";
  const booked = await bookedWindows(admin, tenantId, ctx, date, excludeId);
  const end = start + duration * 60_000;
  return booked.some((b) => start < b.end && b.start < end) ? "conflict" : null;
}

export async function listFreeSlots(admin: any, tenantId: string, ctx: BookingContext, date: string, service: string | null, excludeId?: string | null) {
  const windows = dayWindows(ctx, date);
  if (windows.length === 0) return { closed: true, slots: [] as string[], hoursKnown: !!ctx.hours };
  const duration = durationFor(ctx, service);
  const booked = await bookedWindows(admin, tenantId, ctx, date, excludeId);
  const slots: string[] = [];
  for (const w of windows) {
    for (let m = w.open; m + duration <= w.close; m += SLOT_STEP_MINUTES) {
      const start = Date.parse(`${date}T${toTimeText(m)}:00.000Z`);
      const end = start + duration * 60_000;
      if (start < ctx.now.asDate.getTime()) continue;
      if (booked.some((b) => start < b.end && b.start < end)) continue;
      slots.push(toTimeText(m));
    }
  }
  return { closed: false, slots, hoursKnown: !!ctx.hours };
}

/** One line, no control characters, capped. Empty string when not a string. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
