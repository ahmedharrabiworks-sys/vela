import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { defaultWeekStart, isWeekStart, resolveWeekStart } from "@/lib/week-start";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function owner() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureTenant(user.id, user.email, user.user_metadata);
}

function settingsOf(raw: unknown): Record<string, unknown> {
  try { return ((typeof raw === "string" ? JSON.parse(raw) : raw) ?? {}) as Record<string, unknown>; } catch { return {}; }
}

async function load(admin: any, tenantId: string) {
  const [{ data: cfg }, { data: row }] = await Promise.all([
    admin.from("tenant_config").select("agent_settings").eq("tenant_id", tenantId).maybeSingle(),
    admin.from("tenants").select("phone").eq("id", tenantId).maybeSingle(),
  ]);
  return { settings: settingsOf(cfg?.agent_settings), phone: (row?.phone as string | null) ?? null };
}

export async function GET() {
  let tenant;
  try { tenant = await owner(); } catch { return NextResponse.json({ error: "Account setup required" }, { status: 500 }); }
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { settings, phone } = await load(createSupabaseAdmin() as any, tenant.id);
  return NextResponse.json({ weekStart: resolveWeekStart(settings.weekStart, phone), suggested: defaultWeekStart(phone), chosen: isWeekStart(settings.weekStart) });
}

export async function PATCH(req: NextRequest) {
  let tenant;
  try { tenant = await owner(); } catch { return NextResponse.json({ error: "Account setup required" }, { status: 500 }); }
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { weekStart?: unknown } | null;
  if (!isWeekStart(body?.weekStart)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createSupabaseAdmin() as any;
  const { settings } = await load(admin, tenant.id);
  const { error } = await admin.from("tenant_config").upsert({ tenant_id: tenant.id, agent_settings: { ...settings, weekStart: body.weekStart } }, { onConflict: "tenant_id" });
  if (error) {
    console.error("[week-start] save failed:", error.message);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ weekStart: body.weekStart });
}
