// Mission Control — Security Agent check functions
// Report-only, zero execution authority. Every finding cites real evidence.
// Each check returns an empty array if no issues found — that is an honest result.
// Hard Rule 22 discipline: findings must be traceable to a specific real query result.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export interface SecurityFinding {
  finding: string;
  evidence: string;
  severity: "info" | "warning" | "critical";
}

export interface AuditCategory {
  name: string;
  description: string;
  findings: SecurityFinding[];
}

export interface SecurityAuditResult {
  employeeId: string;
  employeeName: string;
  categories: AuditCategory[];
  totalFindings: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  runAt: string;
}

// ── Check 1: RLS policies ─────────────────────────────────────────────────────
// Tenant data tables that must have RLS policies
const TENANT_TABLES_REQUIRING_RLS = [
  "tenants", "tenant_config", "websites", "website_versions",
  "conversations", "messages", "leads", "appointments",
  "agent_calls", "whatsapp_accounts", "marketing_generations", "webhook_logs",
];

// MC tables that are admin-client-only by design — no end-user policies expected
const ADMIN_ONLY_TABLES = [
  "departments", "employees", "employee_signals", "employee_insights",
  "learning_log", "mission_control_access_log",
];

export async function checkRlsPolicies(admin: AdminClient): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  const { data: policies, error } = await admin
    .from("pg_policies")
    .select("tablename, policyname, permissive, cmd, qual")
    .eq("schemaname", "public");

  if (error) {
    // pg_policies is in pg_catalog — not always accessible via PostgREST.
    // This is an informational gap, not a confirmed vulnerability.
    findings.push({
      finding: "pg_policies view not accessible via PostgREST API",
      evidence: `Error ${error.code}: ${error.message}. Manual verification required: Supabase dashboard → Authentication → Policies for each tenant table.`,
      severity: "info",
    });
    return findings;
  }

  // Build tablename → policies map
  const tableMap = new Map<
    string,
    Array<{ policyname: string; permissive: string; cmd: string; qual: string | null }>
  >();
  for (const p of policies ?? []) {
    if (!tableMap.has(p.tablename)) tableMap.set(p.tablename, []);
    tableMap.get(p.tablename)!.push(p);
  }

  // Flag permissive policies with qual = 'true' (all rows to all roles — usually a mistake)
  for (const [table, pols] of tableMap.entries()) {
    for (const pol of pols) {
      if (pol.permissive === "PERMISSIVE" && pol.qual === "true") {
        findings.push({
          finding: `Table "${table}" has a permissive policy with qual = 'true'`,
          evidence: `Policy: "${pol.policyname}", cmd: ${pol.cmd}, qual: '${pol.qual}' — this allows ALL rows to ALL roles regardless of auth.uid()`,
          severity: "critical",
        });
      }
    }
  }

  // Flag tenant data tables with zero policies
  for (const table of TENANT_TABLES_REQUIRING_RLS) {
    if (!tableMap.has(table)) {
      findings.push({
        finding: `Tenant data table "${table}" has no RLS policies`,
        evidence: `pg_policies returned 0 rows for public.${table} — this table stores per-tenant data and should be row-level secured`,
        severity: "critical",
      });
    }
  }

  // Flag admin-only tables that unexpectedly have policies (may indicate accidental exposure)
  const adminWithPolicies = ADMIN_ONLY_TABLES.filter((t) => tableMap.has(t));
  if (adminWithPolicies.length > 0) {
    findings.push({
      finding: `Admin-only MC tables unexpectedly have RLS policies: ${adminWithPolicies.join(", ")}`,
      evidence: `MC tables are intended to be admin-client-only (SUPABASE_SERVICE_ROLE_KEY). End-user policies were not expected and may indicate accidental exposure.`,
      severity: "warning",
    });
  }

  return findings;
}

// ── Check 2: Webhook fail-open ────────────────────────────────────────────────
// Checks process.env for each webhook route's required secret.
// Missing secrets = route could fail open (no signature verification).
// Severity is "warning" not "critical" — Hard Rule 20: placeholder creds are
// expected until integration day; this check surfaces readiness gaps, not live exploits.

const WEBHOOK_ROUTES = [
  {
    route: "/api/webhooks/instagram",
    vars: ["META_WEBHOOK_VERIFY_TOKEN", "META_APP_SECRET"],
    description: "Instagram DM webhook — HMAC-SHA256 + verify token challenge",
  },
  {
    route: "/api/webhooks/whatsapp",
    vars: ["META_WHATSAPP_VERIFY_TOKEN", "META_APP_SECRET"],
    description: "WhatsApp Meta Cloud API webhook — HMAC-SHA256 + verify token challenge",
  },
  {
    route: "/api/ai-agent/call-webhook",
    vars: ["VAPI_WEBHOOK_SECRET"],
    description: "Vapi end-of-call webhook — bearer token verification",
  },
  {
    route: "/api/whatsapp/webhook (legacy Twilio path)",
    vars: ["TWILIO_AUTH_TOKEN"],
    description: "Legacy Twilio webhook — HMAC-SHA1 verification",
  },
] as const;

export function checkWebhookFailOpen(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const hook of WEBHOOK_ROUTES) {
    const unset = hook.vars.filter((v) => !process.env[v]);
    const set = hook.vars.filter((v) => !!process.env[v]);

    if (unset.length > 0) {
      findings.push({
        finding: `Route "${hook.route}" has ${unset.length} unset required secret(s)`,
        evidence: `Set: [${set.join(", ") || "none"}] | Unset: [${unset.join(", ")}] | Purpose: ${hook.description}`,
        severity: "warning",
      });
    }
  }

  return findings;
}

// ── Check 3: Exposed env vars ─────────────────────────────────────────────────
// NEXT_PUBLIC_* vars are bundled into the client-side JS bundle and visible
// to every browser that loads the app. Sensitive material must never appear here.

const SENSITIVE_PATTERNS = ["SECRET", "SERVICE_ROLE", "PRIVATE_KEY", "ADMIN_KEY"];

export function checkExposedEnvVars(): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  const exposed = Object.keys(process.env)
    .filter((k) => k.startsWith("NEXT_PUBLIC_"))
    .filter((k) => SENSITIVE_PATTERNS.some((p) => k.toUpperCase().includes(p)));

  for (const key of exposed) {
    const pattern = SENSITIVE_PATTERNS.find((p) => key.toUpperCase().includes(p))!;
    findings.push({
      finding: `Client-bundled env var "${key}" matches sensitive pattern "${pattern}"`,
      evidence: `NEXT_PUBLIC_* prefix means this value is included in the client-side JavaScript bundle. Pattern matched: "${pattern}". Value is not logged.`,
      severity: "critical",
    });
  }

  return findings;
}

// ── Check 4: Schema vs known migrations ───────────────────────────────────────
// These are exactly the tables/columns that caused silent production failures
// in this session. Querying them directly — if the query errors, the item is absent.
// PGRST205 / 42703 = column not found. 42P01 = table not found.

const SCHEMA_EXPECTATIONS = [
  {
    table: "agent_calls",
    column: null as string | null,
    migration: "migration_v13b.sql",
    description: "Voice call recording — absence caused all call writes to silently fail (PGRST205 was swallowed by try/catch)",
  },
  {
    table: "tenant_config",
    column: "knowledge_base_updated_at",
    migration: "migration_v13b.sql",
    description: "KB training timestamp — absence broke at-risk detection and Trainer Agent signals",
  },
  {
    table: "whatsapp_accounts",
    column: null as string | null,
    migration: "migration_v9.sql",
    description: "WhatsApp channel accounts — needed for multi-tenant webhook phone_number_id routing",
  },
] as const;

export async function checkSchemaVsMigrations(admin: AdminClient): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  for (const exp of SCHEMA_EXPECTATIONS) {
    const selectField = exp.column ?? "id";
    const { error } = await admin.from(exp.table).select(selectField).limit(1);

    if (!error) continue; // present — no finding

    const isMissingTable =
      error.code === "42P01" ||
      (error.message && error.message.includes("does not exist") && !error.message.includes(selectField));
    const isMissingColumn =
      error.code === "PGRST205" ||
      error.code === "42703" ||
      (error.message && error.message.includes(selectField ?? ""));

    if (isMissingTable) {
      findings.push({
        finding: `Table "${exp.table}" does not exist`,
        evidence: `Error ${error.code}: ${error.message} | Expected from: ${exp.migration} | Impact: ${exp.description}`,
        severity: "critical",
      });
    } else if (exp.column && isMissingColumn) {
      findings.push({
        finding: `Column "${exp.table}.${exp.column}" does not exist`,
        evidence: `Error ${error.code}: ${error.message} | Expected from: ${exp.migration} | Impact: ${exp.description}`,
        severity: "critical",
      });
    } else {
      findings.push({
        finding: `Could not verify ${exp.column ? `"${exp.table}.${exp.column}"` : `table "${exp.table}"`}`,
        evidence: `Unexpected error ${error.code}: ${error.message} — investigate before assuming schema is correct`,
        severity: "warning",
      });
    }
  }

  return findings;
}

// ── runSecurityAudit ──────────────────────────────────────────────────────────
// Runs all four checks, writes findings to employee_insights, returns full result.
// Zero-finding categories are included in the result — honest, never omitted.

const AUDIT_CATEGORIES: Array<{
  name: string;
  description: string;
  runCheck: (admin: AdminClient) => Promise<SecurityFinding[]>;
}> = [
  {
    name: "rls_policies",
    description: "RLS policies — every tenant data table should have row-level security configured",
    runCheck: (admin) => checkRlsPolicies(admin),
  },
  {
    name: "webhook_secrets",
    description: "Webhook fail-open — all webhook routes must have their required secrets set",
    runCheck: () => Promise.resolve(checkWebhookFailOpen()),
  },
  {
    name: "exposed_env_vars",
    description: "Client-side exposure — no NEXT_PUBLIC_* var should match a sensitive key pattern",
    runCheck: () => Promise.resolve(checkExposedEnvVars()),
  },
  {
    name: "schema_drift",
    description: "Schema vs migrations — known-critical tables and columns must still exist",
    runCheck: (admin) => checkSchemaVsMigrations(admin),
  },
];

export async function runSecurityAudit(
  admin: AdminClient,
  employeeId: string,
): Promise<SecurityAuditResult> {
  const runAt = new Date().toISOString();

  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("id, name")
    .eq("id", employeeId)
    .single();

  if (empErr || !emp) {
    throw new Error(`runSecurityAudit: employee not found (${employeeId})`);
  }

  const categories: AuditCategory[] = [];

  for (const cat of AUDIT_CATEGORIES) {
    let findings: SecurityFinding[] = [];
    try {
      findings = await cat.runCheck(admin);
    } catch (err) {
      findings = [{
        finding: `Check "${cat.name}" threw an unexpected error`,
        evidence: err instanceof Error ? err.message : String(err),
        severity: "warning",
      }];
    }
    categories.push({ name: cat.name, description: cat.description, findings });
  }

  const allFindings = categories.flatMap((c) => c.findings);
  const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
  const warningCount = allFindings.filter((f) => f.severity === "warning").length;
  const infoCount = allFindings.filter((f) => f.severity === "info").length;

  // Write to employee_insights (kind: 'security_finding').
  // supporting_signal_ids is intentionally [] — security findings are real-time checks,
  // not derived from employee signal rows. The employee_insights table shape is reused
  // here because it already has the right structure (employeeId, kind, content, confidence).
  // Requires migration_v16.sql + migration_v17.sql to have been run.
  if (allFindings.length > 0) {
    const insertRows = categories.flatMap((cat) =>
      cat.findings.map((f) => ({
        employee_id: employeeId,
        kind: "security_finding",
        content: `[${f.severity.toUpperCase()}] ${f.finding}\n\nEvidence: ${f.evidence}`,
        supporting_signal_ids: [],
        confidence: f.severity === "critical" ? "high" : f.severity === "warning" ? "medium" : "low",
      })),
    );

    const { error: insertErr } = await admin.from("employee_insights").insert(insertRows);
    if (insertErr) {
      console.error("[runSecurityAudit] employee_insights insert failed:", insertErr.message);
      if (insertErr.message?.includes("security_finding")) {
        console.error("  → Run supabase/migration_v17.sql to add 'security_finding' kind.");
      } else if (insertErr.message?.includes("employee_insights")) {
        console.error("  → Run supabase/migration_v16.sql first to create the table.");
      }
    }
  }

  return {
    employeeId,
    employeeName: emp.name as string,
    categories,
    totalFindings: allFindings.length,
    criticalCount,
    warningCount,
    infoCount,
    runAt,
  };
}
