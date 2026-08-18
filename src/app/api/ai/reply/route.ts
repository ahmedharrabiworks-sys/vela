import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getUsageSummary } from "@/lib/usage";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-config";
import { createNotification, channelLabel } from "@/lib/notifications";
import { checkAvailability, formatAvailabilityDirective, formatBookedSlotsText } from "@/lib/availability";
import { stripAiTells } from "@/lib/text-clean";

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

  const { data: config } = await admin
    .from("tenant_config")
    .select("services_json, faq_json, tone, language, booking_rules, knowledge_base")
    .eq("tenant_id", tenantId)
    .maybeSingle();

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

  /* ── 4. Load last 10 messages for context (exclude test messages) ── */
  // convId is guaranteed tenant-scoped by this point (validated or freshly
  // created above); tenant_id is included here too as defense-in-depth,
  // consistent with the hardening above -- never rely on a single filter
  // for tenant isolation when a second one is cheap and available.
  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .eq("tenant_id", tenantId)
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(10);

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

  /* ── 7. Build system prompt ── */
  type ServiceRow   = { name: string; price?: string; description?: string };
  type FaqRow       = { question: string; answer: string };
  type KbService    = { name: string; price?: string; duration?: string; description?: string };
  type KbFaq        = { q: string; a: string };
  type KbBusiness   = { hours?: string; address?: string; bookingPolicy?: string; tone?: string };
  type KnowledgeBase = { services?: KbService[]; faqs?: KbFaq[]; business?: KbBusiness; extra?: string };
  type TenantRow    = { business_name: string; industry?: string; city?: string; phone?: string; website?: string };
  type ConfigRow    = { services_json?: ServiceRow[]; faq_json?: FaqRow[]; tone?: string; language?: string; booking_rules?: Record<string, unknown>; knowledge_base?: string };
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
  const tone     = kbBusiness.tone ?? cfg.tone ?? "professional";
  const language = cfg.language ?? "Auto-detect";
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
            content: `Current datetime (ISO 8601): ${new Date().toISOString()}. Look at the customer's latest message, with recent conversation context, and determine if they are stating or confirming ONE concrete, fully-resolved date AND time they want to book (this includes confirming a time the AI itself just offered, e.g. "yes that works"). Resolve relative dates ("tomorrow", "next Tuesday", "the 15th at 3pm") using the current datetime above. Reply ONLY valid JSON: {"candidateDateTime": "ISO 8601 or null"}. Return null if no concrete date+time is being stated or confirmed right now.`,
          },
          { role: "user", content: `${recentContext ? recentContext + "\n" : ""}Customer: "${message}"` },
        ],
        max_tokens: 60,
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(extract.choices[0]?.message?.content ?? "{}") as { candidateDateTime?: string | null };
      if (parsed.candidateDateTime) {
        const result = await checkAvailability(admin, tenantId, parsed.candidateDateTime);
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
${bookedSlotsText}${extraText}${availabilityDirective}

Rules:
• Tone: ${tone} and warm — be like a helpful employee, not a robot
• Language: ${languageInstruction}
• Be concise — maximum 3 sentences per reply
• To book: ask for preferred day/time if not given. The moment the customer states or confirms a specific day/time, answer immediately in this same reply — never say "let me check and get back to you" for a date/time question; the system already checked (see REAL-TIME AVAILABILITY CHECK above when present). If available and within working hours, confirm it and move to finalize (get any missing name/phone/service, then confirm with "Booked ✓"). If not, say so and offer the real alternatives given.
• NEVER double-book a slot already listed above
• NEVER book outside working hours
• "Let me check that for you — can I get your contact number?" may ONLY be used for something genuinely outside your knowledge that is NOT a date/time availability question (e.g. a specific technical detail you have no info on) — never for checking a schedule, which you already have.
• Never invent prices, services, or times not listed above
• If the customer asks to speak to a human, manager, or real person, include the exact token [NEEDS_HUMAN] somewhere in your reply
• If the customer mentions their name or phone number, remember it for the conversation
• Never use an em dash (—), en dash (–), or double-hyphen (--) anywhere in your reply. Use a period, comma, or a plain hyphen instead`;

  /* ── 8. Call OpenAI ── */
  let aiReply = "Thank you for your message! I'll get back to you shortly.";
  let needsHuman = false;

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

      const rawReply = completion.choices[0]?.message?.content?.trim() ?? aiReply;

      // Extract [NEEDS_HUMAN] signal and strip it from visible reply
      if (rawReply.includes("[NEEDS_HUMAN]")) {
        needsHuman = true;
        aiReply = rawReply.replace("[NEEDS_HUMAN]", "").replace(/\s{2,}/g, " ").trim();
      } else {
        aiReply = rawReply;
      }
      // Deterministic backstop for the no-em-dash rule above -- see stripAiTells.
      aiReply = stripAiTells(aiReply);
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
    if (!phone && !email) return; // matches submit-form/route.ts's own rule: a lead needs a real way to reach them
    if (leadId) {
      const updates: Record<string, string> = {};
      if (phone) updates.phone = phone;
      if (email) updates.email = email;
      if (name && name !== "Customer" && name !== "Website Visitor") updates.name = name;
      if (Object.keys(updates).length > 0) {
        // Only fill fields that are currently empty -- never clobber a real value.
        for (const [field, value] of Object.entries(updates)) {
          await admin.from("leads").update({ [field]: value }).eq("id", leadId).is(field, null);
        }
      }
      return;
    }
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

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const detect = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Current datetime (ISO 8601): ${new Date().toISOString()}. Extract booking info from the conversation turn below. Reply ONLY valid JSON: {"booked": true|false, "datetime": "ISO 8601 or null", "service": "service name or null", "customerName": "extracted name or null", "customerPhone": "extracted phone or null"}`,
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

  if (booked && booking?.datetime) {
    await admin.from("appointments").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      conversation_id: convId,
      service_name: booking.service ?? "",
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
        body: booking.service ? booking.service : null,
        link: "/app/appointments",
      });
    }
  }

  return NextResponse.json(
    { reply: aiReply, conversationId: convId, booked, booking, needsHuman },
    { headers: CORS }
  );
}
