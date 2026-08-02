import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { MC_SESSION_COOKIE, verifyMcSessionCookie } from "@/lib/mission-control-auth";
import {
  getTenantRoster,
  getTheoreticalMRR,
  getVoiceMarginSummary,
  getPlatformActivitySummary,
  getAtRiskTenants,
  getEmployeeRoster,
  getEmployeeDetail,
  getTenantEngagement,
  getTenantActivity,
} from "@/lib/mission-control/queries";
import { analyzeEmployee } from "@/lib/mission-control/analysis";
import { runSecurityAudit } from "@/lib/mission-control/security-checks";

// ── Tool definitions ──────────────────────────────────────────────────────────

const MC_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_tenant_roster",
      description:
        "Returns all tenants with business name, plan, industry, city, and join date. Also returns plan breakdown counts and total count.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_theoretical_mrr",
      description:
        "Returns theoretical MRR (plan price × active tenant count per tier). NOT actual collected revenue — Stripe is not integrated. Always label this as 'theoretical'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_voice_margin_summary",
      description:
        "Returns voice minute usage and cost per tenant for the current month. Cost = duration_seconds × $0.12/min (Vapi + ElevenLabs + GPT-4o). Compared against theoretical plan revenue.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_platform_activity_summary",
      description:
        "Returns current-month counts for conversations, leads, appointments, and agent_calls across all tenants.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_at_risk_tenants",
      description:
        "Returns tenants matching behavioral risk proxies: no login in 14+ days, KB never trained, or zero calls in 30 days. These are behavioral proxies only — never label as 'churned'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_roster",
      description:
        "Returns all AI employees with their department, status, and latest signal values.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_employee_detail",
      description:
        "Returns full detail for a specific AI employee: role, domain, safe default action, signal history, and learning log. Use get_employee_roster first to find the employee ID.",
      parameters: {
        type: "object",
        properties: {
          employee_id: {
            type: "string",
            description: "UUID of the employee (from get_employee_roster)",
          },
        },
        required: ["employee_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tenant_engagement",
      description:
        "Returns engagement detail for a specific tenant: last login, KB training status, channel connections (Instagram, WhatsApp, website). Use get_tenant_roster first to find the tenant ID.",
      parameters: {
        type: "object",
        properties: {
          tenant_id: {
            type: "string",
            description: "UUID of the tenant (from get_tenant_roster)",
          },
        },
        required: ["tenant_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tenant_activity",
      description:
        "Returns recent activity for a specific tenant: last 20 conversations, leads, appointments, and calls. Use get_tenant_roster first to find the tenant ID.",
      parameters: {
        type: "object",
        properties: {
          tenant_id: {
            type: "string",
            description: "UUID of the tenant (from get_tenant_roster)",
          },
        },
        required: ["tenant_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_employee",
      description:
        "Runs on-demand signal-history analysis for a specific AI employee. Reads the employee's real signal timeline, finds evidence-backed insights and recommendations, and writes results to the database. Returns empty arrays if fewer than 2 compute runs exist (honest: not enough history). Use get_employee_roster first to find the employee ID.",
      parameters: {
        type: "object",
        properties: {
          employee_id: {
            type: "string",
            description: "UUID of the employee (from get_employee_roster)",
          },
        },
        required: ["employee_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_security_audit",
      description:
        "Runs an on-demand security audit via the Security Agent employee. Checks: RLS policies (tenant data tables), webhook secret coverage, client-side env var exposure, and schema vs known migrations. Report-only — no changes made. Returns findings grouped by category with severity (critical/warning/info) and evidence. Use get_employee_roster to find the Security Agent employee ID first.",
      parameters: {
        type: "object",
        properties: {
          employee_id: {
            type: "string",
            description: "UUID of the Security Agent employee (from get_employee_roster — use the one named 'Security Agent')",
          },
        },
        required: ["employee_id"],
      },
    },
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Vela Master Executive AI — a real-time intelligence interface for the Vela platform owner.
You have access to tools that query live production data directly.

HARD RULES — never violate, no exceptions:
1. Every factual answer requires a tool call first. Do not answer from memory or general knowledge.
2. If no available tool can directly answer the question, say: "That data isn't available yet." Then briefly explain why. Do not guess, estimate, extrapolate, or derive one metric from a different metric to fill the gap.
3. A tool result of 0 means 0. Report it honestly — do not soften, reframe, or imply it might be higher.
4. Revenue figures are ALWAYS labeled "theoretical MRR" (plan price × tenant count). Actual collected revenue does not exist in any tool — never invent it.
5. At-risk data is a BEHAVIORAL PROXY — it means "no login in 14+ days, KB untrained, or no calls in 30 days." It is NOT churn, NOT cancellation rate, NOT a churn rate. Never compute or report a "churn rate" from at-risk data. If asked for churn rate, say "That data isn't available yet — churn rate requires actual subscription cancellations, which requires Stripe to be connected."
6. Do NOT derive metrics that weren't explicitly produced by a tool. If a tool returns at-risk count and total count, do NOT compute at-risk% and call it "churn rate" or any other metric the user asked for. Metric substitution is not allowed.

Your available data sources (via tools):
- Full tenant roster with plans, industries, cities
- Theoretical MRR by plan tier
- Voice minute usage and cost per tenant (current month)
- Platform activity: conversations, leads, appointments, calls (current month)
- At-risk tenants (behavioral proxies only — NOT churn)
- AI employee roster with real signal values
- Per-tenant engagement detail and recent activity
- Security audit via Security Agent employee (RLS policies, webhook secrets, env var exposure, schema drift)

Metrics that do NOT exist in any tool — never answer these by substitution:
- Churn rate or cancellation rate (requires Stripe — not connected)
- Actual collected revenue (requires Stripe — not connected)
- Customer lifetime value, CAC, marketing ROI
- Future projections of any kind`;

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<unknown> {
  switch (name) {
    case "get_tenant_roster":
      return getTenantRoster(admin);
    case "get_theoretical_mrr":
      return getTheoreticalMRR(admin);
    case "get_voice_margin_summary":
      return getVoiceMarginSummary(admin);
    case "get_platform_activity_summary":
      return getPlatformActivitySummary(admin);
    case "get_at_risk_tenants":
      return getAtRiskTenants(admin);
    case "get_employee_roster":
      return getEmployeeRoster(admin);
    case "get_employee_detail":
      return getEmployeeDetail(admin, args.employee_id as string);
    case "get_tenant_engagement":
      return getTenantEngagement(admin, args.tenant_id as string);
    case "get_tenant_activity":
      return getTenantActivity(admin, args.tenant_id as string);
    case "analyze_employee":
      return analyzeEmployee(admin, args.employee_id as string);
    case "run_security_audit":
      return runSecurityAudit(admin, args.employee_id as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const sessionValue = request.cookies.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as {
    message?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (body.message.length > 1000) {
    return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const openai = new OpenAI({ apiKey });

    // Build message list: system + prior turns + new user message
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(body.conversationHistory ?? []).slice(-10), // keep last 10 turns for context
      { role: "user", content: body.message.trim() },
    ];

    // Tool-calling loop — max 6 iterations (prevents runaway tool chains)
    for (let i = 0; i < 6; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: MC_TOOLS,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.2, // low temp — this is a data retrieval interface, not creative
      });

      const choice = response.choices[0];
      const assistantMsg = choice.message;
      messages.push(assistantMsg);

      // No tool calls — model produced a final text answer
      if (!assistantMsg.tool_calls?.length) {
        const reply = assistantMsg.content?.trim() ?? "I wasn't able to generate a response.";
        return NextResponse.json({ reply });
      }

      // Execute all tool calls in parallel
      const toolResults = await Promise.allSettled(
        assistantMsg.tool_calls.map(async (tc) => {
          let result: unknown;
          try {
            result = await executeTool(
              tc.function.name,
              JSON.parse(tc.function.arguments || "{}"),
              admin,
            );
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "Tool execution failed" };
          }
          return { id: tc.id, result };
        }),
      );

      // Append each tool result as a tool message
      for (const r of toolResults) {
        if (r.status === "fulfilled") {
          messages.push({
            role: "tool",
            tool_call_id: r.value.id,
            content: JSON.stringify(r.value.result),
          });
        }
      }
    }

    // Exhausted iterations without a final text response
    return NextResponse.json({
      reply: "I ran too many tool lookups without reaching a conclusion. Please try rephrasing your question.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[MC executive]", msg);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
