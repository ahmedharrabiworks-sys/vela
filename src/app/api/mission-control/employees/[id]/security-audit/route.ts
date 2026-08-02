import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { MC_SESSION_COOKIE, verifyMcSessionCookie } from "@/lib/mission-control-auth";
import { runSecurityAudit } from "@/lib/mission-control/security-checks";

// POST /api/mission-control/employees/[id]/security-audit
// Only callable for the Security Agent employee. MC-auth-gated, report-only.

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Confirm this employee is named "Security Agent" — not callable for other employees
  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (empErr || !emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (emp.name !== "Security Agent") {
    return NextResponse.json(
      { error: "This route is only callable for the Security Agent employee" },
      { status: 400 },
    );
  }

  try {
    const result = await runSecurityAudit(admin, params.id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[security-audit route]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
