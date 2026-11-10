import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { getDashboardData, isValidRange, type DashboardRange } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

// No cache: a per-instance cache showed deleted conversations for up to a
// minute, and serverless instances can't clear each other's copy.

function limitOrNull(value: number): number | null {
  return value === Infinity ? null : value;
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawRange = searchParams.get("range");
  // Allowlist validation -- an unrecognized/malicious range value silently
  // falls back to "30d" rather than being passed through to any query.
  const range: DashboardRange = isValidRange(rawRange) ? rawRange : "30d";

  let tenantId: string;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    tenantId = tenant.id;
  } catch (err) {
    console.error("[dashboard] ensureTenant failed for user", user.id, ":", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  try {
    const [dashboardData, tenantRow] = await Promise.all([
      getDashboardData(admin, tenantId, range),
      admin.from("tenants").select("plan").eq("id", tenantId).maybeSingle(),
    ]);

    const planId = ((tenantRow.data?.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
    const planCfg = PLAN_CONFIG[planId] ?? PLAN_CONFIG.starter;
    const usage = await getUsageSummary(admin, tenantId);

    const payload = {
      ...dashboardData,
      plan: planId,
      usage: {
        messages: { used: usage.messagesUsed, limit: limitOrNull(planCfg.textMessages) },
        voiceMinutes: { used: usage.voiceMinutesUsed, limit: limitOrNull(planCfg.voiceMinutes) },
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[dashboard] aggregation error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
