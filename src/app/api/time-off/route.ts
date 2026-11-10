import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { UUID_RE, loadBookingContext } from "@/lib/appointment-slots";
import { validateTimeOff } from "@/lib/time-off";
import { appointmentsInBlock, deleteTimeOff, insertTimeOff } from "@/lib/time-off-server";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function auth() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  return { user, tenant };
}

export async function POST(req: NextRequest) {
  let who;
  try { who = await auth(); } catch { return NextResponse.json({ error: "Account setup required" }, { status: 500 }); }
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid_date" }, { status: 400 });

  const admin = createSupabaseAdmin() as any;
  const ctx = await loadBookingContext(admin, who.tenant.id);
  const check = validateTimeOff(body, ctx.now.date);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const saved = await insertTimeOff(admin, who.tenant.id, who.user.id, check.value);
  if (saved.missingTable) return NextResponse.json({ error: "needs_migration" }, { status: 503 });
  if (!saved.row) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  // Never cancelled here: the owner decides what happens to these.
  const appointments = await appointmentsInBlock(admin, who.tenant.id, check.value);
  return NextResponse.json({ row: saved.row, appointments }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let who;
  try { who = await auth(); } catch { return NextResponse.json({ error: "Account setup required" }, { status: 500 }); }
  if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createSupabaseAdmin() as any;
  const removed = await deleteTimeOff(admin, who.tenant.id, id);
  return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not_found" }, { status: 404 });
}
