// Diagnostic — Mission Control Phase 1 pre-flight
// Run: node src/scripts/diag-mc-phase1-tables.mjs
// Queries production Supabase directly using the service role key.
// Read-only: SELECT from information_schema only.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load env vars from .env.local
const envPath = join(process.cwd(), ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  db:   { schema: "public" },
});

async function query(sql) {
  // Use the REST /rest/v1/rpc endpoint via a raw fetch to run arbitrary SQL
  // via the pg_ functions available to the service role
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) return { error: `HTTP ${res.status}: ${await res.text()}` };
  return { data: await res.json() };
}

// Alternative: use supabase-js .from("information_schema.tables") — won't work directly.
// Instead, query via a known public table approach using the admin SDK.
// We'll use the fact that createClient with service role bypasses RLS,
// and we can query information_schema via a raw RPC if it's available.
// Fallback: just try to insert/select from each table and check the error code.

async function checkTableExists(tableName) {
  // Try selecting 0 rows — if table doesn't exist, we get error code 42P01
  const { data, error } = await sb.from(tableName).select("*", { head: true, count: "exact" }).limit(0);
  if (error) {
    if (error.code === "42P01") return { exists: false, error: null };
    return { exists: null, error: `Unexpected error: ${error.code} — ${error.message}` };
  }
  return { exists: true, count: data };
}

async function checkColumn(table, column) {
  // Try selecting the specific column — if missing, error code 42703
  const { data, error } = await sb.from(table).select(column).limit(0);
  if (error) {
    if (error.code === "42703") return { exists: false };
    if (error.code === "42P01") return { exists: false, tableAlsoMissing: true };
    return { exists: null, error: `${error.code}: ${error.message}` };
  }
  return { exists: true };
}

console.log("=".repeat(60));
console.log("VELA — Production DB diagnostic (read-only)");
console.log(`URL: ${SUPABASE_URL.replace(/\/\/.*@/, "//***@")}`);
console.log("=".repeat(60));

// 1. Check agent_calls existence
console.log("\n[1] agent_calls table:");
const ac = await checkTableExists("agent_calls");
if (ac.exists === false) {
  console.log("  ✗ DOES NOT EXIST (42P01)");
} else if (ac.exists === true) {
  console.log("  ✓ EXISTS");
} else {
  console.log("  ? Unexpected:", ac.error);
}

// 2. Check tenant_config.knowledge_base_updated_at (from migration_v13.sql ALTER TABLE)
console.log("\n[2] tenant_config.knowledge_base_updated_at column:");
const kbTs = await checkColumn("tenant_config", "knowledge_base_updated_at");
if (kbTs.exists === false && kbTs.tableAlsoMissing) {
  console.log("  ✗ tenant_config table also missing (unexpected)");
} else if (kbTs.exists === false) {
  console.log("  ✗ COLUMN DOES NOT EXIST — migration_v13.sql ALTER TABLE did not run");
} else if (kbTs.exists === true) {
  console.log("  ✓ COLUMN EXISTS — migration_v13.sql ALTER TABLE ran successfully");
} else {
  console.log("  ? Unexpected:", kbTs.error);
}

// 3. If agent_calls DOES exist, check for the composite index by querying a row
if (ac.exists === true) {
  console.log("\n[3] agent_calls columns check:");
  const cols = ["tenant_id", "duration_seconds", "ended_at", "call_type", "transcript", "created_at"];
  for (const col of cols) {
    const r = await checkColumn("agent_calls", col);
    console.log(`  ${r.exists ? "✓" : "✗"} ${col}`);
  }
}

// 4. Check other tables that migration_v6.sql touched
console.log("\n[4] Other tables created by migration_v6.sql:");
const vRes = await checkColumn("tenant_config", "vapi_phone_number_id");
console.log(`  tenant_config.vapi_phone_number_id: ${vRes.exists ? "✓ exists" : "✗ missing"}`);
const aRes = await checkColumn("tenant_config", "agent_settings");
console.log(`  tenant_config.agent_settings:       ${aRes.exists ? "✓ exists" : "✗ missing"}`);
const kbRes = await checkColumn("tenant_config", "knowledge_base");
console.log(`  tenant_config.knowledge_base:       ${kbRes.exists ? "✓ exists" : "✗ missing"}`);

console.log("\n" + "=".repeat(60));
console.log("SUMMARY:");
console.log(`  agent_calls table:           ${ac.exists === true ? "EXISTS" : ac.exists === false ? "MISSING" : "UNKNOWN"}`);
console.log(`  knowledge_base_updated_at:   ${kbTs.exists === true ? "EXISTS (migration_v13 ALTER ran)" : "MISSING (migration_v13 ALTER NOT run)"}`);
if (vRes.exists && aRes.exists && kbRes.exists) {
  console.log("  migration_v6.sql tenant_config cols: all present");
} else {
  console.log("  migration_v6.sql tenant_config cols: SOME MISSING");
}
console.log("=".repeat(60));
