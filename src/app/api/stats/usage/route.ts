import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";

// Infinity is not valid JSON — callers receive null to mean "unlimited".
function limitOrNull(value: number): number | null {
  return value === Infinity ? null : value;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);

    // ensureTenant returns only id/business_name/industry/city — fetch plan separately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("plan")
      .eq("id", tenant.id)
      .single();

    const planId = ((tenantRow?.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
    const planCfg = PLAN_CONFIG[planId] ?? PLAN_CONFIG.starter;

    const usage = await getUsageSummary(admin, tenant.id);

    // periodEnd = first moment of the month after periodStart
    const ps = new Date(usage.periodStart);
    const periodEnd = new Date(
      Date.UTC(ps.getUTCFullYear(), ps.getUTCMonth() + 1, 1),
    ).toISOString();

    return NextResponse.json({
      messages: {
        used: usage.messagesUsed,
        limit: limitOrNull(planCfg.textMessages),
      },
      voiceMinutes: {
        used: usage.voiceMinutesUsed,
        limit: limitOrNull(planCfg.voiceMinutes),
      },
      periodStart: usage.periodStart,
      periodEnd,
      plan: planId,
    });
  } catch (err) {
    console.error("[stats/usage] error:", err);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
