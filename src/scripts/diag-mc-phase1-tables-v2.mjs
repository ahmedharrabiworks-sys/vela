// Diagnostic v2 — prints actual error codes so we can see what's real
// Run: node src/scripts/diag-mc-phase1-tables-v2.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

console.log("=".repeat(60));

// 1. agent_calls: select ALL columns — if the table and columns exist, this works fine
console.log("\n[1] SELECT * FROM agent_calls LIMIT 0:");
const { data: acAll, error: acAllErr } = await sb.from("agent_calls").select("*").limit(0);
if (acAllErr) {
  console.log(`  ERROR — code: "${acAllErr.code}"  message: "${acAllErr.message}"`);
} else {
  console.log("  OK — table exists and is accessible");
}

// 2. Specific columns — print raw error if anything fails
const agentCallsCols = ["id","tenant_id","call_type","ended_at","duration_seconds","language","caller_number","transcript","summary","outcome","appointment_booked","kb_extracted","created_at"];
console.log("\n[2] agent_calls column-by-column:");
for (const col of agentCallsCols) {
  const { error } = await sb.from("agent_calls").select(col).limit(0);
  if (error) {
    console.log(`  ✗ ${col}  [code: "${error.code}", msg: "${error.message.slice(0,80)}"]`);
  } else {
    console.log(`  ✓ ${col}`);
  }
}

// 3. tenant_config — check for both knowledge_base_updated_at AND vapi_phone_number_id
console.log("\n[3] tenant_config key columns:");
const tcCols = ["knowledge_base", "agent_settings", "vapi_phone_number_id", "knowledge_base_updated_at"];
for (const col of tcCols) {
  const { error } = await sb.from("tenant_config").select(col).limit(0);
  if (error) {
    console.log(`  ✗ ${col}  [code: "${error.code}", msg: "${error.message.slice(0,80)}"]`);
  } else {
    console.log(`  ✓ ${col}`);
  }
}

// 4. Check all public tables
console.log("\n[4] All public tables (via information_schema via a known table):");
// Use Supabase's built-in pg_catalog access isn't available via REST,
// but we can try a few known tables to see what exists
const tables = ["tenants","tenant_config","leads","conversations","messages","appointments","agent_calls","websites","website_versions","marketing_generations","webhook_logs","whatsapp_accounts"];
for (const t of tables) {
  const { error } = await sb.from(t).select("*", { head: true, count: "exact" }).limit(0);
  if (error) {
    const missing = error.code === "42P01" || error.message?.includes("does not exist");
    console.log(`  ${missing ? "✗ MISSING" : "? ERR    "} ${t}  [${error.code}: ${error.message.slice(0,50)}]`);
  } else {
    console.log(`  ✓ exists  ${t}`);
  }
}

console.log("\n" + "=".repeat(60));
