/**
 * WhatsApp Cloud API — send a text message on behalf of a tenant.
 * Uses Graph API v22.0+ (v20.0 sunsets Sep 2026; always use v22.0 or higher for new work).
 *
 * Called by: src/app/api/webhooks/whatsapp/route.ts
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } };
    // Log full detail server-side; never surface Meta internals to callers
    console.error("[whatsapp-send] Meta Graph API error:", {
      status: res.status,
      code: data.error?.code,
      message: data.error?.message,
      phoneNumberId,
      // Partial recipient for logs — don't log full phone number
      recipientPrefix: to.slice(0, 5) + "…",
    });
    throw new Error(`WhatsApp send failed (${res.status})`);
  }
}
