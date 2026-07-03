import { createSupabaseAdmin } from "@/lib/supabase-server";

export interface DashboardStats {
  totalLeads: number;
  newLeadsThisWeek: number;
  newLeadsChange: number;
  appointmentsThisWeek: number;
  appointmentsChange: number;
  conversationsThisWeek: number;
  conversationsChange: number;
  needsHumanCount: number;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalLeadsRes,
    newLeadsRes,
    prevLeadsRes,
    apptsRes,
    prevApptsRes,
    convsRes,
    prevConvsRes,
    needsHumanRes,
  ] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", twoWeeksAgo.toISOString()).lt("created_at", weekAgo.toISOString()),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("needs_human", true),
  ]);

  const totalLeads = totalLeadsRes.count ?? 0;
  const newLeads = newLeadsRes.count ?? 0;
  const prevLeads = prevLeadsRes.count ?? 0;
  const appts = apptsRes.count ?? 0;
  const prevAppts = prevApptsRes.count ?? 0;
  const convs = convsRes.count ?? 0;
  const prevConvs = prevConvsRes.count ?? 0;
  const needsHuman = needsHumanRes.count ?? 0;

  return {
    totalLeads,
    newLeadsThisWeek: newLeads,
    newLeadsChange: pctChange(newLeads, prevLeads),
    appointmentsThisWeek: appts,
    appointmentsChange: pctChange(appts, prevAppts),
    conversationsThisWeek: convs,
    conversationsChange: pctChange(convs, prevConvs),
    needsHumanCount: needsHuman,
  };
}
