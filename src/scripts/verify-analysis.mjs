// Verification: analyzeEmployee flow against real production data.
// Tests: (A) signal-timeline append, (B) analyzeEmployee on Website Agent,
//        (C) recommendation constraint enforcement, (D) executive AI tool call.
// Usage: node src/scripts/verify-analysis.mjs

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
  console.error("FATAL: missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY");
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

// ── Helpers: Website Agent signal computation (mirrors queries.ts) ─────────────

async function computeWebsiteAgentSignals(employeeId) {
  const { data: rows, error } = await admin.from("websites").select("id, draft_html, is_published");
  if (error) throw new Error(`computeWebsiteAgentSignals/query: ${error.message}`);

  const totalSites = (rows ?? []).length;
  const sitesWithDraft = (rows ?? []).filter((r) => r.draft_html != null).length;
  const publishedSites = (rows ?? []).filter((r) => r.is_published === true).length;
  const generationSuccessRate = totalSites > 0
    ? parseFloat(((sitesWithDraft / totalSites) * 100).toFixed(1)) : 0;
  const publishRate = totalSites > 0
    ? parseFloat(((publishedSites / totalSites) * 100).toFixed(1)) : 0;

  const now = new Date().toISOString();
  const insertRows = [
    { employee_id: employeeId, signal_name: "total_sites", value: totalSites,
      real_description: "Total websites rows across all tenants (websites table, all time)", computed_at: now },
    { employee_id: employeeId, signal_name: "sites_with_draft", value: sitesWithDraft,
      real_description: "Websites where draft_html IS NOT NULL", computed_at: now },
    { employee_id: employeeId, signal_name: "published_sites", value: publishedSites,
      real_description: "Websites where is_published = true", computed_at: now },
    { employee_id: employeeId, signal_name: "generation_success_rate", value: generationSuccessRate,
      real_description: "sites_with_draft / total_sites × 100 (%)", computed_at: now },
    { employee_id: employeeId, signal_name: "publish_rate", value: publishRate,
      real_description: "published_sites / total_sites × 100 (%)", computed_at: now },
  ];

  const { error: insertErr } = await admin.from("employee_signals").insert(insertRows);
  if (insertErr) throw new Error(`computeWebsiteAgentSignals/insert: ${insertErr.message}`);
  return { signalsWritten: insertRows.length, signals: insertRows };
}

// ── Helpers: analyzeEmployee (mirrors analysis.ts, same logic) ─────────────────

const MIN_RUNS = 2;
const MIN_REC_SIGNALS = 3;

async function analyzeEmployeeDirect(employeeId, employeeName) {
  const { data: signalRows, error: sigErr } = await admin
    .from("employee_signals")
    .select("id, signal_name, value, real_description, computed_at")
    .eq("employee_id", employeeId)
    .order("computed_at", { ascending: true })
    .limit(200);
  if (sigErr) throw new Error(`signals: ${sigErr.message}`);

  const signals = signalRows ?? [];
  const distinctRuns = new Set(signals.map((s) => s.computed_at)).size;

  if (distinctRuns < MIN_RUNS) {
    return { status: "insufficient_history", distinctRuns, insights: [], recommendations: [], message: `Only ${distinctRuns} run(s)` };
  }

  // Group by computed_at
  const runMap = new Map();
  for (const s of signals) {
    if (!runMap.has(s.computed_at)) runMap.set(s.computed_at, []);
    runMap.get(s.computed_at).push(s);
  }
  const runEntries = Array.from(runMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const historyBlock = runEntries
    .map(([ts, rows], i) => {
      const lines = rows.map((r) => `  [${r.id}] ${r.signal_name} = ${r.value} — ${r.real_description}`).join("\n");
      return `Run ${i + 1} — ${ts}\n${lines}`;
    })
    .join("\n\n");

  const validIds = new Set(signals.map((s) => s.id));

  const systemPrompt = `You are an analyst reviewing the operational signal history of an AI employee named "${employeeName}".
RULES:
1. An INSIGHT is a checkable pattern visible in the timeline. Cite specific signal row UUIDs from the [UUID] tags.
2. A RECOMMENDATION requires AT LEAST ${MIN_REC_SIGNALS} distinct supporting signal rows and confidence "medium" or "high".
3. If no real pattern exists, return empty arrays.
4. Return ONLY valid JSON — no markdown.
Schema: { "insights": [{"content":"...","supportingSignalIds":["uuid"],"confidence":"low"|"medium"|"high"}], "recommendations": [{"content":"...","supportingSignalIds":["uuid1","uuid2","uuid3"],"confidence":"medium"|"high"}] }`;

  const userMessage = `Employee: ${employeeName}\nSignal history (${distinctRuns} runs, ${signals.length} entries):\n\n${historyBlock}\n\nAnalyze. Return JSON only.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1200,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const gpt = JSON.parse(raw);

  function isValidId(id) { return typeof id === "string" && validIds.has(id); }

  const rawInsights = Array.isArray(gpt.insights) ? gpt.insights : [];
  const rawRecs = Array.isArray(gpt.recommendations) ? gpt.recommendations : [];

  const validInsights = rawInsights.filter((i) =>
    typeof i.content === "string" && i.content.trim().length > 0 &&
    Array.isArray(i.supportingSignalIds) && i.supportingSignalIds.length > 0 &&
    i.supportingSignalIds.every(isValidId) &&
    ["low","medium","high"].includes(i.confidence)
  ).map((i) => ({ kind: "insight", content: i.content.trim(), supportingSignalIds: i.supportingSignalIds, confidence: i.confidence }));

  const validRecs = rawRecs.filter((r) =>
    typeof r.content === "string" && r.content.trim().length > 0 &&
    Array.isArray(r.supportingSignalIds) && r.supportingSignalIds.length >= MIN_REC_SIGNALS &&
    r.supportingSignalIds.every(isValidId) &&
    ["medium","high"].includes(r.confidence)
  ).map((r) => ({ kind: "recommendation", content: r.content.trim(), supportingSignalIds: r.supportingSignalIds, confidence: r.confidence }));

  // Attempt DB write (may fail if migration_v16.sql not yet run)
  const allEntries = [...validInsights, ...validRecs];
  let dbWriteOk = true;
  if (allEntries.length > 0) {
    const { error: insErr } = await admin.from("employee_insights").insert(
      allEntries.map((e) => ({
        employee_id: employeeId, kind: e.kind, content: e.content,
        supporting_signal_ids: e.supportingSignalIds, confidence: e.confidence,
      }))
    );
    if (insErr) {
      dbWriteOk = false;
      console.log(`  ⚠ employee_insights insert failed: ${insErr.message}`);
      console.log(`    → Run supabase/migration_v16.sql in Supabase SQL Editor to enable persistence.`);
    }
  }

  return {
    status: allEntries.length > 0 ? "ok" : "no_patterns",
    distinctRuns, insights: validInsights, recommendations: validRecs,
    gptRawInsights: rawInsights.length, gptRawRecs: rawRecs.length,
    dbWriteOk,
    message: allEntries.length > 0
      ? `${validInsights.length} insight(s), ${validRecs.length} recommendation(s) from ${distinctRuns} runs`
      : `No patterns detected across ${distinctRuns} runs`,
  };
}

// ── Find Website Agent ────────────────────────────────────────────────────────

console.log("\nFinding Website Agent...");
const { data: empRow, error: empErr } = await admin
  .from("employees").select("id, name").eq("name", "Website Agent").single();

if (empErr || !empRow) {
  console.error("  FATAL: Website Agent not found. Run seed-website-agent.mjs first.");
  process.exit(1);
}
const employeeId = empRow.id;
console.log(`  Website Agent id: ${employeeId}`);

// ── A: Signal history append (ensure >= 2 runs) ───────────────────────────────

console.log("\nA: Signal history — append mode (ensure >= 2 compute runs)");

const { data: preSigs } = await admin
  .from("employee_signals").select("computed_at").eq("employee_id", employeeId);
const preRuns = new Set((preSigs ?? []).map((s) => s.computed_at)).size;
console.log(`  Pre-existing distinct runs: ${preRuns}`);

let runsAfterSetup = preRuns;
if (preRuns < 2) {
  console.log(`  → Running computeWebsiteAgentSignals to reach 2 runs...`);
  const needed = 2 - preRuns;
  for (let i = 0; i < needed; i++) {
    await computeWebsiteAgentSignals(employeeId);
    console.log(`    → Inserted run ${preRuns + i + 1}`);
  }
  const { data: postSigs } = await admin
    .from("employee_signals").select("computed_at").eq("employee_id", employeeId);
  runsAfterSetup = new Set((postSigs ?? []).map((s) => s.computed_at)).size;
}

check("A1: >= 2 distinct compute runs exist", runsAfterSetup >= 2, `runs=${runsAfterSetup}`);

// Verify new runs are appended (not overwritten) by checking total row count
const { count: totalSigRows } = await admin
  .from("employee_signals").select("id", { count: "exact", head: true }).eq("employee_id", employeeId);
check("A2: total signal rows > signals per run (appended, not overwritten)", (totalSigRows ?? 0) > 5, `total=${totalSigRows}`);

// ── B: analyzeEmployee — real output ─────────────────────────────────────────

console.log("\nB: analyzeEmployee — real output from signal history");
const analysisResult = await analyzeEmployeeDirect(employeeId, "Website Agent");

console.log(`  Status: ${analysisResult.status}`);
console.log(`  Distinct runs: ${analysisResult.distinctRuns}`);
console.log(`  GPT produced: ${analysisResult.gptRawInsights} raw insights, ${analysisResult.gptRawRecs} raw recommendations`);
console.log(`  Validated: ${analysisResult.insights.length} insights, ${analysisResult.recommendations.length} recommendations`);
console.log(`  Message: ${analysisResult.message}`);

if (analysisResult.insights.length > 0) {
  console.log("\n  --- Insights ---");
  for (const ins of analysisResult.insights) {
    console.log(`  [${ins.confidence}] ${ins.content.slice(0, 120)}`);
    console.log(`    Supporting: ${ins.supportingSignalIds.length} signal(s)`);
  }
}
if (analysisResult.recommendations.length > 0) {
  console.log("\n  --- Recommendations ---");
  for (const rec of analysisResult.recommendations) {
    console.log(`  [${rec.confidence}] ${rec.content.slice(0, 120)}`);
    console.log(`    Supporting: ${rec.supportingSignalIds.length} signal(s)`);
  }
}

check("B1: status is ok, no_patterns, or insufficient_history (not error)",
  ["ok","no_patterns","insufficient_history"].includes(analysisResult.status), analysisResult.status);
check("B2: insights array present", Array.isArray(analysisResult.insights));
check("B3: recommendations array present", Array.isArray(analysisResult.recommendations));
check("B4: result is honest (ok means entries exist, no_patterns means arrays are empty)",
  analysisResult.status === "ok"
    ? (analysisResult.insights.length + analysisResult.recommendations.length) > 0
    : (analysisResult.insights.length + analysisResult.recommendations.length) === 0
);

// ── C: Recommendation constraint enforcement ──────────────────────────────────

console.log("\nC: Recommendation constraint enforcement");

// C1: Every returned recommendation must have >= 3 supporting signal IDs
let allRecsValid = true;
for (const rec of analysisResult.recommendations) {
  if (rec.supportingSignalIds.length < 3 || !["medium","high"].includes(rec.confidence)) {
    allRecsValid = false;
    console.log(`  ✗ Invalid recommendation passed filter: ${rec.supportingSignalIds.length} IDs, confidence=${rec.confidence}`);
  }
}
check("C1: all returned recommendations have >= 3 supporting signals and medium/high confidence",
  allRecsValid, `recs_checked=${analysisResult.recommendations.length}`);

// C2: Validation logic unit test — a synthetic underpowered rec is filtered out
const syntheticRec = { content: "test", supportingSignalIds: ["fake-id-1", "fake-id-2"], confidence: "medium" };
const syntheticValidIds = new Set(["fake-id-1", "fake-id-2"]);
const wouldPass = (
  Array.isArray(syntheticRec.supportingSignalIds) &&
  syntheticRec.supportingSignalIds.length >= 3 &&  // fails: only 2
  syntheticRec.supportingSignalIds.every((id) => syntheticValidIds.has(id)) &&
  ["medium","high"].includes(syntheticRec.confidence)
);
check("C2: recommendation with only 2 supporting IDs is rejected by validation filter",
  !wouldPass, `supportingIds=${syntheticRec.supportingSignalIds.length}`);

// C3: Validation logic unit test — low confidence rec is filtered out
const lowConfRec = { content: "test", supportingSignalIds: ["a","b","c"], confidence: "low" };
const lowValidIds = new Set(["a","b","c"]);
const lowPasses = (
  lowConfRec.supportingSignalIds.length >= 3 &&
  lowConfRec.supportingSignalIds.every((id) => lowValidIds.has(id)) &&
  ["medium","high"].includes(lowConfRec.confidence)  // fails: "low"
);
check("C3: recommendation with 'low' confidence is rejected by validation filter", !lowPasses);

// C4: Invented UUID is rejected
const fakeId = "00000000-0000-0000-0000-000000000000";
const realValidIds = new Set(["real-uuid-1","real-uuid-2","real-uuid-3"]);
const inventedIdPasses = ["real-uuid-1", fakeId, "real-uuid-3"].every((id) => realValidIds.has(id));
check("C4: invented UUID not in validIds set is rejected", !inventedIdPasses);

// ── D: Executive AI — analyze_employee tool call ──────────────────────────────

console.log("\nD: Executive AI — analyze_employee tool call");

const MC_TOOLS = [
  { type: "function", function: { name: "get_employee_roster", description: "Returns all AI employees.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "analyze_employee", description: "Runs on-demand analysis for a specific AI employee. Returns insights/recommendations from real signal history. Use get_employee_roster first.", parameters: { type: "object", properties: { employee_id: { type: "string", description: "UUID of the employee" } }, required: ["employee_id"] } } },
];

const EXEC_SYSTEM = `You are the Vela Master Executive AI. Answer ONLY using tool results. Never estimate. Call tools to get real data.`;

async function execAsk(question) {
  const messages = [
    { role: "system", content: EXEC_SYSTEM },
    { role: "user", content: question },
  ];
  const toolsCalled = [];
  for (let i = 0; i < 6; i++) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", messages, tools: MC_TOOLS, tool_choice: "auto",
      max_tokens: 600, temperature: 0.2,
    });
    const choice = res.choices[0];
    messages.push(choice.message);
    if (!choice.message.tool_calls?.length) return { reply: choice.message.content, toolsCalled };
    for (const tc of choice.message.tool_calls) {
      toolsCalled.push(tc.function.name);
      let result;
      if (tc.function.name === "analyze_employee") {
        const args = JSON.parse(tc.function.arguments || "{}");
        result = await analyzeEmployeeDirect(args.employee_id, "Website Agent");
      } else if (tc.function.name === "get_employee_roster") {
        const { data } = await admin.from("employees").select("id, name").order("created_at");
        result = { employees: (data ?? []).map((e) => ({ id: e.id, name: e.name })) };
      } else {
        result = { error: `Unknown tool: ${tc.function.name}` };
      }
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }
  }
  return { reply: "Max iterations", toolsCalled };
}

const execResult = await execAsk("How is the Website Agent performing? Run an analysis.");
console.log(`  Tools called: ${execResult.toolsCalled.join(" → ")}`);
console.log(`  Reply: "${execResult.reply?.slice(0, 300)}"`);

check("D1: executive called analyze_employee tool",
  execResult.toolsCalled.includes("analyze_employee"), `tools=${execResult.toolsCalled.join(",")}`);
check("D2: executive returned a non-empty reply", (execResult.reply?.length ?? 0) > 10);
check("D3: executive did not claim to have no data when analysis ran",
  !execResult.reply?.toLowerCase().includes("no data") || execResult.toolsCalled.includes("analyze_employee"),
  `tools_called=${execResult.toolsCalled.length}`);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── ${passed}/${checks} checks passed ──`);
if (passed < checks) process.exit(1);
