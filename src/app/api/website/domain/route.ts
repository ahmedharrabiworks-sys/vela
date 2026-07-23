import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── Rate limiting (in-memory, per tenant) ─────────────────────────────────────
const RATE_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT  = 10;
const RATE_WINDOW = 10 * 60 * 1000;

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

// ── Strict domain validation ───────────────────────────────────────────────────
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

function isValidDomain(input: string): boolean {
  if (!input || input.includes(" ") || input.includes("..")) return false;
  const parts = input.split(".");
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return false;
  return parts.every((p) => LABEL_RE.test(p));
}

// ── Auth + tenant helper ───────────────────────────────────────────────────────
async function getAuthedTenant(req: NextRequest): Promise<{ tenant: { id: string } | null; error?: NextResponse }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tenant: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return { tenant: null, error: NextResponse.json({ error: "No tenant found" }, { status: 404 }) };

  return { tenant };
}

// ── POST /api/website/domain ───────────────────────────────────────────────────
// Body: { domain, websiteId }
// Saves domain to websites.domain with domain_status = 'pending'.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { domain?: string; websiteId?: string };
  const rawDomain = (body.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const websiteId = body.websiteId;

  if (!isValidDomain(rawDomain)) {
    return NextResponse.json(
      { error: "Please enter a valid domain name (e.g. mysalon.com or www.mysalon.com)." },
      { status: 400 },
    );
  }
  if (!websiteId) {
    return NextResponse.json({ error: "websiteId required" }, { status: 400 });
  }

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;
  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  // Ownership check
  const { data: site } = await admin
    .from("websites").select("id").eq("id", websiteId).eq("tenant_id", tenant.id).maybeSingle();
  if (!site) return NextResponse.json({ error: "Website not found." }, { status: 404 });

  // Conflict check: another site (different websiteId) already has this domain
  const { data: conflict } = await admin
    .from("websites").select("id").eq("domain", rawDomain).neq("id", websiteId).maybeSingle();
  if (conflict) {
    return NextResponse.json(
      { error: "This domain is already connected to another site." },
      { status: 409 },
    );
  }

  await admin
    .from("websites")
    .update({ domain: rawDomain, domain_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", websiteId)
    .eq("tenant_id", tenant.id);

  return NextResponse.json({ domain: rawDomain, status: "pending" });
}

// ── GET /api/website/domain?websiteId=xxx ──────────────────────────────────────
// Verifies DNS (CNAME or A record) and then probes that the domain routes to this
// server. Sets domain_status to "verified" only when BOTH checks pass.
// Sets "failed" if DNS is absent; "pending" if DNS ok but server probe failed.
export async function GET(req: NextRequest) {
  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;
  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  const websiteId = new URL(req.url).searchParams.get("websiteId");

  // Load the site (tenant-scoped)
  const q = admin
    .from("websites")
    .select("id, domain, domain_status")
    .eq("tenant_id", tenant.id);
  const { data: site } = websiteId
    ? await q.eq("id", websiteId).maybeSingle()
    : await q.order("updated_at", { ascending: false }).limit(1).maybeSingle();

  const domain = (site as { domain?: string | null } | null)?.domain;
  if (!domain) return NextResponse.json({ status: null, domain: null });

  // ── Step 1: DNS check ────────────────────────────────────────────────────────
  let dnsOk = false;
  try {
    // CNAME check (www subdomains)
    const cnameRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: "application/json" } },
    );
    if (cnameRes.ok) {
      const d = await cnameRes.json() as { Answer?: { data?: string }[] };
      if ((d.Answer ?? []).some((a) => typeof a.data === "string" && a.data.includes("vercel"))) {
        dnsOk = true;
      }
    }

    // A record check (apex domains — 76.76.21.21 is Vercel's anycast IP)
    if (!dnsOk) {
      const aRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { Accept: "application/json" } },
      );
      if (aRes.ok) {
        const d = await aRes.json() as { Answer?: { data?: string }[] };
        if ((d.Answer ?? []).some((a) => a.data === "76.76.21.21")) {
          dnsOk = true;
        }
      }
    }
  } catch { /* DNS network error — dnsOk stays false */ }

  // ── Step 2: server probe (only if DNS resolves to Vercel) ────────────────────
  let probeOk = false;
  if (dnsOk) {
    try {
      const probeRes = await fetch(`https://${domain}/api/website/domain-probe`, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "Vela-DomainCheck/1.0" },
      });
      if (probeRes.ok) {
        const probeData = await probeRes.json() as { vela?: boolean };
        probeOk = probeData?.vela === true;
      }
    } catch { probeOk = false; }
  }

  // ── Determine status ─────────────────────────────────────────────────────────
  // "verified" only when BOTH DNS and the server probe pass.
  // "pending"  when DNS is set but the server probe failed (propagating or domain
  //            not yet added to the Vercel project in the dashboard).
  // "failed"   when DNS records are absent.
  let status: "verified" | "pending" | "failed";
  let message: string | undefined;

  if (dnsOk && probeOk) {
    status = "verified";
  } else if (dnsOk) {
    status = "pending";
    message =
      "DNS records found. If you just updated DNS, allow up to 48 hours. " +
      "If propagation is complete, make sure this domain is added to your Vercel project in the dashboard.";
  } else {
    status = "failed";
    message = "DNS records not found. Check your registrar settings and allow up to 48 hours for changes to propagate.";
  }

  // Persist only if status changed (avoid spurious writes)
  const currentStatus = (site as { domain_status?: string | null } | null)?.domain_status;
  if (status !== currentStatus) {
    await admin
      .from("websites")
      .update({ domain_status: status, updated_at: new Date().toISOString() })
      .eq("id", (site as { id: string }).id)
      .eq("tenant_id", tenant.id);
  }

  return NextResponse.json({ domain, status, ...(message ? { message } : {}) });
}

// ── DELETE /api/website/domain ─────────────────────────────────────────────────
// Body: { websiteId }
// Clears domain and domain_status from the website row.
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { websiteId?: string };
  const websiteId = body.websiteId;

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;
  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  if (!websiteId) return NextResponse.json({ error: "websiteId required" }, { status: 400 });

  const admin = createSupabaseAdmin() as AdminClient;

  await admin
    .from("websites")
    .update({ domain: null, domain_status: null, updated_at: new Date().toISOString() })
    .eq("id", websiteId)
    .eq("tenant_id", tenant.id);

  return NextResponse.json({ ok: true });
}
