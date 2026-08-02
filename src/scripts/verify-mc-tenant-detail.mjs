// Verify /mission-control/tenants/[id] page logic against production.
// Usage: node src/scripts/verify-mc-tenant-detail.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../../.env.local"), "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g, "")]; })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let checks = 0, passed = 0;
function check(label, ok, detail = "") {
  checks++;
  if (ok) { console.log(`  ✓ ${label}${detail ? " | " + detail : ""}`); passed++; }
  else       console.log(`  ✗ ${label}${detail ? " | " + detail : ""}`);
}

// ── A: get first real tenant ──────────────────────────────────────────────────
console.log("\nA: Fetch real tenant");
const { data: tenants } = await admin.from("tenants").select("id, business_name, plan").limit(1);
check("A1: at least one tenant", (tenants?.length ?? 0) > 0);

const tenant = tenants?.[0];
const tenantId = tenant?.id;
console.log(`    Using: ${tenant?.business_name} (${tenant?.plan}) — id=${tenantId}`);

// ── B: tenant row lookup (as the page does) ───────────────────────────────────
console.log("\nB: Tenant row lookup");
const { data: row, error: rowErr } = await admin
  .from("tenants")
  .select("id, business_name, plan, created_at, industry, city")
  .eq("id", tenantId)
  .single();

check("B1: row found",  !!row && !rowErr, rowErr?.message);
check("B2: business_name present", !!row?.business_name, row?.business_name);
check("B3: plan present",          !!row?.plan,          row?.plan);

// ── C: tenant_config (engagement) ────────────────────────────────────────────
// Some test tenants have no config row (no signup flow). The page handles this
// gracefully — shows null/false values. Check the query doesn't error, not that
// a row exists.
console.log("\nC: Engagement data");
const { data: cfg, error: cfgErr } = await admin
  .from("tenant_config")
  .select("knowledge_base_updated_at, instagram_connected")
  .eq("tenant_id", tenantId)
  .single();

// PGRST116 = "no rows returned" — not a bug, just a sparse test tenant
const cfgMissing = cfgErr?.code === "PGRST116";
check("C1: config query succeeded (row may be absent)",
  !cfgErr || cfgMissing,
  cfgMissing ? "no config row (test tenant)" : cfgErr?.message ?? "ok");
check("C2: instagram_connected is boolean or absent",
  typeof cfg?.instagram_connected === "boolean" || cfg === null,
  String(cfg?.instagram_connected ?? "absent"));

// ── D: activity query ─────────────────────────────────────────────────────────
console.log("\nD: Activity data");
const [convsR, leadsR, callsR] = await Promise.all([
  admin.from("conversations").select("id, channel, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
  admin.from("leads").select("id, name, channel, status, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
  admin.from("agent_calls").select("id, call_type, duration_seconds, outcome, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
]);

check("D1: conversations query succeeded",  !convsR.error,  convsR.error?.message);
check("D2: leads query succeeded",          !leadsR.error,  leadsR.error?.message);
check("D3: agent_calls query succeeded",    !callsR.error,  callsR.error?.message);
console.log(`    convs=${convsR.data?.length}, leads=${leadsR.data?.length}, calls=${callsR.data?.length}`);

// ── E: voice margin for this tenant ──────────────────────────────────────────
console.log("\nE: Voice margin");
const ps = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
const { data: callRows } = await admin
  .from("agent_calls").select("tenant_id, duration_seconds").gte("created_at", ps);

const secs = (callRows ?? []).filter(r => r.tenant_id === tenantId).reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
const voiceMin = Math.round(secs / 60);
const voiceCost = parseFloat((voiceMin * 0.12).toFixed(2));

check("E1: voice minutes non-negative", voiceMin >= 0, `${voiceMin} min → $${voiceCost}`);

// ── F: not-found case ─────────────────────────────────────────────────────────
console.log("\nF: Not-found case (fake UUID)");
const { data: noRow, error: noErr } = await admin
  .from("tenants")
  .select("id")
  .eq("id", "00000000-0000-0000-0000-000000000000")
  .single();

check("F1: fake UUID returns null row",  !noRow,  noErr?.message ?? "no error returned");
check("F2: page would show NotFound UI", !noRow);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n── ${passed}/${checks} checks passed ──`);
if (passed < checks) process.exit(1);
