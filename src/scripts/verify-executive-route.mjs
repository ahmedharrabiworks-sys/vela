// Verify /api/mission-control/executive route against real production data.
// Tests: (1) answerable question calls a real tool and returns a real number,
//        (2) unanswerable question explicitly refuses without guessing.
// Note: this route requires MC session auth — we bypass the HTTP layer by calling
// the OpenAI API + query functions directly (same pattern as other verify scripts).
// Usage: node src/scripts/verify-executive-route.mjs

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OPENAI_API_KEY) {
  console.error("FATAL: missing required env vars in .env.local");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

let checks = 0, passed = 0;
function check(label, ok, detail = "") {
  checks++;
  if (ok) { console.log(`  ✓ ${label}${detail ? " | " + detail : ""}`); passed++; }
  else     console.log(`  ✗ ${label}${detail ? " | " + detail : ""}`);
}

// ── Query helpers (mirrors route.ts) ─────────────────────────────────────────

async function getTenantRoster() {
  const { data, error } = await admin.from("tenants")
    .select("id, business_name, plan, created_at, industry, city")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const planBreakdown = {};
  for (const t of data ?? []) planBreakdown[t.plan] = (planBreakdown[t.plan] ?? 0) + 1;
  return { tenants: data ?? [], planBreakdown, totalCount: (data ?? []).length };
}

async function getAtRiskTenants() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const thirtyDaysAgo   = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [tenantsRes, configsRes, callsRes, authRes] = await Promise.all([
    admin.from("tenants").select("id, owner_id, business_name, plan"),
    admin.from("tenant_config").select("tenant_id, knowledge_base_updated_at"),
    admin.from("agent_calls").select("tenant_id").gte("created_at", thirtyDaysAgo),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const configMap = Object.fromEntries((configsRes.data ?? []).map((c) => [c.tenant_id, c]));
  const recentCallTenants = new Set((callsRes.data ?? []).map((c) => c.tenant_id));
  const authMap = Object.fromEntries((authRes.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  const atRisk = [];
  for (const t of tenantsRes.data ?? []) {
    const cfg = configMap[t.id];
    const lastSignIn = authMap[t.owner_id] ?? null;
    const riskFactors = [];
    if (!lastSignIn || lastSignIn < fourteenDaysAgo) riskFactors.push("no_recent_login");
    if (!cfg?.knowledge_base_updated_at) riskFactors.push("kb_never_trained");
    if (!recentCallTenants.has(t.id)) riskFactors.push("no_recent_calls");
    if (riskFactors.length) atRisk.push({ tenantId: t.id, businessName: t.business_name, plan: t.plan, riskFactors });
  }
  return atRisk;
}

const TOOLS = [
  { type: "function", function: { name: "get_tenant_roster", description: "Returns all tenants.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_at_risk_tenants", description: "Returns at-risk tenants (behavioral proxies).", parameters: { type: "object", properties: {} } } },
];

const SYSTEM_PROMPT = `You are the Vela Master Executive AI — a real-time intelligence interface for the Vela platform owner.
You have access to tools that query live production data directly.

HARD RULES — never violate, no exceptions:
1. Every factual answer requires a tool call first. Do not answer from memory or general knowledge.
2. If no available tool can directly answer the question, say: "That data isn't available yet." Then briefly explain why. Do not guess, estimate, extrapolate, or derive one metric from a different metric to fill the gap.
3. A tool result of 0 means 0. Report it honestly — do not soften, reframe, or imply it might be higher.
4. Revenue figures are ALWAYS labeled "theoretical MRR" (plan price × tenant count). Actual collected revenue does not exist in any tool — never invent it.
5. At-risk data is a BEHAVIORAL PROXY — it means "no login in 14+ days, KB untrained, or no calls in 30 days." It is NOT churn, NOT cancellation rate, NOT a churn rate. Never compute or report a "churn rate" from at-risk data. If asked for churn rate, say "That data isn't available yet — churn rate requires actual subscription cancellations, which requires Stripe to be connected."
6. Do NOT derive metrics that weren't explicitly produced by a tool. If a tool returns at-risk count and total count, do NOT compute at-risk% and call it "churn rate" or any other metric the user asked for. Metric substitution is not allowed.

Metrics that do NOT exist in any tool — never answer these by substitution:
- Churn rate or cancellation rate (requires Stripe — not connected)
- Actual collected revenue (requires Stripe — not connected)
- Customer lifetime value, CAC, marketing ROI
- Future projections of any kind`;

async function askExecutive(question) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];
  for (let i = 0; i < 6; i++) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", messages, tools: TOOLS, tool_choice: "auto",
      max_tokens: 500, temperature: 0.2,
    });
    const choice = res.choices[0];
    messages.push(choice.message);
    if (!choice.message.tool_calls?.length) return { reply: choice.message.content, toolsCalled: messages.filter(m => m.role === "tool").length };
    for (const tc of choice.message.tool_calls) {
      let result;
      try {
        if (tc.function.name === "get_at_risk_tenants") result = await getAtRiskTenants();
        else if (tc.function.name === "get_tenant_roster") result = await getTenantRoster();
        else result = { error: `Unknown tool: ${tc.function.name}` };
      } catch (e) { result = { error: e.message }; }
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }
  return { reply: "Max iterations reached", toolsCalled: 0 };
}

// ── Test A: answerable question ───────────────────────────────────────────────

console.log("\nA: Answerable question — at-risk tenants");
console.log("  Question: \"How many tenants are at risk right now?\"");

const realAtRisk = await getAtRiskTenants();
console.log(`  Real at-risk count from DB: ${realAtRisk.length}`);

const answerA = await askExecutive("How many tenants are at risk right now?");
console.log(`  Model reply: "${answerA.reply?.slice(0, 200)}..."`);

check("A1: model called at least one tool",        answerA.toolsCalled >= 1, `tools_called=${answerA.toolsCalled}`);
check("A2: reply mentions the real at-risk count", answerA.reply?.includes(String(realAtRisk.length)), `expected=${realAtRisk.length}`);
check("A3: reply does not say 'I don't know'",     !answerA.reply?.toLowerCase().includes("i don't know"));
check("A4: reply does not say 'I cannot'",         !answerA.reply?.toLowerCase().includes("i cannot"));

// ── Test B: unanswerable question ─────────────────────────────────────────────

console.log("\nB: Unanswerable question — churn rate (no billing data)");
console.log("  Question: \"What's our churn rate?\"");

const answerB = await askExecutive("What's our churn rate?");
console.log(`  Model reply: "${answerB.reply?.slice(0, 300)}"`);

const refusedB = (
  answerB.reply?.toLowerCase().includes("not available") ||
  answerB.reply?.toLowerCase().includes("isn't available") ||
  answerB.reply?.toLowerCase().includes("not tracked") ||
  answerB.reply?.toLowerCase().includes("no tool") ||
  answerB.reply?.toLowerCase().includes("stripe") ||
  answerB.reply?.toLowerCase().includes("billing")
);

check("B1: reply does not give a churn rate number", !/\d+(\.\d+)?%/.test(answerB.reply ?? ""), answerB.reply?.slice(0, 80));
check("B2: reply explicitly refuses or explains gap", refusedB, answerB.reply?.slice(0, 120));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── ${passed}/${checks} checks passed ──`);
if (passed < checks) process.exit(1);
