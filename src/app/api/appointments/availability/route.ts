import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { UUID_RE, cleanText, listFreeSlots, loadBookingContext } from "@/lib/appointment-slots";
import { normalizeDate } from "@/lib/phone-booking";

export const dynamic = "force-dynamic";

/** Free start times for one day, from real opening hours and bookings. */
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const date = normalizeDate(params.get("date") ?? "");
  const exclude = params.get("exclude");
  if (!date || (exclude && !UUID_RE.test(exclude))) return NextResponse.json({ error: "invalid" }, { status: 400 });

  let tenant;
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch {
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const ctx = await loadBookingContext(admin, tenant.id);
  const result = await listFreeSlots(admin, tenant.id, ctx, date, cleanText(params.get("service"), 120) || null, exclude);
  return NextResponse.json(result);
}
