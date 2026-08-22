import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { createNotification, channelLabel } from "@/lib/notifications";
import { checkAvailability, formatAvailabilityDirective, formatBookedSlotsText, DEFAULT_SLOT_MINUTES } from "@/lib/availability";
import { stripAiTells, stripFillerClosers } from "@/lib/text-clean";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── Per-tenant in-memory rate limiter ──────────────────────────────────────
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

  // Per-tenant rate limit — checked before any OpenAI calls
  if (isTenantRateLimited(tenantId)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down" },
      { status: 429, headers: CORS }
    );
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
      return NextResponse.json(
        {
          error: "You've reached your plan's message limit for this month. Upgrade to Pro for unlimited messages.",
          limitType: "messages",
          used: usage.messagesUsed,
          limit: msgLimit,
        },
        { status: 429, headers: CORS },
      );
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
  if (convId) {
    const { data: conv } = await admin
      .from("conversations")
      .select("id, lead_id")
      .eq("id", convId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (conv) {
      leadId = (conv as { lead_id: string | null }).lead_id ?? null;
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
    const { data: conv } = await admin
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        lead_id: null,
        channel,
        customer_name: customerName,
        ai_enabled: true,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
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
${bookedSlotsText}${extraText}${availabilityDirective}${pendingApptDirective}

Rules:
• Tone: ${tone} and warm — be like a helpful employee, not a robot
• Language: ${languageInstruction}
• Be concise — maximum 3 sentences per reply
• Do NOT list your full services or price menu unprompted — not at the start of a conversation, not in response to a generic greeting or vague question. Only discuss a specific service once the customer names it or clearly asks what you offer.
• Do NOT state a price unless the customer explicitly asks about cost/price for that specific service.
• MANDATORY: ask ONE question at a time, never more. If you still need two or more pieces of information (e.g. which service/unit, a day/time, their name, their phone), ask for only the SINGLE most important missing one in this reply and stop there — wait for their answer before asking the next. Never bundle multiple questions into one message (e.g. never ask "which service, what date/time, and your name and number?" all together). This applies to booking just as much as anything else.
• To book: ask for preferred day/time if not given (and nothing else in that same message). The moment the customer states or confirms a specific day/time, answer immediately in this same reply — never say "let me check and get back to you" for a date/time question; the system already checked (see REAL-TIME AVAILABILITY CHECK above when present). If available and within working hours, confirm it and move to finalize -- ask for any missing name/phone/service ONE AT A TIME, not together, then confirm with "Booked ✓" once you have what you need. If not, say so and offer the real alternatives given.
• If the customer explicitly declines to name a specific service (e.g. "no particular service, just want to come talk," "not sure yet, just visiting"), do not leave it blank or keep pushing -- accept a real fallback description of the visit itself (e.g. "General Consultation," "In-person meeting") as the service and move on to the next missing detail.
• NEVER double-book a slot already listed above
• NEVER book outside working hours
• "Let me check that for you — can I get your contact number?" may ONLY be used for something genuinely outside your knowledge that is NOT a date/time availability question (e.g. a specific technical detail you have no info on) — never for checking a schedule, which you already have.
• Never invent prices, services, or times not listed above
• MANDATORY, NO EXCEPTIONS: whenever the customer asks about a service, treatment, or product that is NOT in the Services list above, you must do all three of the following in that same reply: (1) do not claim to offer it and do not invent any details about it (no price, no duration, nothing), (2) say something like "That's not something we currently offer, let me check with the team and get back to you" rather than a flat decline, (3) include the exact literal text [NEEDS_HUMAN] somewhere in your reply so the team is actually notified. This token is required every single time rule (1) applies, with zero exceptions — do not skip it just because you already declined the request.
• If the customer asks to speak to a human, manager, or real person, include the exact token [NEEDS_HUMAN] somewhere in your reply
• If the customer mentions their name or phone number, remember it for the conversation
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

  if (apiKey) {
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
      if (phone) await admin.from("leads").update({ phone }).eq("id", leadId).is("phone", null);
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
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .insert({
        tenant_id: tenantId,
        name: (name && name !== "Customer" && name !== "Website Visitor") ? name : customerName,
        phone: phone || null,
        email: email || null,
        channel,
        status: "new",
      })
      .select("id")
      .single();
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

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Current datetime (ISO 8601): ${new Date().toISOString()}. Extract booking info from the conversation turn below. IMPORTANT: this system has no real timezone conversion anywhere -- the current datetime given above already uses the exact same clock convention this business's appointments are stored and displayed in. Never apply any timezone shift, offset, or "helpful" conversion based on the business's city or country when producing the "datetime" field -- write the literal clock hour the customer stated or confirmed earlier in this conversation, unmodified, with a Z suffix (e.g. "3pm" -> "...T15:00:00Z", never adjusted). If the booked service matches one of this business's real services, the "service" field MUST be copied EXACTLY (same spelling, same wording) from this list, never paraphrased or reworded: ${kbServices.map((s) => s.name).join(", ") || "(none configured)"}. Reply ONLY valid JSON: {"booked": true|false, "datetime": "ISO 8601 or null", "service": "service name or null", "customerName": "extracted name or null", "customerPhone": "extracted phone or null"}. If the customer explicitly declined to name a specific service/unit/reason (e.g. "no particular service, just want to talk in person", "not sure yet"), do not return null for service -- return a real short fallback description of the visit itself, such as "General Consultation" or "In-person meeting".`,
          },
          {
            role: "user",
            content: `Customer: "${message}"\nAI: "${aiReply}"`,
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
  if (booked && !pendingApptConfirmedThisTurn && booking?.datetime) {
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

    if (existing && !isSameSlot) {
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
      await admin.from("appointments").insert({
        tenant_id: tenantId,
        lead_id: leadId,
        conversation_id: convId,
        service_name: serviceName,
        datetime: booking.datetime,
        status: "pending",
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
