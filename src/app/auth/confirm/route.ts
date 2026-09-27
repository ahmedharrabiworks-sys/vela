import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, createSupabaseAdmin } from "@/lib/supabase-server";

// One-tap email link handler for every non-OAuth auth email (signup
// confirm, password recovery, email change, magic link). Verifies via
// token_hash -- NOT the old ?code= PKCE exchange -- which is why this
// fixes the cross-device failure /auth/callback had: PKCE needs the
// code_verifier cookie set on the SAME browser/device that started the
// request, but verifyOtp({token_hash, type}) is self-contained and works
// from any device the link is opened on. /auth/callback stays OAuth-only
// (Google), untouched -- see that route's own comment.
type ConfirmType = "signup" | "recovery" | "email_change" | "magiclink";
const ALLOWED_TYPES = new Set<ConfirmType>(["signup", "recovery", "email_change", "magiclink"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");

  if (!tokenHash || !typeParam || !ALLOWED_TYPES.has(typeParam as ConfirmType)) {
    return NextResponse.redirect(new URL("/auth/link-expired", request.url));
  }
  const type = typeParam as ConfirmType;

  const supabase = createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.session) {
    console.warn(`[auth/confirm] verifyOtp failed: type=${type} message=${error?.message}`);
    const expiredUrl = new URL("/auth/link-expired", request.url);
    expiredUrl.searchParams.set("type", type === "recovery" ? "recovery" : "signup");
    return NextResponse.redirect(expiredUrl);
  }

  if (type === "signup") {
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

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", request.url));
  }

  if (type === "email_change") {
    const url = new URL("/app/settings", request.url);
    url.searchParams.set("toast", "email_changed");
    return NextResponse.redirect(url);
  }

  // magiclink
  return NextResponse.redirect(new URL("/app", request.url));
}
