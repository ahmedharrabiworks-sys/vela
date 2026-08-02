import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  MC_SESSION_COOKIE,
  verifyMcSessionCookie,
} from "@/lib/mission-control-auth";
import {
  getTenantEngagement,
  getTenantActivity,
  getVoiceMarginSummary,
} from "@/lib/mission-control/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = params.id;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;

    // Verify this tenant actually exists (no IDOR — still controlled via MC allowlist)
    const { data: tenantRow, error: tenantErr } = await admin
      .from("tenants")
      .select("id, business_name, plan, created_at, industry, city")
      .eq("id", tenantId)
      .single();

    if (tenantErr || !tenantRow) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [engagement, activity, voiceAll] = await Promise.all([
      getTenantEngagement(admin, tenantId),
      getTenantActivity(admin, tenantId, 20),
      getVoiceMarginSummary(admin),
    ]);

    // Extract just this tenant's voice margin row
    const voiceRow = voiceAll.tenants.find((t) => t.tenantId === tenantId) ?? null;

    return NextResponse.json({
      tenant: tenantRow,
      engagement,
      activity,
      voiceMargin: voiceRow,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC tenant detail]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
