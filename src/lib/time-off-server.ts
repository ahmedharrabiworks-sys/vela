/* eslint-disable @typescript-eslint/no-explicit-any */
import { timeOffLabel, validateTimeOff, nextOccurrence, type TimeOff, type TimeOffInput, toMinutes } from "@/lib/time-off";
import { addDaysISO } from "@/lib/opening-hours";

const COLS = "id, start_date, end_date, start_time, end_time, reason";

/** True while migration_v43.sql has not been run. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === "PGRST205" || error.code === "42P01");
}

const clean = (o: TimeOff): TimeOff => ({ ...o, start_time: o.start_time?.slice(0, 5) ?? null, end_time: o.end_time?.slice(0, 5) ?? null });

/** Never throws: without the table, nothing is blocked and bookings carry on. */
export async function loadTimeOff(admin: any, tenantId: string, fromDate: string): Promise<TimeOff[]> {
  try {
    const { data, error } = await admin.from("business_time_off").select(COLS).eq("tenant_id", tenantId).gte("end_date", fromDate).order("start_date", { ascending: true }).limit(200);
    if (error) {
      if (!isMissingTable(error)) console.error("[time-off] load failed:", error.message);
      return [];
    }
    return ((data ?? []) as TimeOff[]).map(clean);
  } catch (err) {
    console.error("[time-off] load error:", (err as Error)?.message);
    return [];
  }
}

export interface AffectedAppointment { id: string; name: string; service: string; date: string; time: string }

/** Active bookings that fall inside a block, so the owner can decide. */
export async function appointmentsInBlock(admin: any, tenantId: string, v: TimeOffInput): Promise<AffectedAppointment[]> {
  const { data } = await admin
    .from("appointments")
    .select("id, datetime, service_name, leads(name)")
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "confirmed"])
    .is("deleted_at", null)
    .gte("datetime", `${v.start_date}T00:00:00.000Z`)
    .lt("datetime", `${addDaysISO(v.end_date, 1)}T00:00:00.000Z`)
    .order("datetime", { ascending: true })
    .limit(100);
  return ((data ?? []) as any[])
    .map((a) => {
      const iso = new Date(a.datetime).toISOString();
      return { id: a.id as string, name: (a.leads?.name as string | null) ?? "", service: (a.service_name as string | null) ?? "", date: iso.slice(0, 10), time: iso.slice(11, 16) };
    })
    .filter((a) => {
      if (!v.start_time || !v.end_time) return true;
      const m = toMinutes(a.time);
      return m >= toMinutes(v.start_time) && m < toMinutes(v.end_time);
    });
}

export async function insertTimeOff(admin: any, tenantId: string, userId: string, v: TimeOffInput): Promise<{ row?: TimeOff; missingTable?: boolean; error?: string }> {
  const { data, error } = await admin.from("business_time_off").insert({ tenant_id: tenantId, created_by: userId, ...v }).select(COLS).single();
  if (error) {
    if (isMissingTable(error)) return { missingTable: true };
    console.error("[time-off] insert failed:", error.message);
    return { error: "save_failed" };
  }
  return { row: clean(data as TimeOff) };
}

export async function deleteTimeOff(admin: any, tenantId: string, id: string): Promise<boolean> {
  const { data, error } = await admin.from("business_time_off").delete().eq("id", id).eq("tenant_id", tenantId).select("id");
  if (error) {
    console.error("[time-off] delete failed:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

/**
 * The owner's own words must be a clear yes to a question the assistant just
 * asked. This is checked on the real message, so a model that skips the
 * confirmation step cannot save anything.
 */
export function isConfirmationReply(message: string | undefined, history: Array<{ role: string; content: string }>): boolean {
  const last = [...history].reverse().find((h) => h.role === "assistant");
  if (!last || !/[?؟]/.test(last.content)) return false;
  const text = (message ?? "").trim().toLowerCase().replace(/[.!,،]+$/g, "");
  if (text.length > 40) return false;
  return /^(yes|yeah|yep|yup|sure|ok|okay|confirm|confirmed|correct|go ahead|do it|please do|yes please|save it|block it|remove it)\b|^(نعم|اي|إي|ايوه|أيوه|ايوا|تمام|اكيد|أكيد|موافق|طيب|زين|احفظ|أكد|اكد|سجل|سجّل|يلا|ماشي)(\s|$)/.test(text);
}

const asLabel = (v: TimeOffInput) => ({ en: timeOffLabel(v, "en"), ar: timeOffLabel(v, "ar") });

export interface RawRange { startDate?: unknown; endDate?: unknown; startTime?: unknown; endTime?: unknown; reason?: unknown }

export async function previewRanges(admin: any, tenantId: string, ranges: RawRange[], today: string) {
  const items = [];
  for (const raw of ranges.slice(0, 10)) {
    const check = validateTimeOff(raw, today);
    if (!check.ok) {
      items.push(check.error === "past" && typeof raw.startDate === "string"
        ? { past: true, askOwner: `That date has passed. Ask if they meant ${nextOccurrence(raw.startDate)}. Do not save anything yet.`, nextOccurrence: nextOccurrence(raw.startDate) }
        : { error: check.error });
      continue;
    }
    const appointments = await appointmentsInBlock(admin, tenantId, check.value);
    items.push({ ...check.value, label: asLabel(check.value), appointmentsBooked: appointments.length, appointments });
  }
  return items;
}
