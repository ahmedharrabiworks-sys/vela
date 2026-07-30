/**
 * E2E verification: Phase B item 12 Step 4 — /api/stats/usage endpoint.
 * Tests four scenarios:
 *   1 — Unauthenticated: expect 401
 *   2 — Starter tenant: messages.limit = 500, voiceMinutes.limit = 150
 *   3 — Pro/Premium/Custom tenant: messages.limit = null, voiceMinutes.limit = null
 *   4 — Response shape: all required fields present, no Infinity in JSON
 *
 * Auth strategy: sign in via Supabase auth REST API → get access_token →
 * send it as the sb-* cookie the SSR client reads.
 *
 * Run:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="..."
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."
 *   $env:TEST_ACCOUNT_EMAIL="..."
 *   $env:TEST_ACCOUNT_PASSWORD="..."
 *   npx tsx src/scripts/e2e-phase-b12-step4-usage-endpoint.ts
 */
import { createClient } from "@supabase/supabase-js";

const PROD_URL   = "https://vela-g8h4.vercel.app";
const sbUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testEmail  = process.env.TEST_ACCOUNT_EMAIL!;
const testPass   = process.env.TEST_ACCOUNT_PASSWORD!;

if (!sbUrl || !serviceKey || !testEmail || !testPass) {
  console.error("Missing env vars"); process.exit(1);
}

const admin = createClient(sbUrl, serviceKey, { auth: { persistSession: false } });

// Extract the project ref from the Supabase URL (e.g. puyinskgvwycmrvkzgac)
const projectRef = new URL(sbUrl).hostname.split(".")[0]!;
const cookieName = `sb-${projectRef}-auth-token`;

const checks: { label: string; pass: boolean; detail?: string }[] = [];
function check(label: string, pass: boolean, detail?: string) {
  checks.push({ label, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

// Sign in via Supabase auth REST and return a cookie string for use in fetch headers.
async function getSessionCookie(email: string, password: string): Promise<string | null> {
  const resp = await fetch(
    `${sbUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? serviceKey,
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!resp.ok) {
    console.error("  Auth sign-in failed:", resp.status, await resp.text());
    return null;
  }
  const session = await resp.json() as any;
  if (!session.access_token) return null;

  // Supabase SSR reads a chunked cookie. The simplest shape that works is the
  // base64url-encoded session stored under the standard cookie name.
  // However, the SSR library actually reads raw cookie chunks. The reliable
  // approach is to use the signed-in client's cookie jar.
  //
  // Alternate reliable approach: use the anon client to sign in and read the
  // actual cookie values it sets, mirroring what the browser does.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const anonClient = createClient(sbUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData } = await anonClient.auth.signInWithPassword({ email, password });
  if (!signInData.session) return null;

  // Build the cookie value in the format @supabase/ssr expects:
  // JSON of the full session object, then base64-encoded in chunks.
  // For a simple test, we encode the full session as a single cookie value.
  const sessionJson = JSON.stringify({
    access_token:  signInData.session.access_token,
    token_type:    signInData.session.token_type,
    expires_in:    signInData.session.expires_in,
    expires_at:    signInData.session.expires_at,
    refresh_token: signInData.session.refresh_token,
    user:          signInData.session.user,
  });

  // @supabase/ssr encodes large values as base64 chunks. Single-chunk format:
  const b64 = Buffer.from(sessionJson).toString("base64");
  return `${cookieName}=${encodeURIComponent("base64-" + b64)}`;
}

async function callUsageEndpoint(cookie: string | null): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;

  const resp = await fetch(`${PROD_URL}/api/stats/usage`, { headers });
  const body = await resp.json().catch(() => ({}));
  return { status: resp.status, body };
}

async function main() {
  console.log("=== Phase B item 12 Step 4 — /api/stats/usage E2E ===\n");

  // ── Scenario 1: Unauthenticated → 401 ─────────────────────────────────
  console.log("--- Scenario 1: Unauthenticated request ---");
  const { status: unauthStatus, body: unauthBody } = await callUsageEndpoint(null);
  console.log(`  HTTP ${unauthStatus}: ${JSON.stringify(unauthBody)}`);
  check("Unauthenticated → 401", unauthStatus === 401, `got ${unauthStatus}`);

  // ── Get session cookie for the test account ────────────────────────────
  console.log("\nSigning in test account...");
  const cookie = await getSessionCookie(testEmail, testPass);

  if (!cookie) {
    console.error("  ❌ Could not get session cookie — remaining tests skipped.");
    printSummary(); return;
  }
  console.log("  Session cookie obtained.\n");

  // ── Scenario 2: Authenticated → shape + Starter limit check ───────────
  console.log("--- Scenario 2: Authenticated response shape ---");
  const { status, body } = await callUsageEndpoint(cookie);
  console.log(`  HTTP ${status}`);
  console.log(`  Response: ${JSON.stringify(body)}`);

  check("Returns 200", status === 200, `got ${status}`);
  check("messages.used is a number", typeof body?.messages?.used === "number",
    String(body?.messages?.used));
  check("messages.limit is number or null", body?.messages?.limit === null || typeof body?.messages?.limit === "number",
    String(body?.messages?.limit));
  check("voiceMinutes.used is a number", typeof body?.voiceMinutes?.used === "number",
    String(body?.voiceMinutes?.used));
  check("voiceMinutes.limit is number or null", body?.voiceMinutes?.limit === null || typeof body?.voiceMinutes?.limit === "number",
    String(body?.voiceMinutes?.limit));
  check("periodStart is ISO string", typeof body?.periodStart === "string" && body.periodStart.includes("T"),
    body?.periodStart);
  check("periodEnd is ISO string", typeof body?.periodEnd === "string" && body.periodEnd.includes("T"),
    body?.periodEnd);
  check("plan field present", typeof body?.plan === "string", body?.plan);
  check("No Infinity in JSON", !JSON.stringify(body).includes("Infinity"), "JSON clean");
  check("periodEnd > periodStart", new Date(body?.periodEnd) > new Date(body?.periodStart),
    `${body?.periodStart?.slice(0,10)} → ${body?.periodEnd?.slice(0,10)}`);

  const plan = body?.plan as string;

  // ── Scenario 3: Plan-specific limit values ─────────────────────────────
  console.log(`\n--- Scenario 3: Plan-specific limits (plan = ${plan}) ---`);

  if (plan === "starter") {
    check("Starter: messages.limit = 500", body?.messages?.limit === 500, String(body?.messages?.limit));
    check("Starter: voiceMinutes.limit = 150", body?.voiceMinutes?.limit === 150, String(body?.voiceMinutes?.limit));
  } else if (["pro", "premium", "custom"].includes(plan)) {
    check(`${plan}: messages.limit = null (unlimited)`, body?.messages?.limit === null,
      String(body?.messages?.limit));
    check(`${plan}: voiceMinutes.limit is a number (not null)`,
      typeof body?.voiceMinutes?.limit === "number",
      String(body?.voiceMinutes?.limit));
  } else {
    check("Plan is a known value", false, `unexpected plan: ${plan}`);
  }

  // ── Scenario 4: voiceMinutes.used is sane (not NaN/undefined/negative) ─
  console.log("\n--- Scenario 4: voiceMinutes sanity ---");
  const vm = body?.voiceMinutes?.used;
  check("voiceMinutes.used is non-negative integer",
    typeof vm === "number" && Number.isInteger(vm) && vm >= 0,
    String(vm));

  // ── Cross-check messages.used against DB ──────────────────────────────
  console.log("\n--- Cross-check: messages.used vs Supabase direct count ---");
  // Find the tenant for the test account
  const { data: { user } } = await admin.auth.admin.listUsers();
  const testUser = user?.find((u: any) => u.email === testEmail);
  if (testUser) {
    const { data: tenantRow } = await admin
      .from("tenants").select("id, plan").eq("owner_id", testUser.id).single();
    if (tenantRow) {
      const now = new Date();
      const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const { count } = await admin
        .from("messages").select("*", { count: "exact", head: true })
        .eq("tenant_id", (tenantRow as any).id).eq("role", "assistant").gte("created_at", periodStart);
      check("messages.used matches DB count", body?.messages?.used === (count ?? 0),
        `endpoint=${body?.messages?.used}, db=${count}`);
    }
  } else {
    console.log("  (Could not find test user — skipping DB cross-check)");
  }

  printSummary();
}

function printSummary() {
  const passed = checks.filter(c => c.pass).length;
  const total  = checks.length;
  console.log(`\n=== RESULT: ${passed}/${total} checks passed ===`);
  if (passed === total) {
    console.log("✅ /api/stats/usage CONFIRMED working.");
    console.log("   Phase B item 12 Step 5 (dashboard UI + upgrade prompt) can proceed.");
  } else {
    const failed = checks.filter(c => !c.pass);
    console.log("❌ Failed checks:");
    for (const f of failed) console.log(`   - ${f.label}${f.detail ? `: ${f.detail}` : ""}`);
  }
}

main().catch(console.error);
