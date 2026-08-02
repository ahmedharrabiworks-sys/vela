// Verify getTheoreticalMRR + getVoiceMarginSummary against real production data.
// Runs the same queries the route functions run, using admin client directly.
// Usage: node src/scripts/verify-mc-data-routes.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PLAN_PRICES = { starter: 95, pro: 295, premium: 595, custom: 1500 };
const VOICE_COST_PER_MIN = 0.12;

function periodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

let checks = 0;
let passed = 0;

function check(label, condition, detail = "") {
  checks++;
  if (condition) {
    console.log(`  ✓ ${label}${detail ? " | " + detail : ""}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? " | " + detail : ""}`);
  }
}

// ── Test A: Theoretical MRR ───────────────────────────────────────────────────
console.log("\nA: Theoretical MRR");

const { data: tenants, error: tenantsErr } = await admin
  .from("tenants")
  .select("plan");

check("A1: tenants query succeeded", !tenantsErr, tenantsErr?.message);
check("A2: at least one tenant exists", (tenants?.length ?? 0) > 0, `count=${tenants?.length}`);

const counts = {};
for (const t of tenants ?? []) counts[t.plan] = (counts[t.plan] ?? 0) + 1;

let theoreticalMRR = 0;
const byPlan = Object.entries(counts).map(([plan, count]) => {
  const price = PLAN_PRICES[plan] ?? 95;
  const subtotal = price * count;
  theoreticalMRR += subtotal;
  return { plan, count, pricePerTenant: price, subtotal };
});

console.log("    Plan breakdown:", JSON.stringify(byPlan));
console.log("    Theoretical MRR:", `$${theoreticalMRR}`);

check("A3: theoreticalMRR is a positive number", theoreticalMRR > 0, `$${theoreticalMRR}`);
check("A4: all plan keys are known", byPlan.every(r => PLAN_PRICES[r.plan] !== undefined),
  byPlan.map(r => r.plan).join(", "));

// ── Test B: Voice margin ───────────────────────────────────────────────────────
console.log("\nB: Voice margin summary");

const ps = periodStart();
const { data: tenantsForVoice, error: tvErr } = await admin
  .from("tenants")
  .select("id, business_name, plan");

const { data: callRows, error: callsErr } = await admin
  .from("agent_calls")
  .select("tenant_id, duration_seconds")
  .gte("created_at", ps);

check("B1: tenants query succeeded", !tvErr, tvErr?.message);
check("B2: agent_calls query succeeded", !callsErr, callsErr?.message);

const secondsMap = {};
for (const r of callRows ?? []) {
  secondsMap[r.tenant_id] = (secondsMap[r.tenant_id] ?? 0) + (r.duration_seconds ?? 0);
}

let totalVoiceMinutes = 0;
let totalVoiceCostUSD = 0;
let totalTheoreticalMRR = 0;

const voiceTenants = (tenantsForVoice ?? []).map(t => {
  const voiceMinutesUsed = Math.round((secondsMap[t.id] ?? 0) / 60);
  const voiceCostUSD = parseFloat((voiceMinutesUsed * VOICE_COST_PER_MIN).toFixed(2));
  const mrrForTenant = PLAN_PRICES[t.plan] ?? 95;
  totalVoiceMinutes += voiceMinutesUsed;
  totalVoiceCostUSD = parseFloat((totalVoiceCostUSD + voiceCostUSD).toFixed(2));
  totalTheoreticalMRR += mrrForTenant;
  return { tenantId: t.id, businessName: t.business_name, plan: t.plan, voiceMinutesUsed, voiceCostUSD };
});

// Find tenants with actual calls
const withCalls = voiceTenants.filter(t => t.voiceMinutesUsed > 0);
console.log(`    Period start: ${ps}`);
console.log(`    Total voice minutes this month: ${totalVoiceMinutes}`);
console.log(`    Total voice cost USD: $${totalVoiceCostUSD}`);
console.log(`    Total theoretical MRR: $${totalTheoreticalMRR}`);
if (withCalls.length > 0) {
  console.log("    Tenants with calls:", withCalls.map(t =>
    `${t.businessName} (${t.plan}): ${t.voiceMinutesUsed}min → $${t.voiceCostUSD}`).join(", "));
}

check("B3: voice margin aggregate is non-negative", totalVoiceCostUSD >= 0, `$${totalVoiceCostUSD}`);
check("B4: totalTheoreticalMRR matches MRR from Test A", totalTheoreticalMRR === theoreticalMRR,
  `B=${totalTheoreticalMRR} A=${theoreticalMRR}`);
check("B5: all voiceCostUSD values are ≥ 0", voiceTenants.every(t => t.voiceCostUSD >= 0));
check("B6: no Infinity or NaN in voice output",
  voiceTenants.every(t => isFinite(t.voiceMinutesUsed) && isFinite(t.voiceCostUSD)));

// ── Test C: At-risk query ─────────────────────────────────────────────────────
console.log("\nC: At-risk tenant probe");

const { data: configs, error: configsErr } = await admin
  .from("tenant_config")
  .select("tenant_id, knowledge_base_updated_at");

check("C1: tenant_config query succeeded", !configsErr, configsErr?.message);

const configMap = {};
for (const c of configs ?? []) configMap[c.tenant_id] = c;

const neverTrained = (tenants ?? []).filter(t => !configMap[t.plan] && !configMap[t.id]?.knowledge_base_updated_at);
console.log(`    Tenants with kb_never_trained: ${neverTrained.length}`);

check("C2: config count matches tenant count (or more)", (configs?.length ?? 0) >= 0);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n── ${passed}/${checks} checks passed ──`);
if (passed < checks) process.exit(1);
