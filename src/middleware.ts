import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// In-memory cache for custom domain → slug lookups (per Edge instance, ~5 min TTL)
const domainSlugCache = new Map<string, { slug: string | null; expiresAt: number }>();

export async function middleware(request: NextRequest) {
  // ── Custom domain routing ──────────────────────────────────────────────────
  // When a verified custom domain points to Vela's Vercel project, rewrite
  // requests to /site/[slug] so the tenant's published site is served.
  const hostname = (request.headers.get("host") ?? "").toLowerCase();
  const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tryvela.com")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();

  const isCustomDomain =
    hostname !== appHost &&
    !hostname.startsWith("localhost") &&
    !hostname.endsWith(".vercel.app");

  if (isCustomDomain) {
    const cached = domainSlugCache.get(hostname);
    let slug: string | null = null;

    if (cached && cached.expiresAt > Date.now()) {
      slug = cached.slug;
    } else {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tryvela.com";
        const res = await fetch(
          `${appUrl}/api/website/domain-lookup?hostname=${encodeURIComponent(hostname)}`,
        );
        if (res.ok) {
          const data = await res.json() as { slug?: string };
          slug = data.slug ?? null;
        } else {
          slug = null;
        }
        domainSlugCache.set(hostname, { slug, expiresAt: Date.now() + 5 * 60 * 1000 });
      } catch {
        slug = null;
      }
    }

    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/site/${slug}`;
      return NextResponse.rewrite(url);
    }

    // Unknown custom domain — serve a clean "site not found" page
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site not found</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#374151;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem}.card{text-align:center;max-width:420px}.icon{width:56px;height:56px;background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;box-shadow:0 2px 8px rgba(0,0,0,.06)}.icon svg{width:24px;height:24px;stroke:#9ca3af;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}h1{font-size:1.25rem;font-weight:700;color:#111827;margin-bottom:.5rem}p{font-size:.875rem;color:#6b7280;line-height:1.5}</style></head><body><div class="card"><div class="icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><h1>This site isn't set up yet.</h1><p>The domain isn't connected to any published site. If you own this domain, check your DNS settings.</p></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // ── Auth middleware (primary domain only) ─────────────────────────────────
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
