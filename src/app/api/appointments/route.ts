import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { checkSlot, cleanText, durationFor, loadBookingContext } from "@/lib/appointment-slots";
import { normalizeDate, normalizeTime } from "@/lib/phone-booking";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";
import { isOutsideHours } from "@/lib/time-off";
import { parseDurationMinutes } from "@/lib/availability";
import { resolveWeekStart } from "@/lib/week-start";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_ROWS = 2000;
const PHONE_RE = /^\+?[0-9][0-9\s()-]{5,24}$/;

async function currentTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureTenant(user.id, user.email, user.user_metadata);
}

// The phone agent writes this boilerplate into notes; the owner should only
// see what someone actually wrote. The call summary is shown on its own.
function ownerNotes(raw: string | null): { notes: string | null; callSummary: string | null } {
  if (!raw) return { notes: null, callSummary: null };
  const summary = raw.match(/Call summary:\s*([\s\S]*)$/)?.[1]?.trim() || null;
  if (raw.startsWith("Booked by the phone agent")) return { notes: null, callSummary: summary };
  return { notes: raw.trim() || null, callSummary: summary };
}

function settingsOf(raw: unknown): Record<string, unknown> {
  try { return ((typeof raw === "string" ? JSON.parse(raw) : raw) ?? {}) as Record<string, unknown>; } catch { return {}; }
}

export async function GET() {
  let tenant;
  try {
    tenant = await currentTenant();
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as any;
  const ctx = await loadBookingContext(admin, tenant.id);
  const [{ data: rows, error }, { data: calls }, { data: cfg }, { data: owner }] = await Promise.all([
    admin
      .from("appointments")
      .select("id, service_name, datetime, status, notes, conversation_id, rescheduled, leads(name, phone, phone_unconfirmed, channel)")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("datetime", { ascending: false })
      .limit(MAX_ROWS),
    admin
      .from("agent_calls")
      .select("id, summary, appointment_booked")
      .eq("tenant_id", tenant.id)
      .eq("call_type", "live")
      .not("appointment_booked", "is", null)
      .limit(MAX_ROWS),
    admin.from("tenant_config").select("vapi_phone_number, agent_settings").eq("tenant_id", tenant.id).maybeSingle(),
    admin.from("tenants").select("phone").eq("id", tenant.id).maybeSingle(),
  ]);
  if (error) {
    console.error("[appointments] list failed:", error.message);
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }

  const callByAppointment = new Map<string, { id: string; summary: string | null }>();
  for (const c of (calls ?? []) as Array<{ id: string; summary: string | null; appointment_booked: { appointmentId?: string } | null }>) {
    const apptId = c.appointment_booked?.appointmentId;
    if (apptId) callByAppointment.set(apptId, { id: c.id, summary: c.summary });
  }

  const appointments = ((rows ?? []) as any[]).map((a) => {
    // Stored digits are the wall-clock time; never convert them.
    const iso = new Date(a.datetime).toISOString();
    const lead = a.leads as { name: string | null; phone: string | null; phone_unconfirmed: boolean | null; channel: string | null } | null;
    const call = callByAppointment.get(a.id) ?? null;
    const { notes, callSummary } = ownerNotes(a.notes as string | null);
    return {
      id: a.id as string,
      name: lead?.name ?? "",
      phone: lead?.phone ?? "",
      phoneUnconfirmed: lead?.phone_unconfirmed === true,
      service: (a.service_name as string | null) ?? "",
      date: iso.slice(0, 10),
      time: iso.slice(11, 16),
      durationMinutes: durationFor(ctx, a.service_name as string | null),
      outsideHours: (a.status === "pending" || a.status === "confirmed") && isOutsideHours(iso.slice(0, 10), iso.slice(11, 16), durationFor(ctx, a.service_name as string | null), ctx.hours, ctx.timeOff),
      status: a.status as string,
      channel: lead?.channel ?? "manual",
      notes,
      conversationId: (a.conversation_id as string | null) ?? null,
      rescheduled: a.rescheduled === true,
      callId: call?.id ?? null,
      callSummary: call?.summary ?? callSummary,
    };
  });

  return NextResponse.json({
    now: { date: ctx.now.date, time: ctx.now.time },
    hours: ctx.hours,
    timeOff: ctx.timeOff,
    // Day table rows: the shortest real service, else 30 minutes.
    slotMinutes: (() => { const d = ctx.services.map((s) => parseDurationMinutes(s.duration)).filter((x): x is number => !!x && x >= 10 && x <= 240); return d.length ? Math.min(...d) : 30; })(),
    services: ctx.services.map((s) => s.name),
    phoneLinked: !!cfg?.vapi_phone_number,
    weekStart: resolveWeekStart(settingsOf(cfg?.agent_settings).weekStart, owner?.phone as string | null),
    viewKey: tenant.id,
    appointments,
  });
}

// Owner adds an appointment by hand. A manual booking has no lead channel
// (NULL), which is how it stays out of "Booked by AI".
export async function POST(req: NextRequest) {
  let tenant;
  try {
    tenant = await currentTenant();
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid" }, { status: 400 });

  const name = cleanText(body.name, 100);
  const service = cleanText(body.service, 120);
  const phone = cleanText(body.phone, 32);
  const notes = cleanText(body.notes, 500);
  const date = typeof body.date === "string" ? normalizeDate(body.date) : null;
  const time = typeof body.time === "string" ? normalizeTime(body.time) : null;
  if (!name || !service || !date || !time) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (phone && !PHONE_RE.test(phone)) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const admin = createSupabaseAdmin() as any;
  const ctx = await loadBookingContext(admin, tenant.id);
  const problem = await checkSlot(admin, tenant.id, ctx, date, time, service);
  if (problem) return NextResponse.json({ error: problem }, { status: 409 });

  const { data: lead, error: leadErr } = await admin.from("leads").insert({
    tenant_id: tenant.id,
    name,
    phone: phone || null,
    phone_unconfirmed: phone ? !hasConfirmedCountryCode(phone) : false,
    channel: null,
    status: "booked",
    form_data: { service, source: "manual" },
  }).select("id").single();
  if (leadErr || !lead) {
    console.error("[appointments] manual lead failed:", leadErr?.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const { data: appt, error: apptErr } = await admin.from("appointments").insert({
    tenant_id: tenant.id,
    lead_id: lead.id,
    service_name: service,
    datetime: `${date}T${time}:00.000Z`,
    status: "confirmed",
    notes: notes || null,
  }).select("id").single();
  if (apptErr || !appt) {
    console.error("[appointments] manual appointment failed:", apptErr?.message);
    await admin.from("leads").delete().eq("id", lead.id).eq("tenant_id", tenant.id);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await createNotification(admin, {
    tenantId: tenant.id,
    type: "appointment",
    title: "Appointment added",
    body: `${name}, ${service}, ${date} ${time}`,
    link: "/app/appointments",
  });

  return NextResponse.json({ id: appt.id }, { status: 201 });
}
