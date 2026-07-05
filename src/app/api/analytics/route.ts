import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenantId: string;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    tenantId = tenant.id;
  } catch (err) {
    console.error("[analytics] ensureTenant error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [leadsRes, convsRes, apptsRes] = await Promise.all([
    admin.from("leads").select("created_at").eq("tenant_id", tenantId).gte("created_at", ninetyDaysAgo),
    admin.from("conversations").select("channel, created_at").eq("tenant_id", tenantId),
    admin.from("appointments").select("created_at, status").eq("tenant_id", tenantId),
  ]);

  const leads: { created_at: string }[] = leadsRes.data ?? [];
  const conversations: { channel: string; created_at: string }[] = convsRes.data ?? [];
  const appointments: { created_at: string; status: string }[] = apptsRes.data ?? [];

  // Daily lead counts for past 90 days
  const dailyCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const date = l.created_at.slice(0, 10);
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  });

  // Channel breakdown from conversations
  const channelMap: Record<string, number> = {};
  conversations.forEach((c) => {
    const ch = (c.channel || "website").toLowerCase();
    const label = ch === "whatsapp" ? "WhatsApp" : ch === "instagram" ? "Instagram" : "Website";
    channelMap[label] = (channelMap[label] ?? 0) + 1;
  });

  const knownChannels = ["WhatsApp", "Instagram", "Website"];
  const channelBreakdown = knownChannels.map((ch) => ({
    channel: ch,
    conversations: channelMap[ch] ?? 0,
  }));

  return NextResponse.json({
    totalLeads: leads.length,
    totalConversations: conversations.length,
    totalAppointments: appointments.length,
    dailyCounts,
    channelBreakdown,
  });
}
