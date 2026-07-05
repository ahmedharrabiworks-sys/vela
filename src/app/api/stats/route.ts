import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getDashboardStats } from "@/lib/stats";
import { ensureTenant } from "@/lib/ensure-tenant";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    const stats = await getDashboardStats(tenant.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[stats] ensureTenant error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
