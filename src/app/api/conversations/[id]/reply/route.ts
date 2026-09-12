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
 *   website   — saves to DB, widget polling still applies (see below) PLUS a real email to the
 *               lead's address via Resend when one is on file (round L FIX 6) -- most customers
 *               never reopen the exact widget session, so email is the real delivery path for
 *               this channel now, not just a same-session poll. SMS is NOT wired (no working
 *               outbound Twilio Messages integration exists anywhere in this codebase -- only a
 *               now-dead Twilio Verify/OTP flow for a retired WhatsApp-connect step) -- flagged
 *               via channelNote when a phone number exists but no email does, rather than faked.
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
    .select("id, tenant_id, channel, customer_name, lead_id, tenants!inner(owner_id, business_name)")
    .eq("id", params.id)
    .single();

  if (convErr || !conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (conv.tenants as any)?.owner_id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const businessName = ((conv.tenants as any)?.business_name as string | undefined) || "the business";
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
    // FIX 3: the widget still polls for new messages while open (see
    // chat-client.tsx), so this IS delivered to a visitor with the widget
    // currently open, within the poll interval. A visitor who has since
    // closed the widget only ever saw it on next reopen (full history
    // restore) -- most real customers never do that, so round L FIX 6 adds
    // a real primary delivery path: email the lead's address on file via
    // Resend (the exact fetch-based pattern already used in
    // submit-form/route.ts's sendFormNotification). SMS is intentionally
    // NOT attempted here -- there is no working outbound Twilio Messages
    // integration anywhere in this codebase (only a dead Twilio Verify/OTP
    // flow for a retired WhatsApp-connect step), so a phone-only lead gets
    // an honest channelNote instead of a faked send.
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    if (conv.lead_id) {
      const { data: lead } = await admin
        .from("leads")
        .select("email, phone")
        .eq("id", conv.lead_id)
        .maybeSingle();
      const l = lead as { email: string | null; phone: string | null } | null;
      customerEmail = l?.email ?? null;
      customerPhone = l?.phone ?? null;
    }

    if (!customerEmail) {
      return NextResponse.json({
        ok: true,
        channelNote: customerPhone
          ? "No email on file for this customer. SMS delivery isn't set up yet (needs a Twilio integration) -- message saved to chat history only for now."
          : "No email or phone on file for this customer -- message saved to chat history only. They'll see it if they reopen the same website chat.",
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: true,
        channelNote: "Email delivery isn't connected yet (RESEND_API_KEY not set) -- message saved to chat history only for now.",
      });
    }

    try {
      await sendCustomerEmail({ toEmail: customerEmail, businessName, text: text.trim() });
    } catch (err) {
      console.error("[conversations/reply] Resend send to customer failed:", err);
      // Round M FIX 5: real production logs (this exact 403, same wording,
      // also hit by submit-form/route.ts's pre-existing owner-notification
      // send -- confirmed this is not new or specific to this send path)
      // showed every non-sandbox-owner recipient rejected with "You can
      // only send testing emails to your own email address... verify a
      // domain at resend.com/domains" -- Resend's account-wide sandbox
      // restriction, not a code bug: the correct recipient (the lead's own
      // real email, confirmed correct above) is being used, the request
      // really reaches Resend, and Resend really rejects it. The prior
      // round's "confirmed working" send only succeeded because that test
      // happened to target the one email Resend's sandbox exempts (the
      // account owner's own verified address) -- which no real customer
      // will ever match. Surfacing the real reason here (Hard Rule 20:
      // never leave a real blocker looking like a mystery bug) instead of
      // a generic "delivery failed" that reads as a code defect.
      const msg = err instanceof Error ? err.message : String(err);
      // FIX (this round): "testing email address instead of domains like"
      // is a second real Resend sandbox-mode wording (confirmed live via
      // submit-form/route.ts hitting it directly) -- fires when the
      // recipient's domain looks unverifiable (e.g. a test account's
      // @example.com), as opposed to this file's originally-observed
      // wording ("only send testing emails to your own email address"),
      // which fires for a real-looking but non-owner domain. Same root
      // cause either way; both patterns now recognized here and in
      // submit-form/route.ts's matching check.
      const isSandboxRestriction = /only send testing emails|testing email address|verify a domain/i.test(msg);
      return NextResponse.json({
        ok: true,
        channelError: isSandboxRestriction
          ? "Message saved, but email delivery is blocked: Resend is still in sandbox mode (no verified sending domain), so it can only deliver to your own account email, not real customers. Verify a domain at resend.com/domains to enable this."
          : "Message saved but email delivery failed.",
      });
    }

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

// Round L FIX 6: same raw-fetch Resend pattern already established in
// submit-form/route.ts's sendFormNotification -- reuses RESEND_API_KEY/
// RESEND_FROM_EMAIL, the same env vars, the same failure semantics (throws
// on a non-ok response so the caller can report channelError without ever
// treating a failed send as a fatal error for the request as a whole).
async function sendCustomerEmail(p: { toEmail: string; businessName: string; text: string }) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Vela <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to:      p.toEmail,
      subject: `New message from ${p.businessName}`,
      html: `
        <p style="margin:0 0 16px;font-family:sans-serif;font-size:14px;color:#111111;">You have a new message from <strong>${p.businessName}</strong>:</p>
        <p style="margin:0 0 20px;padding:14px 16px;background:#F9FAFB;border-radius:8px;font-family:sans-serif;font-size:14px;color:#111111;white-space:pre-wrap;">${p.text}</p>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF;font-family:sans-serif;">Reply directly to this business through the chat on their website.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
