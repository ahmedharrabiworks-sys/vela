import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/auth/whatsapp/callback
 *
 * Called by the client after the Embedded Signup v4 popup completes.
 * The FB.login callback (with sessionInfoVersion: 2) provides:
 *   code            — session_info_exchange_token (NOT an access token, must be exchanged)
 *   waba_id         — WhatsApp Business Account ID from authResponse.session_info.waba_id
 *   phone_number_id — from authResponse.session_info.phone_number_id
 *
 * Server-to-server flow:
 *   1. Exchange code → Business Integration System User access token (long-lived)
 *   2. Validate phone_number_id + fetch display_phone_number + verified_name from Meta
 *   3. Subscribe WABA to this app's webhook (POST /<waba_id>/subscribed_apps)
 *   4. Write to whatsapp_accounts (upsert on phone_number_id) — fail closed, no partial writes
 *   5. Set tenant_config.whatsapp_connected = true + whatsapp_waba_id
 *
 * Returns { ok, phoneNumber, displayName, waba_id, phone_number_id } on success.
 * Never returns the access_token to the client.
 */
export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tenant: Awaited<ReturnType<typeof ensureTenant>>;
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({})) as {
    code?: string;
    waba_id?: string;
    phone_number_id?: string;
  };

  const { code, waba_id, phone_number_id } = body;

  if (!code || !waba_id || !phone_number_id) {
    return NextResponse.json(
      { error: "Missing required fields: code, waba_id, phone_number_id" },
      { status: 400 }
    );
  }

  // ── 3. Check env ──────────────────────────────────────────────────────────
  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.error("[whatsapp/callback] META_APP_ID or META_APP_SECRET not configured");
    return NextResponse.json({ error: "Service not configured" }, { status: 500 });
  }

  // ── 4. Exchange session_info_exchange_token → Business Integration System User token ──
  const tokenRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&code=${encodeURIComponent(code)}`
  );
  const tokenData = await tokenRes.json() as {
    access_token?: string;
    error?: { message?: string; code?: number };
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    console.error("[whatsapp/callback] Token exchange failed:", tokenData.error?.message);
    return NextResponse.json({ error: "Meta authentication failed — please try again." }, { status: 400 });
  }

  const accessToken = tokenData.access_token;

  // ── 5. Validate phone_number_id + fetch display info ─────────────────────
  // This also server-side confirms the phone_number_id belongs to this token,
  // so we never trust the client-supplied value without verification.
  const phoneRes = await fetch(
    `https://graph.facebook.com/v22.0/${encodeURIComponent(phone_number_id)}` +
    `?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(accessToken)}`
  );
  const phoneData = await phoneRes.json() as {
    display_phone_number?: string;
    verified_name?: string;
    error?: { message?: string };
  };

  if (!phoneRes.ok) {
    console.error("[whatsapp/callback] Phone number validation failed:", phoneData.error?.message);
    return NextResponse.json(
      { error: "Could not verify your WhatsApp Business number — please try again." },
      { status: 400 }
    );
  }

  const phoneNumber  = phoneData.display_phone_number ?? null;
  const displayName  = phoneData.verified_name ?? null;

  // ── 6. Subscribe WABA to this app's webhook ───────────────────────────────
  // Without this call, Meta won't route messages from this WABA to our webhook.
  // Fail closed: don't mark connected if subscription fails.
  const subscribeRes = await fetch(
    `https://graph.facebook.com/v22.0/${encodeURIComponent(waba_id)}/subscribed_apps`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const subscribeData = await subscribeRes.json() as {
    success?: boolean;
    error?: { message?: string };
  };

  if (!subscribeRes.ok || !subscribeData.success) {
    console.error("[whatsapp/callback] Webhook subscription failed:", subscribeData.error?.message);
    return NextResponse.json(
      { error: "Webhook subscription failed — please try again." },
      { status: 400 }
    );
  }

  // ── 7. Write to whatsapp_accounts (upsert on phone_number_id) ────────────
  const admin = createSupabaseAdmin() as any;
  const now   = new Date().toISOString();

  const { error: upsertErr } = await admin
    .from("whatsapp_accounts")
    .upsert(
      {
        tenant_id:         tenant.id,
        waba_id,
        phone_number_id,
        phone_number:      phoneNumber,
        display_name:      displayName,
        access_token:      accessToken,
        token_acquired_at: now,
        is_active:         true,
        updated_at:        now,
      },
      { onConflict: "phone_number_id" }
    );

  if (upsertErr) {
    console.error("[whatsapp/callback] DB write failed:", upsertErr.message);
    return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
  }

  // ── 8. Update tenant_config ───────────────────────────────────────────────
  await admin
    .from("tenant_config")
    .upsert(
      {
        tenant_id:         tenant.id,
        whatsapp_connected: true,
        whatsapp_waba_id:  waba_id,
        whatsapp_phone:    phoneNumber ?? "",
      },
      { onConflict: "tenant_id" }
    );

  // Never return access_token to the client
  return NextResponse.json({
    ok:             true,
    phoneNumber,
    displayName,
    waba_id,
    phone_number_id,
  });
}
