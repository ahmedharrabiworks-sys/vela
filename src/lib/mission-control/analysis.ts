// Mission Control — on-demand employee analysis
// Reads the employee's real signal history, calls GPT to surface honest patterns,
// writes verified results to employee_insights.
//
// Hard Rule 22: every insight/recommendation must cite specific real signal row UUIDs.
// No fabrication: if no real pattern exists, the result is empty — that is honest.
// Minimum 2 distinct compute runs required to detect any pattern.
// Recommendations additionally require >= 3 corroborating signal IDs and
// confidence "medium" or "high" — never from a single reading or low confidence.

import OpenAI from "openai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export interface EmployeeInsight {
  kind: "insight" | "recommendation";
  content: string;
  supportingSignalIds: string[];
  confidence: "low" | "medium" | "high";
}

export interface AnalyzeEmployeeResult {
  status: "ok" | "insufficient_history" | "no_patterns" | "no_openai" | "error";
  employeeId: string;
  employeeName: string;
  distinctRuns: number;
  insights: EmployeeInsight[];
  recommendations: EmployeeInsight[];
  message: string;
}

interface RawSignalRow {
  id: string;
  signal_name: string;
  value: number | null;
  real_description: string;
  computed_at: string;
}

interface GptEntry {
  content: string;
  supportingSignalIds: string[];
  confidence: string;
}

interface GptResponse {
  insights?: GptEntry[];
  recommendations?: GptEntry[];
}

const MIN_RUNS_FOR_ANALYSIS = 2;
const MIN_SIGNALS_FOR_RECOMMENDATION = 3;

export async function analyzeEmployee(
  admin: AdminClient,
  employeeId: string,
): Promise<AnalyzeEmployeeResult> {
  // ── Fetch employee metadata ──────────────────────────────────────────────────
  const { data: empRow, error: empErr } = await admin
    .from("employees")
    .select("id, name")
    .eq("id", employeeId)
    .single();

  if (empErr || !empRow) {
    throw new Error(`analyzeEmployee: employee not found (${employeeId})`);
  }

  const employeeName: string = empRow.name;

  // ── Fetch full signal history (with IDs for citation) ────────────────────────
  const { data: signalRows, error: sigErr } = await admin
    .from("employee_signals")
    .select("id, signal_name, value, real_description, computed_at")
    .eq("employee_id", employeeId)
    .order("computed_at", { ascending: true })
    .limit(200);

  if (sigErr) throw new Error(`analyzeEmployee/signals: ${sigErr.message}`);

  const signals: RawSignalRow[] = signalRows ?? [];

  // ── Count distinct compute runs (signals in one run share the same computed_at) ─
  const distinctRuns = new Set(signals.map((s) => s.computed_at)).size;

  if (distinctRuns < MIN_RUNS_FOR_ANALYSIS) {
    return {
      status: "insufficient_history",
      employeeId,
      employeeName,
      distinctRuns,
      insights: [],
      recommendations: [],
      message: `Only ${distinctRuns} compute run(s) on record. Analysis requires at least ${MIN_RUNS_FOR_ANALYSIS} distinct runs to detect patterns — run the compute/seed script again to build history.`,
    };
  }

  // ── OpenAI key check ─────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "no_openai",
      employeeId,
      employeeName,
      distinctRuns,
      insights: [],
      recommendations: [],
      message: "OPENAI_API_KEY not configured.",
    };
  }

  // ── Format signal history as a timeline for GPT ──────────────────────────────
  // Group by computed_at (each group = one compute run, same timestamp)
  const runMap = new Map<string, RawSignalRow[]>();
  for (const s of signals) {
    if (!runMap.has(s.computed_at)) runMap.set(s.computed_at, []);
    runMap.get(s.computed_at)!.push(s);
  }

  const runEntries = Array.from(runMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const historyBlock = runEntries
    .map(([ts, rows], i) => {
      const lines = rows
        .map((r) => `  [${r.id}] ${r.signal_name} = ${r.value ?? "null"} — ${r.real_description}`)
        .join("\n");
      return `Run ${i + 1} — ${ts}\n${lines}`;
    })
    .join("\n\n");

  const validIds = new Set(signals.map((s) => s.id));

  // ── GPT analysis call ────────────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an analyst reviewing the operational signal history of an AI employee named "${employeeName}".
Your task: find real, observable patterns in the timeline data provided.

RULES — non-negotiable:
1. An INSIGHT is a checkable pattern, trend, notable value, or change visible in the timeline.
   You MUST cite specific signal row UUIDs (from the [UUID] tags) that support it.
   Use ONLY UUIDs from the provided data — never invent UUIDs.
2. A RECOMMENDATION requires AT LEAST ${MIN_SIGNALS_FOR_RECOMMENDATION} distinct supporting signal rows and confidence "medium" or "high".
   Never produce a recommendation from a single data point, from inferred values, or with "low" confidence.
   A recommendation without ${MIN_SIGNALS_FOR_RECOMMENDATION}+ real cited signal rows must be omitted entirely.
3. If no real pattern exists in the data, return empty arrays for both insights and recommendations.
   An honest empty result is correct — do not invent patterns.
4. Confidence: "low" = loosely correlated; "medium" = clearly visible in 2+ readings; "high" = consistent across all readings with no contradictory data.
5. Return ONLY valid JSON — no markdown, no preamble, no explanation outside the JSON structure.

Required JSON schema:
{
  "insights": [
    { "content": "...", "supportingSignalIds": ["uuid1", "uuid2"], "confidence": "low" | "medium" | "high" }
  ],
  "recommendations": [
    { "content": "...", "supportingSignalIds": ["uuid1", "uuid2", "uuid3"], "confidence": "medium" | "high" }
  ]
}`;

  const userMessage = `Employee: ${employeeName}
Signal history (${distinctRuns} compute runs, ${signals.length} total signal entries):

${historyBlock}

Analyze the timeline. Produce only evidence-linked insights and recommendations that meet the stated rules.`;

  let gptResponse: GptResponse = { insights: [], recommendations: [] };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1200,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    gptResponse = JSON.parse(raw) as GptResponse;
  } catch (err) {
    console.error("[analyzeEmployee] GPT call failed:", err);
    return {
      status: "error",
      employeeId,
      employeeName,
      distinctRuns,
      insights: [],
      recommendations: [],
      message: "Analysis GPT call failed — signal history is valid but analysis could not complete.",
    };
  }

  // ── Validate GPT output (server-side enforcement) ────────────────────────────
  function isValidId(id: unknown): id is string {
    return typeof id === "string" && validIds.has(id);
  }

  const rawInsights: GptEntry[] = Array.isArray(gptResponse.insights) ? gptResponse.insights : [];
  const rawRecs: GptEntry[] = Array.isArray(gptResponse.recommendations) ? gptResponse.recommendations : [];

  const validInsights: EmployeeInsight[] = rawInsights
    .filter((i) =>
      typeof i.content === "string" &&
      i.content.trim().length > 0 &&
      Array.isArray(i.supportingSignalIds) &&
      i.supportingSignalIds.length > 0 &&
      i.supportingSignalIds.every(isValidId) &&
      ["low", "medium", "high"].includes(i.confidence),
    )
    .map((i) => ({
      kind: "insight" as const,
      content: i.content.trim(),
      supportingSignalIds: i.supportingSignalIds as string[],
      confidence: i.confidence as "low" | "medium" | "high",
    }));

  // Recommendations: additionally enforce >= MIN_SIGNALS and no "low" confidence
  const validRecommendations: EmployeeInsight[] = rawRecs
    .filter((r) =>
      typeof r.content === "string" &&
      r.content.trim().length > 0 &&
      Array.isArray(r.supportingSignalIds) &&
      r.supportingSignalIds.length >= MIN_SIGNALS_FOR_RECOMMENDATION &&
      r.supportingSignalIds.every(isValidId) &&
      ["medium", "high"].includes(r.confidence),
    )
    .map((r) => ({
      kind: "recommendation" as const,
      content: r.content.trim(),
      supportingSignalIds: r.supportingSignalIds as string[],
      confidence: r.confidence as "medium" | "high",
    }));

  // ── Write verified entries to employee_insights ──────────────────────────────
  const allEntries = [...validInsights, ...validRecommendations];
  if (allEntries.length > 0) {
    const insertRows = allEntries.map((e) => ({
      employee_id: employeeId,
      kind: e.kind,
      content: e.content,
      supporting_signal_ids: e.supportingSignalIds,
      confidence: e.confidence,
    }));

    const { error: insertErr } = await admin
      .from("employee_insights")
      .insert(insertRows);

    if (insertErr) {
      // Log but don't crash — still return the analysis results
      console.error("[analyzeEmployee] employee_insights insert failed:", insertErr.message);
      console.error("  → Run supabase/migration_v16.sql in Supabase SQL Editor if the table doesn't exist yet.");
    }
  }

  return {
    status: allEntries.length > 0 ? "ok" : "no_patterns",
    employeeId,
    employeeName,
    distinctRuns,
    insights: validInsights,
    recommendations: validRecommendations,
    message: allEntries.length > 0
      ? `Found ${validInsights.length} insight(s) and ${validRecommendations.length} recommendation(s) from ${distinctRuns} compute runs.`
      : `No patterns detected across ${distinctRuns} compute run(s) — this is an honest result, not an error.`,
  };
}
