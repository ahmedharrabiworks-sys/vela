import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

/**
 * GET /api/auth/instagram/callback
 * Receives the OAuth code from Meta, exchanges it for a token,
 * fetches the Facebook Pages + linked Instagram Business Account,
 * and stores the Page Access Token (non-expiring) + Page ID in Supabase.
 *
 * Token strategy: we store page.access_token (Page Access Token from /me/accounts),
 * NOT the short-lived user access token from the initial code exchange (60-min TTL).
 * The Page Access Token doesn't expire as long as the user retains their page role.
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

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=not_configured`);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/instagram/callback`;

    // 1. Exchange code for short-lived user access token (used only to call /me/accounts)
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[instagram/callback] Token exchange failed:", tokenData.error?.message);
      return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=token_exchange`);
    }

    const shortLivedUserToken = tokenData.access_token;

    // 2. Fetch Facebook Pages linked to this account.
    // Each page object includes page.access_token — this is the non-expiring Page Access Token
    // we will store (not the short-lived user token from step 1).
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${shortLivedUserToken}`
    );
    const pagesData = await pagesRes.json() as { data?: Array<{ id: string; access_token: string }> };

    let igUsername = "";
    let igBusinessId = "";
    let igPageId = "";
    let igPageToken = "";

    // 3. For each Page, check for a linked Instagram Business Account
    for (const page of pagesData.data ?? []) {
      const igCheckRes = await fetch(
        `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || shortLivedUserToken}`
      );
      const igCheckData = await igCheckRes.json() as { instagram_business_account?: { id: string } };

      if (igCheckData.instagram_business_account?.id) {
        igBusinessId = igCheckData.instagram_business_account.id;
        // Capture the Page ID and Page Access Token — these are what we store.
        // page.access_token is the non-expiring Page token from /me/accounts.
        igPageId    = page.id;
        igPageToken = page.access_token || shortLivedUserToken;

        // 4. Get the Instagram username
        const userRes = await fetch(
          `https://graph.facebook.com/v22.0/${igBusinessId}?fields=username,name&access_token=${igPageToken}`
        );
        const userData = await userRes.json() as { username?: string };
        igUsername = userData.username || "";
        break;
      }
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

    // 7. Upsert channel connection info.
    // instagram_access_token = Page Access Token (non-expiring), NOT the short-lived user token.
    // instagram_page_id = Facebook Page ID (needed to POST /{PAGE_ID}/messages for DM replies).
    await admin.from("tenant_config").upsert(
      {
        tenant_id: tenant.id,
        instagram_connected: true,
        instagram_username: igUsername,
        instagram_access_token: igPageToken,
        instagram_business_id: igBusinessId,
        instagram_page_id: igPageId,
      },
      { onConflict: "tenant_id" }
    );

    const qs = igUsername
      ? `?instagram=connected&username=${encodeURIComponent(igUsername)}`
      : "?instagram=connected";

    return NextResponse.redirect(`${appUrl}/app/channels${qs}`);
  } catch (err) {
    console.error("[instagram/callback] Unexpected error:", err);
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=error&reason=server_error`);
  }
}
