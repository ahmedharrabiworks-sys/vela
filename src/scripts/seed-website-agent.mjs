// One-time seed: creates Website Builder department + Website Agent employee
// and computes initial signals from the live websites table.
// Idempotent — safe to run multiple times; checks existence before inserting.
// ⚠️  Requires migration_v15.sql to have been run first.
// Usage: node src/scripts/seed-website-agent.mjs

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

console.log("\n1. Website Builder department");

const { data: existingDept, error: deptLookupErr } = await admin
  .from("departments")
  .select("id, name, is_staffed")
  .eq("name", "Website Builder")
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
    .insert({ name: "Website Builder", is_staffed: true })
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

console.log("\n2. Website Agent employee");

const { data: existingEmp, error: empLookupErr } = await admin
  .from("employees")
  .select("id, name")
  .eq("name", "Website Agent")
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
      name: "Website Agent",
      role_description: "Monitors website generation and publication activity across all tenants",
      domain_description: "Website Builder — site creation, generation success rates, publication status",
      status: "idle",
      safe_default_action: "pause any pending publish, preserve draft intact",
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

console.log("\n3. Computing Website Agent signals from websites table");

const { data: websiteRows, error: sitesErr } = await admin
  .from("websites")
  .select("id, draft_html, is_published");

if (sitesErr) {
  console.error("  FATAL: could not query websites:", sitesErr.message);
  process.exit(1);
}

const totalSites          = (websiteRows ?? []).length;
const sitesWithDraft      = (websiteRows ?? []).filter((r) => r.draft_html != null).length;
const publishedSites      = (websiteRows ?? []).filter((r) => r.is_published === true).length;
const generationSuccessRate = totalSites > 0
  ? parseFloat(((sitesWithDraft / totalSites) * 100).toFixed(1)) : 0;
const publishRate = totalSites > 0
  ? parseFloat(((publishedSites / totalSites) * 100).toFixed(1)) : 0;

console.log(`  total_sites=${totalSites}, sites_with_draft=${sitesWithDraft}, published_sites=${publishedSites}`);
console.log(`  generation_success_rate=${generationSuccessRate}%, publish_rate=${publishRate}%`);

const now = new Date().toISOString();
const signalRows = [
  { signal_name: "total_sites",               value: totalSites,              real_description: "Total websites rows across all tenants (websites table, all time)" },
  { signal_name: "sites_with_draft",          value: sitesWithDraft,          real_description: "Websites where draft_html IS NOT NULL — proxy for at least one successful generation" },
  { signal_name: "published_sites",           value: publishedSites,          real_description: "Websites where is_published = true — owner explicitly published" },
  { signal_name: "generation_success_rate",   value: generationSuccessRate,   real_description: "sites_with_draft / total_sites × 100 — all-time generation success rate (%)" },
  { signal_name: "publish_rate",              value: publishRate,             real_description: "published_sites / total_sites × 100 — share of created sites that were published (%)" },
].map((s) => ({ ...s, employee_id: empId, computed_at: now }));

const { error: insertErr } = await admin.from("employee_signals").insert(signalRows);
if (insertErr) {
  console.error("  FATAL: could not insert signals:", insertErr.message);
  process.exit(1);
}
console.log(`  → Wrote ${signalRows.length} signal rows`);

// ── STEP 4: Verify ────────────────────────────────────────────────────────────

console.log("\n4. Verification");

const [deptCount, empCount, sigCount, logCount] = await Promise.all([
  admin.from("departments").select("id", { count: "exact", head: true }),
  admin.from("employees").select("id", { count: "exact", head: true }),
  admin.from("employee_signals").select("id", { count: "exact", head: true }).eq("employee_id", empId),
  admin.from("learning_log").select("id", { count: "exact", head: true }).eq("employee_id", empId),
]);

check("V1: exactly 1 department",            deptCount.count === 1,          `count=${deptCount.count}`);
check("V2: exactly 1 employee",              empCount.count === 1,           `count=${empCount.count}`);
check("V3: signals written for this employee", (sigCount.count ?? 0) > 0,   `count=${sigCount.count}`);
check("V4: learning_log is empty (expected)", logCount.count === 0,          `count=${logCount.count}`);
check("V5: total_sites is non-negative",     totalSites >= 0,                `${totalSites}`);
check("V6: generation_success_rate in 0-100", generationSuccessRate >= 0 && generationSuccessRate <= 100, `${generationSuccessRate}%`);
check("V7: publish_rate in 0-100",           publishRate >= 0 && publishRate <= 100, `${publishRate}%`);
check("V8: no NaN or Infinity in signals",
  [totalSites, sitesWithDraft, publishedSites, generationSuccessRate, publishRate].every(
    (v) => isFinite(v) && !isNaN(v)
  ));

// Confirm department is_staffed = true
const { data: deptRow } = await admin.from("departments").select("is_staffed").eq("id", deptId).single();
check("V9: department is_staffed=true",      deptRow?.is_staffed === true);

// Confirm employee status is idle
const { data: empRow } = await admin.from("employees").select("status").eq("id", empId).single();
check("V10: employee status=idle",           empRow?.status === "idle",      empRow?.status);

console.log(`\n── ${passed}/${checks} checks passed ──`);
console.log(`\nSeed complete.`);
console.log(`  Department id : ${deptId}`);
console.log(`  Employee id   : ${empId}`);
console.log(`  Signal count  : ${sigCount.count}`);
if (passed < checks) process.exit(1);
