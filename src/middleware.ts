import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Per-Edge-instance in-memory cache: hostname → slug, 5 min TTL.
// Avoids a DB round-trip on every request for known custom domains.
const slugCache = new Map<string, { slug: string | null; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getAppHost(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://tryvela.com")
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
    const res = await fetch(`${sbUrl}/rest/v1/websites?${params}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${svcKey}`,
        Accept: "application/json",
      },
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
  // tryvela.com (and any NEXT_PUBLIC_APP_URL value) is excluded by the appHost check.
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

  // ── Auth middleware (primary domain only) ─────────────────────────────────────
  const path = request.nextUrl.pathname;
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

  // Refresh session — keeps the JWT alive on every request
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from /app
  if (path.startsWith("/app") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((path.startsWith("/auth/login") || path.startsWith("/auth/signup")) && user) {
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
