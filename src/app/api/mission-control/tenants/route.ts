import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  MC_SESSION_COOKIE,
  verifyMcSessionCookie,
} from "@/lib/mission-control-auth";
import { getTenantRoster, getTenantEngagement } from "@/lib/mission-control/queries";

export async function GET(request: NextRequest) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;

    const { tenants, planBreakdown, totalCount } = await getTenantRoster(admin);

    // Fetch engagement for all tenants in parallel.
    // For small tenant counts (<100) this is acceptable; optimize if needed later.
    const engagements = await Promise.all(
      tenants.map((t) => getTenantEngagement(admin, t.id).catch(() => null)),
    );

    const engagementMap = new Map(
      engagements.map((e, i) => [tenants[i].id, e]),
    );

    const result = tenants.map((t) => ({
      ...t,
      engagement: engagementMap.get(t.id) ?? null,
    }));

    return NextResponse.json({ tenants: result, planBreakdown, totalCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC tenants]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
