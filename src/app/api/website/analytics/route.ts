import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant" }, { status: 404 });

  const websiteId = new URL(req.url).searchParams.get("websiteId");
  if (!websiteId) return NextResponse.json({ error: "websiteId required" }, { status: 400 });

  // Scope: confirm this website belongs to the authenticated tenant
  const { data: site } = await admin
    .from("websites").select("id")
    .eq("id", websiteId).eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 86_400_000).toISOString();

  // 3 parallel queries:
  // 1. All-time total count (head-only, no data transfer)
  // 2. All-time visitor_hash list for unique-visitor count (compact column only)
  // 3. Last 30 days full detail for chart, referrers, device split, and 7/30d counts
  const [totalRes, uniqueRes, last30Res] = await Promise.all([
    admin.from("site_visits").select("id", { count: "exact", head: true }).eq("website_id", websiteId),
    admin.from("site_visits").select("visitor_hash").eq("website_id", websiteId).limit(100_000),
    admin.from("site_visits")
      .select("visitor_hash, visited_at, referrer, device")
      .eq("website_id", websiteId)
      .gte("visited_at", thirtyDaysAgo)
      .limit(10_000),
  ]);

  const totalVisits   = (totalRes.count as number | null) ?? 0;
  const uniqueVisitors = new Set(
    ((uniqueRes.data ?? []) as { visitor_hash: string }[]).map((r) => r.visitor_hash)
  ).size;

  const rows = (last30Res.data ?? []) as {
    visitor_hash: string;
    visited_at:   string;
    referrer:     string;
    device:       string;
  }[];

  const last7Days  = rows.filter((r) => r.visited_at >= sevenDaysAgo).length;
  const last30Days = rows.length;

  // Daily visit counts — fill every day of the last 30 (including zeros for empty days)
  const dailyMap: Record<string, number> = {};
  rows.forEach((r) => {
    const d = r.visited_at.slice(0, 10);
    dailyMap[d] = (dailyMap[d] ?? 0) + 1;
  });
  const dailyVisits: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dailyVisits.push({ date: d, count: dailyMap[d] ?? 0 });
  }

  // Top 5 referrers
  const refMap: Record<string, number> = {};
  rows.forEach((r) => {
    const ref = r.referrer?.trim() || "(direct)";
    refMap[ref] = (refMap[ref] ?? 0) + 1;
  });
  const topReferrers = Object.entries(refMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([referrer, count]) => ({ referrer, count }));

  // Device split as percentages
  const devMap: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
  rows.forEach((r) => { devMap[r.device] = (devMap[r.device] ?? 0) + 1; });
  const devTotal = rows.length || 1;
  const deviceSplit = {
    desktop: Math.round((devMap.desktop / devTotal) * 100),
    mobile:  Math.round((devMap.mobile  / devTotal) * 100),
    tablet:  Math.round((devMap.tablet  / devTotal) * 100),
  };

  return NextResponse.json({
    totalVisits,
    uniqueVisitors,
    last7Days,
    last30Days,
    dailyVisits,
    topReferrers,
    deviceSplit,
  });
}
