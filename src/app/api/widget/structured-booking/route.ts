import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";
import { createNotification } from "@/lib/notifications";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";
import { checkAvailability, DEFAULT_SLOT_MINUTES } from "@/lib/availability";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// Round M4 FIX 7 — structured intake box submission handler.
//
// Distinct from submit-form/route.ts (the plain HTML booking-form path,
// which always creates a "pending" appointment with no real availability
// check) and from ai/reply/route.ts (the conversational flow, which asks an
// explicit yes/no confirmation before booking). This route is the deliberate
// exception FIX 6 describes: the structured form's own submission IS the
// explicit confirmation, so when the selected service is a real trained one,
// this books directly (or explains unavailability) with no extra "should I
// confirm?" round trip. Reuses the exact same checkAvailability function the
// conversational flow already uses, so both paths agree on what "available"
// means.
//
// Security posture matches submit-form/route.ts exactly: hashed-IP rate
// limiting, field sanitization/length caps, phone format validation. Wildcard
// CORS matches every other widget-facing route (ai/reply, widget/history) --
// this route is called from a third-party embed context by design.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MAX_FIELD_LEN = 200;

function sanitize(val: unknown, max: number): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, max);
}

function isValidPhone(p: string): boolean {
  return /^[\d\s+\-().]{7,30}$/.test(p);
}

type KbService = { name?: string };
type ServiceRow = { name?: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    tenantId?: string;
    websiteId?: string;
    conversationId?: string | null;
    name?: string;
    phone?: string;
    service?: string;
    date?: string;   // YYYY-MM-DD
    time?: string;   // HH:mm
  };

  const tenantId = sanitize(body.tenantId, 100);
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, business_name")
    .eq("id", tenantId)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });

  // ── Rate limiting by hashed IP (same pattern as submit-form/route.ts) ────
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
    return NextResponse.json({ error: "Too many requests. Please wait before submitting again." }, { status: 429, headers: CORS });
  }

  // ── Validate fields ────────────────────────────────────────────────────
  const name    = sanitize(body.name, MAX_FIELD_LEN);
  const phone   = sanitize(body.phone, MAX_FIELD_LEN);
  const service = sanitize(body.service, MAX_FIELD_LEN);
  const date    = sanitize(body.date, 20);
  const time    = sanitize(body.time, 20);

  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400, headers: CORS });
  if (!phone || !isValidPhone(phone)) return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400, headers: CORS });
  if (!service) return NextResponse.json({ error: "Please choose or describe a service." }, { status: 400, headers: CORS });

  const websiteId = sanitize(body.websiteId, 100) || null;
  const phoneUnconfirmed = !hasConfirmedCountryCode(phone);

  // ── Load real trained services (same KB-first precedence as ai/reply) ───
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base, services_json")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  let kbServices: KbService[] = [];
  try {
    const kb = cfg?.knowledge_base ? JSON.parse(cfg.knowledge_base as string) as { services?: KbService[] } : null;
    kbServices = kb?.services ?? [];
  } catch { /* malformed KB -- falls through to legacy/no match below */ }
  const legacyServices: ServiceRow[] = (cfg?.services_json as ServiceRow[] | undefined) ?? [];
  const allServiceNames = [
    ...kbServices.map((s) => s.name).filter((n): n is string => !!n),
    ...legacyServices.map((s) => s.name).filter((n): n is string => !!n),
  ];
  const matchedServiceName = allServiceNames.find((n) => n.toLowerCase() === service.toLowerCase()) ?? null;

  // ── Find-or-create the lead (matched by phone, same tenant) ──────────────
  const { data: existingLead } = await admin
    .from("leads")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  async function upsertLead(status: string, intentSummary: string, formData: Record<string, unknown>): Promise<string | null> {
    if (existingLead?.id) {
      await admin.from("leads").update({
        name, phone, phone_unconfirmed: phoneUnconfirmed, status, intent_summary: intentSummary, form_data: formData,
      }).eq("id", existingLead.id);
      return existingLead.id as string;
    }
    const { data: inserted, error } = await admin.from("leads").insert({
      tenant_id: tenant.id, name, phone, phone_unconfirmed: phoneUnconfirmed,
      channel: "website", status, ip_hash: ipHash, intent_summary: intentSummary, form_data: formData,
    }).select("id").single();
    if (error) { console.error("[structured-booking] lead insert error:", error.message); return null; }
    return (inserted as { id: string } | null)?.id ?? null;
  }

  // ── Case A: NOT a real trained service -- never book, always a pending lead ──
  if (!matchedServiceName) {
    const leadId = await upsertLead(
      "new",
      `Requested a service not yet trained: "${service}"${date ? ` for ${date}${time ? ` ${time}` : ""}` : ""}`,
      { service, preferred_datetime: (date && time) ? `${date}T${time}:00Z` : null, message: null },
    );
    if (leadId) {
      await createNotification(admin, {
        tenantId: tenant.id as string,
        type: "lead",
        title: "New request — service not yet trained",
        body: `${name}: ${service}`,
        link: "/app/leads",
      });
    }
    return NextResponse.json({
      ok: true,
      booked: false,
      pending: true,
      message: "Thanks! Your request has been received. We'll reply to your phone number within 24 hours once we confirm availability for that.",
    }, { headers: CORS });
  }

  // ── Case B: a real trained service, but no date/time given -- can't check
  // availability or book; capture as a pending lead instead of failing. ──
  if (!date || !time) {
    const leadId = await upsertLead("new", `Interested in ${matchedServiceName}, no specific time given yet.`, { service: matchedServiceName, preferred_datetime: null, message: null });
    if (leadId) {
      await createNotification(admin, { tenantId: tenant.id as string, type: "lead", title: "New lead from Website", body: name, link: "/app/leads" });
    }
    return NextResponse.json({
      ok: true, booked: false, pending: true,
      message: "Thanks! Please let us know your preferred date and time and we'll confirm availability.",
    }, { headers: CORS });
  }

  // ── Case C: a real trained service + a real date/time -- this IS the
  // explicit confirmation (Fix 6). Check real availability and either book
  // directly or offer the real alternatives, no extra confirmation step. ──
  const requestedISO = `${date}T${time}:00Z`;
  const requested = new Date(requestedISO);
  if (isNaN(requested.getTime())) {
    return NextResponse.json({ error: "Please enter a valid date and time." }, { status: 400, headers: CORS });
  }

  const availability = await checkAvailability(admin, tenant.id, requestedISO, DEFAULT_SLOT_MINUTES, matchedServiceName, kbServices as { name?: string; duration?: string }[]);

  if (availability?.conflict) {
    const leadId = await upsertLead(
      "new",
      `Wanted ${matchedServiceName} on ${date} ${time}, but that slot is taken.`,
      { service: matchedServiceName, preferred_datetime: requestedISO, message: null },
    );
    if (leadId) {
      await createNotification(admin, { tenantId: tenant.id as string, type: "lead", title: "New lead from Website", body: `${name}: ${matchedServiceName} (requested slot unavailable)`, link: "/app/leads" });
    }
    const fmt = (d: Date) => d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    return NextResponse.json({
      ok: true,
      booked: false,
      message: availability.alternatives.length > 0
        ? `That time isn't available. Here are some options: ${availability.alternatives.map(fmt).join(", ")}. Reply in chat or resubmit with a different time.`
        : "That time isn't available and we don't have a nearby opening. We've saved your request and will follow up within 24 hours.",
      alternatives: availability.alternatives.map((d) => d.toISOString()),
    }, { headers: CORS });
  }

  // Available (or availability check itself couldn't run, e.g. an
  // unparseable edge case that checkAvailability already guards against by
  // returning null) -- book directly. This is the explicit-confirmation
  // exception from Fix 6: the structured submission itself is the
  // confirmation, so this is inserted as "confirmed", not "pending"
  // (matching the same precedent already used for the conversational flow's
  // own confirm-then-book path -- see ai/reply/route.ts).
  const leadId = await upsertLead(
    "booked",
    `Booked ${matchedServiceName} for ${date} ${time} via the quick booking form.`,
    { service: matchedServiceName, preferred_datetime: requestedISO, message: null },
  );
  if (!leadId) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: CORS });
  }

  const { error: apptErr } = await admin.from("appointments").insert({
    tenant_id: tenant.id,
    lead_id: leadId,
    service_name: matchedServiceName,
    datetime: requestedISO,
    status: "confirmed",
  });
  if (apptErr) {
    console.error("[structured-booking] appointment insert error:", apptErr.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: CORS });
  }

  await createNotification(admin, {
    tenantId: tenant.id as string,
    type: "appointment",
    title: "New appointment booked",
    body: matchedServiceName,
    link: "/app/appointments",
  });

  const whenLabel = requested.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return NextResponse.json({
    ok: true,
    booked: true,
    message: `Booked ✓ ${matchedServiceName} on ${whenLabel}. See you then, ${name.split(" ")[0]}!`,
  }, { headers: CORS });
}
