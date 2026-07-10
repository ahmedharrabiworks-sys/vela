import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VAPI_BASE = "https://api.vapi.ai";

async function vapiRequest(path: string, method: string, body?: unknown) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not configured");
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any)?.message ?? `Vapi ${method} ${path} → ${res.status}`);
  return data;
}

async function getAuthAndTenant(req: NextRequest) {
  void req;
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 };
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { user, tenant };
  } catch {
    return { error: "Account setup required", status: 500 };
  }
}

function buildInboundSystem(
  agentName: string,
  businessName: string,
  kb: Record<string, any>,
  settings: Record<string, any>
): string {
  const services = (kb.services as Array<{ name: string; price?: string }> | undefined) ?? [];
  const biz = (kb.business as Record<string, string> | undefined) ?? {};
  const extra = (kb.extra as string | undefined) ?? "";
  const personality = (settings.personality as string | undefined) ?? "professional";
  const greetingStyle = (settings.greetingStyle as string | undefined) ?? "warm";
  const customInstructions = (settings.customInstructions as string | undefined) ?? "";

  const greetingLine =
    greetingStyle === "pro"
      ? `Good day, you've reached ${businessName}. How may I help you?`
      : `Hi! Thanks for calling ${businessName}. How can I help you today?`;

  const svcList = services.length > 0
    ? services.map(s => `${s.name}${s.price ? ` (${s.price})` : ""}`).join(", ")
    : "";

  return `You are ${agentName}, the AI phone agent for ${businessName}. You handle inbound calls professionally, answer questions, and book appointments.

## GREETING
When the call starts, say: "${greetingLine}"

## LANGUAGE RULE
Detect the caller's language from their first message and switch to it immediately. Support all languages — especially Arabic (العربية), French, German, Spanish. Never mix languages within a call.

## BUSINESS KNOWLEDGE
${svcList ? `Services: ${svcList}` : ""}
${biz.hours ? `Hours: ${biz.hours}` : ""}
${biz.address ? `Location: ${biz.address}` : ""}
${biz.bookingPolicy ? `Booking: ${biz.bookingPolicy}` : ""}
${extra ? `Additional info: ${extra}` : ""}

## CALL FLOW
1. Greet warmly
2. Understand what the caller needs
3. Answer questions using your business knowledge above
4. If they want to book: collect their name, preferred date/time, and service — confirm back to them
5. Close warmly, let them know someone will confirm their booking

## PERSONALITY
${personality === "professional" ? "Formal, precise, and business-focused." : personality === "friendly" ? "Warm, approachable, builds rapport." : personality === "persuasive" ? "Confident, highlights value, drives action." : "Concise and efficient — respects the caller's time."}

${customInstructions ? `## CUSTOM RULES\n${customInstructions}` : ""}

## RULES
- Never invent information not in your knowledge
- Keep responses short — this is a phone call, not a chat
- Never mention you are AI unless directly asked
- Always confirm bookings back to the caller before ending the call`;
}

export async function GET(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("vapi_phone_number, vapi_phone_number_id, vapi_assistant_id")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return NextResponse.json({
    phoneNumber:   (cfg as any)?.vapi_phone_number   ?? null,
    phoneNumberId: (cfg as any)?.vapi_phone_number_id ?? null,
    assistantId:   (cfg as any)?.vapi_assistant_id   ?? null,
  });
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: "VAPI_API_KEY not configured on server" }, { status: 422 });
  }

  const admin = createSupabaseAdmin() as any;

  // Load tenant KB + settings
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base, agent_settings, vapi_assistant_id, vapi_phone_number_id, vapi_phone_number")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let kb: Record<string, any> = {};
  let agentSettings: Record<string, any> = {};
  try {
    if ((cfg as any)?.knowledge_base) {
      const raw = (cfg as any).knowledge_base;
      kb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
    if ((cfg as any)?.agent_settings) {
      const raw = (cfg as any).agent_settings;
      agentSettings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
    }
  } catch { /* ignore parse errors */ }

  const agentName = (agentSettings.agentName as string | undefined) || "Vela";
  const voiceId   = (agentSettings.voiceId as string | undefined) || "PIGsltMj3gFMR34aFDI3";
  const speed     = (agentSettings.speed   as number | undefined) ?? 0.85;

  // App URL for webhook serverUrl
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const webhookUrl = appUrl
    ? `${appUrl}/api/ai-agent/call-webhook?tenantId=${tenant.id}`
    : "";

  const systemPrompt = buildInboundSystem(agentName, tenant.business_name || "your business", kb, agentSettings);

  try {
    // Create or update the Vapi assistant
    let assistantId = (cfg as any)?.vapi_assistant_id as string | null ?? null;
    const assistantBody = {
      name: `${agentName} — ${tenant.business_name || "Business"}`,
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: {
        provider: "11labs",
        voiceId,
        model: "eleven_multilingual_v2",
        stability: 0.45,
        similarityBoost: 0.8,
        style: 0.25,
        useSpeakerBoost: true,
        speed,
      },
      transcriber: { provider: "gladia", model: "fast", languageBehaviour: "automatic single language" },
      stopSpeakingPlan: { numWords: 0, voiceSeconds: 0, backoffSeconds: 0.5 },
      startSpeakingPlan: { waitSeconds: 0.4, smartEndpointingEnabled: true },
      ...(webhookUrl ? { serverUrl: webhookUrl } : {}),
    };

    if (assistantId) {
      await vapiRequest(`/assistant/${assistantId}`, "PATCH", assistantBody);
    } else {
      const created = await vapiRequest("/assistant", "POST", assistantBody) as any;
      assistantId = created.id as string;
    }

    // Provision phone number if not already done
    let phoneNumber = (cfg as any)?.vapi_phone_number as string | null ?? null;
    let phoneNumberId = (cfg as any)?.vapi_phone_number_id as string | null ?? null;

    if (!phoneNumberId) {
      const numRes = await vapiRequest("/phone-number", "POST", {
        provider: "vapi",
        name: `${tenant.business_name || "Business"} — Vela`,
        assistantId,
      }) as any;
      phoneNumber   = (numRes.number ?? numRes.id) as string;
      phoneNumberId = numRes.id as string;
    }

    // Save to tenant_config
    await admin
      .from("tenant_config")
      .update({
        vapi_assistant_id:    assistantId,
        vapi_phone_number:    phoneNumber,
        vapi_phone_number_id: phoneNumberId,
      })
      .eq("tenant_id", tenant.id);

    return NextResponse.json({ phoneNumber, phoneNumberId, assistantId });
  } catch (err: any) {
    console.error("[ai-agent/phone] provision error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to provision phone number" },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const result = await getAuthAndTenant(req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { tenant } = result;

  const admin = createSupabaseAdmin() as any;
  await admin
    .from("tenant_config")
    .update({ vapi_phone_number: null, vapi_phone_number_id: null, vapi_assistant_id: null })
    .eq("tenant_id", tenant.id);

  return NextResponse.json({ ok: true });
}
