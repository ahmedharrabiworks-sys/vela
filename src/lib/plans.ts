"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "./supabase";

export const PLAN_CONFIG = {
  starter: {
    price: 79,
    channels: 1,
    bookingsPerMonth: 50,
    customDomains: 1,
    teamMembers: 1,
    analytics: false,
    followUps: false,
    whiteLabel: false,
    aiTraining: "generic" as const,
    support: "email" as const,
  },
  pro: {
    price: 159,
    channels: 3,
    bookingsPerMonth: Infinity,
    customDomains: 2,
    teamMembers: 15,
    analytics: true,
    followUps: true,
    whiteLabel: true,
    aiTraining: "custom" as const,
    support: "liveChat" as const,
  },
  premium: {
    price: 299,
    channels: 3,
    bookingsPerMonth: Infinity,
    customDomains: 3,
    teamMembers: Infinity,
    analytics: true,
    followUps: true,
    whiteLabel: true,
    aiTraining: "advanced" as const,
    support: "dedicated" as const,
  },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

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
    isPro: plan === "pro" || plan === "premium",
    isPremium: plan === "premium",
    isStarter: plan === "starter",
  };
}
