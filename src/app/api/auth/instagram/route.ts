import { NextResponse } from "next/server";

/**
 * GET /api/auth/instagram
 * Redirects the authenticated user to Meta's OAuth dialog.
 * Admin setup required: create a Meta App at developers.facebook.com,
 * add Instagram Basic Display + Messenger products, then set:
 *   META_APP_ID and META_APP_SECRET in .env.local
 * Add this callback URL in Meta App → Instagram Basic Display → Valid OAuth Redirect URIs:
 *   https://your-domain.com/api/auth/instagram/callback
 */
export async function GET() {
  const appId = process.env.META_APP_ID;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!appId) {
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata",
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  );
}
