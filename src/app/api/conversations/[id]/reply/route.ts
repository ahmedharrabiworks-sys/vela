import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";
import { sendInstagramMessage } from "@/lib/instagram-send";

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/reply
 * Owner takeover — saves a real message to DB and delivers it via the conversation's channel.
 * Auth-gated: the conversation must belong to a tenant owned by the calling user.
 *
 * Body: { text: string }
 * Response:
 *   200 { ok: true }                    — message saved and delivered
 *   200 { ok: true, channelError }      — message saved to DB; channel delivery failed (not fatal)
 *   200 { ok: true, channelNote }       — message saved; channel has no delivery mechanism (website)
 *   400 { error }                       — bad request
 *   401 { error }                       — not authenticated
 *   403 { error }                       — not owner
 *   404 { error }                       — conversation not found
 *   500 { error }                       — DB insert failed
 *
 * Channel behavior:
 *   whatsapp  — saves to DB + sends via Meta Graph API v22.0 to the customer's phone number
 *   instagram — saves to DB + sends via Meta Graph API v22.0 to the customer's Instagram PSID
 *   website   — saves to DB only (widget is stateless; customer won't see it live)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { text } = body as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Verify ownership — same join pattern as conversations/[id]/resolve
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, tenant_id, channel, customer_name, lead_id, tenants!inner(owner_id)")
    .eq("id", params.id)
    .single();

  if (convErr || !conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (conv.tenants as any)?.owner_id;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = conv.tenant_id as string;
  const channel = conv.channel as string;

  // Save to DB first — DB is source of truth regardless of channel delivery outcome
  // is_owner_reply distinguishes this from a real AI-generated reply (both
  // use role="assistant") -- see migration_v27.sql. Without it, the inbox
  // labeled the owner's own message "Vela AI".
  //
  // Fallback: if migration_v27.sql hasn't been run yet in this environment,
  // is_owner_reply doesn't exist and PostgREST rejects the WHOLE row
  // (PGRST204) -- not just that field. Retrying without it means a pending
  // migration degrades the owner-reply LABEL (falls back to pre-fix
  // behavior), not actual message delivery. Real customer communication
  // must never be blocked by a missing optional column.
  let insertErr = (await admin
    .from("messages")
    .insert({
      conversation_id: params.id,
      tenant_id: tenantId,
      role: "assistant",
      content: text.trim(),
      is_test: false,
      is_owner_reply: true,
    })).error;

  if (insertErr?.code === "PGRST204") {
    console.warn("[conversations/reply] is_owner_reply column missing — run migration_v27.sql. Falling back to insert without it.");
    insertErr = (await admin
      .from("messages")
      .insert({
        conversation_id: params.id,
        tenant_id: tenantId,
        role: "assistant",
        content: text.trim(),
        is_test: false,
      })).error;
  }

  if (insertErr) {
    console.error("[conversations/reply] insert failed:", insertErr.message);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.id);

  // ── Channel delivery ──────────────────────────────────────────────────────

  if (channel === "website") {
    // FIX 3: the widget now polls for new messages while open (see
    // chat-client.tsx), so this IS delivered to a visitor with the widget
    // currently open, within the poll interval -- not instant push, but a
    // real delivery, not silently history-only as before. A visitor who has
    // since closed the widget will see it the next time they reopen it
    // (full history restore, FIX 4), same as any other channel.
    return NextResponse.json({ ok: true });
  }

  if (channel === "whatsapp") {
    const { data: wa } = await admin
      .from("whatsapp_accounts")
      .select("phone_number_id, access_token")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    if (!wa?.phone_number_id || !wa?.access_token) {
      return NextResponse.json({
        ok: true,
        channelError: "WhatsApp account not connected — message saved to history only.",
      });
    }

    // Customer phone is stored on the lead record
    let customerPhone: string | null = null;
    if (conv.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("phone")
        .eq("id", conv.lead_id)
        .maybeSingle();
      customerPhone = (lead as { phone: string | null } | null)?.phone ?? null;
    }

    if (!customerPhone) {
      return NextResponse.json({
        ok: true,
        channelError: "Customer phone number not on file — message saved to history only.",
      });
    }

    try {
      await sendWhatsAppMessage(wa.phone_number_id, wa.access_token, customerPhone, text.trim());
    } catch (err) {
      console.error("[conversations/reply] WhatsApp send failed:", err);
      return NextResponse.json({
        ok: true,
        channelError: "Message saved but WhatsApp delivery failed. Check that your account is active.",
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (channel === "instagram") {
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("instagram_page_id, instagram_access_token")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    type CfgRow = { instagram_page_id?: string | null; instagram_access_token?: string | null };
    const pageId = (cfg as CfgRow | null)?.instagram_page_id;
    const pageToken = (cfg as CfgRow | null)?.instagram_access_token;

    if (!pageId || !pageToken) {
      return NextResponse.json({
        ok: true,
        channelError: "Instagram not connected — message saved to history only.",
      });
    }

    // Instagram webhook stores senderId (PSID) as customer_name in conversations
    const recipientId = conv.customer_name as string | null;
    if (!recipientId) {
      return NextResponse.json({
        ok: true,
        channelError: "Customer Instagram ID not available — message saved to history only.",
      });
    }

    try {
      await sendInstagramMessage(pageId, pageToken, recipientId, text.trim());
    } catch (err) {
      console.error("[conversations/reply] Instagram send failed:", err);
      return NextResponse.json({
        ok: true,
        channelError: "Message saved but Instagram delivery failed. Re-connect your Instagram account if this persists.",
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Unknown channel — message was already saved
  return NextResponse.json({
    ok: true,
    channelNote: `Message saved. Channel '${channel}' doesn't support outbound replies yet.`,
  });
}
