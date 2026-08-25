import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";
import { createNotification } from "@/lib/notifications";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";

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
      { error: "Too many requests. Please wait before submitting again." },
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
  // FIX 6: renderAppointmentForm's real date input is named "preferredDate"
  // (an HTML <input type="date">) -- this route previously only read
  // "datetime", a field no form on the site actually sends, so a real
  // customer-provided date was silently discarded and no Appointment record
  // was ever created, even from the dedicated appointment-booking form.
  const datetime  = sanitize(body.preferredDate || body.datetime, MAX_FIELD_LEN);
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

  // Round M FIX 1: this path previously wrote `phone` raw with no
  // country-code check at all -- the AI conversation flow (ensureLeadFromContact
  // in ai/reply/route.ts) already validates via hasConfirmedCountryCode and
  // flags phone_unconfirmed when a number isn't self-describing (no real
  // country code), but the website's own booking/consultation form bypassed
  // that entirely, so a bare local number submitted here looked identical to
  // a real, confirmed one everywhere it's shown. Same real check now applied
  // here -- saved either way (never blocks a real submission), just flagged
  // for the owner to see/correct like every other channel already does.
  const phoneUnconfirmed = phone ? !hasConfirmedCountryCode(phone) : false;

  // Round M5 FIX 4: confirmed live -- this channel's own Message field
  // already shows the customer's literal text verbatim, so copying it into
  // intent_summary too made the lead detail view show the exact same
  // sentence twice under two different labels ("Conclusion" and "Message").
  // No real AI conversation happened here to synthesize -- this is a
  // single-shot form submission, not the multi-turn chat widget/Instagram/
  // WhatsApp exchanges ai/reply/route.ts actually summarizes with a real GPT
  // call. Left null; Message alone is sufficient for this channel.
  const intentSummary = null;

  // ── Save to leads table (same schema as other channels) ───────────────────
  let insertRow: Record<string, unknown> = {
    tenant_id: tenant.id,
    name,
    phone:    phone    || null,
    phone_unconfirmed: phoneUnconfirmed,
    email:    email    || null,
    channel:  "website",
    status:   datetime ? "booked" : "new",
    ip_hash:  ipHash,
    intent_summary: intentSummary,
    form_data: {
      service:            service  || null,
      preferred_datetime: datetime || null,
      message:            message  || null,
    },
  };
  let { data: insertedLead, error: insertErr } = await admin.from("leads").insert(insertRow).select("id").single();
  if (insertErr?.code === "PGRST204") {
    // Tiered fallback, not a single all-or-nothing retry: phone_unconfirmed
    // (migration_v33.sql) and intent_summary (migration_v34.sql) are
    // separate, independently-landed columns -- dropping BOTH together on
    // any single PGRST204 would silently lose real phone validation
    // whenever only intent_summary happened to be the missing one (this
    // fired live: real bare-local-number submission stored
    // phone_unconfirmed=false, the column's own DEFAULT, instead of the
    // correctly-computed true, because the fallback removed a column that
    // was actually already present).
    const { intent_summary: _is, ...withoutSummary } = insertRow;
    void _is;
    insertRow = withoutSummary;
    ({ data: insertedLead, error: insertErr } = await admin.from("leads").insert(insertRow).select("id").single());
    if (insertErr?.code === "PGRST204") {
      const { phone_unconfirmed: _pu, ...withoutPhoneFlag } = insertRow;
      void _pu;
      insertRow = withoutPhoneFlag;
      ({ data: insertedLead, error: insertErr } = await admin.from("leads").insert(insertRow).select("id").single());
    }
  }

  if (insertErr) {
    console.error("[submit-form] insert error:", insertErr.message);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  await createNotification(admin, {
    tenantId: tenant.id as string,
    type: "lead",
    title: "New lead from Website",
    body: name || null,
    link: "/app/leads",
  });

  // FIX 6: a booking form submission previously only ever created a Lead --
  // no Appointment record was ever created, even when a real customer date
  // was provided (renderAppointmentForm's "preferredDate" field was read
  // under the wrong name -- see the datetime parsing above). Only creates an
  // Appointment when the customer actually gave a parseable date; a plain
  // contact-form submission (no date field at all) correctly stays lead-only,
  // matching the same "only book when a real date exists" rule already used
  // by the AI chat/phone channels (see ai/reply/route.ts).
  const leadId = (insertedLead as { id?: string } | null)?.id;
  if (leadId && datetime) {
    const parsedDate = new Date(datetime);
    if (!isNaN(parsedDate.getTime())) {
      const { error: apptErr } = await admin.from("appointments").insert({
        tenant_id:    tenant.id,
        lead_id:      leadId,
        service_name: service || "",
        datetime:     parsedDate.toISOString(),
        status:       "pending",
      });
      if (apptErr) {
        console.error("[submit-form] appointment insert error:", apptErr.message);
      } else {
        await createNotification(admin, {
          tenantId: tenant.id as string,
          type: "appointment",
          title: "New appointment requested",
          body: service || null,
          link: "/app/appointments",
        });
      }
    }
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
