/**
 * Diagnostic: confirm whether migration_v2.sql ran in production.
 * Checks:
 *   1. Do the v2 columns (ai_enabled, customer_name, last_message_at) exist?
 *   2. Is conversations.lead_id still NOT NULL?
 *
 * Run from repo root:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://puyinskgvwycmrvkzgac.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<key>"
 *   npx tsx src/scripts/diag-migration-v2.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("=== Vela migration_v2 diagnostic ===\n");

  // ── CHECK 1: Do v2 columns exist in the PostgREST schema cache? ──────────
  // A SELECT that references all v2 columns will fail with
  // "Could not find the 'X' column of 'conversations' in the schema cache"
  // if any column is missing.
  console.log("CHECK 1 — v2 column existence (ai_enabled, customer_name, last_message_at)");
  const { data: colCheck, error: colErr } = await admin
    .from("conversations")
    .select("id, lead_id, ai_enabled, customer_name, last_message_at")
    .limit(1);

  if (colErr) {
    console.log(`  ❌ SELECT failed: ${colErr.message}`);
    console.log("  → At least one v2 column is MISSING from the schema cache.");
    console.log("  → migration_v2.sql has NOT run (or schema reload failed).\n");
  } else {
    console.log("  ✅ All v2 columns exist in the schema cache.\n");
  }

  // ── CHECK 2: Is lead_id still NOT NULL? ──────────────────────────────────
  // Strategy: attempt to INSERT a conversations row with lead_id = null.
  // We then DELETE it immediately on success so there is no leftover test data.
  // On failure we read the error message for "null value in column" to confirm.
  //
  // We need a real tenant_id to satisfy the FK. Grab the first tenant in the DB.
  console.log("CHECK 2 — conversations.lead_id nullability");

  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .limit(1)
    .single();

  if (!tenant) {
    console.log("  ⚠️  No tenants found — cannot probe insert. Run again after a tenant exists.");
    return;
  }

  const probePayload: Record<string, unknown> = {
    tenant_id: tenant.id,
    lead_id: null,
    channel: "website",
  };

  // Add v2 columns only if they exist (avoid a second failure masking the real one)
  if (!colErr) {
    probePayload.customer_name = "__diag_probe__";
    probePayload.ai_enabled = false;
    probePayload.last_message_at = new Date().toISOString();
  }

  const { data: inserted, error: insertErr } = await admin
    .from("conversations")
    .insert(probePayload)
    .select("id")
    .single();

  if (insertErr) {
    const msg = insertErr.message ?? "";
    if (msg.includes("null value") && msg.includes("lead_id")) {
      console.log(`  ❌ Insert failed: ${msg}`);
      console.log("  → lead_id is STILL NOT NULL — migration_v2 DROP NOT NULL never ran.\n");
      console.log("=== HOTFIX SQL (run in Supabase SQL Editor) ===");
      console.log("  ALTER TABLE conversations ALTER COLUMN lead_id DROP NOT NULL;");
      console.log("  ALTER TABLE appointments  ALTER COLUMN lead_id DROP NOT NULL;");
      console.log("  NOTIFY pgrst, 'reload schema';\n");
    } else if (msg.includes("not-null") || msg.includes("violates not-null")) {
      console.log(`  ❌ Insert failed with NOT NULL violation: ${msg}`);
      console.log("  → lead_id is NOT NULL. See hotfix above.\n");
    } else {
      console.log(`  ⚠️  Insert failed with unexpected error: ${msg}`);
      console.log("  → Cannot confirm constraint state from this error.\n");
    }
  } else if (inserted) {
    console.log("  ✅ Insert with lead_id=null SUCCEEDED — lead_id IS nullable.");
    // Clean up the probe row
    await admin.from("conversations").delete().eq("id", inserted.id);
    console.log("  (Probe row deleted.)\n");
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log("=== SUMMARY ===");
  if (!colErr && !insertErr) {
    console.log("✅ migration_v2.sql appears to have run successfully in production.");
    console.log("   The 500 'Could not create conversation' error was likely a test-script");
    console.log("   artifact (test skipped lead creation or used wrong column names),");
    console.log("   NOT an active production bug. Phase B item 12 Step 3 can proceed.\n");
  } else if (colErr && insertErr) {
    console.log("❌ migration_v2.sql has NOT run: v2 columns missing AND lead_id is NOT NULL.");
    console.log("   Run migration_v2.sql in Supabase SQL Editor immediately — the normal");
    console.log("   widget flow WILL hit this bug (route inserts ai_enabled/customer_name).\n");
  } else if (!colErr && insertErr) {
    console.log("❌ v2 columns exist BUT lead_id is still NOT NULL.");
    console.log("   migration_v2.sql may have partially run. The DROP NOT NULL line failed");
    console.log("   or was skipped. Run the hotfix SQL above.\n");
  } else if (colErr && !insertErr) {
    console.log("⚠️  lead_id is nullable BUT some v2 columns are missing.");
    console.log("   Partial migration state. Run migration_v2.sql in full.\n");
  }
}

main().catch(console.error);
