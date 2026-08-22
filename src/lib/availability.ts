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
 * FIX 4 (round N): appointments still has no per-service duration COLUMN
 * (that remains true -- confirmed against schema.sql + all migrations), but
 * a real per-service duration already exists as free text on each service
 * in Train Your AI (kb.services[].duration, e.g. "60 min", "1 hour", "45
 * minutes") -- it was just never used here. The fixed 60-minute buffer
 * below silently allowed exactly the reported gap: a service that
 * genuinely takes 60 minutes starting at 10:00 AM would let a DIFFERENT
 * appointment be offered/confirmed at 10:30 AM, because the buffer was the
 * same on every check regardless of what was actually booked or being
 * requested. parseDurationMinutes below turns that free text into a real
 * number (falling back to DEFAULT_SLOT_MINUTES only when a service has no
 * duration set or isn't found), and checkAvailability now computes a real
 * [start, start+duration) window for BOTH the requested slot and every
 * existing booked appointment (looked up by its own service_name), and
 * checks true interval overlap between them -- not a same-size buffer on
 * every comparison.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULT_SLOT_MINUTES = 60;

export interface BookedSlot {
  datetime: string;
  service_name?: string | null;
}

export interface ServiceDuration {
  name: string;
  duration?: string | null;
}

/**
 * Parses free-text duration ("60 min", "1 hour", "1.5 hours", "45m", "90",
 * "1-2 hours", "30 - 45 min") into a real minute count. Returns null when
 * the text doesn't contain a recognizable duration -- callers fall back to
 * DEFAULT_SLOT_MINUTES themselves so a missing/unparseable duration never
 * blocks booking, it just uses the same safe default this whole system
 * already relied on.
 *
 * FIX 1 (round O): a service with a RANGE duration ("1 – 2 Hours") must
 * resolve to the MAX end, never the min -- the appointment could genuinely
 * run the full range, and the blocking window has to assume the worst
 * case. The range branch below is matched and resolved explicitly (both
 * numbers captured, Math.max taken) so this is a deterministic guarantee,
 * not an accident of which number the single-value regex happens to match
 * first for a given string format.
 */
export function parseDurationMinutes(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = text.trim().toLowerCase();
  // Range: "1-2 hours", "1 – 2 hours", "30-45 min", "1 to 2 hours" -- one
  // unit word applying to both numbers. Always take the MAX end.
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
  if (m) {
    const max = Math.max(parseFloat(m[1]), parseFloat(m[2]));
    return Math.round(max * (/^h/.test(m[3]) ? 60 : 1));
  }
  // Hours: "1 hour", "1.5 hours", "2h", "1hr"
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  // Minutes: "60 min", "60 minutes", "60m", "60mins"
  m = s.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/);
  if (m) return Math.round(parseFloat(m[1]));
  // Bare number, assumed minutes: "60", "90"
  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Math.round(parseFloat(m[1]));
  return null;
}

/**
 * Looks up a service's real duration by name (case-insensitive, trimmed,
 * exact match).
 *
 * FIX 1 (round O) root cause: a real booked appointment's service_name is
 * whatever the booking-detection GPT call extracted at booking time in
 * api/ai/reply/route.ts section 12 -- that extraction was unconstrained
 * free text, so a service literally named "Real Estate Consulting" got
 * saved as "Real Estate Consultation" (a paraphrase), and the exact-match
 * lookup below silently failed and fell back to DEFAULT_SLOT_MINUTES (60),
 * producing a blocking window of [9:00,10:00) instead of the real
 * [9:00,11:00) for a "1-2 Hours" service -- exactly why a 10:00 AM request
 * was wrongly accepted. Section 12's prompt is now constrained to copy the
 * exact real service name (see that file), which prevents this at the
 * source going forward, but a serviceName here can still fail to match --
 * old rows saved before that fix, a service since renamed/removed, or a
 * still-imperfect extraction. When that happens this NO LONGER falls back
 * to a flat 60-minute guess (which is exactly what caused the bug): it
 * falls back to the LONGEST real, parseable duration among the tenant's
 * OWN services, since assuming the worst case is always the safe direction
 * for a function whose entire purpose is to stop double-booking -- an
 * over-wide window costs a redundant "that slot's taken" once in a while,
 * an under-wide one lets two appointments overlap.
 */
function resolveDurationMinutes(services: ServiceDuration[] | undefined, serviceName: string | null | undefined): number {
  if (serviceName && services) {
    const match = services.find((s) => s.name?.trim().toLowerCase() === serviceName.trim().toLowerCase());
    if (match) {
      const parsed = parseDurationMinutes(match.duration);
      if (parsed !== null && parsed > 0) return parsed;
      // A matched service with no parseable duration (e.g. "Ongoing",
      // "Until Sold", "Project Based") isn't a real calendar-slot service --
      // DEFAULT_SLOT_MINUTES is the deliberate, correct fallback here.
      return DEFAULT_SLOT_MINUTES;
    }
  }
  if (services && services.length > 0) {
    const parseable = services
      .map((s) => parseDurationMinutes(s.duration))
      .filter((d): d is number => d !== null && d > 0);
    if (parseable.length > 0) return Math.max(...parseable);
  }
  return DEFAULT_SLOT_MINUTES;
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
        // FIX 2 (round M): explicit timeZone: "UTC" -- datetime is stored as
        // literal wall-clock digits with no real tenant timezone conversion
        // (see appointments/page.tsx for the full explanation). This text
        // feeds directly into what the customer-facing AI tells customers
        // about booked times; without this it silently depended on the
        // server process's default timezone happening to be UTC.
        return `• ${dt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}${b.service_name ? ` (${b.service_name})` : ""}`;
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
  requestedServiceName?: string | null,
  services?: ServiceDuration[],
): Promise<AvailabilityResult | null> {
  const requested = new Date(requestedISO);
  if (isNaN(requested.getTime())) return null;
  if (requested.getTime() < Date.now() - 5 * 60_000) return null;

  // FIX 4 (round N): the requested slot's real duration -- from the
  // service's own kb.duration when it's known and parseable, otherwise the
  // same DEFAULT_SLOT_MINUTES fallback this always used. `slotMinutes`
  // (still accepted for backward compatibility) is now only the fallback
  // used when no service/duration is resolvable, not a fixed buffer
  // applied to every comparison regardless of what's actually booked.
  const requestedDuration = requestedServiceName
    ? resolveDurationMinutes(services, requestedServiceName)
    : slotMinutes;
  const requestedStart = requested.getTime();
  const requestedEnd = requestedStart + requestedDuration * 60_000;
  // Widened lookup window: a long-duration appointment booked well before
  // the requested time can still genuinely overlap it (e.g. a 2-hour
  // service starting 90 minutes earlier ends after the requested start) --
  // a symmetric small buffer around the requested instant alone would miss
  // that. 4 hours comfortably covers any realistic single-appointment
  // duration on either side while staying a cheap, targeted query.
  const lookupBufferMs = 4 * 60 * 60_000;

  const { data: nearby } = await admin
    .from("appointments")
    .select("datetime, service_name")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("datetime", new Date(requestedStart - lookupBufferMs).toISOString())
    .lte("datetime", new Date(requestedStart + lookupBufferMs).toISOString())
    .order("datetime", { ascending: true });

  const nearbyRows = (nearby as BookedSlot[] | null) ?? [];
  // Real interval overlap: [requestedStart, requestedEnd) intersects
  // [bookedStart, bookedEnd) -- each existing appointment's end is computed
  // from ITS OWN service's real duration, not the requested service's.
  const withWindows = nearbyRows.map((b) => {
    const bookedStart = new Date(b.datetime).getTime();
    const bookedDuration = resolveDurationMinutes(services, b.service_name);
    return { slot: b, bookedStart, bookedEnd: bookedStart + bookedDuration * 60_000 };
  });
  const conflictingRow = withWindows.find(
    (w) => requestedStart < w.bookedEnd && w.bookedStart < requestedEnd,
  );
  const conflictingSlot = conflictingRow?.slot ?? null;

  const alternatives: Date[] = [];
  if (conflictingSlot) {
    // One wider query covering the rest of the day plus the same time next
    // day, then walk candidate slots (stepped by the REQUESTED service's
    // own duration) against every real booked window -- real gaps computed
    // from the tenant's actual schedule, not invented times.
    const { data: rangeBookings } = await admin
      .from("appointments")
      .select("datetime, service_name")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("datetime", new Date(requestedStart - lookupBufferMs).toISOString())
      .lte("datetime", new Date(requestedStart + 26 * 60 * 60_000).toISOString())
      .order("datetime", { ascending: true });

    const bookedWindows = ((rangeBookings as BookedSlot[] | null) ?? [])
      .map((b) => {
        const bookedStart = new Date(b.datetime).getTime();
        if (isNaN(bookedStart)) return null;
        const bookedDuration = resolveDurationMinutes(services, b.service_name);
        return { start: bookedStart, end: bookedStart + bookedDuration * 60_000 };
      })
      .filter((w): w is { start: number; end: number } => w !== null);

    const stepMs = requestedDuration * 60_000;
    const overlapsAny = (candStart: number) => {
      const candEnd = candStart + stepMs;
      return bookedWindows.some((w) => candStart < w.end && w.start < candEnd);
    };

    for (let step = 1; step <= 6 && alternatives.length < 3; step++) {
      const candidateStart = requestedStart + step * stepMs;
      if (!overlapsAny(candidateStart)) {
        alternatives.push(new Date(candidateStart));
      }
    }
    if (alternatives.length < 3) {
      const nextDaySame = requestedStart + 24 * 60 * 60_000;
      if (!overlapsAny(nextDaySame)) {
        alternatives.push(new Date(nextDaySame));
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
  // FIX 2 (round M): explicit timeZone: "UTC" -- same reasoning as the other
  // fmt call above in this file.
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
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
