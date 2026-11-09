import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { getUsageSummary } from "@/lib/usage";
import { probeVapiWallet } from "@/lib/vapi-health";
import { getVapiServerConfig, resolveTenantTimezone, wallClockNow } from "@/lib/vapi-webhook";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Reason = "plan" | "webhook" | "number_missing" | "service";

/** Free checks only. Returns why real calls can't reach the agent, or null. */
async function findIssue(tenantId: string, phoneNumberId: string | null, voicePlan: boolean): Promise<Reason | null> {
  if (!voicePlan) return "plan";
  if (!getVapiServerConfig(tenantId).ok || !process.env.TWILIO_AUTH_TOKEN) return "webhook";
  const key = process.env.VAPI_API_KEY;
  if (!key || !phoneNumberId) return "number_missing";
  try {
    const [number, wallet] = await Promise.all([
      fetch(`https://api.vapi.ai/phone-number/${encodeURIComponent(phoneNumberId)}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(4000),
      }),
      probeVapiWallet(),
    ]);
    if (number.status === 404) return "number_missing";
    if (!number.ok || wallet.state !== "ok") return "service";
    return null;
  } catch {
    return "service";
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenant;
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  const admin = createSupabaseAdmin() as any;
  const [{ data: row }, { data: cfg }] = await Promise.all([
    admin.from("tenants").select("phone, plan").eq("id", tenant.id).maybeSingle(),
    admin.from("tenant_config").select("vapi_phone_number, vapi_phone_number_id, agent_settings").eq("tenant_id", tenant.id).maybeSingle(),
  ]);

  const planId = ((row?.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
  const plan = PLAN_CONFIG[planId] ?? PLAN_CONFIG.starter;
  const linked = (cfg?.vapi_phone_number as string | null) ?? null;

  let settings: Record<string, any> = {};
  try {
    const raw = cfg?.agent_settings;
    settings = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch { /* defaults */ }

  // This week runs Sunday to Saturday in the business's own timezone.
  const now = wallClockNow(resolveTenantTimezone(settings));
  const offsetMs = now.asDate.getTime() - Math.floor(Date.now() / 60_000) * 60_000;
  const weekStartWall = Date.parse(`${now.date}T00:00:00.000Z`) - new Date(`${now.date}T12:00:00.000Z`).getUTCDay() * 86_400_000;
  const weekStart = new Date(weekStartWall - offsetMs).toISOString();

  const [usage, { count: callsThisWeek }, { data: last }] = await Promise.all([
    getUsageSummary(admin, tenant.id),
    admin.from("agent_calls").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("call_type", "live").gte("created_at", weekStart),
    admin.from("agent_calls").select("created_at").eq("tenant_id", tenant.id).eq("call_type", "live").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const reason = linked ? await findIssue(tenant.id, (cfg?.vapi_phone_number_id as string | null) ?? null, plan.voiceAgent) : null;
  const limit = Number.isFinite(plan.voiceMinutes) ? plan.voiceMinutes : null;

  return NextResponse.json({
    status: !linked ? "needs_setup" : reason ? "issue" : "live",
    reason,
    voicePlan: plan.voiceAgent,
    // Customers dial the business's own number, which forwards to the linked line.
    number: (row?.phone as string | null) || linked,
    callsThisWeek: callsThisWeek ?? 0,
    minutes: { used: usage.voiceMinutesUsed, limit },
    lastCallAt: (last?.created_at as string | undefined) ?? null,
  });
}
