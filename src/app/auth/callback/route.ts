import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

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

  // Self-heal: a brand-new Google sign-in has no tenant row yet. /app's
  // dashboard queries tenants directly and bails out blank if none exists,
  // so create one now (idempotent -- no-op for a returning user who already
  // has one) the same way email signup ends up with a real tenant.
  try {
    await ensureTenant(
      data.session.user.id,
      data.session.user.email ?? undefined,
      data.session.user.user_metadata,
    );
  } catch (e) {
    console.error("[auth/callback] ensureTenant failed:", e);
  }

  return NextResponse.redirect(new URL("/app", request.url));
}
