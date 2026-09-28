import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { getDashboardData, isValidRange, type DashboardRange } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

// Short per-tenant cache (60s) -- Dashboard-redesign round. In-memory,
// same known limitation as every other in-memory cache/limiter in this
// codebase (resets on cold start, not shared across serverless instances):
// an acceptable staleness ceiling for a dashboard number, not a security
// boundary (the security boundary is the explicit tenant_id filter on
// every query in dashboard-stats.ts, re-checked on every request
// regardless of cache state).
const CACHE_TTL_MS = 60_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: any; expiresAt: number }>();

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

  const cacheKey = `${tenantId}:${range}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
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

    cache.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[dashboard] aggregation error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
