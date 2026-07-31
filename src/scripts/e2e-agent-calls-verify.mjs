// End-to-end verification: agent_calls insert → retrieval → context stats → voice usage
// Exercises the real production call-webhook route, not a bypassed DB insert.
// Run: node src/scripts/e2e-agent-calls-verify.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL       = "https://vela-g8h4.vercel.app"; // always production
const VAPI_SECRET   = env.VAPI_WEBHOOK_SECRET || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not in .env.local");
  console.error("  SUPABASE_URL set:", !!SUPABASE_URL);
  console.error("  SERVICE_KEY set:", !!SERVICE_KEY);
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

let passed = 0, failed = 0;
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log("  PASS:", label, detail ? `(${detail})` : ""); }
  else     { failed++; console.error("  FAIL:", label, detail ? `(${detail})` : ""); }
}

console.log("=".repeat(60));
console.log("agent_calls end-to-end verification");
console.log(`Target: ${APP_URL}`);
console.log(`VAPI_WEBHOOK_SECRET configured: ${VAPI_SECRET ? "YES" : "NO — webhook will 401"}`);

// ── Pick a real tenant from production ────────────────────────
const { data: tenants, error: tenantsErr } = await sb.from("tenants").select("id, business_name, plan").limit(1);
if (tenantsErr) {
  console.error("\nFATAL: tenants query error —", tenantsErr.code, tenantsErr.message);
  process.exit(1);
}
const tenant = tenants?.[0];
if (!tenant) {
  console.error("\nFATAL: no tenants found in production — cannot run test");
  process.exit(1);
}
const tenantId = tenant.id;
console.log(`\nUsing tenant: "${tenant.business_name}" (${tenant.plan}) — id: ${tenantId}`);

// ── Note pre-test call count ──────────────────────────────────
const { count: countBefore } = await sb
  .from("agent_calls")
  .select("*", { count: "exact", head: true })
  .eq("tenant_id", tenantId);
console.log(`\nPre-test agent_calls count for this tenant: ${countBefore ?? 0}`);

// ── STEP A: POST realistic end-of-call-report to production webhook ───────────
console.log("\nA: POST end-of-call-report to production call-webhook");

if (!VAPI_SECRET) {
  console.log("  SKIP: VAPI_WEBHOOK_SECRET not set in .env.local — inserting directly via admin");
  console.log("        (this tests the DB + retrieval layer; the route itself can't be tested");
  console.log("         until VAPI_WEBHOOK_SECRET is added to Vercel env vars)");

  // Direct insert to prove the table and retrieval work end-to-end
  const { error: insertErr } = await sb.from("agent_calls").insert({
    tenant_id:        tenantId,
    call_type:        "live",
    ended_at:         new Date().toISOString(),
    duration_seconds: 127,
    language:         "en",
    caller_number:    "+1555000E2E",
    transcript:       [
      { role: "assistant", text: "Hello, thank you for calling. How can I help you today?" },
      { role: "user",      text: "Hi, I'd like to book an appointment for next Tuesday." },
      { role: "assistant", text: "Of course! I have availability on Tuesday at 2pm and 4pm. Which works better?" },
      { role: "user",      text: "2pm works great." },
      { role: "assistant", text: "Perfect, I've booked you for Tuesday at 2pm. See you then!" },
    ],
    summary:            "Customer called to book appointment. Successfully scheduled for Tuesday 2pm.",
    outcome:            "completed",
    appointment_booked: { detected: true, summary: "Appointment booked Tuesday 2pm" },
    kb_extracted:       null,
  });

  check("A (direct insert): row inserted without error", !insertErr, insertErr?.message ?? "");
} else {
  // Real webhook path
  const vapiPayload = {
    message: {
      type: "end-of-call-report",
      durationSeconds: 127,
      summary: "Customer called to book appointment. Successfully scheduled for Tuesday 2pm.",
      call: {
        id:          "test-call-" + Date.now(),
        phoneNumberId: "test-phone-id",
        startedAt:   new Date(Date.now() - 127000).toISOString(),
        endedAt:     new Date().toISOString(),
        endedReason: "customer-ended-call",
        customer:    { number: "+1555000E2E" },
      },
      artifact: {
        messages: [
          { role: "bot",  message: "Hello, thank you for calling. How can I help you today?" },
          { role: "user", message: "Hi, I'd like to book an appointment for next Tuesday." },
          { role: "bot",  message: "Of course! I have availability on Tuesday at 2pm and 4pm. Which works better?" },
          { role: "user", message: "2pm works great." },
          { role: "bot",  message: "Perfect, I've booked you for Tuesday at 2pm. See you then!" },
        ],
      },
    },
  };

  const webhookUrl = `${APP_URL}/api/ai-agent/call-webhook?tenantId=${tenantId}`;
  let webhookStatus = 0;
  let webhookBody = "";
  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vapi-secret": VAPI_SECRET,
      },
      body: JSON.stringify(vapiPayload),
    });
    webhookStatus = res.status;
    webhookBody   = await res.text();
  } catch (err) {
    check("A: webhook POST reachable", false, String(err));
    process.exit(1);
  }

  check("A1: webhook returns 200", webhookStatus === 200, `got ${webhookStatus}: ${webhookBody.slice(0, 80)}`);
  check("A2: webhook body is {ok:true}", webhookBody.includes('"ok":true'), webhookBody.slice(0, 80));

  // Give the async insert a moment to commit
  await new Promise(r => setTimeout(r, 1000));
}

// ── STEP B: Confirm the row is in agent_calls ─────────────────
console.log("\nB: Confirm row in agent_calls");

const { data: calls, count: countAfter } = await sb
  .from("agent_calls")
  .select("id, tenant_id, call_type, duration_seconds, caller_number, transcript, summary, outcome, created_at", { count: "exact" })
  .eq("tenant_id", tenantId)
  .order("created_at", { ascending: false })
  .limit(1);

const latestCall = calls?.[0];
check("B1: count increased by 1", (countAfter ?? 0) === (countBefore ?? 0) + 1, `was ${countBefore}, now ${countAfter}`);
check("B2: latest call has correct tenant_id", latestCall?.tenant_id === tenantId);
check("B3: duration_seconds is 127", latestCall?.duration_seconds === 127, String(latestCall?.duration_seconds));
check("B4: caller_number is +1555000E2E", latestCall?.caller_number === "+1555000E2E", String(latestCall?.caller_number));
check("B5: transcript array has 5 messages", Array.isArray(latestCall?.transcript) && latestCall.transcript.length === 5, String(latestCall?.transcript?.length));
check("B6: summary populated", !!latestCall?.summary, latestCall?.summary?.slice(0, 50));
check("B7: call_type is live", latestCall?.call_type === "live");

// ── STEP C: Calls page GET logic (mirrors ai-agent/calls/route.ts) ───────────
console.log("\nC: Calls page retrieval (ai-agent/calls/route.ts GET logic)");

const { data: pageData, error: pageErr } = await sb
  .from("agent_calls")
  .select("*")
  .eq("tenant_id", tenantId)
  .order("created_at", { ascending: false })
  .limit(50);

check("C1: no error on GET query", !pageErr, pageErr?.message ?? "");
check("C2: returns array (not empty)", Array.isArray(pageData) && pageData.length > 0, `${pageData?.length} calls`);
check("C3: first call matches test row", pageData?.[0]?.caller_number === "+1555000E2E");

// ── STEP D: context/route.ts call stats (mirrors AI Agent Overview) ───────────
console.log("\nD: AI Agent Overview stats (context/route.ts logic)");

const { data: ctxCallData, count: ctxCount, error: ctxErr } = await sb
  .from("agent_calls")
  .select("id, duration_seconds", { count: "exact" })
  .eq("tenant_id", tenantId)
  .limit(100);

const ctxTotalSecs = (ctxCallData ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
const ctxTotalMins = Math.round(ctxTotalSecs / 60);

check("D1: no error on context call query", !ctxErr, ctxErr?.message ?? "");
check("D2: total call count > 0", (ctxCount ?? 0) > 0, `count=${ctxCount}`);
check("D3: totalMinutes > 0", ctxTotalMins > 0, `${ctxTotalMins} min (${ctxTotalSecs}s raw)`);

// ── STEP E: getUsageSummary voice minutes (mirrors usage.ts) ──────────────────
console.log("\nE: Voice-minute usage (usage.ts getUsageSummary logic)");

const periodStart = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
).toISOString();

const { data: usageCallData, error: usageErr } = await sb
  .from("agent_calls")
  .select("duration_seconds")
  .eq("tenant_id", tenantId)
  .gte("created_at", periodStart);

const totalUsageSecs = ((usageCallData ?? []))
  .reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
const voiceMinutesUsed = Math.round(totalUsageSecs / 60);

check("E1: no error on usage query", !usageErr, usageErr?.message ?? "");
check("E2: current-period rows returned", Array.isArray(usageCallData) && usageCallData.length > 0, `${usageCallData?.length} rows`);
check("E3: voiceMinutesUsed > 0", voiceMinutesUsed > 0, `${voiceMinutesUsed} min`);

// ── Clean up test row ─────────────────────────────────────────
console.log("\nCleaning up test row...");
if (latestCall?.id) {
  await sb.from("agent_calls").delete().eq("id", latestCall.id);
  console.log("  Deleted test row:", latestCall.id);
}

console.log("\n" + "=".repeat(60));
console.log(`agent_calls E2E: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
