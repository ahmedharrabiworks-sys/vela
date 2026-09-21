import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/instagram
 * Redirects the authenticated user to Instagram's own OAuth dialog --
 * Instagram API with Instagram Login ("Instagram Business Login"), the
 * current, correct connection method.
 *
 * ROOT CAUSE this replaces (found live during Meta App Review): this route
 * previously redirected to www.facebook.com's OAuth dialog requesting
 * instagram_basic, instagram_manage_messages, pages_show_list,
 * pages_manage_metadata, pages_messaging -- the deprecated "Facebook Login +
 * linked Page" method. Meta now rejects that scope combination outright with
 * "Invalid Scopes". Confirmed via Meta's current, official docs (not
 * guessed) that Instagram Business Login is a genuinely different flow, not
 * just a renamed scope list: a different authorization host
 * (www.instagram.com, not www.facebook.com), a different app credential
 * (a distinct "Instagram App ID", not META_APP_ID), and a callback response
 * shape with no Facebook Page concept at all (a direct Instagram-scoped
 * user_id + Instagram user access token). See callback/route.ts for the
 * corresponding rebuild.
 *
 * Admin setup required (real, current Meta dashboard steps -- distinct from
 * the existing Facebook Login app config used by WhatsApp):
 *   1. Meta App Dashboard -> Instagram -> API setup with Instagram login ->
 *      "3. Set up Instagram business login" -> Business login settings.
 *   2. Copy the "Instagram App ID" and "Instagram app secret" shown there
 *      (NOT the same as META_APP_ID/META_APP_SECRET) into
 *      META_INSTAGRAM_APP_ID / META_INSTAGRAM_APP_SECRET.
 *   3. In that same Business login settings section, add this callback URL
 *      to "OAuth redirect URIs" (a separate list from Facebook Login's):
 *        https://your-domain.com/api/auth/instagram/callback
 */
export async function GET() {
  const appId = process.env.META_INSTAGRAM_APP_ID;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!appId) {
    return NextResponse.redirect(`${appUrl}/app/channels?instagram=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
  });

  return NextResponse.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`
  );
}
