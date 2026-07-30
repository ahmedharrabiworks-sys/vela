/**
 * E2E verification: confirm migration_v2 hotfix fixed the widget 500.
 * Tests the exact scenario that was broken: brand-new visitor, no conversationId.
 *
 * Run:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="..."
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."
 *   npx tsx src/scripts/e2e-widget-hotfix-verify.ts
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

async function main() {
  console.log("=== E2E Widget Hotfix Verification ===\n");

  // ── 1. Pick a real tenant ──────────────────────────────────────────────
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name: business_name, plan")
    .limit(1)
    .single();

  if (!tenant) { console.error("No tenants found"); process.exit(1); }
  const tenantId: string = (tenant as any).id;
  console.log(`Using tenant: ${(tenant as any).name} (${tenantId})\n`);

  // ── 2. Snapshot row counts before ─────────────────────────────────────
  const { count: leadsBefore } = await admin
    .from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { count: convsBefore } = await admin
    .from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { count: msgsBefore } = await admin
    .from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);

  // ── 3. Send a fresh message — NO conversationId (new visitor) ─────────
  console.log("Sending POST to /api/ai/reply (no conversationId)...");
  const t0 = Date.now();
  const resp = await fetch(`${PROD_URL}/api/ai/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId,
      message: "Hi, what services do you offer?",
      channel: "website",
      customerName: "__e2e_hotfix_verify__",
      // intentionally NO conversationId — simulates brand-new visitor
    }),
  });
  const elapsed = Date.now() - t0;
  const body = await resp.json().catch(() => ({})) as any;

  console.log(`\nHTTP ${resp.status} in ${elapsed}ms`);
  console.log("Response body:", JSON.stringify(body).slice(0, 300));

  check("HTTP 200 (not 500)", resp.status === 200, `got ${resp.status}`);
  check("reply field present", typeof body.reply === "string" && body.reply.length > 0, body.reply?.slice(0, 80));
  check("conversationId returned", typeof body.conversationId === "string", body.conversationId);

  if (resp.status !== 200) {
    console.log("\n❌ Route returned non-200 — aborting row checks. No rows to clean up.");
    printSummary();
    return;
  }

  const convId: string = body.conversationId;

  // ── 4. Verify DB rows ──────────────────────────────────────────────────
  console.log("\nVerifying DB rows...");

  // Row counts should have increased
  const { count: leadsAfter } = await admin
    .from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { count: convsAfter } = await admin
    .from("conversations").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { count: msgsAfter } = await admin
    .from("messages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);

  check("leads row created", (leadsAfter ?? 0) > (leadsBefore ?? 0),
    `${leadsBefore} → ${leadsAfter}`);
  check("conversations row created", (convsAfter ?? 0) > (convsBefore ?? 0),
    `${convsBefore} → ${convsAfter}`);
  check("2 messages rows created (user + assistant)", (msgsAfter ?? 0) >= (msgsBefore ?? 0) + 2,
    `${msgsBefore} → ${msgsAfter}`);

  // Verify the conversation has v2 columns populated
  const { data: conv } = await admin
    .from("conversations")
    .select("id, lead_id, customer_name, ai_enabled, last_message_at")
    .eq("id", convId)
    .single();

  const c = conv as any;
  check("conversation.customer_name populated", c?.customer_name === "__e2e_hotfix_verify__",
    c?.customer_name);
  check("conversation.ai_enabled = true", c?.ai_enabled === true, String(c?.ai_enabled));
  check("conversation.last_message_at present", typeof c?.last_message_at === "string",
    c?.last_message_at?.slice(0, 20));
  check("conversation.lead_id set", !!c?.lead_id, c?.lead_id);

  // Verify messages have tenant_id (Phase B item 12 Step 2 instrumentation)
  const { data: msgs } = await admin
    .from("messages")
    .select("id, role, tenant_id, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  const msgsArr = (msgs ?? []) as any[];
  const userMsg = msgsArr.find((m: any) => m.role === "user");
  const asstMsg = msgsArr.find((m: any) => m.role === "assistant");

  check("user message role=user exists", !!userMsg, userMsg?.content?.slice(0, 40));
  check("user message tenant_id populated", userMsg?.tenant_id === tenantId, userMsg?.tenant_id);
  check("assistant message role=assistant exists", !!asstMsg, asstMsg?.content?.slice(0, 40));
  check("assistant message tenant_id populated", asstMsg?.tenant_id === tenantId, asstMsg?.tenant_id);

  // ── 5. Cleanup ─────────────────────────────────────────────────────────
  console.log("\nCleaning up test rows...");

  // Delete messages first (FK from messages → conversations)
  if (msgsArr.length > 0) {
    const msgIds = msgsArr.map((m: any) => m.id);
    await admin.from("messages").delete().in("id", msgIds);
    console.log(`  Deleted ${msgIds.length} message(s)`);
  }

  // Delete conversation
  const { error: convDelErr } = await admin.from("conversations").delete().eq("id", convId);
  check("conversation cleaned up", !convDelErr, convDelErr?.message);

  // Delete the lead
  if (c?.lead_id) {
    const { error: leadDelErr } = await admin.from("leads").delete().eq("id", c.lead_id);
    check("lead cleaned up", !leadDelErr, leadDelErr?.message);
  }

  printSummary();
}

function printSummary() {
  const passed = checks.filter(c => c.pass).length;
  const total  = checks.length;
  console.log(`\n=== RESULT: ${passed}/${total} checks passed ===`);
  if (passed === total) {
    console.log("✅ Website widget CONFIRMED WORKING end-to-end for new visitors.");
    console.log("   Phase B item 12 Step 3 can proceed.");
  } else {
    const failed = checks.filter(c => !c.pass);
    console.log("❌ Some checks failed:");
    for (const f of failed) console.log(`   - ${f.label}${f.detail ? `: ${f.detail}` : ""}`);
  }
}

main().catch(console.error);
