// Real cross-tenant isolation test for the Dashboard aggregation
// (dashboard-stats.ts / /api/dashboard). Creates two REAL, throwaway
// tenants directly in the database (service role, same admin client the
// route itself uses) with distinct real conversation/appointment/lead
// rows, then calls the actual getDashboardData() function -- not a
// simulation -- for each tenantId and asserts tenant A's numbers never
// include tenant B's rows. Cleans up every row it creates afterward.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env.local manually (no dotenv dependency in this project).
const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { getDashboardData } = await import("../lib/dashboard-stats.ts");

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { console.log(`PASS ${label}`); pass++; }
  else { console.log(`FAIL ${label}`); fail++; }
}

const cleanup = [];

async function createTestTenant(name) {
  // tenants.owner_id is a real FK to auth.users -- a throwaway auth user is
  // created first (admin API, never goes through the real signup flow) so
  // the tenant insert has a genuine row to reference, same as how a real
  // signup creates both.
  const email = `dashboard-crosstenant-${crypto.randomUUID()}@example.com`;
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
  });
  if (authErr) throw new Error(`create auth user failed: ${authErr.message}`);
  cleanup.push(() => admin.auth.admin.deleteUser(authUser.user.id));

  const { data: tenant, error } = await admin
    .from("tenants")
    .insert({ owner_id: authUser.user.id, business_name: name, plan: "pro" })
    .select("id")
    .single();
  if (error) throw new Error(`create tenant failed: ${error.message}`);
  cleanup.push(() => admin.from("tenants").delete().eq("id", tenant.id));
  return tenant.id;
}

async function createLead(tenantId, channel) {
  const { data, error } = await admin
    .from("leads")
    .insert({ tenant_id: tenantId, name: "Cross-tenant test lead", channel })
    .select("id")
    .single();
  if (error) throw new Error(`create lead failed: ${error.message}`);
  cleanup.push(() => admin.from("leads").delete().eq("id", data.id));
  return data.id;
}

async function createConversation(tenantId, leadId, channel, needsHuman) {
  const { error } = await admin.from("conversations").insert({
    tenant_id: tenantId, lead_id: leadId, channel, needs_human: needsHuman,
  });
  if (error) throw new Error(`create conversation failed: ${error.message}`);
}

async function createAppointment(tenantId, leadId) {
  const { error } = await admin.from("appointments").insert({
    tenant_id: tenantId, lead_id: leadId, datetime: new Date().toISOString(), status: "confirmed",
  });
  if (error) throw new Error(`create appointment failed: ${error.message}`);
}

async function main() {
  console.log("Creating two real, isolated test tenants...");
  const tenantA = await createTestTenant("Cross-Tenant Test A " + Date.now());
  const tenantB = await createTestTenant("Cross-Tenant Test B " + Date.now());

  // Tenant A: 3 whatsapp leads/conversations, 2 appointments.
  for (let i = 0; i < 3; i++) {
    const leadId = await createLead(tenantA, "whatsapp");
    await createConversation(tenantA, leadId, "whatsapp", i < 2);
    if (i < 2) await createAppointment(tenantA, leadId);
  }
  // Tenant B: 5 instagram leads/conversations, 1 appointment -- deliberately
  // DIFFERENT counts and a different channel, so any leakage is obvious.
  for (let i = 0; i < 5; i++) {
    const leadId = await createLead(tenantB, "instagram");
    await createConversation(tenantB, leadId, "instagram", i < 4);
    if (i < 1) await createAppointment(tenantB, leadId);
  }

  // Settle delay: this test runs from a local dev machine against a remote
  // Supabase Postgres server -- real, measured clock skew between the two
  // (confirmed directly: a row's DB-assigned created_at came back ~1-2s
  // AHEAD of this machine's own clock at the moment the insert resolved)
  // can otherwise land a just-inserted row's timestamp on the wrong side
  // of getDashboardData's own `now = new Date()` boundary, purely as a
  // local-clock artifact. Not a concern in the real deployed path -- both
  // Vercel (where this code actually runs) and Supabase are NTP-synced
  // production infrastructure, not a personal dev machine.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("Fetching dashboard data for each tenant independently...");
  const dataA = await getDashboardData(admin, tenantA, "30d");
  const dataB = await getDashboardData(admin, tenantB, "30d");

  check("Tenant A sees exactly its own 3 conversations", dataA.kpis.conversations.value === 3);
  check("Tenant B sees exactly its own 5 conversations", dataB.kpis.conversations.value === 5);
  check("Tenant A sees exactly its own 2 appointments", dataA.kpis.appointments.value === 2);
  check("Tenant B sees exactly its own 1 appointment", dataB.kpis.appointments.value === 1);
  check("Tenant A's business name is its own, not Tenant B's", dataA.businessName.startsWith("Cross-Tenant Test A"));
  check("Tenant B's business name is its own, not Tenant A's", dataB.businessName.startsWith("Cross-Tenant Test B"));
  check("Tenant A's channel breakdown has WhatsApp only, never Instagram", dataA.channels.some((c) => c.channel === "whatsapp") && !dataA.channels.some((c) => c.channel === "instagram"));
  check("Tenant B's channel breakdown has Instagram only, never WhatsApp", dataB.channels.some((c) => c.channel === "instagram") && !dataB.channels.some((c) => c.channel === "whatsapp"));
  // Direct cross-check: neither tenant's total conversation count could be
  // explained by the OTHER tenant's data leaking in (3+5=8; if isolation
  // failed via a missing tenant_id filter, both would likely show 8).
  check("Tenant A's count is not the combined total of both tenants", dataA.kpis.conversations.value !== 8);
  check("Tenant B's count is not the combined total of both tenants", dataB.kpis.conversations.value !== 8);

  // Also confirm at the route layer: the route never accepts a client-
  // supplied tenant_id at all (it always derives tenantId from the
  // authenticated session via ensureTenant(user.id)) -- structurally, there
  // is no parameter through which a caller could even ask for another
  // tenant's id, unlike a route that trusted a body/query tenant_id.
  const routeSource = readFileSync("src/app/api/dashboard/route.ts", "utf8");
  check("Route never reads a client-supplied tenant id from the request", !/searchParams\.get\(["']tenant/i.test(routeSource) && !/body\.tenantId/i.test(routeSource));
  check("Route derives tenantId only from ensureTenant(user.id)", /ensureTenant\(user\.id/.test(routeSource));

  console.log("\nCleaning up test data...");
  for (const fn of cleanup.reverse()) await fn();

  console.log(`\n${pass}/${pass + fail} checks passed.`);
  if (fail > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Test failed:", err);
  for (const fn of cleanup.reverse()) { try { await fn(); } catch { /* best effort */ } }
  process.exit(1);
});
