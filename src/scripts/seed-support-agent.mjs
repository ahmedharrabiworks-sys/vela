// Seed: Support department + Support Agent employee, runs first real signal compute.
// Mirrors seed-security-agent.mjs structure exactly.
// Idempotent — safe to run multiple times.
// ⚠️  Requires migration_v15.sql to have been run (employees table).
// ⚠️  Requires migration_v18.sql to have been run (needs_human_resolved_at column).
// Usage: node src/scripts/seed-support-agent.mjs

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

// ── Signal compute (mirrors queries.ts computeSupportAgentSignals) ─────────────

async function computeSupportAgentSignalsLocal(employeeId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const now_iso = new Date().toISOString();

  const [openRes, staleRes, tenantsRes] = await Promise.all([
    admin.from("conversations").select("id, tenant_id", { count: "exact", head: true }).eq("needs_human", true),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("needs_human", true).lt("last_message_at", twentyFourHoursAgo),
    admin.from("conversations").select("tenant_id").eq("needs_human", true),
  ]);

  if (openRes.error) throw new Error(`open: ${openRes.error.message}`);
  if (staleRes.error) throw new Error(`stale: ${staleRes.error.message}`);

  const openCount = openRes.count ?? 0;
  const staleCount = staleRes.count ?? 0;
  const tenantsWithEscalations = new Set((tenantsRes.data ?? []).map((r) => r.tenant_id)).size;

  // resolved_last_30_days requires needs_human_resolved_at (migration_v18.sql)
  let resolvedLast30d = null;
  const resolvedRes = await admin
    .from("conversations").select("id", { count: "exact", head: true })
    .not("needs_human_resolved_at", "is", null)
    .gte("needs_human_resolved_at", thirtyDaysAgo);

  if (resolvedRes.error) {
    console.log("  ⚠ resolved_last_30_days skipped — run supabase/migration_v18.sql to unlock this signal");
    console.log(`    (error: ${resolvedRes.error.code} ${resolvedRes.error.message})`);
  } else {
    resolvedLast30d = resolvedRes.count ?? 0;
  }

  const signals = [
    {
      signalName: "open_escalations_count",
      value: openCount,
      realDescription: "conversations table COUNT WHERE needs_human = true — total open human-handoff requests (all tenants, never reset without explicit resolve)",
    },
    {
      signalName: "stale_escalations_count",
      value: staleCount,
      realDescription: "conversations WHERE needs_human = true AND last_message_at < now() - 24h — escalations with no recent activity (aging proxy)",
    },
    {
      signalName: "tenants_with_escalations",
      value: tenantsWithEscalations,
      realDescription: "COUNT DISTINCT tenant_id WHERE needs_human = true — number of tenants that currently have at least one open escalation",
    },
    ...(resolvedLast30d !== null ? [{
      signalName: "resolved_last_30_days",
      value: resolvedLast30d,
      realDescription: "conversations WHERE needs_human_resolved_at IS NOT NULL AND needs_human_resolved_at >= now() - 30 days — escalations explicitly marked resolved in the last 30 days",
    }] : []),
  ];

  const insertRows = signals.map((s) => ({
    employee_id: employeeId,
    signal_name: s.signalName,
    real_description: s.realDescription,
    value: s.value,
    computed_at: now_iso,
  }));

  const { error: insertError } = await admin.from("employee_signals").insert(insertRows);
  if (insertError) throw new Error(`insert: ${insertError.message}`);

  return { signals, openCount, staleCount, tenantsWithEscalations, resolvedLast30d, resolvedSignalSkipped: resolvedLast30d === null };
}

// ── STEP 1: Support department ────────────────────────────────────────────────

console.log("\n1. Support department");
const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments").select("id, name, is_staffed").eq("name", "Support").single();

if (deptLookupErr && deptLookupErr.code !== "PGRST116") {
  if (deptLookupErr.message?.includes("does not exist")) {
    console.error("\n  FATAL: departments table does not exist. Run migration_v15.sql first.\n");
    process.exit(1);
  }
  throw deptLookupErr;
}

let deptId;
if (existingDept) {
  console.log(`  → Already exists: id=${existingDept.id}`);
  deptId = existingDept.id;
} else {
  const { data: newDept, error: deptInsErr } = await admin
    .from("departments").insert({ name: "Support", is_staffed: true }).select("id").single();
  if (deptInsErr) { console.error("  FATAL:", deptInsErr.message); process.exit(1); }
  deptId = newDept.id;
  console.log(`  → Created: id=${deptId}`);
}

// ── STEP 2: Support Agent employee ───────────────────────────────────────────

console.log("\n2. Support Agent employee");
const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees").select("id, name").eq("name", "Support Agent").single();

if (empLookupErr && empLookupErr.code !== "PGRST116") throw empLookupErr;

let empId;
if (existingEmp) {
  console.log(`  → Already exists: id=${existingEmp.id}`);
  empId = existingEmp.id;
} else {
  const { data: newEmp, error: empInsErr } = await admin
    .from("employees").insert({
      department_id: deptId,
      name: "Support Agent",
      role_description: "Monitors the conversations.needs_human escalation flag across all tenants — surfaces open human-handoff requests, aging escalations, and resolution activity",
      domain_description: "Level 0 — observed only. Reads conversations.needs_human and needs_human_resolved_at. No ticket system (no support_tickets table), no inbound email channel, no SLA enforcement, no assignment logic. Real signal foundation only. safe_default_action: null (no containment authority — read-only observer).",
      status: "idle",
      safe_default_action: null,
    }).select("id").single();
  if (empInsErr) { console.error("  FATAL:", empInsErr.message); process.exit(1); }
  empId = newEmp.id;
  console.log(`  → Created: id=${empId}`);
}

// ── STEP 3: First real signal compute ────────────────────────────────────────

console.log("\n3. Computing Support Agent signals (conversations.needs_human)");

let signalResult;
try {
  signalResult = await computeSupportAgentSignalsLocal(empId);
  console.log(`  Signals written: ${signalResult.signals.length}`);
  for (const s of signalResult.signals) {
    console.log(`  [${s.signalName}] ${s.value}`);
  }
} catch (e) {
  console.error("  FATAL: signal compute failed:", e.message);
  if (e.message?.includes("needs_human_resolved_at")) {
    console.error("  → Run supabase/migration_v18.sql in Supabase SQL Editor first.");
  }
  process.exit(1);
}

// ── STEP 4: Verification ─────────────────────────────────────────────────────

console.log("\n4. Verification");

const [supDeptRow, supEmpRow, sigRows, logCount] = await Promise.all([
  admin.from("departments").select("id, name, is_staffed").eq("id", deptId).single(),
  admin.from("employees").select("id, name, status, safe_default_action, domain_description").eq("id", empId).single(),
  admin.from("employee_signals").select("signal_name, value").eq("employee_id", empId).order("computed_at", { ascending: false }).limit(4),
  admin.from("learning_log").select("id", { count: "exact", head: true }).eq("employee_id", empId),
]);

check("V1: Support department exists and is_staffed=true",
  !!supDeptRow.data && supDeptRow.data.is_staffed === true, supDeptRow.data?.name);
check("V2: Support Agent employee exists",
  !!supEmpRow.data && !supEmpRow.error, supEmpRow.data?.name);
check("V3: safe_default_action is null (no execution authority — Level 0)",
  supEmpRow.data?.safe_default_action === null, `safe_default_action=${supEmpRow.data?.safe_default_action}`);
check("V4: status=idle",
  supEmpRow.data?.status === "idle", supEmpRow.data?.status);
check("V5: domain_description mentions Level 0",
  supEmpRow.data?.domain_description?.includes("Level 0"), "Level 0 in domain_description");
const expectedSignals = signalResult.resolvedSignalSkipped ? 3 : 4;
check(`V6: ${expectedSignals} signals written to employee_signals${signalResult.resolvedSignalSkipped ? " (resolved_last_30_days pending migration_v18.sql)" : ""}`,
  (sigRows.data?.length ?? 0) === expectedSignals, `signals=${sigRows.data?.length ?? 0}`);
check("V7: learning_log is empty (no synthetic activity)",
  logCount.count === 0, `count=${logCount.count}`);

// Verify each signal is present with a valid numeric value
const sigMap = Object.fromEntries((sigRows.data ?? []).map((s) => [s.signal_name, s.value]));
check("V8: open_escalations_count is numeric",
  sigMap["open_escalations_count"] !== undefined && isFinite(Number(sigMap["open_escalations_count"])),
  `value=${sigMap["open_escalations_count"]}`);
check("V9: stale_escalations_count is numeric",
  sigMap["stale_escalations_count"] !== undefined && isFinite(Number(sigMap["stale_escalations_count"])),
  `value=${sigMap["stale_escalations_count"]}`);
check("V10: resolved_last_30_days is numeric (or skipped if migration_v18.sql not yet run)",
  signalResult.resolvedSignalSkipped
    ? true  // skip this check — signal not written, that's correct
    : (sigMap["resolved_last_30_days"] !== undefined && isFinite(Number(sigMap["resolved_last_30_days"]))),
  signalResult.resolvedSignalSkipped ? "skipped (migration_v18.sql pending)" : `value=${sigMap["resolved_last_30_days"]}`);

// Sanity: stale count can't exceed open count
check("V11: stale_escalations_count <= open_escalations_count (sanity)",
  Number(sigMap["stale_escalations_count"] ?? 0) <= Number(sigMap["open_escalations_count"] ?? 0),
  `stale=${sigMap["stale_escalations_count"]} open=${sigMap["open_escalations_count"]}`);

const { data: allDepts } = await admin.from("departments").select("name").order("created_at");
const { data: allEmps }  = await admin.from("employees").select("name").order("created_at");
console.log("\n  All departments:", allDepts?.map((d) => d.name).join(", "));
console.log("  All employees:  ", allEmps?.map((e) => e.name).join(", "));

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Support department id : ${deptId}`);
console.log(`  Support Agent id      : ${empId}`);
console.log(`  open_escalations_count: ${signalResult.openCount}`);
console.log(`  stale_escalations_count: ${signalResult.staleCount}`);
console.log(`  tenants_with_escalations: ${signalResult.tenantsWithEscalations}`);
console.log(`  resolved_last_30_days: ${signalResult.resolvedLast30d ?? "skipped — run supabase/migration_v18.sql"}`);
if (passed < checks) process.exit(1);
