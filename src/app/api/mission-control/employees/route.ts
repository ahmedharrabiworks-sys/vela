import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { MC_SESSION_COOKIE, verifyMcSessionCookie } from "@/lib/mission-control-auth";
import { getEmployeeRoster } from "@/lib/mission-control/queries";

export async function GET(request: NextRequest) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const employees = await getEmployeeRoster(admin);
    return NextResponse.json({ employees });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC employees]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
