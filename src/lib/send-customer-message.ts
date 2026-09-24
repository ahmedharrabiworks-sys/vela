// Round M8 FIX 3(b): shared real multi-channel customer-message delivery,
// extracted from the exact same logic already proven in
// conversations/[id]/reply/route.ts (owner takeover) -- reused here so
// confirming a pending service can message the waiting customer through
// whichever real channel their conversation is actually on, with the same
// honest per-channel fallback behavior (never a faked "delivered").
// Intentionally duplicated rather than importing the route file (route
// files aren't meant to be imported as modules) -- kept in sync with that
// route by hand, same convention as getImageQuery/getImageQueries
// elsewhere in this codebase.
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";
import { sendInstagramMessage } from "@/lib/instagram-send";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export type SendCustomerMessageResult =
  | { ok: true }
  | { ok: true; channelNote: string }
  | { ok: true; channelError: string }
  | { ok: false; error: string };

export async function sendCustomerMessage(
  admin: AdminClient,
  params: { conversationId: string; tenantId: string; text: string; asOwnerReply?: boolean }
): Promise<SendCustomerMessageResult> {
  const { conversationId, tenantId, text } = params;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, channel, customer_name, lead_id")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (convErr || !conv) return { ok: false, error: "Conversation not found" };

  const channel = conv.channel as string;

  let insertErr = (await admin.from("messages").insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    role: "assistant",
    content: text.trim(),
    is_test: false,
    is_owner_reply: params.asOwnerReply ?? true,
  })).error;
  if (insertErr?.code === "PGRST204") {
    ({ error: insertErr } = await admin.from("messages").insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      role: "assistant",
      content: text.trim(),
      is_test: false,
    }));
  }
  if (insertErr) {
    console.error("[send-customer-message] insert failed:", insertErr.message);
    return { ok: false, error: "Failed to save message" };
  }

  await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

  if (channel === "whatsapp") {
    const { data: wa } = await admin
      .from("whatsapp_accounts")
      .select("phone_number_id, access_token")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();
    if (!wa?.phone_number_id || !wa?.access_token) {
      return { ok: true, channelError: "WhatsApp account not connected, message saved to history only." };
    }
    let customerPhone: string | null = null;
    if (conv.lead_id) {
      const { data: lead } = await admin.from("leads").select("phone").eq("id", conv.lead_id).maybeSingle();
      customerPhone = (lead as { phone: string | null } | null)?.phone ?? null;
    }
    if (!customerPhone) return { ok: true, channelError: "Customer phone number not on file, message saved to history only." };
    try {
      await sendWhatsAppMessage(wa.phone_number_id, wa.access_token, customerPhone, text.trim());
    } catch (err) {
      console.error("[send-customer-message] WhatsApp send failed:", err);
      return { ok: true, channelError: "Message saved but WhatsApp delivery failed." };
    }
    return { ok: true };
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
    if (!pageId || !pageToken) return { ok: true, channelError: "Instagram not connected, message saved to history only." };
    const recipientId = conv.customer_name as string | null;
    if (!recipientId) return { ok: true, channelError: "Customer Instagram ID not available, message saved to history only." };
    try {
      await sendInstagramMessage(pageId, pageToken, recipientId, text.trim());
    } catch (err) {
      console.error("[send-customer-message] Instagram send failed:", err);
      return { ok: true, channelError: "Message saved but Instagram delivery failed." };
    }
    return { ok: true };
  }

  // website (or unknown): saved to DB only -- the widget's own polling
  // picks it up if the customer still has that session open; no separate
  // email path here (that's a deliberate scope decision, see FIX 3(b) --
  // unlike a manual owner reply, this is a system-generated confirmation,
  // and the pending-services flow already fires a real in-app notification
  // for the owner elsewhere).
  return { ok: true, channelNote: `Message saved. Channel '${channel}' has no separate outbound delivery.` };
}
