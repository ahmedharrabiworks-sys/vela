/**
 * Real booking capture for the inbound phone agent (Vapi book_appointment
 * tool, served by api/ai-agent/call-webhook).
 *
 * Replaces the old end-of-call regex ("summary mentions book/appointment")
 * that inserted an appointment at a made-up "now + 24h". Now the caller's
 * exact confirmed date/time/service/name/phone arrive as structured tool
 * arguments DURING the call, are checked against the SAME availability and
 * double-booking logic the text AI uses (lib/availability.ts
 * checkAvailability, per-service durations), and the result is spoken back
 * to the caller in the same turn.
 *
 * Time convention: identical to every other channel. Appointments store the
 * literal local wall-clock time with a Z suffix and are displayed with
 * timeZone "UTC", so a 15:00 Doha booking is saved as ...T15:00:00.000Z.
 * "Today"/"past" are judged in the tenant's timezone (default Asia/Qatar).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { checkAvailability, DEFAULT_SLOT_MINUTES, type ServiceDuration } from "@/lib/availability";
import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { createNotification } from "@/lib/notifications";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";
import { isReliableCallerId, resolveTenantTimezone, wallClockNow } from "@/lib/vapi-webhook";

export interface BookAppointmentArgs {
  customer_name?: unknown;
  customer_phone?: unknown;
  service?: unknown;
  date?: unknown;
  time?: unknown;
}

export interface PhoneBookingInput {
  tenantId: string;
  args: BookAppointmentArgs;
  callId: string | null;
  callerNumber: string | null;
}

export interface PhoneBookingResult {
  status: "booked" | "already_booked" | "conflict" | "existing_appointment" | "invalid" | "error";
  /** Spoken back to the caller by the assistant, verbatim in meaning. */
  message: string;
  appointmentId?: string;
  datetime?: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** "15:30", "3:30 PM", "3pm", "1530" -> "15:30"; null if not a real time. */
export function normalizeTime(raw: string): string | null {
  const m = raw.trim().toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?::|\.|h)?(\d{2})?(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.replace(/\./g, "");
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Strict YYYY-MM-DD that is a real calendar date. */
export function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}`) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Wall-clock label, same rendering convention as the dashboard (timeZone UTC). */
export function spokenWhen(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  });
}

export async function bookAppointmentFromCall(admin: any, input: PhoneBookingInput): Promise<PhoneBookingResult> {
  const { tenantId, args, callId, callerNumber } = input;

  const name = str(args.customer_name);
  const spokenPhone = str(args.customer_phone);
  const serviceRaw = str(args.service);
  const date = normalizeDate(str(args.date));
  const time = normalizeTime(str(args.time));

  const missing = [
    !name && "the caller's name",
    !spokenPhone && "the caller's phone number",
    !serviceRaw && "the service",
    !date && "a valid date",
    !time && "a valid time",
  ].filter(Boolean);
  if (missing.length > 0) {
    return { status: "invalid", message: `Not booked yet. Still missing: ${missing.join(", ")}. Ask the caller for it, confirm it, then try again.` };
  }

  // Tenant context: timezone, real services (with durations), own numbers.
  const [{ data: cfg }, { data: tenant }] = await Promise.all([
    admin.from("tenant_config")
      .select("knowledge_base, agent_settings, vapi_phone_number")
      .eq("tenant_id", tenantId).maybeSingle(),
    admin.from("tenants").select("phone").eq("id", tenantId).maybeSingle(),
  ]);
  const parse = (raw: unknown) => {
    if (!raw) return {};
    try { return (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>; } catch { return {}; }
  };
  const settings = parse(cfg?.agent_settings);
  const kb = parseKnowledgeBase(cfg?.knowledge_base);
  const services = ((kb.services as ServiceDuration[] | undefined) ?? []).filter((s) => s && typeof s.name === "string");
  const timezone = resolveTenantTimezone(settings);

  // Use the exact real service name when the caller's matches one (so the
  // per-service duration in checkAvailability resolves), else keep theirs.
  const realService = services.find((s) => s.name.trim().toLowerCase() === serviceRaw.toLowerCase());
  const serviceName = realService?.name ?? serviceRaw;

  const requestedISO = `${date}T${time}:00.000Z`;
  const requested = new Date(requestedISO);
  const now = wallClockNow(timezone);
  if (requested.getTime() < now.asDate.getTime() - 5 * 60_000) {
    return { status: "invalid", message: `Not booked: ${spokenWhen(requested)} is already in the past (it is now ${now.time} on ${now.date}, ${timezone}). Ask the caller for a future day and time.` };
  }

  // Caller identity (Addition A): only a trustworthy caller ID may be used
  // to merge with an existing lead. Missing/anonymous/the business's own
  // number/the bridge number => a separate lead for this call.
  const reliable = isReliableCallerId(callerNumber, [tenant?.phone, cfg?.vapi_phone_number]);

  // Idempotency: Vapi can retry a tool call. A lead already tied to THIS
  // call with the SAME slot booked means it's done; say so again.
  let lead: { id: string } | null = null;
  if (callId) {
    const { data } = await admin.from("leads").select("id")
      .eq("tenant_id", tenantId).eq("form_data->>last_vapi_call_id", callId)
      .is("deleted_at", null).limit(1).maybeSingle();
    lead = data ?? null;
  }
  if (!lead && reliable) {
    const { data } = await admin.from("leads").select("id")
      .eq("tenant_id", tenantId).eq("channel", "phone").eq("phone", callerNumber)
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    lead = data ?? null;
  }

  if (lead) {
    // Same rule as the text AI: one active (future, not cancelled)
    // appointment per customer at a time.
    const { data: active } = await admin.from("appointments")
      .select("id, datetime, service_name")
      .eq("tenant_id", tenantId).eq("lead_id", lead.id)
      .neq("status", "cancelled").is("deleted_at", null)
      .gte("datetime", now.asDate.toISOString())
      .order("datetime", { ascending: true }).limit(1).maybeSingle();
    if (active) {
      const activeWhen = new Date(active.datetime);
      if (activeWhen.getTime() === requested.getTime()) {
        return { status: "already_booked", message: `Already booked: ${active.service_name || serviceName} on ${spokenWhen(activeWhen)}. Confirm this to the caller.`, appointmentId: active.id, datetime: active.datetime };
      }
      return { status: "existing_appointment", message: `Not booked: this caller already has an active appointment (${active.service_name || "appointment"} on ${spokenWhen(activeWhen)}). Only one active appointment is allowed at a time. Tell them, and offer to have the team call back to change it.` };
    }
  }

  // Same availability + double-booking logic as the text AI.
  const availability = await checkAvailability(admin, tenantId, requestedISO, DEFAULT_SLOT_MINUTES, serviceName, services);
  if (!availability) {
    return { status: "invalid", message: "Not booked: that date and time could not be checked. Ask the caller to repeat the day and time." };
  }
  if (availability.conflict) {
    const alts = availability.alternatives.map(spokenWhen);
    return {
      status: "conflict",
      message: `Not booked: ${spokenWhen(requested)} is already taken. ${alts.length > 0 ? `Real free alternatives: ${alts.join("; ")}.` : "No free slot nearby, ask for a different day."} Offer these to the caller.`,
    };
  }

  const callerPhoneForLead = reliable ? callerNumber! : spokenPhone;
  const formData: Record<string, unknown> = {
    service: serviceName,
    source: "phone_call",
    last_vapi_call_id: callId,
    caller_id: callerNumber ?? null,
    caller_id_reliable: reliable,
    ...(reliable && spokenPhone && spokenPhone !== callerNumber ? { phone_given: spokenPhone } : {}),
  };

  try {
    if (lead) {
      const { data: existing } = await admin.from("leads").select("form_data").eq("id", lead.id).maybeSingle();
      await admin.from("leads").update({
        name,
        status: "booked",
        form_data: { ...((existing?.form_data as Record<string, unknown>) ?? {}), ...formData },
      }).eq("id", lead.id).eq("tenant_id", tenantId);
    } else {
      const { data: created, error: leadErr } = await admin.from("leads").insert({
        tenant_id: tenantId,
        name,
        phone: callerPhoneForLead,
        phone_unconfirmed: !hasConfirmedCountryCode(callerPhoneForLead),
        channel: "phone",
        status: "booked",
        form_data: formData,
      }).select("id").single();
      if (leadErr || !created) throw new Error(`lead insert failed: ${leadErr?.message ?? "no row"}`);
      lead = created;
    }

    const { data: appt, error: apptErr } = await admin.from("appointments").insert({
      tenant_id: tenantId,
      lead_id: lead!.id,
      service_name: serviceName,
      datetime: requestedISO,
      status: "confirmed",
      notes: `Booked by the phone agent. Phone given on the call: ${spokenPhone}.${reliable ? "" : " Caller ID was missing, anonymous or the business's own number."}`,
    }).select("id, datetime").single();
    if (apptErr || !appt) throw new Error(`appointment insert failed: ${apptErr?.message ?? "no row"}`);

    await createNotification(admin, {
      tenantId,
      type: "appointment",
      title: "New appointment booked by phone",
      body: `${name}, ${serviceName}, ${spokenWhen(requested)}`,
      link: "/app/appointments",
    });

    return {
      status: "booked",
      message: `Booked: ${serviceName} for ${name} on ${spokenWhen(requested)}. Confirm this back to the caller.`,
      appointmentId: appt.id,
      datetime: appt.datetime,
    };
  } catch (err: any) {
    console.error("[phone-booking] booking failed:", err?.message ?? err);
    return { status: "error", message: "Not booked: the booking system had an error. Apologize, and tell the caller the team will call them back to confirm." };
  }
}
