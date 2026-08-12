"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const LAST_APP_ROUTE_KEY = "vela_last_app_route";
const RESUMED_FLAG_KEY   = "vela_app_resumed";

/** Mounted once at the root layout -- records the most recent /app/* page
    visited in this browser (plain localStorage, this browser only -- never
    persists across different accounts or devices), so reopening the app
    later can resume on that specific page instead of always the dashboard.
    Never touches the public homepage ("/"), which always renders itself
    unconditionally no matter what is stored here. */
export function LastRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/app/")) return;
    localStorage.setItem(LAST_APP_ROUTE_KEY, pathname);
  }, [pathname]);

  return null;
}

/** Mounted on the /app dashboard root only. On the FIRST /app landing in a
    fresh tab/session (typed URL, bookmark, reopening the app after closing
    the browser), if this browser has a more specific last-visited /app/*
    page stored, jump straight there instead of always showing the
    dashboard. Guarded by a one-time sessionStorage flag so navigating back
    to /app later in the same tab (sidebar "Dashboard" link, etc.) always
    shows the dashboard, not a bounce back to wherever you were before. */
export function ResumeLastAppRoute() {
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem(RESUMED_FLAG_KEY)) return;
    sessionStorage.setItem(RESUMED_FLAG_KEY, "1");

    const stored = localStorage.getItem(LAST_APP_ROUTE_KEY);
    if (stored && stored !== "/app") {
      router.replace(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
