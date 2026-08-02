import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { MC_SESSION_COOKIE, verifyMcSessionCookie } from "@/lib/mission-control-auth";
import { analyzeEmployee } from "@/lib/mission-control/analysis";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const result = await analyzeEmployee(admin, params.id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC analyze]", msg);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
