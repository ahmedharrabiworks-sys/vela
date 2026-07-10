import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: NextRequest) {
  void req;
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenant: { id: string };
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  const admin = createSupabaseAdmin() as any;
  const tenantId = tenant.id;

  const [leadsRes, apptRes, convRes, cfgRes, callsRes] = await Promise.all([
    admin.from("leads")
      .select("id, name, stage, created_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(3),
    admin.from("appointments")
      .select("id, customer_name, service, scheduled_at", { count: "exact" })
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(3),
    admin.from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    admin.from("tenant_config")
      .select("instagram_connected, whatsapp_connected, knowledge_base, agent_settings")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin.from("agent_calls")
      .select("id, duration_seconds", { count: "exact" })
      .eq("tenant_id", tenantId)
      .limit(100),
  ]);

  const cfg = (cfgRes.data as Record<string, any> | null) ?? {};
  const kb  = (cfg.knowledge_base as Record<string, any> | null) ?? {};
  const agentSettings = (cfg.agent_settings as Record<string, any> | null) ?? {};

  const callData = (callsRes.data ?? []) as Array<{ duration_seconds?: number }>;
  const totalCallSecs = callData.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0);

  return NextResponse.json({
    business: {
      name:     (kb.businessName as string | undefined) ?? "your business",
      services: (kb.services as unknown[] | undefined) ?? [],
      hours:    (kb.hours as string | undefined) ?? null,
      address:  (kb.address as string | undefined) ?? null,
    },
    leads: {
      total:  (leadsRes.count as number | null) ?? 0,
      recent: (leadsRes.data ?? []).slice(0, 3),
    },
    appointments: {
      total:    (apptRes.count as number | null) ?? 0,
      upcoming: (apptRes.data ?? []).slice(0, 3),
    },
    conversations: {
      total: (convRes.count as number | null) ?? 0,
    },
    channels: {
      instagram: (cfg.instagram_connected as boolean | undefined) ?? false,
      whatsapp:  (cfg.whatsapp_connected as boolean | undefined) ?? false,
    },
    agentSettings: {
      voiceId:  (agentSettings.voiceId as string | undefined) ?? null,
      tone:     (agentSettings.tone as string | undefined) ?? "professional",
      language: (agentSettings.language as string | undefined) ?? null,
    },
    calls: {
      total:         (callsRes.count as number | null) ?? 0,
      totalMinutes:  Math.round(totalCallSecs / 60),
    },
  });
}
