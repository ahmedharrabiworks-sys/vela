/**
 * Instagram Messaging API — send a DM reply on behalf of a tenant.
 * Uses Graph API v22.0+ (same version floor as whatsapp-send.ts).
 *
 * Called by: src/app/api/webhooks/instagram/route.ts
 *
 * Token: must be a Page Access Token (instagram_access_token in tenant_config),
 * NOT a user access token. Page tokens don't expire while the user retains page role.
 */
export async function sendInstagramMessage(
  pageId: string,
  pageToken: string,
  recipientId: string,
  text: string
): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${pageId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } };
    // Log detail server-side only — never surface token or full recipient ID to callers
    console.error("[instagram-send] Meta Graph API error:", {
      status: res.status,
      code: data.error?.code,
      message: data.error?.message,
      pageId,
      // Partial recipient for logs — don't log full scoped user ID
      recipientPrefix: recipientId.slice(0, 6) + "…",
    });
    throw new Error(`Instagram send failed (${res.status})`);
  }
}
