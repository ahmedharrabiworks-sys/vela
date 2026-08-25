"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "./supabase";
export { PLAN_CONFIG } from "./plan-config";
export type { PlanId } from "./plan-config";
import { PLAN_CONFIG, type PlanId } from "./plan-config";

function readPlanFromStorage(): PlanId {
  if (typeof window === "undefined") return "starter";
  try {
    const profile = JSON.parse(localStorage.getItem("vela_profile") || "{}");
    const p = ((profile?.plan as string) || "starter").toLowerCase();
    return (p in PLAN_CONFIG ? p : "starter") as PlanId;
  } catch {
    return "starter";
  }
}

export function usePlan() {
  const [plan, setPlan] = useState<PlanId>(readPlanFromStorage);
  // Round M3 FIX 4: consumers that gate a data fetch on isPro (e.g.
  // Analytics) previously ran that gate on the FIRST render's isPro value --
  // computed from a synchronous localStorage guess (defaults to "starter"
  // whenever vela_profile has no plan field yet, which is common right
  // after signup/on a fresh session) -- not the real plan, which only
  // arrives a moment later from this effect's async Supabase read. A
  // real Pro/Premium tenant could see isPro=false on that first render and
  // never fetch real data at all if the consuming effect didn't also
  // depend on isPro changing later. planLoaded lets a consumer wait for
  // this async check to actually settle (success OR failure) before
  // deciding whether to skip a plan-gated fetch, instead of trusting a
  // momentary guess.
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tenant } = await (supabase as any)
          .from("tenants")
          .select("plan")
          .eq("owner_id", user.id)
          .single();
        if (tenant?.plan) {
          const p = (tenant.plan as string).toLowerCase() as PlanId;
          if (p in PLAN_CONFIG) setPlan(p);
        }
      } catch { /* ignore -- planLoaded still flips below so a waiting
        consumer isn't stuck forever; it falls back to the localStorage
        guess already in `plan`, same as before this fix. */
      } finally {
        setPlanLoaded(true);
      }
    })();
  }, []);

  return {
    plan,
    planLoaded,
    config: PLAN_CONFIG[plan],
    isPro: plan === "pro" || plan === "premium" || plan === "custom",
    isPremium: plan === "premium" || plan === "custom",
    isStarter: plan === "starter",
  };
}
