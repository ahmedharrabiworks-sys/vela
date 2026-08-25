import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { createNotification, channelLabel } from "@/lib/notifications";
import { checkAvailability, formatAvailabilityDirective, formatBookedSlotsText, DEFAULT_SLOT_MINUTES } from "@/lib/availability";
import { stripAiTells, stripFillerClosers } from "@/lib/text-clean";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── Rate limiting — FIX 1 (round P) ─────────────────────────────────────────
// Diagnostic before this round's changes: yes, rate limiting was already
// live (Security Hardening Round 1, commit afc881f) -- a per-tenant 30
// req/min in-memory sliding window, confirmed present in this file. Three
// real gaps against this round's ask: (1) no per-conversation cap -- a
// single abusive visitor shares the SAME 30/min budget as every other real
// customer of that tenant, so one bad actor could exhaust it and block
// everyone else; (2) no daily backstop -- only a 1-minute window, so a slow-
// drip abuse pattern under 30/min sustained for hours was never caught;
// (3) hitting the limit returned a raw {error} JSON body with HTTP 429 --
// exactly the "raw error" this round says a customer must never see.
//
// Keyed by tenantId (not IP) because the cost risk is per-tenant: a bot with any
// valid tenantId can drain that tenant's AI budget. 30 req/min comfortably covers
// normal heavy chat usage while capping attack cost to ~$0.12/min per tenant.
// Limitation: resets on Vercel cold starts / across serverless instances — a durable
// store (Redis or a Supabase counter) would be needed for airtight enforcement.
const TENANT_RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const TENANT_RATE_LIMIT = 30;
const TENANT_WINDOW_MS  = 60_000;

function isTenantRateLimited(tenantId: string): boolean {
  const now   = Date.now();
  const entry = TENANT_RATE_MAP.get(tenantId);
  if (!entry || now - entry.windowStart >= TENANT_WINDOW_MS) {
    TENANT_RATE_MAP.set(tenantId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= TENANT_RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// New: per-conversation (or per-IP, before a conversation exists) hourly
// cap -- catches a single visitor/session flooding messages within a
// tenant's shared per-minute budget. FIX 1 (round R): raised 30 -> 60/hour
// -- a genuine customer exchange (even an unusually long one) should never
// come close to this; it exists purely as an abuse ceiling, not a real
// UX constraint.
const CONV_RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const CONV_RATE_LIMIT = 60;
const CONV_WINDOW_MS  = 60 * 60_000;

// Per-tenant daily backstop -- see the real-query check right after tenant
// load below for why this is a DB query, not another in-memory counter.
const TENANT_DAILY_LIMIT = 500;

function isKeyRateLimited(key: string, map: Map<string, { count: number; windowStart: number }>, limit: number, windowMs: number): boolean {
  const now   = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    map.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// A graceful, in-character reply shaped exactly like a real successful
// /api/ai/reply response -- the widget/webhook callers all just render
// `data.reply` as a normal chat bubble, so a rate-limited request must
// never surface as a raw {error} JSON body or a visible HTTP failure.
function gracefulLimitReply(convId: string | null, contactPhone?: string | null): NextResponse {
  // FIX 1 (round R): clear, explicit wording per the round's exact ask --
  // "reached the conversation limit," not a vague "getting a lot of
  // messages" that could read as normal small talk from the AI.
  const contact = contactPhone ? ` You can also contact us directly at ${contactPhone}.` : "";
  return NextResponse.json(
    {
      reply: `You've reached the conversation limit for now. Please try again later${contactPhone ? "" : " or contact us directly"}.${contact}`,
      conversationId: convId,
      booked: false,
      booking: null,
      needsHuman: false,
    },
    { headers: CORS }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    tenantId,
    websiteId,
    conversationId,
    message,
    channel = "website",
    customerName = "Customer",
    isTest = false,
  } = body as {
    tenantId?: string;
    websiteId?: string;
    conversationId?: string;
    message?: string;
    channel?: string;
    customerName?: string;
    isTest?: boolean;
  };

  if (!tenantId || !message) {
    return NextResponse.json(
      { error: "tenantId and message are required" },
      { status: 400, headers: CORS }
    );
  }

  // Input length cap — reject before any DB/AI work
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Message too long (max 2000 characters)" },
      { status: 400, headers: CORS }
    );
  }

  // Per-tenant burst rate limit — checked before any DB/OpenAI calls, cheap
  // Map lookup so a flood is rejected without ever touching the database.
  if (isTenantRateLimited(tenantId)) {
    console.warn(`[ai/reply] RATE LIMIT HIT (per-tenant burst, ${TENANT_RATE_LIMIT}/min): tenant=${tenantId}`);
    return gracefulLimitReply(conversationId ?? null);
  }

  // Per-conversation (or per-IP before a conversation exists yet) hourly
  // cap -- see the block comment above CONV_RATE_MAP for why this exists
  // alongside the tenant-wide burst limit above.
  const clientIp = getClientIp(req);
  const convRateKey = conversationId ? `conv:${conversationId}` : `ip:${tenantId}:${clientIp}`;
  if (isKeyRateLimited(convRateKey, CONV_RATE_MAP, CONV_RATE_LIMIT, CONV_WINDOW_MS)) {
    console.warn(`[ai/reply] RATE LIMIT HIT (per-conversation/IP, ${CONV_RATE_LIMIT}/hr): key=${convRateKey} tenant=${tenantId}`);
    return gracefulLimitReply(conversationId ?? null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  /* ── 1. Load tenant + config ── */
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id, business_name, industry, city, phone, website, plan")
    .eq("id", tenantId)
    .single();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: 404, headers: CORS }
    );
  }

  // Per-tenant DAILY backstop -- catches a sustained abuse pattern under the
  // 30/min burst cap (e.g. one message every 3 seconds for hours), which the
  // in-memory burst limiter alone can't see. A real query (rolling 24h,
  // assistant replies only, matching the same counting convention as
  // getUsageSummary's plan-cap check below) rather than another in-memory
  // counter -- a daily cap surviving only until the next cold start would
  // defeat its own purpose. 500/day is a generous multiple of even
  // Starter's full monthly text allowance (500/mo) -- far past anything a
  // real single-tenant customer volume would hit, a clear abuse signal only.
  if (!isTest) {
    const { count: dailyCount } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("role", "assistant")
      .eq("is_test", false)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
    if ((dailyCount ?? 0) >= TENANT_DAILY_LIMIT) {
      console.warn(`[ai/reply] RATE LIMIT HIT (per-tenant daily backstop, ${TENANT_DAILY_LIMIT}/24h): tenant=${tenantId} count=${dailyCount}`);
      return gracefulLimitReply(conversationId ?? null, (tenant as { phone?: string }).phone ?? null);
    }
  }

  // CRITICAL FIX: a tenant's own business_name is account-level, but a
  // tenant can own multiple websites (Premium/Custom plans) with different
  // names -- the assistant on EVERY one of a tenant's sites previously
  // identified itself using the TENANT's business_name regardless of which
  // specific site it was embedded on. Confirmed live: a tenant whose
  // account business_name is "Vela dental clinning" published a site named
  // "Azure Bay Hotel" -- the widget on that site answered as the dental
  // business. websiteId (scoped to this tenant -- never trust a websiteId
  // belonging to someone else) resolves the specific site's own name, which
  // takes priority for the assistant's self-identification below. The
  // underlying knowledge base (services/FAQs) remains tenant-level -- a
  // separate, larger limitation for a tenant whose multiple sites represent
  // genuinely different businesses, not fixed here.
  let siteName: string | null = null;
  if (websiteId && typeof websiteId === "string") {
    const { data: site } = await admin
      .from("websites")
      .select("name")
      .eq("id", websiteId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (site?.name) siteName = site.name as string;
  }

  // FIX 2 (round F): channel_ai_config may not exist yet (migration_v30.sql
  // pending) -- same tiered-fallback pattern used elsewhere in this codebase
  // for not-yet-migrated columns, so a missing column never breaks the
  // tenant_config read this whole route depends on.
  let { data: config, error: configErr } = await admin
    .from("tenant_config")
    .select("services_json, faq_json, tone, language, booking_rules, knowledge_base, channel_ai_config")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (configErr?.code === "PGRST204" || configErr?.code === "42703") {
    ({ data: config } = await admin
      .from("tenant_config")
      .select("services_json, faq_json, tone, language, booking_rules, knowledge_base")
      .eq("tenant_id", tenantId)
      .maybeSingle());
  }

  /* ── 2. Plan-level message cap (Starter only — Pro/Premium/Custom = Infinity) ── */
  const planId = ((tenant.plan as string | undefined) ?? "starter").toLowerCase() as PlanId;
  const msgLimit = PLAN_CONFIG[planId]?.textMessages ?? PLAN_CONFIG.starter.textMessages;

  if (msgLimit !== Infinity && !isTest) {
    const usage = await getUsageSummary(admin, tenantId);
    if (usage.messagesUsed >= msgLimit) {
      // FIX 1 (round P): this reaches the customer-facing widget the same
      // as every other cap on this route -- was a raw {error} JSON body
      // (visible as a broken bubble to the actual customer, not the owner),
      // now the same graceful in-character reply. Still logged server-side
      // for visibility.
      console.warn(`[ai/reply] RATE LIMIT HIT (plan message cap, ${msgLimit}/mo): tenant=${tenantId} used=${usage.messagesUsed}`);
      return gracefulLimitReply(conversationId ?? null, (tenant as { phone?: string }).phone ?? null);
    }
  }

  /* ── 3. Get or create conversation + lead ── */
  let convId = conversationId ?? null;
  let leadId: string | null = null;

  // Hardening found during this investigation: this lookup previously had
  // no tenant_id filter -- a client-supplied conversationId belonging to a
  // DIFFERENT tenant would silently succeed, attaching this reply to (and
  // later pulling message history from) someone else's conversation. Not
  // the mechanism behind the "wrong business identity" bug fixed above
  // (that was a business_name/website mismatch), but a real, independent
  // cross-tenant data-isolation gap. A conversationId that doesn't belong
  // to this tenant is now treated as not found -- the visitor transparently
  // gets a fresh conversation instead of an error.
  //
  // FIX 3 (round P): same gap one level down -- a conversationId that DOES
  // belong to this tenant but to a DIFFERENT one of the tenant's sites was
  // still accepted, because nothing here checked which site it came from.
  // A tenant with 2+ simultaneously published sites (real since Round O)
  // could have one site's widget silently continue another site's
  // conversation. When the caller sends a websiteId (a site-embedded
  // widget), it must now also match; a mismatch is treated the same as the
  // tenant mismatch above -- transparently start fresh, never an error.
  const hasWebsiteId = typeof websiteId === "string" && websiteId.length > 0;
  let websiteIdColumnMissing = false;
  if (convId) {
    let conv: { id: string; lead_id: string | null } | null = null;
    if (hasWebsiteId) {
      const { data, error } = await admin
        .from("conversations")
        .select("id, lead_id")
        .eq("id", convId)
        .eq("tenant_id", tenantId)
        .eq("website_id", websiteId)
        .maybeSingle();
      if (error?.code === "42703" || error?.code === "PGRST204") {
        websiteIdColumnMissing = true;
        ({ data: conv } = await admin
          .from("conversations")
          .select("id, lead_id")
          .eq("id", convId)
          .eq("tenant_id", tenantId)
          .maybeSingle());
      } else {
        conv = data as { id: string; lead_id: string | null } | null;
      }
    } else {
      ({ data: conv } = await admin
        .from("conversations")
        .select("id, lead_id")
        .eq("id", convId)
        .eq("tenant_id", tenantId)
        .maybeSingle());
    }
    if (conv) {
      leadId = conv.lead_id ?? null;
    } else {
      convId = null;
    }
  }

  if (!convId) {
    // CRITICAL FIX: a Lead was previously created for EVERY new conversation
    // unconditionally, the moment the first message arrived -- regardless of
    // whether the visitor ever gave real contact info. Confirmed live via
    // direct query: 3 of 4 "leads" for a real test tenant had name="Website
    // Visitor" (the widget's hardcoded default) with phone AND email both
    // null -- not a real lead by how the term is used everywhere else in the
    // product (e.g. the website booking form at api/site/[tenantId]/
    // submit-form/route.ts requires phone or email before it will create
    // one). conversations.lead_id has been nullable since migration_v2.sql
    // (confirmed live), so a conversation can exist without a lead. No lead
    // is created here anymore -- see ensureLeadFromContact below, called
    // once real phone/email is actually detected in the conversation.
    const insertRow: Record<string, unknown> = {
      tenant_id: tenantId,
      lead_id: null,
      channel,
      customer_name: customerName,
      ai_enabled: true,
      last_message_at: new Date().toISOString(),
    };
    if (hasWebsiteId && !websiteIdColumnMissing) insertRow.website_id = websiteId;
    let { data: conv, error: insertErr } = await admin
      .from("conversations")
      .insert(insertRow)
      .select("id")
      .single();
    if (insertErr?.code === "42703" || insertErr?.code === "PGRST204") {
      delete insertRow.website_id;
      ({ data: conv } = await admin
        .from("conversations")
        .insert(insertRow)
        .select("id")
        .single());
    }
    convId = (conv as { id: string } | null)?.id ?? null;
  }

  if (!convId) {
    return NextResponse.json(
      { error: "Could not create conversation" },
      { status: 500, headers: CORS }
    );
  }

  /* ── 4. Load last 20 messages for context (exclude test messages) ── */
  // convId is guaranteed tenant-scoped by this point (validated or freshly
  // created above); tenant_id is included here too as defense-in-depth,
  // consistent with the hardening above -- never rely on a single filter
  // for tenant isolation when a second one is cheap and available.
  //
  // CRITICAL FIX: this previously ordered ascending + limit(10), which in
  // Postgres/PostgREST means "the OLDEST 10 rows", not "the most recent 10"
  // despite the comment's stated intent. For any conversation past its 10th
  // message, the model was fed a permanently frozen window of the earliest
  // turns and never saw anything the customer said afterward -- confirmed
  // live via a reproduced transcript: a customer's name/phone/service given
  // in later turns fell outside this frozen window, so the AI re-asked for
  // it, and on a later identical prompt it regenerated the exact same reply
  // verbatim because it could not see that it had already sent it. Fixed by
  // querying the most recent rows (descending) then reversing back to
  // chronological order before building the OpenAI messages array below.
  const { data: recentHistoryDesc } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .eq("tenant_id", tenantId)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = ((recentHistoryDesc as Array<{ role: string; content: string }> | null) ?? []).slice().reverse();

  /* ── 5. Save customer message ── */
  // CRITICAL FIX: this insert's result was never captured or checked --
  // confirmed live and via direct diagnostic query: migration_v21.sql (adds
  // messages.is_test) was never run in production, so EVERY insert here has
  // been failing with PGRST204 "Could not find the 'is_test' column" since
  // is_test was added to this payload -- completely silently, since the
  // error was never read. Real conversations had correct metadata
  // (last_message_at, lead, AI reply) but zero message rows ever saved,
  // system-wide, for every website-widget conversation. Logged loudly now
  // (matching conversations/[id]/reply/route.ts's existing pattern) but
  // deliberately non-fatal -- the customer must still get their AI reply
  // even if saving to history fails for some other reason in the future.
  const { error: userMsgErr } = await admin.from("messages").insert({
    conversation_id: convId,
    tenant_id: tenantId,
    role: "user",
    content: message,
    is_test: isTest === true,
  });
  if (userMsgErr) {
    console.error("[ai/reply] FAILED to save customer message:", userMsgErr.code, userMsgErr.message);
  }

  /* ── 6. Load already-booked slots for double-booking prevention ── */
  const { data: bookedSlots } = await admin
    .from("appointments")
    .select("datetime, service_name")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("datetime", new Date().toISOString())
    .order("datetime", { ascending: true })
    .limit(20);

  /* ── 6b. Pending appointment awaiting this customer's confirmation ──────── */
  // Real reschedule flow (Appointments page "Reschedule"): the owner
  // proposes a new time, the appointment is set to status="pending" with
  // the new datetime, and a real message is sent asking the customer to
  // confirm. This is also true for any fresh booking still awaiting
  // confirmation. If one exists for THIS conversation, the very next
  // customer reply needs to be interpreted as answering that specific
  // question -- not treated as a generic message.
  const { data: pendingAppt } = await admin
    .from("appointments")
    .select("id, datetime, service_name, lead_id")
    .eq("tenant_id", tenantId)
    .eq("conversation_id", convId)
    .eq("status", "pending")
    .gte("datetime", new Date().toISOString())
    .order("datetime", { ascending: true })
    .limit(1)
    .maybeSingle();

  /* ── 6c. Existing active booking on this conversation/phone -- FIX 2 (round P) ──
     Before the AI is even allowed to consider booking something new, it needs
     to know a real upcoming appointment already exists for this exact
     conversation (same widget session) or this same phone number, so it can
     tell the customer that directly instead of silently creating a second
     one. This is a SEPARATE, wider check than 6b above (which only catches a
     business-initiated reschedule awaiting confirmation) -- this one catches
     the customer trying to book AGAIN, unprompted, while already booked.
     leadId is already resolved by this point (section 3 above). */
  let existingActiveAppt: { id: string; datetime: string; service_name: string | null; leadName: string | null } | null = null;
  {
    const { data: byConv } = await admin
      .from("appointments")
      .select("id, datetime, service_name, lead_id")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", convId)
      .neq("status", "cancelled")
      .gte("datetime", new Date().toISOString())
      .order("datetime", { ascending: true })
      .limit(1)
      .maybeSingle();
    let row = byConv as { id: string; datetime: string; service_name: string | null; lead_id: string | null } | null;
    if (!row && leadId) {
      // Same real customer, but this specific conversation row has no
      // booking of its own yet -- check by phone in case an earlier, separate
      // conversation (e.g. a prior widget session before localStorage
      // persistence, or a different channel) already booked something.
      const { data: leadRow } = await admin.from("leads").select("phone").eq("id", leadId).maybeSingle();
      const phone = (leadRow as { phone: string | null } | null)?.phone;
      if (phone) {
        const { data: samePhoneLeads } = await admin.from("leads").select("id").eq("tenant_id", tenantId).eq("phone", phone);
        const leadIds = ((samePhoneLeads ?? []) as { id: string }[]).map((l) => l.id);
        if (leadIds.length > 0) {
          const { data: byPhone } = await admin
            .from("appointments")
            .select("id, datetime, service_name, lead_id")
            .eq("tenant_id", tenantId)
            .in("lead_id", leadIds)
            .neq("status", "cancelled")
            .gte("datetime", new Date().toISOString())
            .order("datetime", { ascending: true })
            .limit(1)
            .maybeSingle();
          row = byPhone as { id: string; datetime: string; service_name: string | null; lead_id: string | null } | null;
        }
      }
    }
    if (row) {
      let leadName: string | null = null;
      if (row.lead_id) {
        const { data: ld } = await admin.from("leads").select("name").eq("id", row.lead_id).maybeSingle();
        leadName = (ld as { name: string | null } | null)?.name ?? null;
      }
      existingActiveAppt = { id: row.id, datetime: row.datetime, service_name: row.service_name, leadName };
    }
  }

  /* ── 6d. Most recently cancelled appointment -- FIX 6 (round M) ──────────
     Real gap found in live testing: the AI could correctly CANCEL an
     appointment (see the [CANCEL_APPOINTMENT:id] token below), but when the
     customer then asked to undo/reactivate that same cancellation, the AI
     had no way to look it up (existingActiveAppt above only ever finds
     NON-cancelled rows) -- it fell back to treating "undo the cancel" as a
     brand new booking request and created a genuine duplicate row instead
     of reactivating the original. Only looked up when there's currently no
     active appointment (if one already exists, "undo my cancellation"
     would conflict with the one-active-appointment rule and isn't a real
     case worth adding a lookup for). Same conversation-then-phone fallback
     pattern as existingActiveAppt above, scoped the same way so this can
     only ever surface THIS customer's own cancelled appointment. */
  let mostRecentCancelledAppt: { id: string; datetime: string; service_name: string | null } | null = null;
  if (!existingActiveAppt) {
    const { data: byConv } = await admin
      .from("appointments")
      .select("id, datetime, service_name, lead_id")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", convId)
      .eq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let row = byConv as { id: string; datetime: string; service_name: string | null; lead_id: string | null } | null;
    if (!row && leadId) {
      const { data: leadRow } = await admin.from("leads").select("phone").eq("id", leadId).maybeSingle();
      const phone = (leadRow as { phone: string | null } | null)?.phone;
      if (phone) {
        const { data: samePhoneLeads } = await admin.from("leads").select("id").eq("tenant_id", tenantId).eq("phone", phone);
        const leadIds = ((samePhoneLeads ?? []) as { id: string }[]).map((l) => l.id);
        if (leadIds.length > 0) {
          const { data: byPhone } = await admin
            .from("appointments")
            .select("id, datetime, service_name, lead_id")
            .eq("tenant_id", tenantId)
            .in("lead_id", leadIds)
            .eq("status", "cancelled")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          row = byPhone as { id: string; datetime: string; service_name: string | null; lead_id: string | null } | null;
        }
      }
    }
    if (row) mostRecentCancelledAppt = { id: row.id, datetime: row.datetime, service_name: row.service_name };
  }

  // FIX 2 (round Q): the previous wording had an escape hatch ("only
  // proceed if they clearly explain this is a different person or a real
  // additional visit") -- confirmed live that this let a simple customer
  // insistence ("another one please") read as satisfying it, so the AI
  // opened a brand new booking flow anyway. One active appointment per
  // conversation/phone is now a HARD limit with no exception the model can
  // reason its way around: reschedule or cancel are the only two paths
  // ever offered while one exists, full stop.
  //
  // FIX 1 (round S3): "...or rescheduled away" was logically wrong --
  // rescheduling only moves this SAME appointment to a different time, it
  // never frees up room for an ADDITIONAL one, so it can never be a real
  // path to a second booking. This false claim was exactly what surfaced
  // when a customer asked an informational question like "when can I book
  // another appointment" (routes through the creative reply below, which
  // reads this directive) -- the model correctly relayed what it was told,
  // which was itself wrong. Only cancelling the existing appointment, or
  // its date/time already having passed, actually makes a second one
  // possible. Reschedule is still offered, but only as its own separate
  // action on THIS appointment, never framed as unlocking a new one.
  // FIX 7(a) (round L): the AI could correctly EXPLAIN that cancelling
  // would free up a new booking, and would even say "I will proceed with
  // canceling... please confirm" -- but nothing ever actually executed the
  // cancellation; the appointment only really flipped to cancelled once the
  // OWNER did it manually from the dashboard. Adds a real, deterministic
  // execution path using the exact same confirm-then-token pattern already
  // proven for CONFIRM_APPOINTMENT (see pendingApptDirective/confirmMatch
  // below): the model must ask an explicit yes/no confirmation naming the
  // real appointment before acting, and only after the customer clearly
  // confirms does it include [CANCEL_APPOINTMENT:id] -- matched server-side
  // against this exact existingActiveAppt.id (never trusted blindly, same
  // safeguard as the reschedule-confirm token), so this can only ever
  // cancel THIS conversation/phone's own active appointment.
  const existingActiveApptWhen = existingActiveAppt
    ? new Date(existingActiveAppt.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
    : "";
  // Round M4 FIX 5: this directive is injected on EVERY turn for the rest of
  // the conversation once a booking exists -- confirmed live, the AI kept
  // restating the full date/time (4+ times across a conversation) even in
  // replies about unrelated topics, because it's such a prominent, always-
  // present piece of context. Only the CONFIRMATION rule in the main Rules
  // section (below) previously said "say it once"; nothing told the model
  // to stop mentioning it afterward. Added an explicit "reference briefly,
  // don't restate" instruction right at the top of this always-injected
  // block, since that's the one piece of context present on every single
  // turn regardless of what the customer is actually asking about.
  const existingApptDirective = existingActiveAppt
    ? `\n\nEXISTING ACTIVE BOOKING (real, currently on file for this customer): ${existingActiveAppt.service_name || "an appointment"} at ${existingActiveApptWhen}${existingActiveAppt.leadName ? ` under the name ${existingActiveAppt.leadName}` : ""}. Do NOT restate this exact date and time in every reply -- you already confirmed it once; from now on refer to it briefly ("your appointment", "your booking") unless the customer is specifically asking about, changing, or cancelling it, in which case state it plainly that one time. HARD LIMIT, NO EXCEPTIONS: this customer may only ever have ONE active appointment at a time. If they ask to book a new, additional, or second appointment for ANY reason -- including if they insist, say "just book another one", or claim it's for someone else -- do NOT collect a new date/time and do NOT open a booking flow. Firmly tell them only one active appointment is allowed at a time. A second appointment only becomes possible once this existing one is CANCELLED, or once its date/time has already passed -- rescheduling does NOT free up room for a second appointment, it only moves this SAME appointment to a different time, so NEVER state or imply that rescheduling enables a new booking. You may still separately offer to reschedule this existing appointment to a different time (as its own action, on its own), and separately offer to cancel it -- but when explaining what actually makes a NEW appointment possible, name only cancellation or the appointment already being in the past, never reschedule. Do not budge from this even if they push back or ask again. CANCELLATION: if the customer asks to cancel this existing appointment, first ask one explicit yes/no confirmation question naming it (e.g. "Should I go ahead and cancel your ${existingActiveAppt.service_name || "appointment"} on ${existingActiveApptWhen}?") and stop there. Only after they clearly confirm (e.g. "yes", "please do", "confirm", "go ahead") in their NEXT message, tell them it's been cancelled and include the exact token [CANCEL_APPOINTMENT:${existingActiveAppt.id}] somewhere in that reply -- this actually cancels it in the system, so only use it once they've genuinely confirmed, never earlier and never speculatively.`
    : "";

  // FIX 6 (round M): real "undo the cancellation" execution, mirroring the
  // exact confirm-then-token pattern above -- see mostRecentCancelledAppt
  // (section 6d). Only ever injected when there's genuinely no active
  // appointment (existingActiveAppt is null) AND a real cancelled row
  // exists to reactivate; the token is matched server-side against this
  // exact id, so it can only ever reactivate THIS SAME row, never create a
  // new one and never touch another customer's appointment.
  const reactivateApptDirective = mostRecentCancelledAppt
    ? `\n\nRECENTLY CANCELLED APPOINTMENT (real, on file for this customer): ${mostRecentCancelledAppt.service_name || "an appointment"} that was cancelled, originally for ${new Date(mostRecentCancelledAppt.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}. MANDATORY, OVERRIDES YOUR DEFAULT ASSUMPTION: undoing this specific cancellation IS possible in this system, right now -- do NOT tell the customer a cancellation can never be undone or is permanent; that is factually wrong here. If the customer asks to undo the cancellation, un-cancel it, restore it, bring it back, or reverse it, first ask one explicit yes/no confirmation question naming it (e.g. "Should I un-cancel your ${mostRecentCancelledAppt.service_name || "appointment"} for ${new Date(mostRecentCancelledAppt.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}?") and stop there. Only after they clearly confirm in their NEXT message (e.g. "yes", "please do", "confirm"), tell them it's been restored and include the exact token [REACTIVATE_APPOINTMENT:${mostRecentCancelledAppt.id}] somewhere in that reply. This REACTIVATES the exact same appointment record -- never treat "undo the cancel" as a request for a brand new booking, never collect a new date/time for it, and never open the normal booking flow for this.`
    : "";

  /* ── 7. Build system prompt ── */
  type ServiceRow   = { name: string; price?: string; description?: string };
  type FaqRow       = { question: string; answer: string };
  type KbService    = { name: string; price?: string; duration?: string; description?: string };
  type KbFaq        = { q: string; a: string };
  type KbBusiness   = { hours?: string; address?: string; bookingPolicy?: string; tone?: string };
  type KnowledgeBase = { services?: KbService[]; faqs?: KbFaq[]; business?: KbBusiness; extra?: string };
  type TenantRow    = { business_name: string; industry?: string; city?: string; phone?: string; website?: string };
  type ConfigRow    = { services_json?: ServiceRow[]; faq_json?: FaqRow[]; tone?: string; language?: string; booking_rules?: Record<string, unknown>; knowledge_base?: string; channel_ai_config?: Record<string, { tone?: string; language?: string }> };
  type BookingRow   = { datetime: string; service_name?: string };

  const t = tenant as TenantRow;
  const cfg = (config ?? {}) as ConfigRow;

  // Parse the AI training knowledge base (new) — falls back to legacy services_json
  let kb: KnowledgeBase = {};
  if (cfg.knowledge_base) {
    try { kb = JSON.parse(cfg.knowledge_base as string) as KnowledgeBase; } catch { /* ignore */ }
  }

  const kbServices: KbService[] = kb.services ?? [];
  const kbFaqs: KbFaq[]         = kb.faqs ?? [];
  const kbBusiness: KbBusiness  = kb.business ?? {};
  const kbExtra: string         = kb.extra ?? "";

  const legacyServices: ServiceRow[] = cfg.services_json ?? [];
  const legacyFaqs: FaqRow[]         = cfg.faq_json ?? [];
  // FIX 2 (round F): a per-channel override (set from Channels -> Manage,
  // Instagram/WhatsApp only) takes priority over the tenant's global
  // tone/language, which in turn still beats the KB's own tone default.
  // Website channel has no override surface, so it always uses the global.
  const channelOverride = cfg.channel_ai_config?.[channel];
  const tone     = channelOverride?.tone ?? kbBusiness.tone ?? cfg.tone ?? "professional";
  const language = channelOverride?.language ?? cfg.language ?? "Auto-detect";
  const bookingRules = cfg.booking_rules as { workingHours?: { start: string; end: string; days: string[] } } | undefined;

  // Services: prefer KB, fall back to legacy
  const servicesText =
    kbServices.length > 0
      ? kbServices
          .map((s) => `• ${s.name}${s.price ? ` — ${s.price}` : ""}${s.duration ? ` (${s.duration})` : ""}${s.description ? `: ${s.description}` : ""}`)
          .join("\n")
      : legacyServices.length > 0
      ? legacyServices
          .map((s) => `• ${s.name}${s.price ? ` — ${s.price}` : ""}${s.description ? `: ${s.description}` : ""}`)
          .join("\n")
      : "(No services configured yet — use general knowledge about the industry)";

  // FAQs: prefer KB (q/a format), fall back to legacy (question/answer format)
  const faqsText =
    kbFaqs.length > 0
      ? "\nFAQs:\n" + kbFaqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")
      : legacyFaqs.length > 0
      ? "\nFAQs:\n" + legacyFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n")
      : "";

  const now = new Date();
  const todayFull = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const workingHoursText = kbBusiness.hours
    ? `Working hours: ${kbBusiness.hours}`
    : bookingRules?.workingHours
    ? `Working hours: ${bookingRules.workingHours.days.join(", ")} ${bookingRules.workingHours.start}–${bookingRules.workingHours.end}`
    : "Working hours: not specified — use reasonable business hours";

  const addressText = kbBusiness.address ? `Address: ${kbBusiness.address}` : "";
  const bookingPolicyText = kbBusiness.bookingPolicy ? `\nBooking policy: ${kbBusiness.bookingPolicy}` : "";
  const extraText = kbExtra.trim() ? `\n\nAdditional business knowledge:\n${kbExtra}` : "";

  const bookedSlotsText = formatBookedSlotsText(bookedSlots as BookingRow[] | null);

  // Real pending-confirmation directive -- see section 6b above. Only ever
  // set when a genuine pending appointment row exists for this exact
  // conversation; never fabricated.
  type PendingApptRow = { id: string; datetime: string; service_name?: string | null; lead_id?: string | null };
  const pending = pendingAppt as PendingApptRow | null;
  const pendingApptDirective = pending
    ? `\n\nPENDING CONFIRMATION (this OVERRIDES anything discussed earlier in this conversation): This customer's appointment (${pending.service_name || "appointment"}) was just RESCHEDULED by the business to a NEW time: ${new Date(pending.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}. Any earlier date/time mentioned previously in this conversation is now OUT OF DATE -- ignore it. THIS new time above is what the customer's next message is actually responding to, and it needs THEIR confirmation. If their message clearly confirms/accepts it (e.g. "yes", "that works", "sounds good", "confirmed"), respond confirming THIS new time specifically and include the exact token [CONFIRM_APPOINTMENT:${pending.id}] somewhere in your reply. If they decline or ask for a different time instead, acknowledge that and include the exact token [NEEDS_HUMAN] so the team follows up -- do NOT confirm a different time yourself, and do NOT use [CONFIRM_APPOINTMENT:${pending.id}] unless they clearly accepted the exact new time above.`
    : "";

  const languageInstruction =
    language === "Auto-detect"
      ? "Detect the customer's language from their message and ALWAYS reply in the same language (Arabic if they write Arabic, French if French, English otherwise)."
      : `Always reply in ${language}.`;

  // CRITICAL FIX: use this specific website's own name when known (see the
  // siteName lookup above); tenant.business_name is only a fallback for
  // when no websiteId was provided (an externally-pasted embed, or a widget
  // URL predating this fix).
  const displayName = siteName || t.business_name;

  const apiKey = process.env.OPENAI_API_KEY;

  /* ── 7b. Real-time availability pre-check ──────────────────────────────── */
  // FIX: the AI would say "let me check the availability... and get back to
  // you shortly" and then never actually check anything or follow up -- a
  // permanent stall for something the system can check instantly. This runs
  // BEFORE the main reply so a real, DB-backed answer is injected into the
  // SAME turn, not deferred. Cheap gpt-4o-mini call (same cost class as the
  // existing post-hoc booking detection in section 12 below) extracts a
  // concrete candidate date/time IF the customer just stated or confirmed
  // one; a targeted appointments query (checkAvailability) then decides
  // conflict/no-conflict against the real schedule and computes real
  // alternative slots when it's taken. Channel-agnostic: Website, WhatsApp,
  // and Instagram all reach this same code path (see the webhook routes,
  // which POST here rather than duplicating booking logic per channel).
  let availabilityDirective = "";
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const recentContext = (history as Array<{ role: string; content: string }> ?? [])
        .slice(-4)
        .map((m) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`)
        .join("\n");
      const extract = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Current datetime (ISO 8601): ${new Date().toISOString()}. Look at the customer's latest message, with recent conversation context, and determine if they are stating or confirming ONE concrete, fully-resolved date AND time they want to book (this includes confirming a time the AI itself just offered, e.g. "yes that works"). Resolve relative dates ("tomorrow", "next Tuesday", "the 15th at 3pm") using the current datetime above. IMPORTANT: this system has no real timezone conversion anywhere -- the current datetime given above already uses the exact same clock convention this business's appointments are stored and displayed in. Never apply any timezone shift, offset, or "helpful" conversion based on the business's city or country -- write the literal clock hour the customer said, unmodified, with a Z suffix (e.g. customer says "3pm" -> "...T15:00:00Z", never adjusted). Also identify which service (if any) is being discussed, matching one of these real services if possible: ${kbServices.map((s) => s.name).join(", ") || "(none configured)"}. Reply ONLY valid JSON: {"candidateDateTime": "ISO 8601 or null", "candidateService": "exact matching service name or null"}. Return null values if no concrete date+time is being stated or confirmed right now.`,
          },
          { role: "user", content: `${recentContext ? recentContext + "\n" : ""}Customer: "${message}"` },
        ],
        max_tokens: 80,
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(extract.choices[0]?.message?.content ?? "{}") as { candidateDateTime?: string | null; candidateService?: string | null };
      if (parsed.candidateDateTime) {
        // FIX 4 (round N): pass the real service (if identified) and the
        // tenant's real services list (with each service's own free-text
        // duration) so the conflict check uses a real per-service window
        // instead of a fixed buffer -- see lib/availability.ts for the full
        // root-cause explanation.
        const result = await checkAvailability(admin, tenantId, parsed.candidateDateTime, DEFAULT_SLOT_MINUTES, parsed.candidateService, kbServices);
        if (result) availabilityDirective = formatAvailabilityDirective(result);
      }
    } catch (err) {
      // Best-effort -- a failed pre-check just means no directive is injected;
      // the model falls back to its general instructions rather than the
      // reply being blocked.
      console.error("[ai/reply] availability pre-check failed:", err);
    }
  }

  const systemPrompt = `You are the AI assistant for ${displayName}, a ${t.industry || "business"} in ${t.city || "the UAE"}.

Your job: help customers, answer questions about services and prices, and book appointments.

Business details:
• Name: ${displayName}
• Industry: ${t.industry || "not specified"}
• Location: ${t.city || "UAE"}${addressText ? `\n• ${addressText}` : ""}${t.phone ? `\n• Phone: ${t.phone}` : ""}${t.website ? `\n• Website: ${t.website}` : ""}
• ${workingHoursText}${bookingPolicyText}

Current date & time: ${todayFull}, ${currentTime}

Services:
${servicesText}
${faqsText}
${bookedSlotsText}${extraText}${availabilityDirective}${pendingApptDirective}${existingApptDirective}${reactivateApptDirective}

Rules:
• Tone: ${tone} and warm — be like a helpful employee, not a robot
• Language: ${languageInstruction}
• Be concise — maximum 3 sentences per reply
• Do NOT list your full services or price menu unprompted — not at the start of a conversation, not in response to a generic greeting or vague question. Only discuss a specific service once the customer names it or clearly asks what you offer.
• Do NOT state a price unless the customer explicitly asks about cost/price for that specific service.
• MANDATORY: ask ONE question at a time, never more. If you still need two or more pieces of information (e.g. which service/unit, a day/time, their name, their phone), ask for only the SINGLE most important missing one in this reply and stop there — wait for their answer before asking the next. Never bundle multiple questions into one message (e.g. never ask "which service, what date/time, and your name and number?" all together). This applies to booking just as much as anything else.
• To book: ask for preferred day/time if not given (and nothing else in that same message). The moment the customer states or confirms a specific day/time, answer immediately in this same reply — never say "let me check and get back to you" for a date/time question; the system already checked (see REAL-TIME AVAILABILITY CHECK above when present). If available and within working hours, confirm the slot is available and move to collecting -- ask for any missing name/phone/service ONE AT A TIME, not together. MANDATORY, NO EXCEPTIONS: once you have service + day/time + name + phone, do NOT say "Booked ✓" yet — first ask one explicit yes/no confirmation question naming the exact day/time, e.g. "Should I go ahead and book this for [day/time]?", and stop there. Only after the customer replies with a clear affirmative (e.g. "yes", "please do", "confirm", "sounds good", "go ahead") in their NEXT message do you say "Booked ✓". If they say no, hesitate, or want to change something, do not book — ask what they'd like instead. This confirmation step is required even if they already sound certain earlier in the conversation; never skip straight from "here's what I have" to "Booked ✓" in the same reply. If not available, say so and offer the real alternatives given.
• EXCEPTION to the confirmation step above (this is the ONLY exception -- every other case still requires the explicit yes/no question): if the CUSTOMER'S OWN SINGLE MESSAGE right now already states all four of service + day/time + name + phone together, unprompted, in one go (not built up piece by piece across several of your questions) -- that message IS their explicit confirmation. Skip the "should I go ahead" question entirely and go straight to checking availability and, if available, "Booked ✓" in this same reply. This does NOT apply when you had to ask for the pieces one at a time and they arrived separately -- only when the customer volunteered everything at once themselves.
• If EXISTING ACTIVE BOOKING above is present and the customer is trying to book something new rather than confirming/adjusting that one, follow the HARD LIMIT instruction in that section instead of the confirm-then-book flow, with no exceptions -- never collect a date/time for a second booking while one is active, even if the customer insists.
• Once a booking's date/time has been confirmed (either just now with "Booked ✓", or it already existed when this conversation started), say it in full ONE time and then stop repeating it. In every later reply, refer to it briefly ("your appointment", "your booking", "it") instead of restating the full day/time again -- only state the exact date/time again if the customer is directly asking about it, confirming a reschedule, or confirming a cancellation.
• If the customer explicitly declines to name a specific service (e.g. "no particular service, just want to come talk," "not sure yet, just visiting"), do not leave it blank or keep pushing -- accept a real fallback description of the visit itself (e.g. "General Consultation," "In-person meeting") as the service and move on to the next missing detail.
• NEVER double-book a slot already listed above
• NEVER book outside working hours
• "Let me check that for you — can I get your contact number?" may ONLY be used for something genuinely outside your knowledge that is NOT a date/time availability question (e.g. a specific technical detail you have no info on) — never for checking a schedule, which you already have.
• Never invent prices, services, or times not listed above
• MANDATORY, NO EXCEPTIONS: whenever the customer asks about a service, treatment, or product that is NOT in the Services list above, you must do all three of the following in that same reply: (1) do not claim to offer it and do not invent any details about it (no price, no duration, nothing), (2) say something like "That's not something we currently offer, let me check with the team and get back to you" rather than a flat decline, (3) include the exact literal text [NEEDS_HUMAN] somewhere in your reply so the team is actually notified. This token is required every single time rule (1) applies, with zero exceptions — do not skip it just because you already declined the request.
• If the customer asks to speak to a human, manager, or real person, include the exact token [NEEDS_HUMAN] somewhere in your reply
• If the customer mentions their name or phone number, remember it for the conversation
• When asking for the customer's phone number, ask for it WITH a country code (e.g. "What's the best number to reach you, with country code? Like +971..."). If they reply with a number that looks incomplete or clearly missing a country code (a short local number with no + and no leading 00), ask them to confirm it once more including the country code before treating it as final -- do not just accept a bare local number silently.
• Never use an em dash (—), en dash (–), or double-hyphen (--) anywhere in your reply. Use a period, comma, or a plain hyphen instead
• Never end a reply with generic padding like "If there's anything else you need, just let me know!", "Feel free to reach out if you need anything else!", "How can I assist you today?", or any variation of that. If you genuinely have something specific to add, say that specific thing; otherwise just stop talking after answering.`;

  /* ── 8. Call OpenAI ── */
  let aiReply = "Thank you for your message! I'll get back to you shortly.";
  let needsHuman = false;
  // Set true when this exact turn's [CONFIRM_APPOINTMENT:id] already
  // updated the real pending row below -- guards section 12 from ALSO
  // inserting a brand-new duplicate appointment for the same confirmation
  // (see the guard on that block for the full explanation).
  let pendingApptConfirmedThisTurn = false;
  // Round M FIX 6: same guard, for [REACTIVATE_APPOINTMENT:id] -- confirmed
  // live that without this, section 12's own independent booking-detection
  // extraction could still re-derive the SAME date/time from earlier
  // conversation history on the customer's confirming message ("yes, please
  // un-cancel it") and insert a genuine duplicate appointment alongside the
  // just-reactivated original, even when the reactivate token itself
  // executed correctly.
  let reactivatedThisTurn = false;
  // Round M FIX 6 (real root cause, found via live diagnostic logging):
  // confirming a CANCELLATION ("yes, cancel it") was itself silently
  // creating a duplicate appointment -- section 12's independent
  // booking-detection extraction call sees the AI's own PRIOR message
  // (which named the appointment's date/time while asking "should I go
  // ahead and cancel your appointment on [date]?") plus the customer's
  // short "yes", and misreads that as "confirming a date/time the AI just
  // offered" for a NEW booking -- the exact ambiguity that extraction
  // prompt is inherently prone to, just never triggered by a booking
  // confirmation before. This is what made "undo the cancellation" look
  // broken: by the time the customer asked to undo it, a phantom new
  // appointment already existed, so existingActiveAppt was no longer null
  // and the reactivate directive never even got a chance to fire.
  let cancelledThisTurn = false;
  // Set true when section 7c's deterministic short-circuit below already
  // produced the reply for this turn -- skips the main creative completion
  // call entirely (see that block for why).
  let deterministicRefusalThisTurn = false;

  /* ── 7c. Deterministic duplicate-booking refusal -- FIX 2 (round R) ────────
     Extensive live testing (17 real requests across many phrasings, both
     direct API calls and the real widget UI) never reproduced the reported
     "no response at all" for a rephrased second-appointment request -- the
     existingApptDirective prompt rule above held up correctly every time.
     Rather than keep chasing an unreproducible failure, this makes the
     refusal a hard, code-level guarantee instead of a purely prompt-
     dependent one: whenever an active appointment exists, a cheap, focused
     classification call decides ONLY "is this message asking for a new/
     additional booking" (not the open-ended creative reply), and if so, a
     fixed, deterministic refusal string is used directly -- the main
     gpt-4o completion call is skipped entirely for this turn, so there is
     no way for an LLM-level hiccup (empty completion, moderation refusal,
     an off-script reply) to ever produce silence or a wrong reply for this
     specific, narrow case. Any other message (discussing/rescheduling the
     existing appointment, an unrelated question) still goes through the
     normal creative reply below, with existingApptDirective still injected
     for natural conversation about it. */
  if (apiKey && existingActiveAppt) {
    try {
      const openai = new OpenAI({ apiKey });
      const wantsNewCheck = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            // Round S FIX 1 root cause: the prior wording ("are they asking
            // to book a NEW appointment, for any stated or unstated
            // reason") matched ANY message that referenced "another
            // appointment" -- including a plain QUESTION about future
            // eligibility/timing ("when can I do another appointment?"),
            // not just an actual attempt to book one right now. Every
            // classification call is already fresh per message (no stored
            // flag anywhere in this route -- existingActiveAppt itself is
            // re-queried from the DB on every request), so what looked like
            // a "latched" refusal was really this same over-broad true
            // verdict firing independently, turn after turn, on any
            // message that merely mentioned another appointment. Narrowed
            // to require a genuine ACTIVE ATTEMPT: a stated date/time, or
            // an explicit imperative demand to book one now -- a question
            // about a hypothetical future booking is explicitly false.
            content: `The customer already has one active appointment on file. Look at ONLY their current message below and decide if it is a genuine, ACTIVE ATTEMPT to create a new/additional/second appointment right now. This is true ONLY when the message either (a) states or proposes a concrete new date/time for another appointment, or (b) is an explicit imperative demand to book/schedule/reserve another appointment immediately (e.g. "book another one", "schedule me a second one", "yes book it"), including insisting after being told no. This is NOT true for: a QUESTION about when, whether, or how they could book another appointment in the future (e.g. "when can I do another appointment?", "can I get a second one sometime?", "how do I book another?"), asking about, confirming, rescheduling, or cancelling their EXISTING appointment, or anything unrelated to booking. When a message is phrased as a question rather than a direct demand or a stated date/time, treat it as false. Reply ONLY valid JSON: {"wantsNewBooking": true|false}.`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 20,
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(wantsNewCheck.choices[0]?.message?.content ?? "{}") as { wantsNewBooking?: boolean };
      if (parsed.wantsNewBooking === true) {
        const when = new Date(existingActiveAppt.datetime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
        // Round L FIX 7(b): the old wording offered "reschedule it to a new
        // time, or cancel it" in the SAME breath as refusing a second
        // booking -- reads as if either one unlocks a new appointment, which
        // is still wrong for reschedule (see the Round S3 fix on
        // existingApptDirective above for the full reasoning: reschedule
        // only moves this SAME appointment, it never frees up room for an
        // additional one). Cancellation is now the only thing named as the
        // path to a new booking; reschedule is offered as its own separate,
        // secondary option in its own sentence.
        aiReply = `Only one active appointment is allowed at a time. You currently have ${existingActiveAppt.service_name || "an appointment"} booked for ${when}. To book a new one, you'd need to cancel this existing appointment first. If you'd instead just like to move it to a different time, I can reschedule it, just let me know which you'd prefer.`;
        deterministicRefusalThisTurn = true;
      }
    } catch (err) {
      // Best-effort -- a failed classification just means the normal
      // creative-reply path below runs instead (which still has
      // existingApptDirective injected), never a broken/blank turn.
      console.error("[ai/reply] duplicate-booking classification failed:", err);
    }
  }

  if (!deterministicRefusalThisTurn && apiKey) {
    try {
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history as Array<{ role: string; content: string }> ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
        max_tokens: 400,
        temperature: 0.65,
      });

      let rawReply = completion.choices[0]?.message?.content?.trim() ?? aiReply;

      // Real reschedule/pending-confirmation handling (see section 6b +
      // pendingApptDirective above): only ever acts on an appointment that
      // is genuinely pending for THIS conversation -- confirmedApptId is
      // matched against the specific id injected into the prompt, never
      // trusted blindly from model output, so the model can't confirm an
      // appointment it wasn't told about.
      const confirmMatch = rawReply.match(/\[CONFIRM_APPOINTMENT:([a-f0-9-]+)\]/i);
      if (confirmMatch && pending && confirmMatch[1] === pending.id) {
        rawReply = rawReply.replace(confirmMatch[0], "").replace(/\s{2,}/g, " ").trim();
        const { error: confirmErr } = await admin
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", pending.id)
          .eq("tenant_id", tenantId);
        if (confirmErr) {
          console.error("[ai/reply] FAILED to confirm pending appointment:", confirmErr.message);
        } else {
          pendingApptConfirmedThisTurn = true;
        }
      } else if (confirmMatch) {
        // Model hallucinated a token for an id that doesn't match the real
        // pending appointment (or none exists) -- strip it, never act on it.
        rawReply = rawReply.replace(confirmMatch[0], "").replace(/\s{2,}/g, " ").trim();
      }

      // Round L FIX 7(a): real cancel execution -- same trusted-token
      // pattern as CONFIRM_APPOINTMENT above, matched against
      // existingActiveAppt.id (this exact conversation/phone's own active
      // appointment, resolved in section 6c earlier in this request) so the
      // model can never cancel any appointment it wasn't told about,
      // including another tenant's or another customer's.
      const cancelMatch = rawReply.match(/\[CANCEL_APPOINTMENT:([a-f0-9-]+)\]/i);
      if (cancelMatch && existingActiveAppt && cancelMatch[1] === existingActiveAppt.id) {
        rawReply = rawReply.replace(cancelMatch[0], "").replace(/\s{2,}/g, " ").trim();
        const { error: cancelErr } = await admin
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", existingActiveAppt.id)
          .eq("tenant_id", tenantId);
        if (cancelErr) {
          console.error("[ai/reply] FAILED to cancel appointment:", cancelErr.message);
        } else {
          cancelledThisTurn = true;
          if (!isTest) await createNotification(admin, {
            tenantId,
            type: "appointment",
            title: "Appointment cancelled",
            body: existingActiveAppt.service_name || "Appointment",
            link: "/app/appointments",
          });
        }
      } else if (cancelMatch) {
        // Model hallucinated a token for an id that isn't this customer's
        // real active appointment -- strip it, never act on it.
        rawReply = rawReply.replace(cancelMatch[0], "").replace(/\s{2,}/g, " ").trim();
      }

      // Round M FIX 6: real reactivate/undo-cancellation execution -- same
      // trusted-token pattern as CANCEL_APPOINTMENT above, matched against
      // mostRecentCancelledAppt.id (section 6d) so the model can only ever
      // reactivate THIS customer's own most recently cancelled appointment.
      // Sets status back to "pending" -- the exact same value the existing
      // dashboard "Reactivate" button already uses (appointments/page.tsx's
      // handleReactivate), so an AI-driven undo behaves identically to an
      // owner-driven one. Updates the SAME row -- never inserts a new one,
      // which is exactly the duplicate-appointment bug this fix closes.
      const reactivateMatch = rawReply.match(/\[REACTIVATE_APPOINTMENT:([a-f0-9-]+)\]/i);
      if (reactivateMatch && mostRecentCancelledAppt && reactivateMatch[1] === mostRecentCancelledAppt.id) {
        rawReply = rawReply.replace(reactivateMatch[0], "").replace(/\s{2,}/g, " ").trim();
        const { error: reactivateErr } = await admin
          .from("appointments")
          .update({ status: "pending" })
          .eq("id", mostRecentCancelledAppt.id)
          .eq("tenant_id", tenantId);
        if (reactivateErr) {
          console.error("[ai/reply] FAILED to reactivate appointment:", reactivateErr.message);
        } else {
          reactivatedThisTurn = true;
          if (!isTest) await createNotification(admin, {
            tenantId,
            type: "appointment",
            title: "Appointment reactivated",
            body: mostRecentCancelledAppt.service_name || "Appointment",
            link: "/app/appointments",
          });
        }
      } else if (reactivateMatch) {
        rawReply = rawReply.replace(reactivateMatch[0], "").replace(/\s{2,}/g, " ").trim();
      }

      // Extract [NEEDS_HUMAN] signal and strip it from visible reply
      if (rawReply.includes("[NEEDS_HUMAN]")) {
        needsHuman = true;
        aiReply = rawReply.replace("[NEEDS_HUMAN]", "").replace(/\s{2,}/g, " ").trim();
      } else {
        aiReply = rawReply;
      }
      // Deterministic backstop for the no-em-dash rule above -- see stripAiTells.
      aiReply = stripAiTells(aiReply);
      // FIX 3 (round M): deterministic backstop for the "let me know if
      // anything else!" filler tic -- see stripFillerClosers.
      aiReply = stripFillerClosers(aiReply);
    } catch (err) {
      console.error("[ai/reply] OpenAI error:", err);
    }
  }

  /* ── 9. Extract customer info (name/phone/email) from message ── */
  // CRITICAL FIX: creates the Lead HERE, the first time real contact info is
  // actually seen, instead of unconditionally at conversation start (see the
  // comment on the conversation-creation block above for the full
  // root-cause). Called from both detection points in this route (this
  // regex scan, and the GPT structured-extraction block below) since either
  // can be the first real signal in a given conversation. Never overwrites
  // an already-known value with a blank one.
  async function ensureLeadFromContact(phone?: string | null, email?: string | null, name?: string | null) {
    // CRITICAL FIX: this early return used to run BEFORE the leadId-exists
    // check below, so a real name stated in a later turn (e.g. "I'm Ahmed")
    // with no phone/email repeated in that SAME message was silently
    // discarded -- the lead (and later the appointment, which reads its
    // name via the leads join) stayed on the "Website Visitor" placeholder
    // forever. Reproduced live: a booking conversation where the customer
    // gave a phone number, then stated their real name two turns later,
    // still showed "Website Visitor" on the resulting Appointments row.
    // The "needs a real way to reach them" rule only makes sense for
    // CREATING a brand-new lead record -- it has nothing to do with
    // updating a lead that already exists, so that check now only guards
    // the create path below, not the update path.
    if (leadId) {
      // Never clobber a real value -- phone/email only fill when currently
      // null. name is different: it's never actually null after creation
      // (it defaults to the placeholder customerName, e.g. "Website
      // Visitor"), so a plain `.is("name", null)` check could never match
      // and a real name would never overwrite the placeholder. Matches the
      // placeholder values explicitly instead.
      if (phone) {
        // FIX 4 (round Q) root cause: this always used
        // `.is("phone", null)`, so it only ever wrote a phone number the
        // VERY FIRST time one was captured for this lead -- once any phone
        // (even an unconfirmed local number with no country code) was
        // saved, the field was no longer null, and every SUBSEQUENT
        // message never matched the filter again, silently discarding a
        // customer's later correction ("oh sorry, that's +971..."). Fixed
        // by reading the lead's current phone/phone_unconfirmed first: a
        // genuinely NEW correction (this lead's existing number is
        // unconfirmed AND the new one now has a real country code) is
        // allowed to overwrite even though phone is no longer null -- that
        // is exactly the upgrade this flag exists to detect. A number that
        // was already confirmed is still never clobbered by a later,
        // possibly-noisier capture (the original "never clobber a real
        // value" protection, preserved for the case that's actually
        // trustworthy).
        let { data: currentLead, error: leadReadErr } = await admin
          .from("leads").select("phone, phone_unconfirmed").eq("id", leadId).maybeSingle();
        const phoneUnconfirmedColumnMissing = leadReadErr?.code === "42703" || leadReadErr?.code === "PGRST204";
        if (phoneUnconfirmedColumnMissing) {
          ({ data: currentLead } = await admin.from("leads").select("phone").eq("id", leadId).maybeSingle());
        }
        const current = currentLead as { phone: string | null; phone_unconfirmed?: boolean | null } | null;
        const nowConfirmed = hasConfirmedCountryCode(phone);
        const isCorrection = !!current?.phone && current.phone_unconfirmed === true && nowConfirmed;

        if (!current?.phone || isCorrection) {
          if (phoneUnconfirmedColumnMissing) {
            await admin.from("leads").update({ phone }).eq("id", leadId);
          } else {
            const { error: phoneUpdErr } = await admin.from("leads")
              .update({ phone, phone_unconfirmed: !nowConfirmed })
              .eq("id", leadId);
            if (phoneUpdErr?.code === "42703" || phoneUpdErr?.code === "PGRST204") {
              await admin.from("leads").update({ phone }).eq("id", leadId);
            }
          }
        }
      }
      if (email) await admin.from("leads").update({ email }).eq("id", leadId).is("email", null);
      if (name && name !== "Customer" && name !== "Website Visitor") {
        await admin.from("leads").update({ name }).eq("id", leadId)
          .or('name.is.null,name.eq."Website Visitor",name.eq.Customer');
        // FIX 5 (round K second follow-up): real architectural gap -- the
        // lead's own name got updated correctly above, but conversations.
        // customer_name (a separate column, set once at conversation
        // creation to a generic placeholder) was never touched, so the
        // Conversations list -- and the assistant's own name-matching
        // lookups, which read customer_name -- stayed stuck on "Website
        // Visitor" forever even after a real name was captured. Reproduced
        // against real production data: two real leads ("Ahmed Harrabi",
        // "jack danielle") both had their name captured correctly on the
        // lead row, but both linked conversations still showed "Website
        // Visitor". Same placeholder guard as the leads update above --
        // never overwrites a real name already on the conversation.
        await admin.from("conversations").update({ customer_name: name }).eq("id", convId)
          .or('customer_name.is.null,customer_name.eq."Website Visitor",customer_name.eq.Customer,customer_name.eq."Website visitor"');
      }
      return;
    }
    if (!phone && !email) return; // creating a brand-new lead still needs a real way to reach them
    const newLeadRow: Record<string, unknown> = {
      tenant_id: tenantId,
      name: (name && name !== "Customer" && name !== "Website Visitor") ? name : customerName,
      phone: phone || null,
      email: email || null,
      channel,
      status: "new",
    };
    // FIX 6 (round P): same real, guaranteed country-code check as the
    // update path above.
    if (phone) newLeadRow.phone_unconfirmed = !hasConfirmedCountryCode(phone);
    let { data: lead, error: leadErr } = await admin
      .from("leads")
      .insert(newLeadRow)
      .select("id")
      .single();
    if (leadErr?.code === "42703" || leadErr?.code === "PGRST204") {
      delete newLeadRow.phone_unconfirmed;
      ({ data: lead, error: leadErr } = await admin.from("leads").insert(newLeadRow).select("id").single());
    }
    if (leadErr || !lead) {
      console.error("[ai/reply] FAILED to create lead from detected contact info:", leadErr?.message);
      return;
    }
    leadId = (lead as { id: string }).id;
    await admin.from("conversations").update({ lead_id: leadId }).eq("id", convId);
    // FIX 5 (round K second follow-up): same real-name sync as the
    // existing-lead path above -- if a real name was captured at the exact
    // moment this brand-new lead was created, the conversation should show
    // it immediately, not the generic placeholder it was created with.
    if (name && name !== "Customer" && name !== "Website Visitor") {
      await admin.from("conversations").update({ customer_name: name }).eq("id", convId)
        .or('customer_name.is.null,customer_name.eq."Website Visitor",customer_name.eq.Customer,customer_name.eq."Website visitor"');
    }
    if (!isTest) {
      await createNotification(admin, {
        tenantId,
        type: "lead",
        title: `New lead from ${channelLabel(channel)}`,
        body: (name && name !== "Customer" && name !== "Website Visitor") ? name : (customerName !== "Customer" ? customerName : null),
        link: "/app/leads",
      });
    }
  }

  const phonePattern = /(\+?\d[\d\s\-]{7,14}\d)/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneMatches = message.match(phonePattern);
  const emailMatch = message.match(emailPattern);
  if (phoneMatches || emailMatch) {
    const detectedPhone = phoneMatches ? phoneMatches[0].replace(/\s/g, "") : null;
    const detectedEmail = emailMatch ? emailMatch[0] : null;
    await ensureLeadFromContact(detectedPhone, detectedEmail, null);
  }

  /* ── 10. Save AI reply ── */
  // Same silent-failure fix as the customer-message insert above.
  const { error: aiMsgErr } = await admin.from("messages").insert({
    conversation_id: convId,
    tenant_id: tenantId,
    role: "assistant",
    content: aiReply,
    is_test: isTest === true,
  });
  if (aiMsgErr) {
    console.error("[ai/reply] FAILED to save AI reply message:", aiMsgErr.code, aiMsgErr.message);
  }

  /* ── 11. Update conversation ── */
  const convUpdate: Record<string, unknown> = { last_message_at: new Date().toISOString() };
  if (needsHuman) convUpdate.needs_human = true;

  await admin.from("conversations").update(convUpdate).eq("id", convId);

  /* ── 12. Booking + human-handoff detection via structured extraction ── */
  let booked = false;
  let booking: { datetime: string | null; service: string | null } | null = null;
  let fix4Debug = "";
  // FIX 2 (round P): hoisted so the duplicate-booking name-comparison guard
  // below can read this turn's extracted name without a second GPT call.
  let extractedCustomerName: string | null = null;

  // FIX 2 (round R): a deterministic-refusal turn (section 7c above) is
  // guaranteed to never be a real booking confirmation -- skip this
  // extraction call entirely rather than risk it independently
  // misreading the turn (confirmed live: this extraction can return
  // booked:true for a refusal-only turn on its own, harmlessly absorbed
  // downstream by the same-slot/name-conflict guards, but skipping it
  // here removes that ambiguity completely for this specific case).
  if (!deterministicRefusalThisTurn && apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      // FIX 2 (round P): the confirm-before-book prompt change means "Booked
      // ✓" now normally lands on a LATER turn than the one where the
      // service/date/time were actually stated (customer says "yes, go
      // ahead" with no specifics restated) -- this call previously only saw
      // THIS turn's raw message+reply with zero earlier context, so it had
      // no way to recover what was actually being confirmed and silently
      // returned a null datetime/service, which meant no appointment ever
      // got created despite a real, genuine confirmation. Same recent-
      // context pattern as the 7b availability pre-check above.
      const detectRecentContext = (history as Array<{ role: string; content: string }> ?? [])
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`)
        .join("\n");
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Current datetime (ISO 8601): ${new Date().toISOString()}. Extract booking info from the conversation below -- the customer's CURRENT message and the AI's reply to it are what actually decides "booked" (did the AI just finalize a booking in direct response to a genuine confirmation), but the datetime/service being confirmed is very often stated in EARLIER turns, not the current one -- use the recent context to recover it. IMPORTANT: this system has no real timezone conversion anywhere -- the current datetime given above already uses the exact same clock convention this business's appointments are stored and displayed in. Never apply any timezone shift, offset, or "helpful" conversion based on the business's city or country when producing the "datetime" field -- write the literal clock hour the customer stated or confirmed earlier in this conversation, unmodified, with a Z suffix (e.g. "3pm" -> "...T15:00:00Z", never adjusted). If the booked service matches one of this business's real services, the "service" field MUST be copied EXACTLY (same spelling, same wording) from this list, never paraphrased or reworded: ${kbServices.map((s) => s.name).join(", ") || "(none configured)"}. "booked" must be true ONLY if the AI's CURRENT reply literally finalizes the appointment (contains "Booked ✓" or unambiguously states it is now booked) in response to the customer's own explicit affirmative confirmation -- NOT when the AI is merely asking the customer to confirm before booking ("Should I go ahead and book this for..."), and NOT while details are still being collected. Reply ONLY valid JSON: {"booked": true|false, "datetime": "ISO 8601 or null", "service": "service name or null", "customerName": "extracted name or null", "customerPhone": "extracted phone or null"}. If the customer explicitly declined to name a specific service/unit/reason (e.g. "no particular service, just want to talk in person", "not sure yet"), do not return null for service -- return a real short fallback description of the visit itself, such as "General Consultation" or "In-person meeting".`,
          },
          {
            role: "user",
            content: `${detectRecentContext ? detectRecentContext + "\n" : ""}Customer: "${message}"\nAI: "${aiReply}"`,
          },
        ],
        max_tokens: 150,
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(detect.choices[0]?.message?.content ?? "{}") as {
        booked?: boolean;
        datetime?: string;
        service?: string;
        customerName?: string;
        customerPhone?: string;
      };

      booked = parsed.booked === true;
      if (booked) booking = { datetime: parsed.datetime ?? null, service: parsed.service ?? null };
      extractedCustomerName = parsed.customerName?.trim() || null;

      // CRITICAL FIX: routed through the same ensureLeadFromContact helper
      // as the regex scan above -- creates the lead here too if this GPT
      // extraction is the first real contact signal in the conversation,
      // rather than only ever updating a lead that (with the old
      // unconditional-creation code) always already existed.
      if (parsed.customerPhone || parsed.customerName) {
        await ensureLeadFromContact(parsed.customerPhone ?? null, null, parsed.customerName ?? null);
      }
    } catch { /* best-effort */ }
  }

  // CRITICAL FIX (duplicate appointment rows): this used to unconditionally
  // INSERT whenever the structured-extraction call above saw booked:true --
  // which fires on EVERY turn, not just the first. A reschedule
  // confirmation (already handled correctly above via
  // pendingApptConfirmedThisTurn) or simply a customer re-confirming a slot
  // already booked in an earlier turn ("yes Wednesday works" said twice)
  // both re-triggered this block, creating a second appointment row for the
  // same booking -- confirmed live, reproduced via the reschedule flow.
  // Fixed by checking for a real existing non-cancelled appointment on this
  // conversation first: no existing row -> genuinely new booking, insert +
  // notify. An existing row with a DIFFERENT datetime -> a real reschedule,
  // UPDATE that same row in place (never insert a second one) + mark it
  // rescheduled + notify. An existing row with the SAME datetime -> just a
  // redundant re-confirmation, do nothing (never touch status, never
  // duplicate).
  if (booked && !pendingApptConfirmedThisTurn && !reactivatedThisTurn && !cancelledThisTurn && booking?.datetime) {
    // FIX 10: never save a blank service -- the detection prompt above now
    // asks the model for a real fallback description when the customer
    // explicitly declined to name one, but this is a hard backstop in case
    // that still comes back empty.
    const serviceName = booking.service?.trim() || "General Consultation";

    const { data: existingAppt } = await admin
      .from("appointments")
      .select("id, datetime, lead_id")
      .eq("tenant_id", tenantId)
      .eq("conversation_id", convId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existing = existingAppt as { id: string; datetime: string; lead_id: string | null } | null;
    // Same slot to the minute -- a redundant re-confirmation, not a change.
    const isSameSlot = existing && new Date(existing.datetime).getTime() === new Date(booking.datetime).getTime();

    // FIX 2 (round P): a real, DIFFERENT name trying to book a different
    // slot on this SAME conversation while an appointment already exists is
    // a suspicious second-booking attempt, not a reschedule -- the
    // existingApptDirective injected into the system prompt above already
    // told the AI to ask the customer to clarify (reschedule the existing
    // one, or explain this is a genuinely different booking) instead of
    // silently overwriting. This is the hard server-side backstop for that:
    // guarantees no second appointment and no silent overwrite happen even
    // if the model's reply slipped and said "Booked ✓" anyway. Only skips
    // this guard (falls through to the normal reschedule path) when either
    // name is unknown/generic -- can't tell, so assume it's the same
    // person, preserving the original single-person reschedule UX.
    let nameConflict = false;
    if (existing && !isSameSlot && existing.lead_id && extractedCustomerName) {
      const { data: existingLead } = await admin.from("leads").select("name").eq("id", existing.lead_id).maybeSingle();
      const existingName = (existingLead as { name: string | null } | null)?.name;
      const isRealName = (n: string | null | undefined) => !!n && n !== "Customer" && n !== "Website Visitor";
      if (isRealName(existingName) && isRealName(extractedCustomerName)
        && existingName!.trim().toLowerCase() !== extractedCustomerName.trim().toLowerCase()) {
        nameConflict = true;
      }
    }

    if (nameConflict) {
      // Leave the existing appointment untouched -- no insert, no update.
      // The customer already got told about it via existingApptDirective.
    } else if (existing && !isSameSlot) {
      // Real reschedule detected via conversation (not the Appointments
      // page button, but the same real change) -- update in place.
      // Fallback: if migration_v29.sql (adds appointments.rescheduled)
      // hasn't run yet, PostgREST rejects the WHOLE update over one unknown
      // column (PGRST204) -- retry without it so the real datetime/status
      // change still lands; only the visible "Rescheduled" badge is
      // affected, never the actual reschedule.
      const { error: updErr } = await admin.from("appointments").update({
        service_name: serviceName,
        datetime: booking.datetime,
        status: "pending",
        rescheduled: true,
      }).eq("id", existing.id).eq("tenant_id", tenantId);
      if (updErr?.code === "PGRST204") {
        console.warn("[ai/reply] appointments.rescheduled column missing — run migration_v29.sql. Retrying without it.");
        await admin.from("appointments").update({
          service_name: serviceName,
          datetime: booking.datetime,
          status: "pending",
        }).eq("id", existing.id).eq("tenant_id", tenantId);
      }

      if (!isTest) {
        await createNotification(admin, {
          tenantId,
          type: "appointment",
          title: "Appointment rescheduled",
          body: serviceName,
          link: "/app/appointments",
        });
      }
    } else if (!existing) {
      // Round M FIX 9: this is a genuinely new appointment created only
      // after the mandatory confirm-then-book flow in the system prompt
      // (Rules above: "first ask one explicit yes/no confirmation question
      // ... only after the customer replies with a clear affirmative...")
      // -- the customer already explicitly confirmed this exact date/time
      // in the conversation, so requiring the owner to separately click
      // Confirm in the dashboard is redundant. "confirmed" here only;
      // the reschedule-update branch above and submit-form/route.ts's own
      // insert (no interactive confirmation loop, just a single form
      // submit) intentionally still default to "pending" -- unchanged.
      await admin.from("appointments").insert({
        tenant_id: tenantId,
        lead_id: leadId,
        conversation_id: convId,
        service_name: serviceName,
        datetime: booking.datetime,
        status: "confirmed",
      });

      if (leadId) {
        await admin.from("leads").update({ status: "booked" }).eq("id", leadId);
      }

      if (!isTest) {
        await createNotification(admin, {
          tenantId,
          type: "appointment",
          title: "New appointment booked",
          body: serviceName,
          link: "/app/appointments",
        });
      }
    }
    // isSameSlot && existing: redundant re-confirmation, intentionally a no-op.
  }

  // FIX 8 (round M): a short, real "what they want" summary for the
  // Leads/CRM detail view -- website-form leads already had this (their own
  // form's message field), but leads created through this AI conversation
  // flow (website widget, Instagram, WhatsApp -- all funnel through this
  // same route) never got one, so the CRM looked inconsistent across
  // channels. Cheap gpt-4o-mini call over the REAL conversation so far,
  // never fabricated -- explicitly told to say it doesn't know rather than
  // guess when there isn't enough real content yet. Only runs once a real
  // lead exists and there's real conversation content to summarize; skipped
  // for test messages so it never burns API cost on non-real traffic.
  if (leadId && apiKey && !isTest) {
    try {
      const openai = new OpenAI({ apiKey });
      const convoText = [...(history as Array<{ role: string; content: string }> ?? []), { role: "user", content: message }]
        .slice(-10)
        .map((m) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`)
        .join("\n");
      const summaryCheck = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Summarize in ONE short line (under 100 characters) what this customer wants, based ONLY on what they actually said in the conversation below -- never invent or guess details they didn't mention. If there isn't yet enough real content to say anything specific, reply with exactly: NONE. Reply ONLY valid JSON: {"summary": "..." or null}.`,
          },
          { role: "user", content: convoText },
        ],
        max_tokens: 60,
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const parsedSummary = JSON.parse(summaryCheck.choices[0]?.message?.content ?? "{}") as { summary?: string | null };
      const summaryText = parsedSummary.summary?.trim();
      if (summaryText && summaryText.toUpperCase() !== "NONE") {
        const { error: summaryErr } = await admin
          .from("leads")
          .update({ intent_summary: summaryText.slice(0, 200) })
          .eq("id", leadId);
        if (summaryErr?.code === "PGRST204") {
          console.warn("[ai/reply] leads.intent_summary column missing — run the pending migration.");
        }
      }
    } catch (err) {
      // Best-effort -- never blocks the real reply over a summary.
      console.error("[ai/reply] intent summary generation failed:", err);
    }
  }

  // FIX 4 (round M): real regression root-caused via TWO separate live
  // reproductions, both traced to the same underlying gap and both fixed
  // here in one place instead of scattered per-branch patches (an earlier
  // attempt patched two individual branches -- the [CONFIRM_APPOINTMENT:id]
  // token path above and the booking-detection insert/update path above --
  // but leadId is not fully resolved until AFTER both of this request's
  // ensureLeadFromContact calls have run (the regex-based one right after
  // section 9, and the GPT-extraction one inside section 12), and the
  // customer's confirming message is very often the SAME message that
  // gives their name/phone for the first time -- so any backfill attempted
  // mid-request, before leadId's final value is known, silently no-ops.
  // This runs once, at the very end, after every code path in this request
  // that could touch an appointment or resolve a lead has already run:
  // catches ANY non-cancelled appointment for this conversation still
  // missing a lead_id, whenever a real leadId is now known, regardless of
  // which specific branch above created or confirmed it. Reproduced live
  // against tenant 1fedeaa2... (real "Ahmed Harrabi" villa-viewing
  // conversation): conversations.lead_id was correctly set by
  // ensureLeadFromContact, appointments.lead_id stayed null because the
  // confirming message went through the CONFIRM_APPOINTMENT token path,
  // before leadId had been resolved from that same message.
  if (leadId) {
    await admin.from("appointments")
      .update({ lead_id: leadId })
      .eq("tenant_id", tenantId)
      .eq("conversation_id", convId)
      .is("lead_id", null)
      .neq("status", "cancelled");
  }

  return NextResponse.json(
    { reply: aiReply, conversationId: convId, booked, booking, needsHuman },
    { headers: CORS }
  );
}
