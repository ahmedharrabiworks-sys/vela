import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import type { TrainingContext } from "@/lib/vapi-agent-config";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: NextRequest) {
  void req;
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenant: { id: string; business_name: string; industry: string; city: string };
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  // Parse existing KB into topic summaries for skip/confirm logic
  type KbBusiness = { hours?: string; address?: string };
  type Kb = { business?: KbBusiness; extra?: string };
  let kb: Kb = {};
  try {
    if (cfg?.knowledge_base) {
      kb = (typeof cfg.knowledge_base === "string"
        ? JSON.parse(cfg.knowledge_base as string)
        : cfg.knowledge_base) as Kb;
    }
  } catch { /* ignore parse errors */ }

  const existingKb: NonNullable<TrainingContext["existingKb"]> = {};

  if (kb.business?.hours)   existingKb.availability = kb.business.hours;
  if (kb.business?.address) existingKb.locationArea = kb.business.address;
  if (kb.extra?.trim()) {
    // Extract topics stored by save-call with their markers (see save-call/route.ts)
    const bcMatch = kb.extra.match(/^Business & customers:\s*(.+)$/m);
    const reMatch = kb.extra.match(/^Rules & escalation:\s*(.+)$/m);
    const bvMatch = kb.extra.match(/^Brand voice & style:\s*(.+)$/m);
    if (bcMatch) existingKb.businessAndCustomers = bcMatch[1].trim().slice(0, 150);
    if (reMatch) existingKb.rulesEscalation      = reMatch[1].trim().slice(0, 150);
    if (bvMatch) existingKb.brandVoice           = bvMatch[1].trim().slice(0, 150);
  }

  const ctx: TrainingContext = {
    businessName: tenant.business_name || undefined,
    industry:     tenant.industry     || undefined,
    city:         tenant.city         || undefined,
    existingKb:   Object.keys(existingKb).length > 0 ? existingKb : undefined,
  };

  return NextResponse.json(ctx);
}
