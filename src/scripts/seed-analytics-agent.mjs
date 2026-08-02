// One-time seed: creates Analytics department + Analytics/Insights Agent employee
// and computes initial signals from the live platform activity tables.
// Idempotent — safe to run multiple times.
// ⚠️  Requires migration_v15.sql to have been run first.
// Usage: node src/scripts/seed-analytics-agent.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL: missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let checks = 0, passed = 0;
function check(label, ok, detail = "") {
  checks++;
  if (ok) { console.log(`  ✓ ${label}${detail ? " | " + detail : ""}`); passed++; }
  else     console.log(`  ✗ ${label}${detail ? " | " + detail : ""}`);
}

function periodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// ── STEP 1: Department ────────────────────────────────────────────────────────

console.log("\n1. Analytics department");

const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments")
  .select("id, name, is_staffed")
  .eq("name", "Analytics")
  .single();

if (deptLookupErr && deptLookupErr.code !== "PGRST116") {
  if (deptLookupErr.message?.includes("does not exist")) {
    console.error("\n  FATAL: departments table does not exist.");
    console.error("  Run supabase/migration_v15.sql in Supabase SQL Editor first.\n");
    process.exit(1);
  }
  throw deptLookupErr;
}

let deptId;
if (existingDept) {
  console.log(`  → Already exists: id=${existingDept.id}`);
  deptId = existingDept.id;
} else {
  const { data: newDept, error: deptInsertErr } = await admin
    .from("departments")
    .insert({ name: "Analytics", is_staffed: true })
    .select("id")
    .single();
  if (deptInsertErr) {
    console.error("  FATAL: could not insert department:", deptInsertErr.message);
    process.exit(1);
  }
  deptId = newDept.id;
  console.log(`  → Created: id=${deptId}`);
}

// ── STEP 2: Employee ──────────────────────────────────────────────────────────

console.log("\n2. Analytics/Insights Agent employee");

const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees")
  .select("id, name")
  .eq("name", "Analytics/Insights Agent")
  .single();

if (empLookupErr && empLookupErr.code !== "PGRST116") throw empLookupErr;

let empId;
if (existingEmp) {
  console.log(`  → Already exists: id=${existingEmp.id}`);
  empId = existingEmp.id;
} else {
  const { data: newEmp, error: empInsertErr } = await admin
    .from("employees")
    .insert({
      department_id: deptId,
      name: "Analytics/Insights Agent",
      role_description: "Observes platform-wide activity signals across all tenants and surfaces real usage data",
      domain_description: "Conversations, leads, appointments, agent_calls tables — current-month activity counts. Level 0 capability only: real-data reporting. Correlation-detection and Company-Brain-writing are future tiers, not yet built.",
      status: "idle",
      safe_default_action: null,
    })
    .select("id")
    .single();
  if (empInsertErr) {
    console.error("  FATAL: could not insert employee:", empInsertErr.message);
    process.exit(1);
  }
  empId = newEmp.id;
  console.log(`  → Created: id=${empId}`);
}

// ── STEP 3: Compute and write signals ─────────────────────────────────────────

console.log("\n3. Computing Analytics/Insights Agent signals from platform activity tables");

const ps = periodStart();
const [convsRes, leadsRes, apptRes, callsRes] = await Promise.all([
  admin.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", ps),
  admin.from("leads").select("id",          { count: "exact", head: true }).gte("created_at", ps),
  admin.from("appointments").select("id",   { count: "exact", head: true }).gte("created_at", ps),
  admin.from("agent_calls").select("id",    { count: "exact", head: true }).gte("created_at", ps),
]);

if (convsRes.error)  { console.error("  FATAL:", convsRes.error.message);  process.exit(1); }
if (leadsRes.error)  { console.error("  FATAL:", leadsRes.error.message);  process.exit(1); }
if (apptRes.error)   { console.error("  FATAL:", apptRes.error.message);   process.exit(1); }
if (callsRes.error)  { console.error("  FATAL:", callsRes.error.message);  process.exit(1); }

const conversations = convsRes.count ?? 0;
const leads         = leadsRes.count ?? 0;
const appointments  = apptRes.count ?? 0;
const calls         = callsRes.count ?? 0;
const totalEvents   = conversations + leads + appointments + calls;

console.log(`  period_start=${ps}`);
console.log(`  conversations=${conversations}, leads=${leads}, appointments=${appointments}, calls=${calls}`);
console.log(`  total_events_this_month=${totalEvents}`);

const nowIso = new Date().toISOString();
const signalRows = [
  { signal_name: "conversations_this_month", value: conversations, real_description: `conversations table COUNT WHERE created_at >= ${ps} — inbound messages this month` },
  { signal_name: "leads_this_month",         value: leads,         real_description: `leads table COUNT WHERE created_at >= ${ps} — new leads captured this month` },
  { signal_name: "appointments_this_month",  value: appointments,  real_description: `appointments table COUNT WHERE created_at >= ${ps} — bookings made this month` },
  { signal_name: "calls_this_month",         value: calls,         real_description: `agent_calls table COUNT WHERE created_at >= ${ps} — voice calls this month` },
  { signal_name: "total_events_this_month",  value: totalEvents,   real_description: "Sum of conversations + leads + appointments + calls for the current UTC month — combined platform activity signal" },
].map((s) => ({ ...s, employee_id: empId, computed_at: nowIso }));

const { error: insertErr } = await admin.from("employee_signals").insert(signalRows);
if (insertErr) {
  console.error("  FATAL: could not insert signals:", insertErr.message);
  process.exit(1);
}
console.log(`  → Wrote ${signalRows.length} signal rows`);

// ── STEP 4: Verification ──────────────────────────────────────────────────────

console.log("\n4. Verification");

const [analyticsDeptRow, analyticsEmpRow, analyticsSigCount, analyticsLogCount, deptCount, empCount, totalSigCount] = await Promise.all([
  admin.from("departments").select("id, name, is_staffed").eq("id", deptId).single(),
  admin.from("employees").select("id, name, status").eq("id", empId).single(),
  admin.from("employee_signals").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("learning_log").select("id",     { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("departments").select("id",      { count: "exact", head: true }),
  admin.from("employees").select("id",        { count: "exact", head: true }),
  admin.from("employee_signals").select("id", { count: "exact", head: true }),
]);

check("V1: Analytics department exists",           !!analyticsDeptRow.data && !analyticsDeptRow.error, analyticsDeptRow.data?.name);
check("V2: Analytics/Insights Agent exists",       !!analyticsEmpRow.data  && !analyticsEmpRow.error,  analyticsEmpRow.data?.name);
check("V3: signal rows written",                   (analyticsSigCount.count ?? 0) > 0,                 `count=${analyticsSigCount.count}`);
check("V4: learning_log is empty",                 analyticsLogCount.count === 0,                      `count=${analyticsLogCount.count}`);
check("V5: Analytics department is_staffed=true",  analyticsDeptRow.data?.is_staffed === true);
check("V6: status=idle",                           analyticsEmpRow.data?.status === "idle",            analyticsEmpRow.data?.status);
check("V7: all counts non-negative",               [conversations, leads, appointments, calls, totalEvents].every((v) => v >= 0));
check("V8: total_events = sum of parts",           totalEvents === conversations + leads + appointments + calls, `${totalEvents}`);
check("V9: no NaN or Infinity",
  [conversations, leads, appointments, calls, totalEvents].every((v) => isFinite(v) && !isNaN(v)));
check("V10: signal count matches rows written",    analyticsSigCount.count === signalRows.length,      `${analyticsSigCount.count}`);

const { data: deptRows } = await admin.from("departments").select("name").order("created_at");
const { data: empRows }  = await admin.from("employees").select("name").order("created_at");
console.log("\n  All departments:", deptRows?.map((d) => d.name).join(", "));
console.log("  All employees:  ", empRows?.map((e) => e.name).join(", "));
console.log(`  Total departments: ${deptCount.count}, Total employees: ${empCount.count}, Total signal rows: ${totalSigCount.count}`);

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Department id : ${deptId}`);
console.log(`  Employee id   : ${empId}`);
console.log(`  Signal rows   : ${analyticsSigCount.count} (this employee)`);
if (passed < checks) process.exit(1);
