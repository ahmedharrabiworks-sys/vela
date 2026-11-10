import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { UUID_RE } from "@/lib/appointment-slots";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_ITEMS = 200;

/**
 * POST /api/conversations/delete { items: [{ kind: "chat" | "call", id }] }
 * Permanent delete of inbox items, one or many, always inside the caller's
 * own tenant. Appointments are kept; only their link to the thread goes.
 *
 * A call's content is erased but an anonymous row stays (duration and date
 * only, filed as call_type "training", which every customer-facing surface
 * already ignores). Plan usage is summed from these rows, so removing them
 * outright would let an account reset its voice minutes by deleting calls.
 */
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { items?: unknown } | null;
  const items = Array.isArray(body?.items) ? body.items as Array<{ kind?: unknown; id?: unknown }> : [];
  if (items.length === 0 || items.length > MAX_ITEMS) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const valid = items.every((i) => (i?.kind === "chat" || i?.kind === "call") && typeof i?.id === "string" && UUID_RE.test(i.id));
  if (!valid) return NextResponse.json({ error: "invalid" }, { status: 400 });

  let tenant;
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  const admin = createSupabaseAdmin() as any;
  const chatIds = items.filter((i) => i.kind === "chat").map((i) => i.id as string);
  const callIds = items.filter((i) => i.kind === "call").map((i) => i.id as string);
  let deleted = 0;

  if (chatIds.length > 0) {
    const { data: owned } = await admin.from("conversations").select("id").eq("tenant_id", tenant.id).in("id", chatIds);
    const ids = ((owned ?? []) as Array<{ id: string }>).map((c) => c.id);
    if (ids.length > 0) {
      await admin.from("appointments").update({ conversation_id: null }).eq("tenant_id", tenant.id).in("conversation_id", ids);
      const { error: msgErr } = await admin.from("messages").delete().in("conversation_id", ids);
      if (msgErr) console.error("[conversations/delete] messages:", msgErr.message);
      const { error } = await admin.from("conversations").delete().eq("tenant_id", tenant.id).in("id", ids);
      if (error) {
        console.error("[conversations/delete] conversations:", error.message);
        return NextResponse.json({ error: "delete_failed" }, { status: 500 });
      }
      deleted += ids.length;
    }
  }

  if (callIds.length > 0) {
    const { data: owned } = await admin.from("agent_calls").select("id, appointment_booked").eq("tenant_id", tenant.id).in("id", callIds);
    const rows = (owned ?? []) as Array<{ id: string; appointment_booked: { appointmentId?: string } | null }>;
    if (rows.length > 0) {
      // The appointment stays, without the deleted call's summary in its notes.
      for (const apptId of rows.map((r) => r.appointment_booked?.appointmentId).filter((x): x is string => !!x)) {
        const { data: appt } = await admin.from("appointments").select("notes").eq("id", apptId).eq("tenant_id", tenant.id).maybeSingle();
        if (typeof appt?.notes === "string" && appt.notes.includes("Call summary:")) {
          await admin.from("appointments").update({ notes: appt.notes.replace(/\s*Call summary:[\s\S]*$/, "").trim() || null }).eq("id", apptId).eq("tenant_id", tenant.id);
        }
      }
      const { error } = await admin.from("agent_calls").update({
        call_type: "training",
        transcript: [],
        summary: null,
        caller_number: null,
        outcome: "deleted_by_owner",
        appointment_booked: null,
        kb_extracted: null,
      }).eq("tenant_id", tenant.id).in("id", rows.map((r) => r.id));
      if (error) {
        console.error("[conversations/delete] calls:", error.message);
        return NextResponse.json({ error: "delete_failed" }, { status: 500 });
      }
      deleted += rows.length;
    }
  }

  return NextResponse.json({ deleted });
}
