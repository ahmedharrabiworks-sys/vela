import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { computeAiResolutionRate } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tenantId: string;
  let businessName: string;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    tenantId = tenant.id;
    businessName = tenant.business_name;
    console.log("[analytics] tenant resolved:", tenantId, "user:", user.id);
  } catch (err) {
    console.error("[analytics] ensureTenant failed for user", user.id, ":", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Fetch 180 days so we can compute period-over-period for any range, and
  // so the same payload doubles as "full real history" for the per-metric
  // detail view (Analytics redesign) without a second endpoint.
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  // Real website-visit time series (site_visits, per-visit rows) — joined
  // via this tenant's website ids. Graceful: an empty/missing table (e.g.
  // migration_v28.sql not yet run) just yields no rows, never an error that
  // breaks the rest of the page.
  const { data: websiteRows } = await admin.from("websites").select("id").eq("tenant_id", tenantId);
  const websiteIds = ((websiteRows as { id: string }[] | null) ?? []).map((w) => w.id);

  const [leadsRes, convsRes, apptsRes, configRes, visitsRes, aiResolutionRate] = await Promise.all([
    admin.from("leads").select("channel, created_at").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
    admin.from("conversations").select("channel, created_at").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
    admin.from("appointments").select("created_at, status").eq("tenant_id", tenantId).gte("created_at", oneEightyDaysAgo),
    admin.from("tenant_config").select("website_visit_count").eq("tenant_id", tenantId).maybeSingle(),
    websiteIds.length > 0
      ? admin.from("site_visits").select("created_at").in("website_id", websiteIds).gte("created_at", oneEightyDaysAgo)
      : Promise.resolve({ data: [], error: null }),
    computeAiResolutionRate(admin, tenantId, oneEightyDaysAgo),
  ]);

  if (leadsRes.error) console.error("[analytics] leads query error:", leadsRes.error.message, leadsRes.error.code);
  if (convsRes.error) console.error("[analytics] conversations query error:", convsRes.error.message, convsRes.error.code);
  if (apptsRes.error) console.error("[analytics] appointments query error:", apptsRes.error.message, apptsRes.error.code);
  if (visitsRes.error) console.error("[analytics] site_visits query error (non-fatal — likely migration_v28.sql pending):", visitsRes.error.message, visitsRes.error.code);
  const websiteVisits = ((configRes.data as Record<string, unknown> | null)?.website_visit_count as number | null) ?? 0;

  const leads: { channel: string | null; created_at: string }[] = leadsRes.data ?? [];
  const conversations: { channel: string; created_at: string }[] = convsRes.data ?? [];
  const appointments: { created_at: string; status: string }[] = apptsRes.data ?? [];
  const visits: { created_at: string }[] = visitsRes.data ?? [];
  console.log("[analytics] data counts:", { leads: leads.length, conversations: conversations.length, appointments: appointments.length, visits: visits.length });

  // Daily counts for past 180 days (leads, conversations, appointments, visits)
  const dailyCounts: Record<string, number> = {};
  const dailyConvCounts: Record<string, number> = {};
  const dailyApptCounts: Record<string, number> = {};
  const dailyVisitCounts: Record<string, number> = {};

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
  visits.forEach((v) => {
    const date = v.created_at.slice(0, 10);
    dailyVisitCounts[date] = (dailyVisitCounts[date] ?? 0) + 1;
  });

  // Channel breakdown (last 90 days) — leads AND conversations per channel,
  // matching the reference design's two-column breakdown table.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const convChannelMap: Record<string, number> = {};
  const leadChannelMap: Record<string, number> = {};
  const normalizeChannel = (raw: string | null | undefined) => {
    const ch = (raw || "website").toLowerCase();
    return ch === "whatsapp" ? "WhatsApp" : ch === "instagram" ? "Instagram" : "Website";
  };
  conversations
    .filter((c) => c.created_at >= ninetyDaysAgo)
    .forEach((c) => {
      const label = normalizeChannel(c.channel);
      convChannelMap[label] = (convChannelMap[label] ?? 0) + 1;
    });
  leads
    .filter((l) => l.created_at >= ninetyDaysAgo)
    .forEach((l) => {
      const label = normalizeChannel(l.channel);
      leadChannelMap[label] = (leadChannelMap[label] ?? 0) + 1;
    });

  const knownChannels = ["WhatsApp", "Instagram", "Website"];
  const totalChannelLeads = knownChannels.reduce((sum, ch) => sum + (leadChannelMap[ch] ?? 0), 0);
  const channelBreakdown = knownChannels.map((ch) => ({
    channel: ch,
    conversations: convChannelMap[ch] ?? 0,
    leads: leadChannelMap[ch] ?? 0,
    share: totalChannelLeads > 0 ? Math.round(((leadChannelMap[ch] ?? 0) / totalChannelLeads) * 100) : 0,
  }));

  // Count totals for last 90 days
  const totalLeads = leads.filter((l) => l.created_at >= ninetyDaysAgo).length;
  const totalConversations = conversations.filter((c) => c.created_at >= ninetyDaysAgo).length;
  const totalAppointments = appointments.filter((a) => a.created_at >= ninetyDaysAgo).length;
  const totalVisits90d = visits.filter((v) => v.created_at >= ninetyDaysAgo).length;

  return NextResponse.json({
    businessName,
    totalLeads,
    totalConversations,
    totalAppointments,
    totalVisits90d,
    dailyCounts,
    dailyConvCounts,
    dailyApptCounts,
    dailyVisitCounts,
    channelBreakdown,
    websiteVisits,
    aiResolutionRate,
  });
}
