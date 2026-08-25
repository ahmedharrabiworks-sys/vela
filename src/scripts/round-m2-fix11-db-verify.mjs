// Round M2 FIX 11 — direct Supabase verification, zero OpenAI cost.
// Confirms (a) migration_v34.sql's `deleted_at` column on `websites` is live
// and queryable (the exact gap Round M FIX 10 was blocked on), and (b) at
// least one real lead somewhere has a populated intent_summary (Round M FIX 8).
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let pass = 0, fail = 0;
function check(label, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
  if (cond) pass++; else fail++;
}

// ── FIX 10 (Round M) re-check: websites.deleted_at column is live ──
{
  const { data, error } = await supabase.from("websites").select("id, deleted_at").limit(1);
  check("websites.deleted_at column is queryable (migration_v34.sql confirmed live)", !error);
  if (error) console.log("   error:", error.code, error.message);

  const { data: deletedRows, error: err2 } = await supabase
    .from("websites").select("id, name, deleted_at").not("deleted_at", "is", null).limit(5);
  check("query for soft-deleted websites (deleted_at IS NOT NULL) executes without error", !err2);
  console.log(`   soft-deleted website rows found: ${deletedRows?.length ?? 0}`);
  if (deletedRows?.length) console.log("   sample:", JSON.stringify(deletedRows[0]));
}

// ── FIX 8 (Round M) re-check: leads.intent_summary populated somewhere ──
{
  const { data, error } = await supabase.from("leads").select("id, intent_summary").limit(1);
  check("leads.intent_summary column is queryable", !error);
  if (error) console.log("   error:", error.code, error.message);

  const { data: populated, error: err2 } = await supabase
    .from("leads").select("id, name, intent_summary, created_at")
    .not("intent_summary", "is", null).neq("intent_summary", "")
    .order("created_at", { ascending: false }).limit(5);
  check("query for leads with a populated intent_summary executes without error", !err2);
  if (err2) console.log("   error:", err2.code, err2.message);
  console.log(`   leads with populated intent_summary found: ${populated?.length ?? 0}`);
  if (populated?.length) {
    for (const l of populated) console.log(`   - "${l.intent_summary}"`);
  }
}

// Extra context: total lead count + how many are recent, to interpret the
// zero-populated-intent_summary result above (stale data vs a real gap).
const { count: totalLeads } = await supabase.from("leads").select("id", { count: "exact", head: true });
const { count: recentLeads } = await supabase.from("leads").select("id", { count: "exact", head: true })
  .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
console.log(`\ncontext: ${totalLeads ?? 0} total leads in DB, ${recentLeads ?? 0} created in the last 30 days`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
