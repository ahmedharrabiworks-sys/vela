/**
 * Testing-phase plan switching (no payments).
 *
 * FREE_PLAN_SWITCH controls whether a signed-in owner may change their own
 * plan for free from the app. Default ON while unset (testing phase, only
 * the founder uses the app). At launch: set FREE_PLAN_SWITCH=false in
 * Vercel and plug payments into the same picker; the server route then
 * refuses every free switch.
 *
 * Server-only (reads process.env without NEXT_PUBLIC_), never trust the
 * client's view of this flag.
 */
import type { PlanId } from "@/lib/plan-config";

/** Plans an owner may pick themselves. "custom" is sales-assigned only. */
export const SWITCHABLE_PLANS = ["starter", "pro", "premium"] as const satisfies readonly PlanId[];
export type SwitchablePlan = (typeof SWITCHABLE_PLANS)[number];

export function isSwitchablePlan(v: unknown): v is SwitchablePlan {
  return typeof v === "string" && (SWITCHABLE_PLANS as readonly string[]).includes(v);
}

export function freePlanSwitchEnabled(): boolean {
  const raw = (process.env.FREE_PLAN_SWITCH ?? "").trim().toLowerCase();
  if (raw === "") return true; // default ON during testing
  return raw === "true" || raw === "1" || raw === "yes";
}
