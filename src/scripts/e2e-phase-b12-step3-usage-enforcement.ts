/**
 * E2E verification: Phase B item 12 Step 3 — message cap enforcement.
 * Three scenarios:
 *   A — Starter tenant at cap: 501st request returns 429
 *   B — Pro tenant: never blocked regardless of count
 *   C — Starter tenant under cap: normal 200
 *
 * Run:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="..."
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."
 *   npx tsx src/scripts/e2e-phase-b12-step3-usage-enforcement.ts
 */
import { createClient } from "@supabase/supabase-js";

const PROD_URL = "https://vela-g8h4.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error("Missing env vars"); process.exit(1); }
const admin = createClient(url, key, { auth: { persistSession: false } });

const checks: { label: string; pass: boolean; detail?: string }[] = [];
function check(label: string, pass: boolean, detail?: string) {
  checks.push({ label, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

// Fake enough assistant messages to push a tenant past the Starter 500-msg cap.
// Returns the IDs so we can delete them later.
async function seedAtCap(tenantId: string, count: number): Promise<string[]> {
  // We need a conversation to hold the messages. Grab or create one.
  const { data: existingConv } = await admin
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  let convId: string;
  let cleanupConv = false;

  if (existingConv) {
    convId = (existingConv as any).id;
  } else {
    // Need a lead first since we can't guarantee lead_id is nullable in this env
    const { data: lead } = await admin
      .from("leads")
      .insert({ tenant_id: tenantId, name: "__cap_seed__", channel: "website", status: "new" })
      .select("id").single();
    const { data: conv } = await admin
      .from("conversations")
      .insert({ tenant_id: tenantId, lead_id: (lead as any).id, channel: "website" })
      .select("id").single();
    convId = (conv as any).id;
    cleanupConv = true;
  }

  // Insert `count` assistant rows with current-month created_at
  const rows = Array.from({ length: count }, (_, i) => ({
    conversation_id: convId,
    tenant_id: tenantId,
    role: "assistant",
    content: `__cap_seed_${i}__`,
    created_at: new Date().toISOString(),
  }));

  // Insert in batches of 100
  const ids: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const { data } = await admin.from("messages").insert(rows.slice(i, i + 100)).select("id");
    ids.push(...((data ?? []) as any[]).map((r: any) => r.id));
  }

  return ids;
}

async function sendMessage(tenantId: string, conversationId?: string) {
  const resp = await fetch(`${PROD_URL}/api/ai/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      message: "Hi, quick question about your services.",
      channel: "website",
      customerName: "__e2e_cap_test__",
      ...(conversationId ? { conversationId } : {}),
    }),
  });
  const body = await resp.json().catch(() => ({})) as any;
  return { status: resp.status, body };
}

async function main() {
  console.log("=== Phase B item 12 Step 3 — Usage Enforcement E2E ===\n");

  // Find a Starter tenant and a Pro tenant
  const { data: starterTenants } = await admin
    .from("tenants").select("id, business_name, plan").eq("plan", "starter").limit(1);
  const { data: proTenants } = await admin
    .from("tenants").select("id, business_name, plan").in("plan", ["pro", "premium", "custom"]).limit(1);

  const starter = (starterTenants ?? [])[0] as any;
  const pro     = (proTenants ?? [])[0] as any;

  if (!starter) { console.log("⚠️  No Starter tenant found — skipping Scenario A."); }
  if (!pro)     { console.log("⚠️  No Pro/Premium/Custom tenant found — skipping Scenario B."); }

  // Track all seeded row IDs for cleanup
  const seededMsgIds: string[] = [];
  const seededConvIds: string[] = [];
  const seededLeadIds: string[] = [];

  // ── SCENARIO A: Starter tenant at cap ─────────────────────────────────
  if (starter) {
    const starterTenantId: string = starter.id;
    console.log(`\n--- Scenario A: Starter tenant "${starter.business_name}" (${starterTenantId}) ---`);

    // Count existing assistant messages this month
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count: existing } = await admin
      .from("messages").select("*", { count: "exact", head: true })
      .eq("tenant_id", starterTenantId).eq("role", "assistant").gte("created_at", periodStart);
    const existingCount = existing ?? 0;
    const CAP = 500;
    const needed = Math.max(0, CAP - existingCount);

    console.log(`  Existing assistant messages this month: ${existingCount}`);
    console.log(`  Seeding ${needed} rows to reach cap of ${CAP}...`);

    if (needed > 0) {
      const ids = await seedAtCap(starterTenantId, needed);
      seededMsgIds.push(...ids);
      console.log(`  Seeded ${ids.length} rows.`);
    }

    // Now at exactly 500 — the next request should be blocked
    console.log("  Sending request #501 (should return 429)...");
    const { status: blockedStatus, body: blockedBody } = await sendMessage(starterTenantId);
    console.log(`  HTTP ${blockedStatus}: ${JSON.stringify(blockedBody).slice(0, 200)}`);

    check("Scenario A: returns 429 at cap", blockedStatus === 429, `got ${blockedStatus}`);
    check("Scenario A: error field present", typeof blockedBody.error === "string" && blockedBody.error.length > 0, blockedBody.error);
    check("Scenario A: limitType = 'messages'", blockedBody.limitType === "messages", blockedBody.limitType);
    check("Scenario A: used field present", typeof blockedBody.used === "number", String(blockedBody.used));
    check("Scenario A: limit = 500", blockedBody.limit === 500, String(blockedBody.limit));

    // Track any new rows the blocked request may have created (it shouldn't, but verify)
    // The 429 fires before any conversation/message creation, so no rows to clean up from it.
  }

  // ── SCENARIO B: Pro tenant — never blocked ─────────────────────────────
  if (pro) {
    const proTenantId: string = pro.id;
    console.log(`\n--- Scenario B: ${pro.plan} tenant "${pro.business_name}" (${proTenantId}) ---`);

    const { status, body } = await sendMessage(proTenantId);
    console.log(`  HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);

    check("Scenario B: Pro gets 200 (not 429)", status === 200, `got ${status}`);
    check("Scenario B: reply field present", typeof body.reply === "string", body.reply?.slice(0, 60));

    // Clean up the conversation/lead/messages created by this Pro test
    if (body.conversationId) {
      const { data: msgs } = await admin.from("messages").select("id").eq("conversation_id", body.conversationId);
      const msgIds = ((msgs ?? []) as any[]).map((m: any) => m.id);
      if (msgIds.length) await admin.from("messages").delete().in("id", msgIds);

      const { data: conv } = await admin.from("conversations").select("lead_id").eq("id", body.conversationId).maybeSingle();
      const leadId = (conv as any)?.lead_id;
      await admin.from("conversations").delete().eq("id", body.conversationId);
      if (leadId) await admin.from("leads").delete().eq("id", leadId);
    }
  }

  // ── SCENARIO C: Starter under cap — normal reply ───────────────────────
  // We need a Starter tenant with headroom. If we seeded rows above, remove
  // enough to drop back below the cap, then test.
  if (starter) {
    const starterTenantId: string = starter.id;
    console.log(`\n--- Scenario C: Starter under cap (removing seed rows first) ---`);

    // Delete all seeded rows — drops count back to existingCount (which was < 500)
    if (seededMsgIds.length > 0) {
      await admin.from("messages").delete().in("id", seededMsgIds);
      seededMsgIds.length = 0;
      console.log("  Seed rows removed — tenant is now under cap.");
    }

    const { status, body } = await sendMessage(starterTenantId);
    console.log(`  HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`);

    check("Scenario C: Starter under cap gets 200", status === 200, `got ${status}`);
    check("Scenario C: reply field present", typeof body.reply === "string", body.reply?.slice(0, 60));

    // Clean up rows from this test
    if (body.conversationId) {
      const { data: msgs } = await admin.from("messages").select("id").eq("conversation_id", body.conversationId);
      const msgIds = ((msgs ?? []) as any[]).map((m: any) => m.id);
      if (msgIds.length) await admin.from("messages").delete().in("id", msgIds);

      const { data: conv } = await admin.from("conversations").select("lead_id").eq("id", body.conversationId).maybeSingle();
      const leadId = (conv as any)?.lead_id;
      await admin.from("conversations").delete().eq("id", body.conversationId);
      if (leadId) await admin.from("leads").delete().eq("id", leadId);
    }
  }

  // ── Final cleanup of any leftover seeded rows ──────────────────────────
  if (seededMsgIds.length > 0) {
    await admin.from("messages").delete().in("id", seededMsgIds);
    console.log(`\nCleaned up ${seededMsgIds.length} remaining seed message rows.`);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const passed = checks.filter(c => c.pass).length;
  const total  = checks.length;
  console.log(`\n=== RESULT: ${passed}/${total} checks passed ===`);
  if (passed === total) {
    console.log("✅ Message cap enforcement CONFIRMED:");
    console.log("   Starter @ cap → 429  |  Pro → 200  |  Starter under cap → 200");
    console.log("   Phase B item 12 Step 4 (/api/stats/usage endpoint) can proceed.");
  } else {
    const failed = checks.filter(c => !c.pass);
    console.log("❌ Failed checks:");
    for (const f of failed) console.log(`   - ${f.label}${f.detail ? `: ${f.detail}` : ""}`);
  }
}

main().catch(console.error);
