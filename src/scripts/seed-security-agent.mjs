// Seed: Security department + Security Agent employee, runs first real audit.
// Mirrors logic from src/lib/mission-control/security-checks.ts.
// Idempotent — safe to run multiple times.
// ⚠️  Requires migration_v15.sql to have been run (employees table).
// Usage: node src/scripts/seed-security-agent.mjs

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

// ── Security check functions (mirrors security-checks.ts) ─────────────────────

const TENANT_TABLES_REQUIRING_RLS = [
  "tenants","tenant_config","websites","website_versions",
  "conversations","messages","leads","appointments",
  "agent_calls","whatsapp_accounts","marketing_generations","webhook_logs",
];
const ADMIN_ONLY_TABLES = [
  "departments","employees","employee_signals","employee_insights",
  "learning_log","mission_control_access_log",
];

async function checkRlsPolicies() {
  // pg_policies lives in pg_catalog — PostgREST never exposes that schema.
  // get_rls_policies() is a SECURITY DEFINER function created by migration_v19.sql.
  const { data: policies, error } = await admin.rpc("get_rls_policies");
  if (error) return [{ finding: "get_rls_policies() RPC not accessible — migration_v19.sql may not have been run", evidence: `Error ${error.code}: ${error.message}`, severity: "warning" }];

  const tableMap = new Map();
  for (const p of policies ?? []) {
    if (!tableMap.has(p.tablename)) tableMap.set(p.tablename, []);
    tableMap.get(p.tablename).push(p);
  }
  const findings = [];
  for (const [table, pols] of tableMap.entries()) {
    for (const pol of pols) {
      if (pol.permissive === "PERMISSIVE" && pol.qual === "true") {
        findings.push({ finding: `Table "${table}" has permissive policy with qual='true'`, evidence: `Policy: "${pol.policyname}", cmd: ${pol.cmd}`, severity: "critical" });
      }
    }
  }
  for (const table of TENANT_TABLES_REQUIRING_RLS) {
    if (!tableMap.has(table)) findings.push({ finding: `Tenant table "${table}" has no RLS policies`, evidence: `pg_policies returned 0 rows for public.${table}`, severity: "critical" });
  }
  const adminWithPolicies = ADMIN_ONLY_TABLES.filter(t => tableMap.has(t));
  if (adminWithPolicies.length > 0) findings.push({ finding: `Admin-only tables have unexpected policies: ${adminWithPolicies.join(", ")}`, evidence: "MC tables are admin-client-only by design", severity: "warning" });
  return findings;
}

const WEBHOOK_ROUTES = [
  { route: "/api/webhooks/instagram",        vars: ["META_WEBHOOK_VERIFY_TOKEN","META_APP_SECRET"],    description: "Instagram DM webhook" },
  { route: "/api/webhooks/whatsapp",         vars: ["META_WHATSAPP_VERIFY_TOKEN","META_APP_SECRET"],   description: "WhatsApp Meta Cloud API webhook" },
  { route: "/api/ai-agent/call-webhook",     vars: ["VAPI_WEBHOOK_SECRET"],                            description: "Vapi end-of-call webhook" },
  { route: "/api/whatsapp/webhook (Twilio)", vars: ["TWILIO_AUTH_TOKEN"],                              description: "Legacy Twilio webhook" },
];
function checkWebhookFailOpen() {
  const findings = [];
  for (const hook of WEBHOOK_ROUTES) {
    const unset = hook.vars.filter(v => !process.env[v]);
    const set = hook.vars.filter(v => !!process.env[v]);
    if (unset.length > 0) findings.push({ finding: `Route "${hook.route}" has ${unset.length} unset secret(s)`, evidence: `Set: [${set.join(", ")||"none"}] | Unset: [${unset.join(", ")}] | ${hook.description}`, severity: "warning" });
  }
  return findings;
}

const SENSITIVE_PATTERNS = ["SECRET","SERVICE_ROLE","PRIVATE_KEY","ADMIN_KEY"];
function checkExposedEnvVars() {
  const findings = [];
  const exposed = Object.keys(process.env).filter(k => k.startsWith("NEXT_PUBLIC_")).filter(k => SENSITIVE_PATTERNS.some(p => k.toUpperCase().includes(p)));
  for (const key of exposed) {
    const pattern = SENSITIVE_PATTERNS.find(p => key.toUpperCase().includes(p));
    findings.push({ finding: `Client-bundled env var "${key}" matches sensitive pattern "${pattern}"`, evidence: `NEXT_PUBLIC_* prefix bundles value into client-side JS`, severity: "critical" });
  }
  return findings;
}

const SCHEMA_EXPECTATIONS = [
  { table: "agent_calls",     column: null,                          migration: "migration_v13b.sql", description: "Voice call recording" },
  { table: "tenant_config",   column: "knowledge_base_updated_at",  migration: "migration_v13b.sql", description: "KB training timestamp" },
  { table: "whatsapp_accounts", column: null,                        migration: "migration_v9.sql",   description: "WhatsApp channel accounts" },
];
async function checkSchemaVsMigrations() {
  const findings = [];
  for (const exp of SCHEMA_EXPECTATIONS) {
    const { error } = await admin.from(exp.table).select(exp.column ?? "id").limit(1);
    if (!error) continue;
    // PostgREST uses PGRST205 for BOTH "table not found" (no column selected) AND
    // "column not found" (column selected). Disambiguate by whether exp.column is set.
    const missingTable = error.code === "42P01" ||
      (error.code === "PGRST205" && !exp.column) ||
      (!exp.column && (error.message?.includes("does not exist") || error.message?.includes("Could not find the table")));
    const missingCol = (error.code === "PGRST205" && !!exp.column) ||
      error.code === "42703" ||
      (!!exp.column && error.message?.includes(exp.column));
    if (missingTable) findings.push({ finding: `Table "${exp.table}" does not exist`, evidence: `${error.code}: ${error.message} | ${exp.migration}`, severity: "critical" });
    else if (exp.column && missingCol) findings.push({ finding: `Column "${exp.table}.${exp.column}" does not exist`, evidence: `${error.code}: ${error.message} | ${exp.migration}`, severity: "critical" });
    else findings.push({ finding: `Could not verify "${exp.table}${exp.column ? "."+exp.column : ""}"`, evidence: `${error.code}: ${error.message}`, severity: "warning" });
  }
  return findings;
}

async function runSecurityAuditLocal(employeeId) {
  const runAt = new Date().toISOString();
  const categoryDefs = [
    { name: "rls_policies",     description: "RLS policies",      run: checkRlsPolicies },
    { name: "webhook_secrets",  description: "Webhook fail-open", run: checkWebhookFailOpen },
    { name: "exposed_env_vars", description: "Exposed env vars",  run: checkExposedEnvVars },
    { name: "schema_drift",     description: "Schema vs migrations", run: checkSchemaVsMigrations },
  ];
  const categories = [];
  for (const cat of categoryDefs) {
    let findings = [];
    try { findings = await cat.run(); } catch (e) { findings = [{ finding: `Check "${cat.name}" errored`, evidence: e.message, severity: "warning" }]; }
    categories.push({ name: cat.name, description: cat.description, findings });
  }
  const allFindings = categories.flatMap(c => c.findings);

  // Write to employee_insights if migrations have run
  if (allFindings.length > 0) {
    const rows = categories.flatMap(cat =>
      cat.findings.map(f => ({
        employee_id: employeeId, kind: "security_finding",
        content: `[${f.severity.toUpperCase()}] ${f.finding}\n\nEvidence: ${f.evidence}`,
        supporting_signal_ids: [],
        confidence: f.severity === "critical" ? "high" : f.severity === "warning" ? "medium" : "low",
      }))
    );
    const { error: insErr } = await admin.from("employee_insights").insert(rows);
    if (insErr) {
      console.log(`  ⚠ employee_insights insert failed: ${insErr.message}`);
      if (insErr.message?.includes("security_finding")) console.log(`    → Run supabase/migration_v17.sql in Supabase SQL Editor.`);
      else if (insErr.message?.includes("employee_insights")) console.log(`    → Run supabase/migration_v16.sql in Supabase SQL Editor.`);
    }
  }

  return {
    runAt, categories, allFindings,
    criticalCount: allFindings.filter(f => f.severity === "critical").length,
    warningCount:  allFindings.filter(f => f.severity === "warning").length,
    infoCount:     allFindings.filter(f => f.severity === "info").length,
  };
}

// ── STEP 1: Security department ───────────────────────────────────────────────

console.log("\n1. Security department");
const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments").select("id, name, is_staffed").eq("name", "Security").single();

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
    .from("departments").insert({ name: "Security", is_staffed: true }).select("id").single();
  if (deptInsErr) { console.error("  FATAL:", deptInsErr.message); process.exit(1); }
  deptId = newDept.id;
  console.log(`  → Created: id=${deptId}`);
}

// ── STEP 2: Security Agent employee ──────────────────────────────────────────

console.log("\n2. Security Agent employee");
const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees").select("id, name").eq("name", "Security Agent").single();

if (empLookupErr && empLookupErr.code !== "PGRST116") throw empLookupErr;

let empId;
if (existingEmp) {
  console.log(`  → Already exists: id=${existingEmp.id}`);
  empId = existingEmp.id;
} else {
  const { data: newEmp, error: empInsErr } = await admin
    .from("employees").insert({
      department_id: deptId,
      name: "Security Agent",
      role_description: "Audits Vela's production security posture across four check categories: RLS policies, webhook secret coverage, client-side env var exposure, and schema drift vs known migrations",
      domain_description: "Report-only in Stage 1 — zero execution authority. Checks: pg_policies (RLS), process.env webhook secrets, NEXT_PUBLIC_* exposure, information_schema for known-critical column/table presence. safe_default_action: null (no containment authority earned yet — read-only investigator).",
      status: "idle",
      safe_default_action: null,
    }).select("id").single();
  if (empInsErr) { console.error("  FATAL:", empInsErr.message); process.exit(1); }
  empId = newEmp.id;
  console.log(`  → Created: id=${empId}`);
}

// ── STEP 3: First real security audit ─────────────────────────────────────────

console.log("\n3. Running first security audit (all 4 categories)");
const auditResult = await runSecurityAuditLocal(empId);

console.log(`  Ran at: ${auditResult.runAt}`);
for (const cat of auditResult.categories) {
  const findingStr = cat.findings.length === 0
    ? "0 findings"
    : cat.findings.map(f => `[${f.severity.toUpperCase()}] ${f.finding.slice(0,80)}`).join("; ");
  console.log(`  [${cat.name}] ${findingStr}`);
}
console.log(`  Total: ${auditResult.allFindings.length} findings (critical=${auditResult.criticalCount}, warning=${auditResult.warningCount}, info=${auditResult.infoCount})`);

// ── STEP 4: Verification ──────────────────────────────────────────────────────

console.log("\n4. Verification");

const [secDeptRow, secEmpRow, logCount] = await Promise.all([
  admin.from("departments").select("id, name, is_staffed").eq("id", deptId).single(),
  admin.from("employees").select("id, name, status, safe_default_action").eq("id", empId).single(),
  admin.from("learning_log").select("id", { count: "exact", head: true }).eq("employee_id", empId),
]);

check("V1: Security department exists and is_staffed=true",
  !!secDeptRow.data && secDeptRow.data.is_staffed === true, secDeptRow.data?.name);
check("V2: Security Agent employee exists",
  !!secEmpRow.data && !secEmpRow.error, secEmpRow.data?.name);
check("V3: safe_default_action is null (no execution authority earned yet)",
  secEmpRow.data?.safe_default_action === null, `safe_default_action=${secEmpRow.data?.safe_default_action}`);
check("V4: status=idle", secEmpRow.data?.status === "idle", secEmpRow.data?.status);
check("V5: all 4 audit categories ran",
  auditResult.categories.length === 4, `categories=${auditResult.categories.length}`);
check("V6: learning_log is empty", logCount.count === 0, `count=${logCount.count}`);

// Schema-drift specific checks
const schemaCat = auditResult.categories.find(c => c.name === "schema_drift");
const schemaFindings = schemaCat?.findings ?? [];
const agentCallsMissing = schemaFindings.some(f => f.finding.includes('"agent_calls"') && f.severity === "critical");
const kbColMissing = schemaFindings.some(f => f.finding.includes("knowledge_base_updated_at") && f.severity === "critical");
const waMissing = schemaFindings.some(f => f.finding.includes("whatsapp_accounts") && f.severity === "critical");

check("V7: agent_calls table confirmed present (no critical schema-drift finding)",
  !agentCallsMissing, agentCallsMissing ? "MISSING" : "present");
check("V8: tenant_config.knowledge_base_updated_at confirmed present",
  !kbColMissing, kbColMissing ? "MISSING" : "present");
check("V9: whatsapp_accounts table confirmed present (no critical schema-drift finding)",
  !waMissing, waMissing ? "MISSING — run migration_v9.sql" : "present");
check("V10: findings are real numbers (not NaN)",
  [auditResult.criticalCount, auditResult.warningCount, auditResult.infoCount].every(v => isFinite(v) && !isNaN(v)));

const { data: allDepts } = await admin.from("departments").select("name").order("created_at");
const { data: allEmps }  = await admin.from("employees").select("name").order("created_at");
console.log("\n  All departments:", allDepts?.map(d => d.name).join(", "));
console.log("  All employees:  ", allEmps?.map(e => e.name).join(", "));

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Security department id : ${deptId}`);
console.log(`  Security Agent id      : ${empId}`);
console.log(`  Audit findings         : ${auditResult.allFindings.length} total`);
if (passed < checks) process.exit(1);
