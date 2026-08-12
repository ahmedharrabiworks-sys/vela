"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const LAST_ROUTE_KEY = "vela_last_route";
// Transient/private flows that should never be "returned to" on a fresh visit.
const EXCLUDED_PREFIXES = ["/auth", "/mission-control"];

/** Mounted once at the root layout -- records every route visited in this
    browser (plain localStorage, this browser only -- never persists across
    different accounts or devices) so a fresh visit to the homepage can
    return the person to where they left off. */
export function LastRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/") return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    localStorage.setItem(LAST_ROUTE_KEY, pathname);
  }, [pathname]);

  return null;
}

/** Mounted on the homepage only -- if this browser has a stored last route
    from a previous visit, jump straight there instead of showing the
    marketing homepage again. Middleware still guards /app -- an authless
    visitor with a stale /app/... entry simply bounces to /auth/login as
    normal, no separate auth check needed here. */
export function LastRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(LAST_ROUTE_KEY);
    if (stored && stored !== "/") {
      router.replace(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
