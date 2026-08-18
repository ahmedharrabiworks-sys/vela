/**
 * Shared, channel-agnostic real-time appointment availability logic.
 *
 * Root cause this fixes: the AI would say things like "let me check the
 * availability... and get back to you shortly" and then never actually
 * check anything or follow up -- a permanent stall. The system already had
 * the real appointments table available; nothing was ever queried against
 * the specific date/time the customer asked for. This module gives every
 * channel (Website/WhatsApp/Instagram via api/ai/reply, Phone via
 * call-webhook) the same deterministic, real DB-backed answer: query real
 * bookings near the requested time, decide conflict/no-conflict, and (if
 * conflicting) compute real alternative slots from the tenant's actual
 * schedule -- never invented times.
 *
 * Appointments has no per-service duration column (confirmed against
 * schema.sql + all migrations touching the table), so a fixed buffer is
 * used as the conflict window on both sides of a booked time. 60 minutes
 * is a reasonable default across the business types this product targets
 * (clinics, salons, gyms, etc.) -- a real per-service duration would
 * require a schema change and is out of scope here.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULT_SLOT_MINUTES = 60;

export interface BookedSlot {
  datetime: string;
  service_name?: string | null;
}

export interface AvailabilityResult {
  requested: Date;
  conflict: boolean;
  conflictingSlot: BookedSlot | null;
  alternatives: Date[];
}

/**
 * Formats a real, already-fetched list of booked slots into the shared
 * prompt block used by every channel. Pulled out of api/ai/reply/route.ts
 * so Phone (call-webhook) renders the identical format.
 */
export function formatBookedSlotsText(bookedSlots: BookedSlot[] | null | undefined): string {
  if (!bookedSlots || bookedSlots.length === 0) return "";
  return (
    "\nAlready booked slots (DO NOT double-book these):\n" +
    bookedSlots
      .map((b) => {
        const dt = new Date(b.datetime);
        return `• ${dt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}${b.service_name ? ` (${b.service_name})` : ""}`;
      })
      .join("\n")
  );
}

/**
 * Deterministically checks a single candidate date/time against the tenant's
 * REAL appointments (targeted query, not the possibly-truncated general
 * "upcoming bookings" list used for display) and, if it conflicts, computes
 * real nearby free alternatives from the tenant's actual schedule.
 *
 * Returns null when the candidate can't be parsed, or is more than a few
 * minutes in the past (the model's own "Current date & time" context in the
 * prompt handles that case more naturally than a canned directive would).
 */
export async function checkAvailability(
  admin: any,
  tenantId: string,
  requestedISO: string,
  slotMinutes: number = DEFAULT_SLOT_MINUTES,
): Promise<AvailabilityResult | null> {
  const requested = new Date(requestedISO);
  if (isNaN(requested.getTime())) return null;
  if (requested.getTime() < Date.now() - 5 * 60_000) return null;

  const bufferMs = slotMinutes * 60_000;

  const { data: nearby } = await admin
    .from("appointments")
    .select("datetime, service_name")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("datetime", new Date(requested.getTime() - bufferMs).toISOString())
    .lte("datetime", new Date(requested.getTime() + bufferMs).toISOString())
    .order("datetime", { ascending: true })
    .limit(1);

  const conflictingSlot = ((nearby as BookedSlot[] | null) ?? [])[0] ?? null;

  const alternatives: Date[] = [];
  if (conflictingSlot) {
    // One wider query covering the rest of the day plus the same time next
    // day, then walk hourly candidate slots against it -- real gaps computed
    // from the tenant's actual schedule, not invented times.
    const { data: rangeBookings } = await admin
      .from("appointments")
      .select("datetime")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("datetime", new Date(requested.getTime() - bufferMs).toISOString())
      .lte("datetime", new Date(requested.getTime() + 26 * 60 * 60_000).toISOString())
      .order("datetime", { ascending: true });

    const bookedTimes = ((rangeBookings as { datetime: string }[] | null) ?? [])
      .map((b) => new Date(b.datetime).getTime())
      .filter((ts) => !isNaN(ts));

    for (let step = 1; step <= 6 && alternatives.length < 3; step++) {
      const candidate = new Date(requested.getTime() + step * bufferMs);
      if (!bookedTimes.some((ts) => Math.abs(ts - candidate.getTime()) < bufferMs)) {
        alternatives.push(candidate);
      }
    }
    if (alternatives.length < 3) {
      const nextDaySame = new Date(requested.getTime() + 24 * 60 * 60_000);
      if (!bookedTimes.some((ts) => Math.abs(ts - nextDaySame.getTime()) < bufferMs)) {
        alternatives.push(nextDaySame);
      }
    }
  }

  return {
    requested,
    conflict: !!conflictingSlot,
    conflictingSlot,
    alternatives: alternatives.slice(0, 3),
  };
}

/**
 * Renders an AvailabilityResult into an authoritative system-prompt block
 * that forbids the exact stall pattern this fix targets. Injected fresh
 * into the SAME reply turn the customer asked in -- see api/ai/reply's
 * pre-flight extraction step for how the candidate datetime is resolved.
 */
export function formatAvailabilityDirective(result: AvailabilityResult): string {
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const requestedLabel = fmt(result.requested);

  if (!result.conflict) {
    return `\n\nREAL-TIME AVAILABILITY CHECK (already run by the system for this exact message — current as of right now):
Requested time: ${requestedLabel}
Result: AVAILABLE — no conflicting appointment found in the real schedule.
Still confirm it falls within working hours above before finalizing. If it does, confirm the slot immediately in your reply and move to finalize the booking (collect any missing required detail such as name/phone/service, then confirm with "Booked ✓"). Do NOT say "let me check and get back to you" — the check is already done.`;
  }

  const altText = result.alternatives.length > 0
    ? result.alternatives.map(fmt).join("; ")
    : "none found nearby — offer to check a different day";

  return `\n\nREAL-TIME AVAILABILITY CHECK (already run by the system for this exact message — current as of right now):
Requested time: ${requestedLabel}
Result: NOT AVAILABLE — conflicts with an existing booking${result.conflictingSlot?.service_name ? ` (${result.conflictingSlot.service_name})` : ""} at that time.
Real alternative times that ARE free: ${altText}
State clearly in your reply that this exact time is taken, then offer these specific alternatives. Do NOT say "let me check and get back to you" — the check is already done.`;
}
