import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { getUsageSummary } from "@/lib/usage";
import { getVapiServerConfig, resolveTenantTimezone, samePhoneLine, wallClockNow } from "@/lib/vapi-webhook";
import { formatPhoneForDisplay } from "@/lib/phone-validate";
import { resolveWeekStart, startOfWeek } from "@/lib/week-start";

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
    // Read-only check. The wallet probe is gone: it posts an empty call to
    // Vapi, which shows up in the Vapi log as a failed call on every page load.
    const number = await fetch(`https://api.vapi.ai/phone-number/${encodeURIComponent(phoneNumberId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    if (number.status === 404) return "number_missing";
    if (!number.ok) return "service";
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
  const saved = ((row?.phone as string | null) ?? "").trim();

  let settings: Record<string, any> = {};
  try {
    const raw = cfg?.agent_settings;
    settings = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch { /* defaults */ }

  // This week, in the business's own timezone, from its chosen first day.
  const now = wallClockNow(resolveTenantTimezone(settings));
  const offsetMs = now.asDate.getTime() - Math.floor(Date.now() / 60_000) * 60_000;
  const firstDay = startOfWeek(now.date, resolveWeekStart(settings.weekStart, saved || null));
  const weekStartWall = Date.parse(`${firstDay}T00:00:00.000Z`);
  const weekStart = new Date(weekStartWall - offsetMs).toISOString();

  const [usage, { data: weekCalls }, { data: last }] = await Promise.all([
    getUsageSummary(admin, tenant.id),
    admin.from("agent_calls").select("created_at").eq("tenant_id", tenant.id).eq("call_type", "live").gte("created_at", weekStart).limit(5000),
    admin.from("agent_calls").select("created_at").eq("tenant_id", tenant.id).eq("call_type", "live").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  // One bar per day; the total is the same calls, so the two always agree.
  const week = Array.from({ length: 7 }, (_, i) => ({ date: new Date(weekStartWall + i * 86_400_000).toISOString().slice(0, 10), calls: 0 }));
  for (const c of (weekCalls ?? []) as Array<{ created_at: string }>) {
    const localDate = new Date(Date.parse(c.created_at) + offsetMs).toISOString().slice(0, 10);
    const day = week.find((d) => d.date === localDate);
    if (day) day.calls++;
  }
  const callsThisWeek = week.reduce((n, d) => n + d.calls, 0);

  const reason = linked ? await findIssue(tenant.id, (cfg?.vapi_phone_number_id as string | null) ?? null, plan.voiceAgent) : null;
  const limit = Number.isFinite(plan.voiceMinutes) ? plan.voiceMinutes : null;

  return NextResponse.json({
    status: !linked ? "needs_setup" : reason ? "issue" : "live",
    reason,
    voicePlan: plan.voiceAgent,
    // Only ever the number the business forwards from, never the hidden bridge.
    businessNumber: saved && !samePhoneLine(saved, linked) ? formatPhoneForDisplay(saved) : null,
    callsThisWeek,
    week,
    today: now.date,
    minutes: { used: usage.voiceMinutesUsed, limit },
    lastCallAt: (last?.created_at as string | undefined) ?? null,
  });
}
