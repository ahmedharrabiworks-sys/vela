import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createHash } from "crypto";
import { createNotification } from "@/lib/notifications";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";
import { checkAvailability, DEFAULT_SLOT_MINUTES } from "@/lib/availability";
import { recordPendingServiceRequest } from "@/lib/pending-services";

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

  // Round M6 FIX 6(c): this route never created a real conversation record --
  // structured-form bookings had no thread for the AI to follow up in, and
  // never showed up in Recent Messages/Conversations at all, unlike a normal
  // chat-based interaction. `conversationId` was already accepted in the
  // request body (the widget passes its current session's id when one
  // exists, e.g. the customer chatted first, then used the form) but was
  // never actually read anywhere in this file -- confirmed via a full-file
  // search, a genuinely dead field. Same tenant/website ownership validation
  // as ai/reply/route.ts: a conversationId that doesn't genuinely belong to
  // this tenant+site is treated as absent, never trusted blindly.
  const requestedConvId = sanitize(body.conversationId, 100) || null;
  let convId: string | null = null;
  if (requestedConvId) {
    const { data: existingConv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", requestedConvId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    convId = (existingConv as { id: string } | null)?.id ?? null;
  }
  if (!convId) {
    const convInsertRow: Record<string, unknown> = {
      tenant_id: tenant.id,
      lead_id: null,
      channel: "website",
      customer_name: name,
      ai_enabled: true,
      last_message_at: new Date().toISOString(),
    };
    if (websiteId) convInsertRow.website_id = websiteId;
    let { data: newConv, error: convErr } = await admin
      .from("conversations")
      .insert(convInsertRow)
      .select("id")
      .single();
    if (convErr?.code === "42703" || convErr?.code === "PGRST204") {
      delete convInsertRow.website_id;
      ({ data: newConv } = await admin.from("conversations").insert(convInsertRow).select("id").single());
    }
    convId = (newConv as { id: string } | null)?.id ?? null;
  }

  // Real message thread mirroring what a normal chat interaction would
  // produce -- the user message is exactly what the customer submitted via
  // the form, never fabricated. The matching assistant reply is written
  // per-branch below (right before each return), using the exact same
  // `message` text already sent back to the widget.
  if (convId) {
    const requestSummary = `I'd like to book ${service}${date && time ? ` on ${date} at ${time}` : ""}.`;
    await admin.from("messages").insert({ conversation_id: convId, tenant_id: tenant.id, role: "user", content: requestSummary, is_test: false });
    await admin.from("conversations").update({ customer_name: name, last_message_at: new Date().toISOString() }).eq("id", convId);
  }

  async function finalizeConversation(leadId: string | null, replyMessage: string): Promise<void> {
    if (!convId) return;
    if (leadId) await admin.from("conversations").update({ lead_id: leadId }).eq("id", convId).is("lead_id", null);
    await admin.from("messages").insert({ conversation_id: convId, tenant_id: tenant.id, role: "assistant", content: replyMessage, is_test: false });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
  }

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
      // Round M6 FIX 6(b): same pending-service queue the chat path now
      // writes to (ai/reply/route.ts) -- lets the owner dismiss or
      // confirm/add this exact request as a real trained service from
      // Train Your AI, regardless of which channel it came from.
      await recordPendingServiceRequest(admin, tenant.id as string, service, leadId);
      await createNotification(admin, {
        tenantId: tenant.id as string,
        type: "lead",
        title: "New request — service not yet trained",
        body: `${name}: ${service}`,
        link: "/app/ai-training",
      });
    }
    const caseAMessage = "Thanks! Your request has been received. We'll reply to your phone number within 24 hours once we confirm availability for that.";
    await finalizeConversation(leadId, caseAMessage);
    return NextResponse.json({
      ok: true,
      booked: false,
      pending: true,
      message: caseAMessage,
      conversationId: convId,
    }, { headers: CORS });
  }

  // ── Case B: a real trained service, but no date/time given -- can't check
  // availability or book; capture as a pending lead instead of failing. ──
  if (!date || !time) {
    const leadId = await upsertLead("new", `Interested in ${matchedServiceName}, no specific time given yet.`, { service: matchedServiceName, preferred_datetime: null, message: null });
    if (leadId) {
      await createNotification(admin, { tenantId: tenant.id as string, type: "lead", title: "New lead from Website", body: name, link: "/app/leads" });
    }
    const caseBMessage = "Thanks! Please let us know your preferred date and time and we'll confirm availability.";
    await finalizeConversation(leadId, caseBMessage);
    return NextResponse.json({
      ok: true, booked: false, pending: true,
      message: caseBMessage,
      conversationId: convId,
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
    const conflictMessage = availability.alternatives.length > 0
      ? `That time isn't available. Here are some options: ${availability.alternatives.map(fmt).join(", ")}. Reply in chat or resubmit with a different time.`
      : "That time isn't available and we don't have a nearby opening. We've saved your request and will follow up within 24 hours.";
    await finalizeConversation(leadId, conflictMessage);
    return NextResponse.json({
      ok: true,
      booked: false,
      message: conflictMessage,
      alternatives: availability.alternatives.map((d) => d.toISOString()),
      conversationId: convId,
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

  const apptInsertRow: Record<string, unknown> = {
    tenant_id: tenant.id,
    lead_id: leadId,
    service_name: matchedServiceName,
    datetime: requestedISO,
    status: "confirmed",
  };
  if (convId) apptInsertRow.conversation_id = convId;
  let { error: apptErr } = await admin.from("appointments").insert(apptInsertRow);
  if (apptErr?.code === "42703" || apptErr?.code === "PGRST204") {
    delete apptInsertRow.conversation_id;
    ({ error: apptErr } = await admin.from("appointments").insert(apptInsertRow));
  }
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
  const bookedMessage = `Booked ✓ ${matchedServiceName} on ${whenLabel}. See you then, ${name.split(" ")[0]}!`;
  await finalizeConversation(leadId, bookedMessage);
  return NextResponse.json({
    ok: true,
    booked: true,
    message: bookedMessage,
    conversationId: convId,
  }, { headers: CORS });
}
