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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data, error } = await admin.rpc("get_rls_policies");
if (error) {
  console.log("RPC ERROR:", error.code, error.message);
  process.exit(1);
}
console.log(`Total policies returned: ${data.length}\n`);

for (const t of ["marketing_generations", "webhook_logs"]) {
  console.log(`=== ${t} ===`);
  const rows = data.filter(r => r.tablename === t);
  if (rows.length === 0) console.log("  NO POLICIES FOUND (RLS may be enabled with zero policies = deny-all, or RLS disabled)");
  for (const r of rows) {
    console.log(`  policy: "${r.policyname}"  cmd: ${r.cmd}  permissive: ${r.permissive}`);
    console.log(`    qual: ${r.qual}`);
  }
  console.log("");
}
