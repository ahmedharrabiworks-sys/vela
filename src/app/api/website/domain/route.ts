import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── Rate limiting (in-memory, per tenant, resets on cold start) ───────────────
const RATE_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT  = 10;
const RATE_WINDOW = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  const entry = RATE_MAP.get(tenantId);
  if (!entry || now > entry.resetAt) {
    RATE_MAP.set(tenantId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Strict domain validation ──────────────────────────────────────────────────
// Rejects: bare "www", protocols, paths, spaces, double dots, leading/trailing hyphens
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

function isValidDomain(input: string): boolean {
  if (!input || input.includes(" ") || input.includes("..")) return false;
  const parts = input.split(".");
  // Require at least 2 parts with a valid TLD
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return false;
  return parts.every((p) => LABEL_RE.test(p));
}

// ── Map Vercel error codes to clean user-facing messages ──────────────────────
function mapVercelError(code: string | undefined, message: string | undefined): string {
  if (code === "domain_already_in_use")    return "This domain is already in use by another project.";
  if (code === "invalid_domain")           return "Invalid domain — please check the spelling.";
  if (code === "domain_already_verified")  return "This domain is already verified and connected.";
  if (code === "forbidden")                return "You don't have permission to add this domain.";
  if (code === "not_found")                return "Domain not found in this project.";
  if (message?.includes("rate"))           return "Too many requests — please wait a moment.";
  return "Could not connect domain — please try again.";
}

// ── Build DNS records the user must add ───────────────────────────────────────
type DnsRecord = { type: string; name: string; value: string };

function buildDnsInstructions(
  domain: string,
  verification: Array<{ type?: string; domain?: string; value?: string }>,
): DnsRecord[] {
  const records: DnsRecord[] = [];

  // Traffic routing: CNAME for subdomains, A for apex
  const parts = domain.split(".");
  const isApex = parts.length === 2; // e.g. example.com
  if (isApex) {
    records.push({ type: "A", name: "@", value: "76.76.21.21" });
  } else {
    records.push({ type: "CNAME", name: parts[0], value: "cname.vercel-dns.com" });
  }

  // TXT verification records from Vercel
  for (const v of verification) {
    if (v.type && v.domain && v.value) {
      records.push({ type: v.type, name: v.domain, value: v.value });
    }
  }

  return records;
}

// ── Auth + tenant helper ──────────────────────────────────────────────────────
async function getAuthedTenant(req: NextRequest): Promise<{ tenant: { id: string } | null; error?: NextResponse }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tenant: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return { tenant: null, error: NextResponse.json({ error: "No tenant found" }, { status: 404 }) };

  return { tenant };
}

function vercelHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function teamParam(): string {
  return process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
}

// ── POST /api/website/domain ─────────────────────────────────────────────────
// Adds domain to Vercel project + saves to tenant_config
export async function POST(req: NextRequest) {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { domain?: string };
  const rawDomain = (body.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!isValidDomain(rawDomain)) {
    return NextResponse.json(
      { error: "Please enter a valid domain name (e.g. www.yourbusiness.com). A bare 'www' or single word is not valid." },
      { status: 400 },
    );
  }

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const url = `https://api.vercel.com/v10/projects/${projectId}/domains${teamParam()}`;
  let vercelRes: Response;
  try {
    vercelRes = await fetch(url, {
      method: "POST",
      headers: vercelHeaders(token),
      body: JSON.stringify({ name: rawDomain }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Vercel — try again." }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vercelData = await vercelRes.json() as any;

  if (!vercelRes.ok) {
    const code = vercelData?.error?.code as string | undefined;
    const msg  = vercelData?.error?.message as string | undefined;
    return NextResponse.json({ error: mapVercelError(code, msg) }, { status: 400 });
  }

  const verification = (vercelData.verification ?? []) as Array<{ type?: string; domain?: string; value?: string }>;
  const records = buildDnsInstructions(rawDomain, verification);

  const admin = createSupabaseAdmin() as AdminClient;
  await admin.from("tenant_config").upsert({
    tenant_id:             tenant.id,
    website_custom_domain: rawDomain,
    website_domain_status: "pending",
    website_domain_records: records,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ domain: rawDomain, status: "pending", records });
}

// ── GET /api/website/domain ───────────────────────────────────────────────────
// Checks live status with Vercel and updates tenant_config
export async function GET(req: NextRequest) {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_custom_domain, website_domain_status, website_domain_records")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const tc = config as Record<string, unknown> | null;
  const domain = tc?.website_custom_domain as string | undefined;
  if (!domain) return NextResponse.json({ status: null, domain: null, records: [] });

  const tp = teamParam();

  let domainRes: Response;
  try {
    domainRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}${tp}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    return NextResponse.json({ error: "Could not reach Vercel — try again." }, { status: 502 });
  }

  if (!domainRes.ok) {
    if (domainRes.status === 404) {
      // Domain no longer exists on this Vercel project — clear stale state from DB
      await admin.from("tenant_config").upsert({
        tenant_id:              tenant.id,
        website_custom_domain:  null,
        website_domain_status:  null,
        website_domain_records: null,
      }, { onConflict: "tenant_id" });
      return NextResponse.json({ domain: null, status: null, records: [] });
    }
    return NextResponse.json({
      domain,
      status: tc?.website_domain_status ?? "pending",
      records: tc?.website_domain_records ?? [],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domainData = await domainRes.json() as any;
  const verified = domainData?.verified === true;
  const status   = verified ? "verified" : "pending";

  // Update status in tenant_config
  await admin.from("tenant_config").upsert({
    tenant_id:             tenant.id,
    website_domain_status: status,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({
    domain,
    status,
    records: tc?.website_domain_records ?? [],
  });
}

// ── DELETE /api/website/domain ────────────────────────────────────────────────
// Removes domain from Vercel project + clears tenant_config
export async function DELETE(req: NextRequest) {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_custom_domain")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const domain = (config as Record<string, unknown> | null)?.website_custom_domain as string | undefined;
  if (!domain) return NextResponse.json({ ok: true }); // nothing to remove

  const tp = teamParam();

  try {
    await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}${tp}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // Best-effort — clear local state regardless
  }

  await admin.from("tenant_config").upsert({
    tenant_id:              tenant.id,
    website_custom_domain:  null,
    website_domain_status:  null,
    website_domain_records: null,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ ok: true });
}
