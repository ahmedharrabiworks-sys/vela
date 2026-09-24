import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { parseSignedRequest } from "@/lib/meta-signed-request";

export const dynamic = "force-dynamic";

/**
 * POST /api/instagram/deauthorize
 * Meta's Deauthorize Callback URL (Instagram Business Login -> App
 * Dashboard -> Instagram -> Business login settings). Confirmed dead
 * before this fix: neither this route nor /api/instagram/data-deletion
 * existed at all -- both 404'd -- while Meta already had both URLs saved
 * in the dashboard and could hit either at any time (a real deauthorize
 * event, or a compliance crawl).
 *
 * Meta calls this when a user revokes the app's access to their Instagram
 * account (e.g. from their own Instagram/Facebook settings, not from
 * Vela). Request format is Meta's general signed_request mechanism (the
 * same one used by the Data Deletion Request callback -- see
 * lib/meta-signed-request.ts and data-deletion/route.ts for the shared
 * verification logic and a fuller citation of what's confirmed vs. not).
 *
 * Response format: unlike the Data Deletion Request callback (which has an
 * explicit, documented {url, confirmation_code} JSON contract), no current
 * Meta documentation page specifies a required response body for this
 * endpoint specifically -- checked Meta's own docs plus independent
 * community references, none show one. A plain 200 OK is returned, the
 * same baseline every other webhook-style callback in this codebase
 * already returns (see webhooks/instagram, webhooks/whatsapp) -- this is a
 * reasonable default given no documented alternative, not a guess at a
 * specific undocumented contract.
 */
export async function POST(req: NextRequest) {
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;
  if (!appSecret) {
    console.error("[instagram/deauthorize] META_INSTAGRAM_APP_SECRET not configured, rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  if (typeof signedRequest !== "string" || !signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload) {
    // Fail closed, an unverifiable request must never be trusted to touch
    // real tenant data, same posture as every other signature check here.
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 403 });
  }

  const userId = payload.user_id != null ? String(payload.user_id) : "";

  if (userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    // instagram_business_id is the exact column the Instagram OAuth callback
    // (auth/instagram/callback/route.ts) stores this same Instagram-scoped
    // user_id in, matching the real identifier space, not a guess.
    const clearFields: Record<string, unknown> = {
      instagram_connected: false,
      instagram_username: "",
      instagram_access_token: "",
      instagram_business_id: "",
      instagram_token_expires_at: null,
    };
    const { error } = await admin.from("tenant_config").update(clearFields).eq("instagram_business_id", userId);
    if (error?.code === "PGRST204" || error?.code === "42703") {
      // migration_v39.sql (instagram_token_expires_at) hasn't run yet, 
      // retry without it rather than losing the disconnect entirely.
      delete clearFields.instagram_token_expires_at;
      await admin.from("tenant_config").update(clearFields).eq("instagram_business_id", userId);
    } else if (error) {
      console.error("[instagram/deauthorize] update failed:", error.message);
    }
  } else {
    console.warn("[instagram/deauthorize] Verified request had no user_id, nothing to disconnect");
  }

  return NextResponse.json({ ok: true });
}
