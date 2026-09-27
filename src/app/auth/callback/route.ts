import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, createSupabaseAdmin } from "@/lib/supabase-server";

// OAuth-only now (Google sign-in redirects here with ?code=...). Email
// confirmation, password recovery, email change, and magic links all moved
// to /auth/confirm (token_hash based -- works cross-device, which this
// PKCE ?code= exchange never did: the code_verifier cookie it needs is
// only ever present on the same browser/device that started the request).
// This exchanges the OAuth code for a real session (writing the sb-*
// cookies to the response) before sending the user onward. Without this
// exchange, /app's middleware sees no session and bounces back to
// /auth/login empty-handed.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
  }

  const supabase = createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // Covers a genuinely expired/already-used link AND the PKCE
    // cross-device case (the confirmation email opened on a different
    // browser/device than the one that started signup, so the
    // code_verifier cookie this exchange needs isn't present there) --
    // both present identically to the user, so both get the same
    // friendly "request a new link" page rather than a raw error bounced
    // to the login screen.
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(new URL("/auth/link-expired", request.url));
  }

  // Returning user (tenant already exists) -> straight into the app.
  // First-time sign-in with no tenant yet (Google OAuth, or a freshly
  // email-confirmed signup) -> business info + plan selection (signup
  // step 2/3), same onboarding resume for either source -- a real tenant
  // is only created once that onboarding completes, not here.
  const admin = createSupabaseAdmin();
  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("owner_id", data.session.user.id)
    .maybeSingle();

  if (existingTenant) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.redirect(new URL("/auth/signup?onboarding=1", request.url));
}
