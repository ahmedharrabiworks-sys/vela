import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/auth/instagram/callback
 * Receives the OAuth code from Instagram Business Login, exchanges it for a
 * short-lived Instagram User access token, exchanges THAT for a long-lived
 * one (60 days), fetches the connected account's own profile, subscribes
 * that account to Instagram's messaging webhook, and stores the result.
 *
 * REBUILT (found broken live during Meta App Review -- the old scope list
 * this replaced is now rejected by Meta outright). This is a genuinely
 * different flow from what it replaces, not a renamed scope list -- every
 * step below is confirmed against Meta's current, official docs:
 *
 *   - Token exchange: POST api.instagram.com/oauth/access_token (NOT
 *     graph.facebook.com) -> { access_token, user_id, permissions }.
 *   - Long-lived exchange (required -- short-lived tokens are NOT suitable
 *     for a server that replies to DMs asynchronously): GET
 *     graph.instagram.com/access_token?grant_type=ig_exchange_token ->
 *     { access_token, token_type, expires_in } (~60 days in seconds).
 *   - Profile: GET graph.instagram.com/v22.0/me?fields=user_id,username,
 *     account_type -- there is NO Facebook Page, NO /me/accounts lookup, NO
 *     "find the linked Instagram Business Account" step; the token IS the
 *     account. Parsed defensively for both a flat object and a
 *     {"data":[...]} wrapper -- two independent doc lookups both showed the
 *     wrapped shape (unusual for a /me call), and this costs nothing to
 *     handle either way rather than assume one is right.
 *   - Webhook subscription (required, NOT automatic -- confirmed explicitly
 *     in Meta's webhook docs): POST graph.instagram.com/me/subscribed_apps
 *     ?subscribed_fields=messages, using the account's own token. Best
 *     effort: a failure here does not block the connection (the account is
 *     still genuinely connected and usable), but is logged clearly since it
 *     means DMs will not arrive until retried.
 *
 * Storage: reuses instagram_business_id (already the exact column the
 * Instagram webhook handler keys its tenant lookup on -- this flow's
 * user_id IS an Instagram professional-account id, the same kind of value
 * that column has always held) and instagram_access_token (same semantic
 * role: "the token used to call the Graph API for this tenant", now a
 * long-lived Instagram User access token instead of a Page token). Adds
 * instagram_token_expires_at (migration_v39.sql, NOT yet run) to track the
 * real 60-day expiry for a future refresh job -- there is deliberately no
 * new instagram_user_id column: instagram_business_id already serves that
 * exact purpose and is already wired into the webhook lookup, so a second
 * column would only duplicate it. instagram_page_id is no longer written by
 * this flow (there is no Page) -- left untouched/unused for tenants who
 * connected under the old method, never read by the rebuilt webhook/send
 * path (see instagram-send.ts and webhooks/instagram/route.ts).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (error || !code) {
    const reason = encodeURIComponent(error || "no_code");
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=${reason}`);
  }

  const appId = process.env.META_INSTAGRAM_APP_ID;
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=not_configured`);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/instagram/callback`;

    // 1. Exchange code for a short-lived Instagram User access token.
    // Instagram's token endpoint expects a form-encoded POST body, not query params.
    const tokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenRes.json() as {
      access_token?: string;
      user_id?: string | number;
      error_message?: string;
      error_type?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[instagram/callback] Token exchange failed:", tokenData.error_message || tokenData.error_type);
      return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=token_exchange`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for a long-lived token (~60 days). Required -- the
    // short-lived token from step 1 is not viable for a server replying to
    // DMs asynchronously, potentially days after the user connected.
    const longLivedParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: appSecret,
      access_token: shortLivedToken,
    });
    const longLivedRes = await fetch(`https://graph.instagram.com/access_token?${longLivedParams.toString()}`);
    const longLivedData = await longLivedRes.json() as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message?: string };
    };

    if (!longLivedRes.ok || !longLivedData.access_token) {
      console.error("[instagram/callback] Long-lived token exchange failed:", longLivedData.error?.message);
      return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=long_lived_exchange`);
    }

    const accessToken = longLivedData.access_token;
    const expiresAt = typeof longLivedData.expires_in === "number"
      ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
      : null;

    // 3. Fetch the connected account's own profile. No Page, no
    // /me/accounts, no "find the linked Instagram Business Account" search
    // -- the token IS the account.
    const profileRes = await fetch(
      `https://graph.instagram.com/v22.0/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(accessToken)}`
    );
    const profileRaw = await profileRes.json() as {
      user_id?: string | number;
      username?: string;
      data?: { user_id?: string | number; username?: string }[];
      error?: { message?: string };
    };
    // Defensive: handle both a flat object and a {"data":[...]} wrapper --
    // see the file-level comment for why this isn't assumed either way.
    const profile = Array.isArray(profileRaw.data) ? (profileRaw.data[0] ?? {}) : profileRaw;

    const igUserId = String(profile.user_id ?? tokenData.user_id ?? "");
    const igUsername = profile.username ?? "";

    if (!igUserId) {
      console.error("[instagram/callback] Could not resolve Instagram user id:", profileRaw.error?.message || profileRaw);
      return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=profile_fetch`);
    }

    // 4. Subscribe this account to Instagram's messaging webhook. Required
    // -- confirmed explicitly in Meta's webhook docs, NOT automatic just
    // because the app's Webhooks product is configured. Best-effort: this
    // failing does not block the connection (the account is genuinely
    // connected either way), but DMs will not arrive until it succeeds, so
    // it's logged loudly, not swallowed silently.
    try {
      const subRes = await fetch(
        `https://graph.instagram.com/v22.0/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(accessToken)}`,
        { method: "POST" }
      );
      const subData = await subRes.json().catch(() => ({})) as { success?: boolean; error?: { message?: string } };
      if (!subRes.ok || subData.success !== true) {
        console.error("[instagram/callback] Webhook subscription failed for", igUserId, "-", subData.error?.message || subData);
      }
    } catch (subErr) {
      console.error("[instagram/callback] Webhook subscription request threw:", subErr);
    }

    // 5. Get the authenticated Supabase user from session cookies
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/auth/login?redirect=/app/channels`);
    }

    // 6. Find or create the tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!tenant) {
      return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=no_tenant`);
    }

    // 7. Upsert channel connection info. instagram_access_token is now the
    // long-lived Instagram User access token (60-day expiry, tracked in
    // instagram_token_expires_at -- migration_v39.sql). instagram_business_id
    // is the Instagram-scoped account id, reused as-is: it's the exact
    // column the webhook handler already keys its tenant lookup on, and the
    // exact id sendInstagramMessage now sends FROM (see instagram-send.ts).
    // instagram_page_id is deliberately not written -- there is no Page in
    // this flow.
    const { error: upsertErr } = await admin.from("tenant_config").upsert(
      {
        tenant_id: tenant.id,
        instagram_connected: true,
        instagram_username: igUsername,
        instagram_access_token: accessToken,
        instagram_business_id: igUserId,
        instagram_token_expires_at: expiresAt,
      },
      { onConflict: "tenant_id" }
    );
    if (upsertErr?.code === "PGRST204" || upsertErr?.code === "42703") {
      // migration_v39.sql hasn't run yet -- fall back without the new
      // expiry column rather than losing the connection entirely.
      console.warn("[instagram/callback] instagram_token_expires_at column missing — run migration_v39.sql. Retrying without it.");
      await admin.from("tenant_config").upsert(
        {
          tenant_id: tenant.id,
          instagram_connected: true,
          instagram_username: igUsername,
          instagram_access_token: accessToken,
          instagram_business_id: igUserId,
        },
        { onConflict: "tenant_id" }
      );
    }

    const qs = igUsername
      ? `?instagram=connected&username=${encodeURIComponent(igUsername)}`
      : "?instagram=connected";

    return NextResponse.redirect(`${appUrl}/app/channels${qs}`);
  } catch (err) {
    console.error("[instagram/callback] Unexpected error:", err);
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=server_error`);
  }
}
