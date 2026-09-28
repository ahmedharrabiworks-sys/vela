import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { isValidRange, type DashboardRange } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

/** Escapes a CSV field: wraps in quotes and doubles any embedded quote, only when needed. */
function csvField(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Qatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Server-generated CSV export, real rows only, explicitly tenant-scoped --
// same admin-client-plus-explicit-tenant_id-filter pattern as every other
// route in this file group, never a service-role query without that
// filter. One real row per (date, channel) that had at least one
// conversation or appointment in the selected period.
export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawRange = searchParams.get("range");
  const range: DashboardRange = isValidRange(rawRange) ? rawRange : "30d";
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  let tenantId: string;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    tenantId = tenant.id;
  } catch (err) {
    console.error("[dashboard/export] ensureTenant failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [convRes, apptRes, callRes] = await Promise.all([
    admin.from("conversations").select("created_at, channel, deleted_at").eq("tenant_id", tenantId).gte("created_at", since),
    admin.from("appointments").select("created_at, status, deleted_at, lead_id").eq("tenant_id", tenantId).gte("created_at", since),
    admin.from("agent_calls").select("created_at, call_type").eq("tenant_id", tenantId).eq("call_type", "live").gte("created_at", since),
  ]);

  const conversations = ((convRes.data ?? []) as { created_at: string; channel: string | null; deleted_at: string | null }[])
    .filter((c) => !c.deleted_at);
  const appointments = ((apptRes.data ?? []) as { created_at: string; status: string; deleted_at: string | null; lead_id: string | null }[])
    .filter((a) => !a.deleted_at && a.status !== "cancelled");
  const calls = (callRes.data ?? []) as { created_at: string }[];

  const { data: leadIdChannelRows } = await admin.from("leads").select("id, channel").eq("tenant_id", tenantId).is("deleted_at", null);
  const leadChannelById = new Map<string, string>();
  ((leadIdChannelRows ?? []) as { id: string; channel: string | null }[]).forEach((l) => {
    if (l.channel) leadChannelById.set(l.id, l.channel.toLowerCase());
  });

  type Key = string; // `${date}|${channel}`
  const rows = new Map<Key, { date: string; channel: string; conversations: number; appointments: number }>();
  const bump = (date: string, channel: string, field: "conversations" | "appointments") => {
    const key = `${date}|${channel}`;
    const row = rows.get(key) ?? { date, channel, conversations: 0, appointments: 0 };
    row[field] += 1;
    rows.set(key, row);
  };

  conversations.forEach((c) => {
    const ch = (c.channel ?? "").toLowerCase();
    if (ch !== "whatsapp" && ch !== "instagram" && ch !== "phone") return;
    bump(dayKeyFormatter.format(new Date(c.created_at)), ch, "conversations");
  });
  calls.forEach((c) => bump(dayKeyFormatter.format(new Date(c.created_at)), "phone", "conversations"));
  appointments.forEach((a) => {
    const ch = a.lead_id ? leadChannelById.get(a.lead_id) : undefined;
    if (ch !== "whatsapp" && ch !== "instagram" && ch !== "phone") return;
    bump(dayKeyFormatter.format(new Date(a.created_at)), ch, "appointments");
  });

  const sortedRows = Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date) || a.channel.localeCompare(b.channel));

  const lines = ["Date,Channel,Conversations,Appointments"];
  sortedRows.forEach((r) => {
    lines.push([csvField(r.date), csvField(r.channel), csvField(r.conversations), csvField(r.appointments)].join(","));
  });
  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vela-dashboard-${range}-${dayKeyFormatter.format(new Date())}.csv"`,
    },
  });
}
