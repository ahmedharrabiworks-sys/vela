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
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

function isValidDomain(input: string): boolean {
  if (!input || input.includes(" ") || input.includes("..")) return false;
  const parts = input.split(".");
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return false;
  return parts.every((p) => LABEL_RE.test(p));
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

// CNAME target customers must point their domain to
const CNAME_TARGET = process.env.VERCEL_PROJECT_URL ?? "cname.vercel-dns.com";

// ── POST /api/website/domain ──────────────────────────────────────────────────
// Saves domain to DB and returns CNAME instruction (no Vercel API call)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { domain?: string };
  const rawDomain = (body.domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!isValidDomain(rawDomain)) {
    return NextResponse.json(
      { error: "Please enter a valid domain name (e.g. www.yourbusiness.com)." },
      { status: 400 },
    );
  }

  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  await admin.from("tenant_config").upsert({
    tenant_id:              tenant.id,
    website_custom_domain:  rawDomain,
    website_domain_status:  "pending",
    website_domain_records: null,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ domain: rawDomain, status: "pending", cname: CNAME_TARGET });
}

// ── GET /api/website/domain ───────────────────────────────────────────────────
// Checks DNS via Google's public DNS API and updates status in DB
export async function GET(req: NextRequest) {
  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: config } = await admin
    .from("tenant_config")
    .select("website_custom_domain, website_domain_status")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const tc = config as Record<string, unknown> | null;
  const domain = tc?.website_custom_domain as string | undefined;
  if (!domain) return NextResponse.json({ status: null, domain: null, cname: CNAME_TARGET });

  // DNS verification — CNAME check first (subdomains), then A record (apex)
  let verified = false;
  try {
    const cnameRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: "application/json" } },
    );
    if (cnameRes.ok) {
      const cnameData = await cnameRes.json() as { Answer?: { data?: string }[] };
      verified = (cnameData.Answer ?? []).some(
        (a) => typeof a.data === "string" && a.data.includes("vercel"),
      );
    }

    if (!verified) {
      const aRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { Accept: "application/json" } },
      );
      if (aRes.ok) {
        const aData = await aRes.json() as { Answer?: { data?: string }[] };
        // 76.76.21.21 is Vercel's Anycast IP for apex domains
        verified = (aData.Answer ?? []).some((a) => a.data === "76.76.21.21");
      }
    }
  } catch {
    // Network error — return current DB status unchanged
  }

  const status = verified ? "verified" : "pending";

  if (verified && tc?.website_domain_status !== "verified") {
    await admin.from("tenant_config").upsert({
      tenant_id:             tenant.id,
      website_domain_status: "verified",
    }, { onConflict: "tenant_id" });
  }

  return NextResponse.json({ domain, status, cname: CNAME_TARGET });
}

// ── DELETE /api/website/domain ────────────────────────────────────────────────
// Clears domain from DB (no Vercel API call)
export async function DELETE(req: NextRequest) {
  const { tenant, error: authErr } = await getAuthedTenant(req);
  if (authErr || !tenant) return authErr!;

  if (!checkRateLimit(tenant.id)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
  }

  const admin = createSupabaseAdmin() as AdminClient;
  await admin.from("tenant_config").upsert({
    tenant_id:              tenant.id,
    website_custom_domain:  null,
    website_domain_status:  null,
    website_domain_records: null,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ ok: true });
}
