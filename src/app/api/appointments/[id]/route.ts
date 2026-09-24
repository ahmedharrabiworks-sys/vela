import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/appointments/[id]
 *
 * Permanently deletes an appointment (Recycle Bin's "Delete Permanently", 
 * the row must already be soft-deleted; this is never the first delete
 * action). Auth-gated: the appointment's tenant must be owned by the
 * calling user.
 *
 * Root cause this fixes (found live in production): a hard-deleted
 * appointment's row disappears, but nothing ever touched the linked
 * conversation's stored message transcript -- ai/reply/route.ts feeds the
 * last 20 messages back to GPT as context on every turn, so the model kept
 * trusting its own earlier "Booked ✓" reply over the (correctly empty) live
 * DB query and told the customer their cancelled/removed appointment was
 * still confirmed. Reproduced live: seeded a real booking, hard-deleted it
 * via the exact same plain client-side delete this route replaces, asked
 * "is my appointment still confirmed?" again -- got "Yes, your appointment
 * is confirmed." (wrong).
 *
 * Fix: before deleting the row, capture its conversation_id/service_name/
 * datetime, then (if it belongs to a real conversation) insert a role
 * "system" message into that conversation's transcript stating plainly that
 * this specific appointment was cancelled and removed. Appending a note
 * rather than editing/removing the AI's original "Booked ✓" message was the
 * deliberate choice here: there's no appointment_id column on messages to
 * reliably identify which prior message(s) to touch (would need a new
 * migration), and rewriting conversation history a human might reopen later
 * is worse for readability than one clear trailing note. A "system" role is
 * already a valid value in the messages.role CHECK constraint (schema.sql)
 * and OpenAI's chat.completions API accepts a system-role message anywhere
 * in the array, not just at index 0 -- it reaches the model with the same
 * (or higher) instructional weight as a normal turn, and the Conversations
 * page's bubble rendering (msg.role === "user" ? left : right) shows it as a
 * plain right-side note with no "Vela AI" attribution, since that label is
 * gated on role === "assistant" specifically.
 *
 * This is the primary fix (the actual data lie is corrected at the source).
 * A second-layer instruction was also added to ai/reply/route.ts's system
 * prompt telling the model to always trust the live-injected booking
 * sections over anything said earlier in the conversation -- defense in
 * depth, not a substitute for this.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .select("id, conversation_id, service_name, datetime, tenants!inner(owner_id)")
    .eq("id", params.id)
    .single();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (appt.tenants as any)?.owner_id;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteErr } = await admin
    .from("appointments")
    .delete()
    .eq("id", params.id);

  if (deleteErr) {
    console.error("[appointments/[id]] hard delete failed:", deleteErr.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  const conversationId = appt.conversation_id as string | null;
  if (conversationId) {
    const when = new Date(appt.datetime as string).toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });
    const serviceName = (appt.service_name as string | null) || "appointment";
    const { data: conv } = await admin
      .from("conversations")
      .select("id, tenant_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conv) {
      const { error: noteErr } = await admin.from("messages").insert({
        conversation_id: conversationId,
        tenant_id: conv.tenant_id,
        role: "system",
        content: `[This ${serviceName} appointment (previously scheduled for ${when}) was cancelled and permanently removed. It is no longer active -- do not tell the customer it is still confirmed.]`,
        is_test: false,
      });
      if (noteErr) {
        // Non-fatal -- the appointment is already gone either way. Worst
        // case without this note landing is the second-layer system-prompt
        // instruction alone (still an improvement over neither fix).
        console.error("[appointments/[id]] transcript note insert failed:", noteErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
