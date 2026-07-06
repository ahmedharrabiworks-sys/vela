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
    console.log("[analytics] tenant resolved:", tenantId, "user:", user.id);
  } catch (err) {
    console.error("[analytics] ensureTenant failed for user", user.id, ":", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Fetch 180 days so we can compute period-over-period for any range
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const [leadsRes, convsRes, apptsRes] = await Promise.all([
    admin.from("leads").select("created_at").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
    admin.from("conversations").select("channel, created_at").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
    admin.from("appointments").select("created_at, status").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
  ]);

  if (leadsRes.error) console.error("[analytics] leads query error:", leadsRes.error.message, leadsRes.error.code);
  if (convsRes.error) console.error("[analytics] conversations query error:", convsRes.error.message, convsRes.error.code);
  if (apptsRes.error) console.error("[analytics] appointments query error:", apptsRes.error.message, apptsRes.error.code);

  const leads: { created_at: string }[] = leadsRes.data ?? [];
  const conversations: { channel: string; created_at: string }[] = convsRes.data ?? [];
  const appointments: { created_at: string; status: string }[] = apptsRes.data ?? [];
  console.log("[analytics] data counts:", { leads: leads.length, conversations: conversations.length, appointments: appointments.length });

  // Daily counts for past 180 days (leads, conversations, appointments)
  const dailyCounts: Record<string, number> = {};
  const dailyConvCounts: Record<string, number> = {};
  const dailyApptCounts: Record<string, number> = {};

  leads.forEach((l) => {
    const date = l.created_at.slice(0, 10);
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  });
  conversations.forEach((c) => {
    const date = c.created_at.slice(0, 10);
    dailyConvCounts[date] = (dailyConvCounts[date] ?? 0) + 1;
  });
  appointments.forEach((a) => {
    const date = a.created_at.slice(0, 10);
    dailyApptCounts[date] = (dailyApptCounts[date] ?? 0) + 1;
  });

  // Channel breakdown from conversations (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const channelMap: Record<string, number> = {};
  conversations
    .filter((c) => c.created_at >= ninetyDaysAgo)
    .forEach((c) => {
      const ch = (c.channel || "website").toLowerCase();
      const label = ch === "whatsapp" ? "WhatsApp" : ch === "instagram" ? "Instagram" : "Website";
      channelMap[label] = (channelMap[label] ?? 0) + 1;
    });

  const knownChannels = ["WhatsApp", "Instagram", "Website"];
  const channelBreakdown = knownChannels.map((ch) => ({
    channel: ch,
    conversations: channelMap[ch] ?? 0,
  }));

  // Count totals for last 90 days
  const totalLeads = leads.filter((l) => l.created_at >= ninetyDaysAgo).length;
  const totalConversations = conversations.filter((c) => c.created_at >= ninetyDaysAgo).length;
  const totalAppointments = appointments.filter((a) => a.created_at >= ninetyDaysAgo).length;

  return NextResponse.json({
    totalLeads,
    totalConversations,
    totalAppointments,
    dailyCounts,
    dailyConvCounts,
    dailyApptCounts,
    channelBreakdown,
  });
}
