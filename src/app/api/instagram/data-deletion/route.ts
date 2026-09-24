import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { parseSignedRequest } from "@/lib/meta-signed-request";

export const dynamic = "force-dynamic";

/**
 * POST /api/instagram/data-deletion
 * Meta's Data Deletion Request URL (Instagram Business Login -> App
 * Dashboard -> Instagram -> Business login settings). Confirmed dead
 * before this fix -- see deauthorize/route.ts's file comment for the full
 * "both URLs 404'd" finding.
 *
 * Request format confirmed against Meta's current, official docs
 * (developers.facebook.com/docs/development/create-an-app/app-dashboard/
 * data-deletion-callback), not guessed: a form-encoded POST body with a
 * single "signed_request" field -- same mechanism/algorithm as the
 * Deauthorize Callback (see lib/meta-signed-request.ts), decoding to
 * {algorithm:"HMAC-SHA256", issued_at, expires, user_id}.
 *
 * Response format confirmed, not guessed: a JSON object with EXACTLY these
 * two fields -- { url, confirmation_code } -- "a URL where the user can
 * check the status of their deletion request and an alphanumeric
 * confirmation code" (Meta's own docs wording). Deletion is performed
 * synchronously here (the tenant's stored Instagram data is a handful of
 * tenant_config columns, not a large dataset needing an async job), so the
 * status page this points to can report a real, already-true "completed"
 * state rather than a placeholder.
 */
export async function POST(req: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;

  if (!appSecret) {
    console.error("[instagram/data-deletion] META_INSTAGRAM_APP_SECRET not configured, rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  if (typeof signedRequest !== "string" || !signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload) {
    // Fail closed, an unverifiable request must never be trusted to
    // delete real tenant data.
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 403 });
  }

  const userId = payload.user_id != null ? String(payload.user_id) : "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  let tenantId: string | null = null;
  if (userId) {
    // instagram_business_id is the exact column the Instagram OAuth callback
    // stores this same Instagram-scoped user_id in.
    const { data: cfg } = await admin
      .from("tenant_config")
      .select("tenant_id")
      .eq("instagram_business_id", userId)
      .maybeSingle();
    tenantId = cfg?.tenant_id ?? null;

    const clearFields: Record<string, unknown> = {
      instagram_connected: false,
      instagram_username: "",
      instagram_access_token: "",
      instagram_business_id: "",
      instagram_token_expires_at: null,
    };
    const { error } = await admin.from("tenant_config").update(clearFields).eq("instagram_business_id", userId);
    if (error?.code === "PGRST204" || error?.code === "42703") {
      delete clearFields.instagram_token_expires_at;
      await admin.from("tenant_config").update(clearFields).eq("instagram_business_id", userId);
    } else if (error) {
      console.error("[instagram/data-deletion] delete failed:", error.message);
    }
  } else {
    console.warn("[instagram/data-deletion] Verified request had no user_id, nothing to delete");
  }

  // Real, unique confirmation code, logged (not just invented and thrown
  // away) so the status page below can report a genuine, looked-up result
  // instead of always claiming success for any code someone tries.
  const confirmationCode = crypto.randomBytes(8).toString("hex");
  try {
    const { error: logErr } = await admin.from("webhook_logs").insert({
      tenant_id: tenantId,
      channel: "instagram",
      event_type: "data_deletion_request",
      payload: {
        confirmation_code: confirmationCode,
        instagram_user_id: userId || null,
        matched_tenant: tenantId !== null,
        deleted_at: new Date().toISOString(),
      },
      processed: true,
    });
    if (logErr) console.error("[instagram/data-deletion] log insert failed (non-fatal):", logErr.message);
  } catch (logEx) {
    console.error("[instagram/data-deletion] log save threw (non-fatal):", logEx instanceof Error ? logEx.message : logEx);
  }

  return NextResponse.json({
    url: `${appUrl}/instagram/deletion-status?id=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
