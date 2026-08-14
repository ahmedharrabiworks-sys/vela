import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tenant;
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({})) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { error } = await admin
    .from("notifications")
    .update({ read: true })
    .eq("id", body.id)
    .eq("tenant_id", tenant.id); // scoped -- never let one tenant mark another's notification read

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
