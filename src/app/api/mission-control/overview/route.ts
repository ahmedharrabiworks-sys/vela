import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  MC_SESSION_COOKIE,
  verifyMcSessionCookie,
} from "@/lib/mission-control-auth";
import {
  getTenantRoster,
  getTheoreticalMRR,
  getVoiceMarginSummary,
  getPlatformActivitySummary,
  getAtRiskTenants,
} from "@/lib/mission-control/queries";

// NOTE: mc_session_verified cookie has path=/mission-control.
// Browsers will NOT send it to /api/* paths — this route is for server-side
// use (Server Components SSR-fetching with forwarded cookies) or direct curl.
// When a dashboard UI is added, fetch from Server Components, or change the
// cookie path to "/" (and redeploy totp/verify/route.ts).

export async function GET(request: NextRequest) {
  // Defense-in-depth: re-verify session even though middleware guards the UI.
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;

    const [roster, mrrData, voiceMargin, activity, atRisk] = await Promise.all([
      getTenantRoster(admin),
      getTheoreticalMRR(admin),
      getVoiceMarginSummary(admin),
      getPlatformActivitySummary(admin),
      getAtRiskTenants(admin),
    ]);

    return NextResponse.json({
      roster,
      theoreticalMRR: mrrData,
      voiceMargin,
      platformActivity: activity,
      atRisk: {
        tenants: atRisk,
        note: "Behavioral proxies only — never labeled as churned.",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC overview]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
