import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    history?: { role: string; content: string }[];
  };

  const { message, history = [] } = body;
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, business_name, industry, city")
    .eq("owner_id", user.id)
    .single();

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const tenantId = tenant.id as string;

  // Load real-time data in parallel
  const [leadsRes, apptsRes, convsRes, cfgRes] = await Promise.all([
    admin.from("leads").select("id, name, stage, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    admin.from("appointments").select("id, datetime, status, service_name, leads(name)").eq("tenant_id", tenantId).gte("datetime", new Date().toISOString()).order("datetime", { ascending: true }).limit(5),
    admin.from("conversations").select("id, channel, status, needs_human, customer_name").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(8),
    admin.from("tenant_config").select("instagram_connected, whatsapp_connected, services_json").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  const today = new Date();
  const todayAppts = (apptsRes.data ?? []).filter((a: { datetime: string }) => {
    return new Date(a.datetime).toDateString() === today.toDateString();
  });

  const cfg = cfgRes.data as { instagram_connected?: boolean; whatsapp_connected?: boolean; services_json?: unknown[] } | null;

  const systemPrompt = `You are Vela AI, an intelligent business assistant for ${tenant.business_name || "this business"}.
Today: ${today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

BUSINESS:
- Name: ${tenant.business_name || "Unknown"}
- Industry: ${tenant.industry || "Unknown"}
- City: ${tenant.city || "Unknown"}
- Instagram: ${cfg?.instagram_connected ? "Connected" : "Not connected"}
- WhatsApp: ${cfg?.whatsapp_connected ? "Connected" : "Not connected"}

LIVE DATA:
- Recent leads (5): ${JSON.stringify((leadsRes.data ?? []).map((l: { name: string; stage: string }) => ({ name: l.name, stage: l.stage })))}
- Upcoming appointments: ${apptsRes.data?.length ?? 0} total, ${todayAppts.length} today
- Active conversations: ${convsRes.data?.length ?? 0} recent, ${(convsRes.data ?? []).filter((c: { needs_human: boolean }) => c.needs_human).length} need human attention
- Services configured: ${Array.isArray(cfg?.services_json) ? cfg.services_json.length : 0}

You can help with:
- Questions about leads, appointments, conversations, and performance
- Writing customer replies or marketing copy
- Explaining Vela features and how to configure them
- Suggesting actions to grow the business

Navigation: when you want to direct the user somewhere, include [navigate:/path] at the end of your message.
Available paths: /app (dashboard), /app/leads, /app/appointments, /app/conversations, /app/channels, /app/marketing, /app/settings, /app/analytics

Keep responses concise, helpful, and conversational. Use markdown for structure when useful.`;

  const msgs: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((h) => h.role === "user" || h.role === "assistant")
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: msgs,
      max_tokens: 500,
      temperature: 0.6,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't process that request.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Assistant AI error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
