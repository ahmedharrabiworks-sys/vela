import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3;                      // max submissions per IP per window per tenant
const MAX_FIELD_LEN  = 500;
const MAX_MSG_LEN    = 2000;

function sanitize(val: unknown, max: number): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, max);
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidPhone(p: string): boolean {
  return /^[\d\s+\-().]{7,30}$/.test(p);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  if (!tenantId || !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  // Resolve tenant: tenantId can be a UUID (primary) or a website slug (fallback)
  let resolvedTenantId = tenantId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
  if (!isUuid) {
    const { data: site } = await admin
      .from("websites")
      .select("tenant_id")
      .eq("slug", tenantId)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    resolvedTenantId = site.tenant_id as string;
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, business_name, owner_id")
    .eq("id", resolvedTenantId)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Rate limiting by hashed IP ────────────────────────────────────────────
  const forwarded = req.headers.get("x-forwarded-for");
  const rawIp = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
  const salt = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").slice(0, 8);
  const ipHash = createHash("sha256").update(rawIp + salt).digest("hex").slice(0, 16);

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Too many requests — please wait before submitting again." },
      { status: 429 }
    );
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = sanitize(body.firstName, MAX_FIELD_LEN);
  const lastName  = sanitize(body.lastName,  MAX_FIELD_LEN);
  const phone     = sanitize(body.phone,     MAX_FIELD_LEN);
  const email     = sanitize(body.email,     MAX_FIELD_LEN);
  const service   = sanitize(body.service,   MAX_FIELD_LEN);
  const datetime  = sanitize(body.datetime,  MAX_FIELD_LEN);
  const message   = sanitize(body.message,   MAX_MSG_LEN);

  if (!firstName && !lastName) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: "Please enter a phone number or email." }, { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
  }

  const name = [firstName, lastName].filter(Boolean).join(" ");

  // ── Save to leads table (same schema as other channels) ───────────────────
  const { error: insertErr } = await admin.from("leads").insert({
    tenant_id: tenant.id,
    name,
    phone:    phone    || null,
    email:    email    || null,
    channel:  "website",
    status:   "new",
    ip_hash:  ipHash,
    form_data: {
      service:            service  || null,
      preferred_datetime: datetime || null,
      message:            message  || null,
    },
  });

  if (insertErr) {
    console.error("[submit-form] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save — please try again." }, { status: 500 });
  }

  // ── Email notification via Resend (activates when RESEND_API_KEY is set) ──
  if (process.env.RESEND_API_KEY) {
    try {
      const ownerEmail = await getOwnerEmail(admin, tenant.owner_id as string);
      if (ownerEmail) {
        await sendFormNotification({
          ownerEmail,
          businessName: tenant.business_name as string,
          leadName: name,
          phone:    phone    || null,
          email:    email    || null,
          service:  service  || null,
          datetime: datetime || null,
          message:  message  || null,
        });
      }
    } catch (emailErr) {
      // Never fail the request — lead is already saved
      console.warn("[submit-form] Resend notification failed:", emailErr);
    }
  } else {
    console.warn("[submit-form] RESEND_API_KEY not set — skipping email notification");
  }

  return NextResponse.json({ ok: true });
}

async function getOwnerEmail(admin: AdminClient, ownerId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(ownerId);
    return (data?.user?.email as string | undefined) ?? null;
  } catch {
    return null;
  }
}

interface NotificationParams {
  ownerEmail:   string;
  businessName: string;
  leadName:     string;
  phone:    string | null;
  email:    string | null;
  service:  string | null;
  datetime: string | null;
  message:  string | null;
}

async function sendFormNotification(p: NotificationParams) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Vela <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to:      p.ownerEmail,
      subject: `New booking request — ${p.businessName}`,
      html: `
        <h2 style="margin:0 0 16px;font-family:sans-serif;">New booking request for <strong>${p.businessName}</strong></h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#6B7280;white-space:nowrap">Name</td><td style="padding:4px 0"><strong>${p.leadName}</strong></td></tr>
          ${p.phone    ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">Phone</td><td style="padding:4px 0">${p.phone}</td></tr>` : ""}
          ${p.email    ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">Email</td><td style="padding:4px 0">${p.email}</td></tr>` : ""}
          ${p.service  ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">Service</td><td style="padding:4px 0">${p.service}</td></tr>` : ""}
          ${p.datetime ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280">Preferred date/time</td><td style="padding:4px 0">${p.datetime}</td></tr>` : ""}
          ${p.message  ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;vertical-align:top">Message</td><td style="padding:4px 0">${p.message}</td></tr>` : ""}
        </table>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF;font-family:sans-serif;">
          Submitted via your Vela website. View in your
          <a href="https://vela-g8h4.vercel.app/app/leads" style="color:#FF6B35;">CRM dashboard</a>.
        </p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
