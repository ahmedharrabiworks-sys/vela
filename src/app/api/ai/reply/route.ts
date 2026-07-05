import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    tenantId,
    conversationId,
    message,
    channel = "website",
    customerName = "Customer",
  } = body as {
    tenantId?: string;
    conversationId?: string;
    message?: string;
    channel?: string;
    customerName?: string;
  };

  if (!tenantId || !message) {
    return NextResponse.json(
      { error: "tenantId and message are required" },
      { status: 400, headers: CORS }
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

  const { data: config } = await admin
    .from("tenant_config")
    .select("services_json, faq_json, tone, language, booking_rules, knowledge_base")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  /* ── 2. Get or create conversation + lead ── */
  let convId = conversationId ?? null;
  let leadId: string | null = null;

  if (!convId) {
    const { data: lead } = await admin
      .from("leads")
      .insert({ tenant_id: tenantId, name: customerName, channel, status: "new" })
      .select("id")
      .single();
    leadId = (lead as { id: string } | null)?.id ?? null;

    const { data: conv } = await admin
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        channel,
        customer_name: customerName,
        ai_enabled: true,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    convId = (conv as { id: string } | null)?.id ?? null;
  } else {
    const { data: conv } = await admin
      .from("conversations")
      .select("lead_id")
      .eq("id", convId)
      .maybeSingle();
    leadId = (conv as { lead_id: string | null } | null)?.lead_id ?? null;
  }

  if (!convId) {
    return NextResponse.json(
      { error: "Could not create conversation" },
      { status: 500, headers: CORS }
    );
  }

  /* ── 3. Load last 10 messages for context ── */
  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(10);

  /* ── 4. Save customer message ── */
  await admin.from("messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });

  /* ── 5. Load already-booked slots for double-booking prevention ── */
  const { data: bookedSlots } = await admin
    .from("appointments")
    .select("datetime, service_name")
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .gte("datetime", new Date().toISOString())
    .order("datetime", { ascending: true })
    .limit(20);

  /* ── 6. Build system prompt ── */
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

  const bookedSlotsText =
    (bookedSlots as BookingRow[] | null)?.length
      ? "\nAlready booked slots (DO NOT double-book these):\n" +
        (bookedSlots as BookingRow[])
          .map((b) => {
            const dt = new Date(b.datetime);
            return `• ${dt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}${b.service_name ? ` (${b.service_name})` : ""}`;
          })
          .join("\n")
      : "";

  const languageInstruction =
    language === "Auto-detect"
      ? "Detect the customer's language from their message and ALWAYS reply in the same language (Arabic if they write Arabic, French if French, English otherwise)."
      : `Always reply in ${language}.`;

  const systemPrompt = `You are the AI assistant for ${t.business_name}, a ${t.industry || "business"} in ${t.city || "the UAE"}.

Your job: help customers, answer questions about services and prices, and book appointments.

Business details:
• Name: ${t.business_name}
• Industry: ${t.industry || "not specified"}
• Location: ${t.city || "UAE"}${addressText ? `\n• ${addressText}` : ""}${t.phone ? `\n• Phone: ${t.phone}` : ""}${t.website ? `\n• Website: ${t.website}` : ""}
• ${workingHoursText}${bookingPolicyText}

Current date & time: ${todayFull}, ${currentTime}

Services:
${servicesText}
${faqsText}
${bookedSlotsText}${extraText}

Rules:
• Tone: ${tone} and warm — be like a helpful employee, not a robot
• Language: ${languageInstruction}
• Be concise — maximum 3 sentences per reply
• To book: ask for preferred day/time if not given, confirm availability against booked slots above, then confirm with "Booked ✓"
• NEVER double-book a slot already listed above
• NEVER book outside working hours
• If you don't know something, say "Let me check that for you — can I get your contact number?"
• Never invent prices, services, or times not listed above
• If the customer asks to speak to a human, manager, or real person, include the exact token [NEEDS_HUMAN] somewhere in your reply
• If the customer mentions their name or phone number, remember it for the conversation`;

  /* ── 7. Call OpenAI ── */
  const apiKey = process.env.OPENAI_API_KEY;
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
    } catch (err) {
      console.error("[ai/reply] OpenAI error:", err);
    }
  }

  /* ── 8. Extract customer info (name/phone) from message ── */
  const phonePattern = /(\+?\d[\d\s\-]{7,14}\d)/g;
  const phoneMatches = message.match(phonePattern);
  if (phoneMatches && leadId) {
    const detectedPhone = phoneMatches[0].replace(/\s/g, "");
    await admin.from("leads").update({ phone: detectedPhone }).eq("id", leadId).eq("phone", null);
  }

  /* ── 9. Save AI reply ── */
  await admin.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: aiReply,
  });

  /* ── 10. Update conversation ── */
  const convUpdate: Record<string, unknown> = { last_message_at: new Date().toISOString() };
  if (needsHuman) convUpdate.needs_human = true;

  await admin.from("conversations").update(convUpdate).eq("id", convId);

  /* ── 11. Booking + human-handoff detection via structured extraction ── */
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

      // Update lead with extracted name/phone
      if (leadId && (parsed.customerName || parsed.customerPhone)) {
        const updates: Record<string, string> = {};
        if (parsed.customerName) updates.name = parsed.customerName;
        if (parsed.customerPhone) updates.phone = parsed.customerPhone;
        await admin.from("leads").update(updates).eq("id", leadId);
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
  }

  return NextResponse.json(
    { reply: aiReply, conversationId: convId, booked, booking, needsHuman },
    { headers: CORS }
  );
}
