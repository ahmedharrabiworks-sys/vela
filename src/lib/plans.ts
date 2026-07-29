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
      } catch { /* ignore */ }
    })();
  }, []);

  return {
    plan,
    config: PLAN_CONFIG[plan],
    isPro: plan === "pro" || plan === "premium" || plan === "custom",
    isPremium: plan === "premium" || plan === "custom",
    isStarter: plan === "starter",
  };
}
