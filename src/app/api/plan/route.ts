import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { freePlanSwitchEnabled, isSwitchablePlan } from "@/lib/plan-switch";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET  /api/plan -> { plan, freeSwitch }
// POST /api/plan { plan } -> { plan, previous }
//
// Security: the tenant is ALWAYS the signed-in user's own tenant (resolved
// from the session cookie). The body carries only the target plan name,
// which is checked against a fixed allowlist. No tenant id from the client
// is ever read.

async function sessionTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 as const };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { user, tenant };
  } catch {
    return { error: "Account setup required", status: 500 as const };
  }
}

async function currentPlan(admin: any, tenantId: string): Promise<string> {
  const { data } = await admin.from("tenants").select("plan").eq("id", tenantId).maybeSingle();
  return ((data?.plan as string | undefined) ?? "starter").toLowerCase();
}

export async function GET() {
  const s = await sessionTenant();
  if ("error" in s) return NextResponse.json({ error: s.error }, { status: s.status });
  const admin = createSupabaseAdmin() as any;
  return NextResponse.json({ plan: await currentPlan(admin, s.tenant.id), freeSwitch: freePlanSwitchEnabled() });
}

export async function POST(req: NextRequest) {
  const s = await sessionTenant();
  if ("error" in s) return NextResponse.json({ error: s.error }, { status: s.status });

  if (!freePlanSwitchEnabled()) {
    return NextResponse.json({ error: "Plan changes go through billing." }, { status: 403 });
  }

  let body: { plan?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const target = typeof body.plan === "string" ? body.plan.toLowerCase() : body.plan;
  if (!isSwitchablePlan(target)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const admin = createSupabaseAdmin() as any;
  const tenantId = s.tenant.id as string;
  const previous = await currentPlan(admin, tenantId);
  if (previous === target) {
    return NextResponse.json({ plan: target, previous, unchanged: true });
  }

  const { error: updErr } = await admin.from("tenants").update({ plan: target }).eq("id", tenantId);
  if (updErr) {
    console.error("[plan] switch failed:", updErr.message);
    return NextResponse.json({ error: "Could not change plan. Please try again." }, { status: 500 });
  }

  // Audit: who, from, to, when. Always a structured server log line; also a
  // durable row in plan_change_log once migration_v40.sql has been run (a
  // missing table never blocks the switch itself).
  const entry = {
    tenant_id: tenantId,
    user_id: s.user.id,
    user_email: s.user.email ?? null,
    from_plan: previous,
    to_plan: target,
    source: "free_switch",
    changed_at: new Date().toISOString(),
  };
  console.log("[plan] switch", JSON.stringify(entry));
  try {
    const { error: logErr } = await admin.from("plan_change_log").insert(entry);
    if (logErr) console.warn("[plan] plan_change_log insert skipped:", logErr.code, logErr.message);
  } catch (err) {
    console.warn("[plan] plan_change_log insert error:", (err as Error)?.message ?? err);
  }

  return NextResponse.json({ plan: target, previous });
}
