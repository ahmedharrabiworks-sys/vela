// One-time seed: creates Phone department + Phone Agent employee
// and computes initial signals from the live agent_calls table.
// Idempotent — safe to run multiple times.
// ⚠️  Requires migration_v15.sql to have been run first.
// Usage: node src/scripts/seed-phone-agent.mjs

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

// ── STEP 1: Department ────────────────────────────────────────────────────────

console.log("\n1. Phone department");

const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments")
  .select("id, name, is_staffed")
  .eq("name", "Phone")
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
    .insert({ name: "Phone", is_staffed: true })
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

console.log("\n2. Phone Agent employee");

const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees")
  .select("id, name")
  .eq("name", "Phone Agent")
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
      name: "Phone Agent",
      role_description: "Monitors voice call volume, duration, and reach across all tenants",
      domain_description: "Vapi voice pipeline — agent_calls table, call volume, duration, tenants reached. Caveat: Twilio inbound not yet connected (VAPI_WEBHOOK_SECRET placeholder) — call volume is low/near-zero until final integration day",
      status: "idle",
      safe_default_action: "stop accepting calls, log reason",
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

console.log("\n3. Computing Phone Agent signals from agent_calls");

const CALL_WINDOW_DAYS = 90;
const windowStart = new Date(Date.now() - CALL_WINDOW_DAYS * 86_400_000).toISOString();

const [allCallsRes, windowCallsRes] = await Promise.all([
  admin.from("agent_calls").select("tenant_id, duration_seconds"),
  admin.from("agent_calls").select("tenant_id, duration_seconds").gte("created_at", windowStart),
]);

if (allCallsRes.error)    { console.error("  FATAL:", allCallsRes.error.message);    process.exit(1); }
if (windowCallsRes.error) { console.error("  FATAL:", windowCallsRes.error.message); process.exit(1); }

const allCalls    = allCallsRes.data ?? [];
const windowCalls = windowCallsRes.data ?? [];

const totalCalls        = allCalls.length;
const calls90d          = windowCalls.length;
const tenantsWithCalls  = new Set(allCalls.map((c) => c.tenant_id)).size;

const callsWithDuration = allCalls.filter((c) => c.duration_seconds != null);
const avgDurationSecs   = callsWithDuration.length > 0
  ? parseFloat((callsWithDuration.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / callsWithDuration.length).toFixed(1))
  : 0;
const totalVoiceMinutes = parseFloat((allCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60).toFixed(1));

console.log(`  total_calls=${totalCalls}, calls_90d=${calls90d}, tenants_with_calls=${tenantsWithCalls}`);
console.log(`  avg_duration_secs=${avgDurationSecs}s, total_voice_minutes=${totalVoiceMinutes}min`);
if (totalCalls === 0) {
  console.log("  ℹ  Zero calls is honest — Twilio inbound not connected yet (Hard Rule 20).");
}

const nowIso = new Date().toISOString();
const signalRows = [
  { signal_name: "total_calls",          value: totalCalls,         real_description: "Total agent_calls rows all time — all inbound/outbound voice calls recorded" },
  { signal_name: "calls_90d",            value: calls90d,           real_description: `agent_calls rows in the last ${CALL_WINDOW_DAYS} days — recent call volume` },
  { signal_name: "tenants_with_calls",   value: tenantsWithCalls,   real_description: "Distinct tenant_id values in agent_calls — tenants that have made at least one call" },
  { signal_name: "avg_duration_secs",    value: avgDurationSecs,    real_description: "Average duration_seconds across all calls with non-null duration — call length proxy" },
  { signal_name: "total_voice_minutes",  value: totalVoiceMinutes,  real_description: "Sum of duration_seconds / 60 across all agent_calls — total voice minutes consumed all time" },
].map((s) => ({ ...s, employee_id: empId, computed_at: nowIso }));

const { error: insertErr } = await admin.from("employee_signals").insert(signalRows);
if (insertErr) {
  console.error("  FATAL: could not insert signals:", insertErr.message);
  process.exit(1);
}
console.log(`  → Wrote ${signalRows.length} signal rows`);

// ── STEP 4: Verification ──────────────────────────────────────────────────────

console.log("\n4. Verification");

const [phoneDeptRow, phoneEmpRow, phoneSigCount, phoneLogCount, deptCount, empCount, totalSigCount] = await Promise.all([
  admin.from("departments").select("id, name, is_staffed").eq("id", deptId).single(),
  admin.from("employees").select("id, name, status").eq("id", empId).single(),
  admin.from("employee_signals").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("learning_log").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("departments").select("id", { count: "exact", head: true }),
  admin.from("employees").select("id", { count: "exact", head: true }),
  admin.from("employee_signals").select("id", { count: "exact", head: true }),
]);

check("V1: Phone department exists",              !!phoneDeptRow.data && !phoneDeptRow.error, phoneDeptRow.data?.name);
check("V2: Phone Agent employee exists",          !!phoneEmpRow.data  && !phoneEmpRow.error,  phoneEmpRow.data?.name);
check("V3: signal rows written",                  (phoneSigCount.count ?? 0) > 0,             `count=${phoneSigCount.count}`);
check("V4: learning_log is empty",                phoneLogCount.count === 0,                  `count=${phoneLogCount.count}`);
check("V5: Phone department is_staffed=true",     phoneDeptRow.data?.is_staffed === true);
check("V6: Phone Agent status=idle",              phoneEmpRow.data?.status === "idle",        phoneEmpRow.data?.status);
check("V7: total_calls is non-negative",          totalCalls >= 0,                            `${totalCalls}`);
check("V8: calls_90d ≤ total_calls",              calls90d <= totalCalls,                     `${calls90d} / ${totalCalls}`);
check("V9: avg_duration_secs is non-negative",    avgDurationSecs >= 0,                       `${avgDurationSecs}s`);
check("V10: no NaN or Infinity",
  [totalCalls, calls90d, tenantsWithCalls, avgDurationSecs, totalVoiceMinutes].every(
    (v) => isFinite(v) && !isNaN(v)
  ));

const { data: deptRows } = await admin.from("departments").select("name, is_staffed").order("created_at");
const { data: empRows }  = await admin.from("employees").select("name, status").order("created_at");
console.log("\n  All departments:", deptRows?.map((d) => d.name).join(", "));
console.log("  All employees:  ", empRows?.map((e) => e.name).join(", "));
console.log(`  Total departments: ${deptCount.count}, Total employees: ${empCount.count}, Total signal rows: ${totalSigCount.count}`);

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Department id : ${deptId}`);
console.log(`  Employee id   : ${empId}`);
console.log(`  Signal rows   : ${phoneSigCount.count} (this employee)`);
if (passed < checks) process.exit(1);
