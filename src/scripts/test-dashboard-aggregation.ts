/**
 * Unit tests for dashboard-stats.ts (Dashboard-redesign round), against
 * real fixture data through a minimal mock Supabase query-builder -- not
 * hand-written expected totals bypassing the real aggregation code. Covers
 * the required cases: period math, previous-period comparison, no pill
 * when previous=0, timezone day buckets, share %.
 */
import {
  computeTrendPill,
  tenantDayKey,
  tenantDayBoundsUTC,
  getDashboardData,
  isValidRange,
} from "../lib/dashboard-stats";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { console.log(`PASS ${label}`); pass++; }
  else { console.log(`FAIL ${label}`); fail++; }
}

// ── computeTrendPill: period math + no-pill-when-prior-0 ──
check("trend: real increase computes correct pct", JSON.stringify(computeTrendPill(120, 100)) === JSON.stringify({ direction: "up", pct: 20 }));
check("trend: real decrease computes correct pct", JSON.stringify(computeTrendPill(80, 100)) === JSON.stringify({ direction: "down", pct: -20 }));
check("trend: no change is a real flat 0%", JSON.stringify(computeTrendPill(50, 50)) === JSON.stringify({ direction: "flat", pct: 0 }));
check("trend: previous=0 and current=0 -> no pill (null)", computeTrendPill(0, 0) === null);
check("trend: previous=0 and current>0 -> no pill, never a fake +100%", computeTrendPill(50, 0) === null);
check("trend: rounds to nearest integer pct", JSON.stringify(computeTrendPill(103, 100)) === JSON.stringify({ direction: "up", pct: 3 }));

// ── isValidRange: allowlist ──
check("isValidRange accepts 7d/30d/90d", isValidRange("7d") && isValidRange("30d") && isValidRange("90d"));
check("isValidRange rejects anything else", !isValidRange("1d") && !isValidRange("365d") && !isValidRange("'; DROP TABLE tenants;--") && !isValidRange(null));

// ── tenantDayKey / tenantDayBoundsUTC: real Qatar-timezone (UTC+3) bucketing ──
// 2026-01-15 21:30 UTC = 2026-01-16 00:30 in Qatar (UTC+3) -- crosses into
// the NEXT calendar day in Qatar time, a real case a naive UTC .slice(0,10)
// would get wrong.
check("tenantDayKey: 21:30 UTC lands on the NEXT Qatar day", tenantDayKey("2026-01-15T21:30:00.000Z") === "2026-01-16");
// 2026-01-15 20:30 UTC = 2026-01-15 23:30 in Qatar -- still the SAME Qatar day.
check("tenantDayKey: 20:30 UTC stays on the SAME Qatar day", tenantDayKey("2026-01-15T20:30:00.000Z") === "2026-01-15");
{
  const { startISO, endISO } = tenantDayBoundsUTC(0);
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  check("tenantDayBoundsUTC: today's bucket is exactly 24h wide", endDate.getTime() - startDate.getTime() === 86_400_000);
  check("tenantDayBoundsUTC: start boundary is Qatar midnight (21:00 UTC previous day)", startDate.getUTCHours() === 21);
}
{
  const yesterday = tenantDayBoundsUTC(1);
  const today = tenantDayBoundsUTC(0);
  check("tenantDayBoundsUTC: yesterday's end exactly meets today's start", yesterday.endISO === today.startISO);
}

// ── getDashboardData: full pipeline against real fixture rows via a mock query builder ──
function makeMockAdmin(tables: Record<string, unknown[]>) {
  function builder(rows: unknown[]) {
    const b = {
      select: () => b,
      eq: () => b,
      gte: () => b,
      is: () => b,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: { data: unknown[]; count: number; error: null }) => void) =>
        resolve({ data: rows, count: rows.length, error: null }),
    };
    return b;
  }
  return {
    from(table: string) {
      return builder(tables[table] ?? []);
    },
  };
}

async function testFullPipeline() {
  const now = Date.now();
  const daysAgo = (n: number, hourUTC = 12) => {
    const d = new Date(now - n * 86_400_000);
    d.setUTCHours(hourUTC, 0, 0, 0);
    return d.toISOString();
  };

  // 30d range: current period = last 30 days, previous = the 30 before that.
  // 3 conversations in the current period (2 whatsapp, 1 instagram), 2 in
  // the previous period (both whatsapp) -- a real, checkable period split.
  const conversations = [
    { created_at: daysAgo(5), channel: "whatsapp", needs_human: false, lead_id: "lead-1", deleted_at: null },
    { created_at: daysAgo(10), channel: "whatsapp", needs_human: true, lead_id: "lead-2", deleted_at: null },
    { created_at: daysAgo(15), channel: "instagram", needs_human: false, lead_id: "lead-3", deleted_at: null },
    { created_at: daysAgo(40), channel: "whatsapp", needs_human: false, lead_id: "lead-4", deleted_at: null },
    { created_at: daysAgo(45), channel: "whatsapp", needs_human: false, lead_id: "lead-5", deleted_at: null },
    // A deleted (Recycle Bin) conversation in the current period -- must NOT count.
    { created_at: daysAgo(3), channel: "whatsapp", needs_human: false, lead_id: "lead-6", deleted_at: daysAgo(1) },
  ];
  const appointments = [
    { created_at: daysAgo(5), status: "confirmed", conversation_id: "c1", deleted_at: null, lead_id: "lead-1" },
    { created_at: daysAgo(20), status: "pending", conversation_id: "c2", deleted_at: null, lead_id: "lead-3" },
    // Cancelled -- must NOT count as "booked".
    { created_at: daysAgo(2), status: "cancelled", conversation_id: "c3", deleted_at: null, lead_id: "lead-1" },
  ];
  const leads = [
    { created_at: daysAgo(5), channel: "whatsapp", deleted_at: null },
    { created_at: daysAgo(15), channel: "instagram", deleted_at: null },
    { created_at: daysAgo(40), channel: "whatsapp", deleted_at: null },
  ];
  const leadIdChannelRows = [
    { id: "lead-1", channel: "whatsapp" },
    { id: "lead-2", channel: "whatsapp" },
    { id: "lead-3", channel: "instagram" },
  ];
  const calls: unknown[] = [];

  // getDashboardData calls admin.from("leads") twice: once for the New
  // Customers KPI (created_at/channel/deleted_at), once for the channel-
  // breakdown id lookup (id/channel) -- the mock ignores .select() column
  // lists, so the 2nd call is redirected to a separate id-keyed fixture
  // table to serve the right shape.
  const admin = makeMockAdmin({
    tenants: [{ business_name: "Fixture Business" }],
    conversations,
    appointments,
    leads,
    __leadIdChannel__: leadIdChannelRows,
    agent_calls: calls,
    tenant_config: [{ instagram_connected: true, whatsapp_connected: true, vapi_phone_number: null }],
  });
  let leadsCallCount = 0;
  const realFrom = admin.from.bind(admin);
  admin.from = (table: string) => {
    if (table === "leads") {
      leadsCallCount++;
      return realFrom(leadsCallCount === 1 ? "leads" : "__leadIdChannel__");
    }
    return realFrom(table);
  };

  const result = await getDashboardData(admin, "fixture-tenant", "30d");

  check("pipeline: conversations current period = 3 (excludes deleted)", result.kpis.conversations.value === 3);
  check("pipeline: conversations previous period = 2", result.kpis.conversations.previous === 2);
  check("pipeline: conversations trend is a real +50% (3 vs 2)", result.kpis.conversations.trend !== null && result.kpis.conversations.trend.pct === 50);
  check("pipeline: appointments current period = 2 (excludes cancelled)", result.kpis.appointments.value === 2);
  check("pipeline: new customers current period = 2 (leads 5d + 15d ago)", result.kpis.newCustomers.value === 2);
  check("pipeline: new customers previous period = 1 (lead 40d ago)", result.kpis.newCustomers.previous === 1);
  // AI resolution: current period 3 convs, 2 AI-handled (needs_human=false) -> 67%
  check("pipeline: AI resolution rate current = 67% (2/3 AI-handled)", result.kpis.aiResolutionRate.value === 67);
  // Previous period: 2 convs, both AI-handled -> 100%, trend 67 vs 100 = -33%
  check("pipeline: AI resolution rate previous = 100% (2/2 AI-handled)", result.kpis.aiResolutionRate.previous === 100);
  check("pipeline: AI resolution rate has a real trend (previous != 0)", result.kpis.aiResolutionRate.trend !== null);

  // Channel breakdown: current period conversations are 2 whatsapp + 1 instagram = 3 total.
  const wa = result.channels.find((c) => c.channel === "whatsapp");
  const ig = result.channels.find((c) => c.channel === "instagram");
  check("pipeline: WhatsApp channel row conversations = 2", wa?.conversations === 2);
  check("pipeline: Instagram channel row conversations = 1", ig?.conversations === 1);
  check("pipeline: WhatsApp share = 67% (2/3)", wa?.share === 67);
  check("pipeline: Instagram share = 33% (1/3)", ig?.share === 33);
  check("pipeline: no Phone row (not connected, zero calls)", !result.channels.some((c) => c.channel === "phone"));
  check("pipeline: series has 30 day-buckets for 30d range", result.series.conversations.length === 30);
  check("pipeline: businessName comes from the real tenants row", result.businessName === "Fixture Business");
}

async function main() {
  await testFullPipeline();
  console.log(`\n${pass}/${pass + fail} checks passed.`);
  if (fail > 0) process.exit(1);
}

main();
