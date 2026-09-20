import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  MC_SESSION_COOKIE,
  isOwnerEmail,
  verifyMcSessionCookie,
  logMcAttempt,
} from "./lib/mission-control-auth";

// Per-Edge-instance in-memory cache: hostname → slug, 5 min TTL.
// Avoids a DB round-trip on every request for known custom domains.
const slugCache = new Map<string, { slug: string | null; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// PRODUCTION INCIDENT FIX (Aug 28): real live 504 MIDDLEWARE_INVOCATION_TIMEOUT
// confirmed in production -- root cause was supabase.auth.getUser() below
// (line ~155, present unchanged since this middleware was first written)
// having NO timeout at all. Reproduced directly: a request carrying a real
// but EXPIRED session cookie forces the Supabase client to attempt a
// refresh-token exchange, and when that specific call hangs (confirmed live,
// 20s+ with zero response), the entire Edge middleware invocation hangs
// with it until Vercel's own hard ceiling kills it -- every request to
// /app/* or /auth/login|signup, for any visitor whose session cookie has
// simply expired (a normal, expected, constantly-occurring state for
// returning users, not an edge case). This is a real, general defensive
// gap, not specific to whatever triggered today's incident -- any external
// call in Edge middleware with no timeout can take the whole app down the
// same way. withTimeout below is used to bound every such call here.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; resolve(fallback); }
    }, ms);
    promise.then(
      (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(fallback); } },
    );
  });
}

function getAppHost(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
}

// Direct Supabase PostgREST query — no Node.js client, fully Edge-compatible.
// HARD RULE: NEVER call the Vercel Domains API from here.
// Only resolves domains that are: is_published=true AND domain_status=verified.
async function resolveCustomDomain(hostname: string): Promise<string | null> {
  const sbUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!sbUrl || !svcKey || !anonKey) return null;

  try {
    // domain_status must be 'verified' — pending/failed/null domains are NOT served.
    const params =
      `domain=eq.${encodeURIComponent(hostname)}` +
      `&is_published=eq.true` +
      `&domain_status=eq.verified` +
      `&select=slug,id` +
      `&limit=1`;
    // Same production-incident hardening as the auth check below -- this
    // fetch previously had no timeout of its own either; AbortSignal.timeout
    // is the fetch-specific equivalent of withTimeout for a request that
    // needs to actually be cancelled, not just raced.
    const res = await fetch(`${sbUrl}/rest/v1/websites?${params}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${svcKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const rows = await res.json() as { slug: string | null; id: string }[];
    if (!Array.isArray(rows) || !rows.length) return null;
    // Fall back to id as the route param if slug is not set
    return rows[0].slug ?? rows[0].id;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").toLowerCase();
  const appHost  = getAppHost();

  // Custom domain: any host that is NOT the main Vela app, NOT localhost, NOT a Vercel preview.
  // vela-g8h4.vercel.app and all other *.vercel.app URLs are excluded by the .vercel.app check.
  // velaos.co (and any NEXT_PUBLIC_APP_URL value) is excluded by the appHost check.
  const isCustomDomain =
    hostname !== appHost &&
    !hostname.startsWith("localhost") &&
    !hostname.endsWith(".vercel.app");

  if (isCustomDomain) {
    const cached = slugCache.get(hostname);
    let slug: string | null = null;

    if (cached && cached.expiresAt > Date.now()) {
      slug = cached.slug;
    } else {
      slug = await resolveCustomDomain(hostname);
      slugCache.set(hostname, { slug, expiresAt: Date.now() + CACHE_TTL });
    }

    if (slug) {
      // Verified custom domain → rewrite to the tenant's published site.
      const url = request.nextUrl.clone();
      url.pathname = `/site/${slug}`;
      return NextResponse.rewrite(url);
    }

    // Domain not in DB, not verified, or site not published → fall through to normal routing.
    // Do NOT return a 404 page here — let Next.js routing handle it.
    return NextResponse.next({ request });
  }

  // ── Mission Control guard ──────────────────────────────────────────────────────
  // Re-checked on every request, not only at login (Hard Rule 21).
  const path = request.nextUrl.pathname;

  if (path.startsWith("/mission-control")) {
    // These paths are part of the unauthenticated login/TOTP flow
    const isMcPublic =
      path === "/mission-control/login" ||
      path.startsWith("/mission-control/auth/") ||
      path.startsWith("/mission-control/totp");

    if (isMcPublic) return NextResponse.next({ request });

    const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
    const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

    if (!email || !isOwnerEmail(email)) {
      await logMcAttempt({
        email:     email ?? "unknown",
        outcome:   "denied_no_session",
        ip:        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        route:     path,
      });
      const denied = NextResponse.redirect(
        new URL("/mission-control/login", request.url),
      );
      // Clear a stale/forged session cookie if present
      if (sessionValue) denied.cookies.set(MC_SESSION_COOKIE, "", { maxAge: 0, path: "/mission-control" });
      return denied;
    }

    return NextResponse.next({ request });
  }

  // ── Auth middleware (primary domain only) ─────────────────────────────────────
  if (!path.startsWith("/app") && !path.startsWith("/auth/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — keeps the JWT alive on every request.
  // PRODUCTION INCIDENT FIX (Aug 28): this call had no timeout -- confirmed
  // live as the real hang point (see withTimeout's own comment above for
  // the full root cause). Bounded to 5s and fails closed to user=null on
  // timeout, i.e. treated exactly like a genuinely unauthenticated visitor
  // (redirected to /auth/login below) rather than left hanging until
  // Vercel's own hard ceiling kills the whole invocation. 5s is comfortably
  // under Vercel's middleware timeout ceiling and far below what a real
  // visitor would ever wait for a page to start loading, while still being
  // generous for a normal, healthy auth check (which completes in well
  // under 1s under real conditions).
  const { user } = await withTimeout(
    supabase.auth.getUser().then(({ data }) => ({ user: data.user })),
    5000,
    { user: null },
  );

  // Redirect unauthenticated users away from /app
  if (path.startsWith("/app") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth pages -- except a
  // first-time Google sign-in with no tenant yet, who must be allowed to
  // stay on /auth/signup to finish the business-info + plan onboarding
  // steps (see /auth/callback and /auth/signup?onboarding=google).
  if ((path.startsWith("/auth/login") || path.startsWith("/auth/signup")) && user) {
    if (path.startsWith("/auth/signup")) {
      // Same production-incident hardening as the auth check above --
      // fails closed to "no tenant found" on timeout, i.e. lets the visitor
      // stay on /auth/signup rather than hang the whole request. Worst case
      // on a timeout: an existing user with a tenant briefly sees the
      // signup page instead of being bounced to /app -- harmless, and
      // correctable by just navigating there themselves.
      const { tenant } = await withTimeout(
        supabase.from("tenants").select("id").eq("owner_id", user.id).maybeSingle()
          .then(({ data }) => ({ tenant: data })),
        5000,
        { tenant: null },
      );
      if (!tenant) {
        return response;
      }
    }
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/auth/login",
    "/auth/signup",
    // Broad matcher to intercept custom domain requests (static assets excluded)
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
