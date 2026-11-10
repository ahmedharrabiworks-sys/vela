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
import { addDaysISO, resolveOpeningHours, type OpeningHours } from "@/lib/opening-hours";
import { availableWindows, freeSlots, slotProblem, toTimeText, type HoursProblem, type TimeOff } from "@/lib/time-off";
import { loadTimeOff } from "@/lib/time-off-server";
import { resolveTenantTimezone, wallClockNow } from "@/lib/vapi-webhook";

const SLOT_STEP_MINUTES = 30;
const NEAREST_SEARCH_DAYS = 45;
const DAY_MS = 86_400_000;

export interface BookingContext {
  services: ServiceDuration[];
  hours: OpeningHours | null;
  timeOff: TimeOff[];
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
    hours: resolveOpeningHours(kb.business),
    timeOff: await loadTimeOff(admin, tenantId, addDaysISO(now.date, -45)),
    timezone,
    now: { date: now.date, time: now.time, asDate: now.asDate },
  };
}

export const durationFor = (ctx: BookingContext, service: string | null | undefined) => resolveDurationMinutes(ctx.services, service);

async function bookedBetween(admin: any, tenantId: string, ctx: BookingContext, firstDate: string, lastDate: string, excludeId?: string | null) {
  const windowStart = Date.parse(`${firstDate}T00:00:00.000Z`) - DAY_MS;
  let query = admin
    .from("appointments")
    .select("id, datetime, service_name")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "confirmed"])
    .is("deleted_at", null)
    .gte("datetime", new Date(windowStart).toISOString())
    .lt("datetime", new Date(Date.parse(`${lastDate}T00:00:00.000Z`) + 2 * DAY_MS).toISOString());
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return ((data ?? []) as Array<{ datetime: string; service_name: string | null }>).map((b) => {
    const iso = new Date(b.datetime).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16), durationMinutes: durationFor(ctx, b.service_name) };
  });
}

export type SlotIssue = HoursProblem | "conflict";
export const isClosedIssue = (p: SlotIssue | null) => p === "closed" || p === "outside_hours" || p === "time_off";

/** Why this slot can't be booked, or null when it can. Every booking path calls this. */
export async function checkSlot(admin: any, tenantId: string, ctx: BookingContext, date: string, time: string, service: string | null, excludeId?: string | null): Promise<SlotIssue | null> {
  const durationMinutes = durationFor(ctx, service);
  const problem = slotProblem({ date, time, durationMinutes, now: ctx.now, hours: ctx.hours, timeOff: ctx.timeOff });
  if (problem) return problem;
  const start = Date.parse(`${date}T${time}:00.000Z`), end = start + durationMinutes * 60_000;
  const booked = await bookedBetween(admin, tenantId, ctx, date, date, excludeId);
  const clash = booked.some((b) => {
    const s = Date.parse(`${b.date}T${b.time}:00.000Z`);
    return start < s + b.durationMinutes * 60_000 && s < end;
  });
  return clash ? "conflict" : null;
}

export async function listFreeSlots(admin: any, tenantId: string, ctx: BookingContext, date: string, service: string | null, excludeId?: string | null) {
  if (availableWindows(date, ctx.hours, ctx.timeOff).length === 0) return { closed: true, slots: [] as string[], hoursKnown: !!ctx.hours };
  const booked = await bookedBetween(admin, tenantId, ctx, date, date, excludeId);
  const slots = freeSlots({ date, hours: ctx.hours, timeOff: ctx.timeOff, booked: booked.filter((b) => b.date === date), now: ctx.now, step: SLOT_STEP_MINUTES, duration: durationFor(ctx, service) });
  return { closed: false, slots, hoursKnown: !!ctx.hours };
}

/** The soonest bookable times at or after a requested moment. */
export async function nearestSlots(admin: any, tenantId: string, ctx: BookingContext, date: string, time: string, service: string | null, excludeId?: string | null, count = 3): Promise<Array<{ date: string; time: string }>> {
  const from = date < ctx.now.date ? ctx.now.date : date;
  const booked = await bookedBetween(admin, tenantId, ctx, from, addDaysISO(from, NEAREST_SEARCH_DAYS), excludeId);
  const duration = durationFor(ctx, service);
  const out: Array<{ date: string; time: string }> = [];
  for (let i = 0; i <= NEAREST_SEARCH_DAYS && out.length < count; i++) {
    const day = addDaysISO(from, i);
    const slots = freeSlots({ date: day, hours: ctx.hours, timeOff: ctx.timeOff, booked: booked.filter((b) => b.date === day), now: ctx.now, step: SLOT_STEP_MINUTES, duration });
    for (const t of slots) {
      if (i === 0 && date === from && t < time) continue;
      out.push({ date: day, time: t });
      if (out.length >= count) break;
    }
  }
  return out;
}

export { toTimeText };

/** One line, no control characters, capped. Empty string when not a string. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
