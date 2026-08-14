import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 20;

async function getAuthAndTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Unauthorized", status: 401 };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { tenant };
  } catch {
    return { error: "Account setup required", status: 500 };
  }
}

export async function GET(req: NextRequest) {
  void req;
  const result = await getAuthAndTenant();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenant } = result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const [{ data: notifications, error: listErr }, { count: unreadCount, error: countErr }] = await Promise.all([
    admin
      .from("notifications")
      .select("id, type, title, body, link, read, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("read", false),
  ]);

  if (listErr) {
    // PGRST205 = PostgREST schema-cache miss (table not created yet, or the
    // migration hasn't been run against this database). 42P01 = raw Postgres
    // "relation does not exist". Both mean the same thing here: show an
    // honest empty state instead of an error page, same pattern used
    // elsewhere in this app while a migration is still pending.
    const missingTable =
      listErr.code === "42P01" ||
      listErr.code === "PGRST205" ||
      listErr.message?.includes("does not exist") ||
      listErr.message?.includes("schema cache");
    if (missingTable) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }
  void countErr;

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
  });
}
