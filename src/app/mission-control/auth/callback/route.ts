import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isOwnerEmail,
  buildPendingCookie,
  MC_PENDING_COOKIE,
  logMcAttempt,
} from "@/lib/mission-control-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    await logMcAttempt({
      email: "unknown",
      outcome: "denied_no_session",
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      route: "/mission-control/auth/callback",
    });
    return NextResponse.redirect(
      new URL("/mission-control/login?error=no_code", request.url),
    );
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    await logMcAttempt({
      email: "unknown",
      outcome: "denied_no_session",
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      route: "/mission-control/auth/callback",
    });
    return NextResponse.redirect(
      new URL("/mission-control/login?error=auth_failed", request.url),
    );
  }

  const email = (data.session.user.email ?? "").toLowerCase().trim();

  if (!isOwnerEmail(email)) {
    // Sign out immediately — this identity has no MC access
    await supabase.auth.signOut();
    await logMcAttempt({
      email,
      outcome: "denied_not_allowlisted",
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      route: "/mission-control/auth/callback",
    });
    return NextResponse.redirect(
      new URL("/mission-control/login?error=not_authorized", request.url),
    );
  }

  // Email is on the allowlist — set a short-lived pending cookie and proceed to TOTP
  const pendingValue = await buildPendingCookie(email);
  cookieStore.set(MC_PENDING_COOKIE, pendingValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   300, // 5 minutes — must complete TOTP within this window
    path:     "/mission-control",
  });

  return NextResponse.redirect(
    new URL("/mission-control/totp", request.url),
  );
}
