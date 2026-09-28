"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type LandingSessionState =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; initials: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveInitials(user: any): string {
  const name = (user?.user_metadata?.full_name || user?.user_metadata?.name) as string | undefined;
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  if (user?.email) return String(user.email)[0].toUpperCase();
  return "V";
}

/**
 * Landing-page-only session check, for the logged-in header swap (Log in +
 * Start for Free -> Open Vela). Uses supabase.auth.getSession(), which
 * reads the already-cached local session (localStorage) instead of
 * getUser()'s network round trip to revalidate the JWT -- the landing page
 * must stay fast and effectively static, this check is not a source of
 * truth for anything security-sensitive (that's still every /app route's
 * own middleware + server-side auth check, untouched by this hook).
 *
 * Starts at "loading" (renders identically to a logged-out visitor, since
 * that's also what server-rendered HTML looks like -- no hydration
 * mismatch) and resolves to "out" or "in" once the local session read
 * completes, which does not involve a network call. Also subscribes to
 * onAuthStateChange so a login/logout in another tab is reflected without
 * a reload.
 */
export function useLandingSession(): LandingSessionState {
  const [state, setState] = useState<LandingSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data.session?.user;
      setState(user ? { status: "in", initials: deriveInitials(user) } : { status: "out" });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const user = session?.user;
      setState(user ? { status: "in", initials: deriveInitials(user) } : { status: "out" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
