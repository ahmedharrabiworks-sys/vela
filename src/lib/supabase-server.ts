import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { type Database } from "./supabase";

/** Server Component / Route Handler client — reads session from cookies */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookie mutations are ignored
          }
        },
      },
    }
  );
}

/**
 * Route Handler client — identical to createSupabaseServerClient but setAll
 * does NOT catch errors, so refreshed tokens are correctly written back to the
 * browser response. Use this in all Route Handlers (not Server Components).
 */
export function createSupabaseRouteHandlerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// CRITICAL FIX: found live while debugging a Server Component (page.tsx)
// reading a value immediately after it was written -- the read consistently
// returned the PREVIOUS value, confirmed via direct Vercel log inspection
// (not a guess): a script wrote tenant_config.language = 'Arabic', a
// separate direct query against the same project confirmed the row held
// 'Arabic', yet the deployed /widget/[tenantId] Server Component's own
// console.log of the exact same query showed 'English' every time, even
// after a 10s+ wait (ruling out replication lag). Root cause: Next.js's App
// Router patches the global `fetch` used by any library -- including
// supabase-js's internal HTTP calls -- and caches GET requests by default.
// `export const dynamic = "force-dynamic"` on a ROUTE HANDLER reliably
// disables this, but does not reliably propagate to every fetch a SERVER
// COMPONENT (page.tsx) makes through a third-party client in this Next.js
// version -- exactly the gap this bug fell through. Every other
// createSupabaseAdmin() query in this codebase used from Route Handlers
// was unaffected, which is why this had never surfaced before. A
// service-role admin client reads real, frequently-changing application
// data -- it must never be silently cached by an unrelated framework
// layer. Passing an explicit no-store fetch makes this correct
// unconditionally, regardless of which Next.js render context calls it.
function noStoreFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

/** Service-role admin client — for trusted server-side operations only */
export function createSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: noStoreFetch },
    }
  );
}
