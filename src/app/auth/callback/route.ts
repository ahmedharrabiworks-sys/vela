import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, createSupabaseAdmin } from "@/lib/supabase-server";

// Supabase OAuth (Google, etc.) redirects here with ?code=... after the
// provider consent step. This exchanges that code for a real session
// (writing the sb-* cookies to the response) before sending the user into
// the app -- without this exchange, /app's middleware sees no session and
// bounces back to /auth/login empty-handed.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=no_code", request.url));
  }

  const supabase = createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(new URL("/auth/login?error=auth_failed", request.url));
  }

  // Returning user (tenant already exists) -> straight into the app.
  // First-time Google sign-in (no tenant yet) -> business info + plan
  // selection (signup step 2/3), same as email/password signup -- a real
  // tenant is only created once that onboarding completes, not here.
  const admin = createSupabaseAdmin();
  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("owner_id", data.session.user.id)
    .maybeSingle();

  if (existingTenant) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.redirect(new URL("/auth/signup?onboarding=google", request.url));
}
