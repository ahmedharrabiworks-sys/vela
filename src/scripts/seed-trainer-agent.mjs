// One-time seed: creates AI Training department + Trainer Agent employee
// and computes initial signals from tenant_config.knowledge_base_updated_at.
// Idempotent — safe to run multiple times; checks existence before inserting.
// ⚠️  Requires migration_v15.sql to have been run first.
// Usage: node src/scripts/seed-trainer-agent.mjs

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

console.log("\n1. AI Training department");

const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments")
  .select("id, name, is_staffed")
  .eq("name", "AI Training")
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
    .insert({ name: "AI Training", is_staffed: true })
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

console.log("\n2. Trainer Agent employee");

const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees")
  .select("id, name")
  .eq("name", "Trainer Agent")
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
      name: "Trainer Agent",
      role_description: "Monitors AI knowledge base training completion and freshness across all tenants",
      domain_description: "AI Trainer pipeline — KB training rates, knowledge_base_updated_at staleness, untrained tenant detection",
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

console.log("\n3. Computing Trainer Agent signals from tenant_config");

const [tenantsRes, configsRes] = await Promise.all([
  admin.from("tenants").select("id", { count: "exact", head: true }),
  admin.from("tenant_config").select("tenant_id, knowledge_base_updated_at"),
]);

if (tenantsRes.error) { console.error("  FATAL:", tenantsRes.error.message); process.exit(1); }
if (configsRes.error) { console.error("  FATAL:", configsRes.error.message); process.exit(1); }

const totalTenants      = tenantsRes.count ?? 0;
const configs           = configsRes.data ?? [];
const now               = Date.now();
const KB_STALE_DAYS     = 90;

const trainedConfigs    = configs.filter((c) => c.knowledge_base_updated_at != null);
const tenantsWithKb     = trainedConfigs.length;
const kbTrainedRate     = totalTenants > 0 ? parseFloat(((tenantsWithKb / totalTenants) * 100).toFixed(1)) : 0;
const avgKbAgeDays      = tenantsWithKb > 0
  ? parseFloat((trainedConfigs.reduce((sum, c) =>
      sum + Math.floor((now - new Date(c.knowledge_base_updated_at).getTime()) / 86_400_000), 0
    ) / tenantsWithKb).toFixed(1))
  : 0;
const kbStaleCount      = trainedConfigs.filter((c) =>
  Math.floor((now - new Date(c.knowledge_base_updated_at).getTime()) / 86_400_000) > KB_STALE_DAYS
).length;

console.log(`  total_tenants=${totalTenants}, tenants_with_kb=${tenantsWithKb}, kb_trained_rate=${kbTrainedRate}%`);
console.log(`  avg_kb_age_days=${avgKbAgeDays}, kb_stale_count=${kbStaleCount}`);

const nowIso = new Date().toISOString();
const signalRows = [
  { signal_name: "total_tenants",     value: totalTenants,     real_description: "Total tenant rows (tenants table, all time)" },
  { signal_name: "tenants_with_kb",   value: tenantsWithKb,    real_description: "Tenants where knowledge_base_updated_at IS NOT NULL — at least one AI training session completed" },
  { signal_name: "kb_trained_rate",   value: kbTrainedRate,    real_description: "tenants_with_kb / total_tenants × 100 — share of tenants that have completed at least one AI training session (%)" },
  { signal_name: "avg_kb_age_days",   value: avgKbAgeDays,     real_description: "Average days since knowledge_base_updated_at across trained tenants — KB freshness proxy" },
  { signal_name: "kb_stale_count",    value: kbStaleCount,     real_description: `Trained tenants where knowledge_base_updated_at is older than ${KB_STALE_DAYS} days — staleness proxy` },
].map((s) => ({ ...s, employee_id: empId, computed_at: nowIso }));

const { error: insertErr } = await admin.from("employee_signals").insert(signalRows);
if (insertErr) {
  console.error("  FATAL: could not insert signals:", insertErr.message);
  process.exit(1);
}
console.log(`  → Wrote ${signalRows.length} signal rows`);

// ── STEP 4: Verification ──────────────────────────────────────────────────────

console.log("\n4. Verification");

const [trainerDeptRow, trainerEmpRow, trainerSigCount, trainerLogCount, totalSigCount, deptCount, empCount] = await Promise.all([
  admin.from("departments").select("id, name, is_staffed").eq("id", deptId).single(),
  admin.from("employees").select("id, name, status").eq("id", empId).single(),
  admin.from("employee_signals").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("learning_log").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("employee_signals").select("employee_id", { count: "exact", head: true }),
  admin.from("departments").select("id", { count: "exact", head: true }),
  admin.from("employees").select("id", { count: "exact", head: true }),
]);

check("V1: AI Training department exists",          !!trainerDeptRow.data && !trainerDeptRow.error, trainerDeptRow.data?.name);
check("V2: Trainer Agent employee exists",          !!trainerEmpRow.data && !trainerEmpRow.error,   trainerEmpRow.data?.name);
check("V3: trainer signals written",                (trainerSigCount.count ?? 0) > 0,   `count=${trainerSigCount.count}`);
check("V4: trainer learning_log is empty",          trainerLogCount.count === 0,        `count=${trainerLogCount.count}`);
check("V5: total_tenants is non-negative",          totalTenants >= 0,                  `${totalTenants}`);
check("V6: kb_trained_rate in 0-100",               kbTrainedRate >= 0 && kbTrainedRate <= 100, `${kbTrainedRate}%`);
check("V7: avg_kb_age_days is non-negative",        avgKbAgeDays >= 0,                  `${avgKbAgeDays} days`);
check("V8: kb_stale_count ≤ tenants_with_kb",       kbStaleCount <= tenantsWithKb,      `${kbStaleCount} / ${tenantsWithKb}`);
check("V9: no NaN or Infinity",
  [totalTenants, tenantsWithKb, kbTrainedRate, avgKbAgeDays, kbStaleCount].every(
    (v) => isFinite(v) && !isNaN(v)
  ));

check("V10: AI Training department is_staffed=true",  trainerDeptRow.data?.is_staffed === true);

const { data: deptRows } = await admin.from("departments").select("name, is_staffed").order("created_at");
console.log("\n  All departments:", deptRows?.map((d) => `${d.name} (staffed=${d.is_staffed})`).join(", "));
console.log(`  Total departments: ${deptCount.count}, Total employees: ${empCount.count}`);
console.log(`  Total signal rows across all employees: ${totalSigCount.count}`);

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Department id : ${deptId}`);
console.log(`  Employee id   : ${empId}`);
console.log(`  Signal rows   : ${trainerSigCount.count} (this employee)`);
if (passed < checks) process.exit(1);
