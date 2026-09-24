/**
 * Instagram Messaging API, send a DM reply on behalf of a tenant.
 * Uses Instagram API with Instagram Login ("Instagram Business Login") --
 * graph.instagram.com, NOT graph.facebook.com. There is no Facebook Page
 * in this model: the id sent to is the Instagram professional account's
 * own id (stored in tenant_config.instagram_business_id), and the token is
 * that account's own long-lived Instagram User access token (stored in
 * tenant_config.instagram_access_token).
 *
 * REBUILT (found broken live during Meta App Review): this previously sent
 * via graph.facebook.com/{page-id}/messages using a Facebook Page Access
 * Token -- the deprecated method Meta now rejects at the OAuth step, so
 * that Page/token combination can no longer be obtained for new
 * connections. Confirmed against Meta's current docs, not guessed:
 * graph.instagram.com/{ig-id}/messages, Authorization: Bearer header (same
 * as before), request body has no "messaging_type" field (not part of the
 * documented shape for this endpoint -- dropped rather than carried over
 * unverified).
 *
 * Called by: src/app/api/webhooks/instagram/route.ts
 */
export async function sendInstagramMessage(
  igUserId: string,
  accessToken: string,
  recipientId: string,
  text: string
): Promise<void> {
  const res = await fetch(
    `https://graph.instagram.com/v22.0/${igUserId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: { message?: string; code?: number } };
    // Log detail server-side only, never surface token or full recipient ID to callers
    console.error("[instagram-send] Graph API error:", {
      status: res.status,
      code: data.error?.code,
      message: data.error?.message,
      igUserId,
      // Partial recipient for logs, don't log full scoped user ID
      recipientPrefix: recipientId.slice(0, 6) + "…",
    });
    throw new Error(`Instagram send failed (${res.status})`);
  }
}
