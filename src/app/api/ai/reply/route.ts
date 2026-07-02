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

  const adminClient = createSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = adminClient as any;

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
    .select("services_json, faq_json, tone, language")
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

  /* ── 5. Build system prompt ── */
  type ServiceRow = { name: string; price?: string; description?: string };
  type FaqRow = { question: string; answer: string };
  type TenantRow = { business_name: string; industry?: string; city?: string; phone?: string; website?: string };
  type ConfigRow = { services_json?: ServiceRow[]; faq_json?: FaqRow[]; tone?: string; language?: string };

  const t = tenant as TenantRow;
  const cfg = (config ?? {}) as ConfigRow;
  const services: ServiceRow[] = cfg.services_json ?? [];
  const faqs: FaqRow[]         = cfg.faq_json ?? [];
  const tone                   = cfg.tone ?? "professional";
  const language               = cfg.language ?? "English";

  const servicesText =
    services.length > 0
      ? services
          .map((s) => `• ${s.name}${s.price ? ` — ${s.price}` : ""}${s.description ? `: ${s.description}` : ""}`)
          .join("\n")
      : "(No services configured yet — use general knowledge about the industry)";

  const faqsText =
    faqs.length > 0
      ? "\nFAQs:\n" + faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n")
      : "";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const systemPrompt = `You are the AI assistant for ${t.business_name}, a ${t.industry || "business"} in ${t.city || "the UAE"}.

Your job: help customers, answer questions about services and prices, and book appointments.

Business details:
• Name: ${t.business_name}
• Industry: ${t.industry || "not specified"}
• Location: ${t.city || "UAE"}${t.phone ? `\n• Phone: ${t.phone}` : ""}${t.website ? `\n• Website: ${t.website}` : ""}

Services:
${servicesText}
${faqsText}

Rules:
• Tone: ${tone} and warm — be like a helpful employee, not a robot
• Language: ${language === "Auto-detect" ? "match the customer's language exactly (Arabic or English)" : `always reply in ${language}`}
• Be concise — maximum 3 sentences per reply
• To book: ask for preferred day/time if not given, then confirm with "Booked ✓"
• If you don't know something, say "Let me check that for you — can I get your contact number?"
• Never invent prices, services, or times not listed above
• Today: ${today}`;

  /* ── 6. Call OpenAI ── */
  const apiKey = process.env.OPENAI_API_KEY;
  let aiReply = "Thank you for your message! I'll get back to you shortly.";

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...(history as Array<{ role: string; content: string }> ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      aiReply =
        completion.choices[0]?.message?.content?.trim() ?? aiReply;
    } catch (err) {
      console.error("[ai/reply] OpenAI error:", err);
    }
  }

  /* ── 7. Save AI reply ── */
  await admin.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: aiReply,
  });

  /* ── 8. Update conversation timestamp ── */
  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", convId);

  /* ── 9. Booking detection ── */
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
            content: `Detect if a booking was just confirmed. Current datetime: ${new Date().toISOString()}. Reply ONLY with valid JSON: {"booked": true|false, "datetime": "ISO 8601 or null", "service": "service name or null"}`,
          },
          {
            role: "user",
            content: `Customer: "${message}"\nAI: "${aiReply}"`,
          },
        ],
        max_tokens: 120,
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(
        detect.choices[0]?.message?.content ?? "{}"
      );
      booked = parsed.booked === true;
      if (booked) booking = { datetime: parsed.datetime, service: parsed.service };
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
    { reply: aiReply, conversationId: convId, booked, booking },
    { headers: CORS }
  );
}
