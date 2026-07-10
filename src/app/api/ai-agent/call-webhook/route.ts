import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  DEFAULT_VOICE_ID,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  buildInboundSystem,
} from "@/lib/vapi-agent-config";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  // Optional webhook secret check
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-vapi-secret");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, any>;
  try {
    body = await req.json() as Record<string, any>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? body) as Record<string, any>;
  const msgType = (message.type ?? message.message?.type) as string | undefined;

  // ── assistant-request: dynamic tenant lookup by phone number ──────────────
  if (msgType === "assistant-request") {
    const call = message.call as Record<string, any> | undefined;
    const phoneNumberId = (call?.phoneNumberId ?? call?.phone_number_id) as string | undefined;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") ?? null;

    if (!tenantId && !phoneNumberId) {
      return NextResponse.json({ error: "Cannot identify tenant" }, { status: 400 });
    }

    const admin = createSupabaseAdmin() as any;
    let tenantRow: Record<string, any> | null = null;

    if (tenantId) {
      const { data } = await admin
        .from("tenant_config")
        .select("tenant_id, agent_settings, knowledge_base")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      tenantRow = data;
    } else if (phoneNumberId) {
      const { data } = await admin
        .from("tenant_config")
        .select("tenant_id, agent_settings, knowledge_base")
        .eq("vapi_phone_number_id", phoneNumberId)
        .maybeSingle();
      tenantRow = data;
    }

    if (!tenantRow) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Load tenant business name
    const { data: tenantData } = await admin
      .from("tenants")
      .select("business_name")
      .eq("id", tenantRow.tenant_id)
      .maybeSingle();

    let kb: Record<string, any> = {};
    let settings: Record<string, any> = {};
    try {
      if (tenantRow.knowledge_base) {
        const raw = tenantRow.knowledge_base;
        kb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
      }
      if (tenantRow.agent_settings) {
        const raw = tenantRow.agent_settings;
        settings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
      }
    } catch { /* ignore */ }

    const agentName    = (settings.agentName as string | undefined) || "Vela";
    const voiceId      = (settings.voiceId as string | undefined) || DEFAULT_VOICE_ID;
    const speed        = typeof settings.speed === "number" ? settings.speed : 0.85;
    const businessName = (tenantData?.business_name as string | undefined) || "your business";

    const systemPrompt = buildInboundSystem(agentName, businessName, kb, settings);
    const { stopSpeakingPlan, startSpeakingPlan } = getSpeakingPlanConfig();

    return NextResponse.json({
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: getVoiceConfig(voiceId, speed),
        transcriber: getTranscriberConfig(),
        stopSpeakingPlan,
        startSpeakingPlan,
      },
    });
  }

  // ── end-of-call-report: log call to agent_calls ───────────────────────────
  if (msgType === "end-of-call-report" || msgType === "call.ended") {
    const call      = (message.call ?? {}) as Record<string, any>;
    const artifact  = (message.artifact ?? {}) as Record<string, any>;
    const customer  = (call.customer ?? {}) as Record<string, any>;

    const phoneNumberId = (call.phoneNumberId ?? call.phone_number_id) as string | undefined;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") ?? null;

    if (!tenantId && !phoneNumberId) {
      return NextResponse.json({ ok: true }); // Can't associate — silently accept
    }

    const admin = createSupabaseAdmin() as any;
    let resolvedTenantId = tenantId;

    if (!resolvedTenantId && phoneNumberId) {
      const { data } = await admin
        .from("tenant_config")
        .select("tenant_id")
        .eq("vapi_phone_number_id", phoneNumberId)
        .maybeSingle();
      resolvedTenantId = (data as any)?.tenant_id ?? null;
    }

    if (!resolvedTenantId) {
      return NextResponse.json({ ok: true });
    }

    // Parse transcript messages
    const rawMessages = (artifact.messages ?? message.messages ?? []) as Array<any>;
    const transcript = rawMessages
      .filter((m: any) => m.role === "bot" || m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role === "bot" ? "assistant" : m.role as string,
        text: (m.message ?? m.text ?? m.content ?? "") as string,
      }));

    const summary        = (message.summary ?? artifact.summary ?? null) as string | null;
    const durationSecs   = Math.round((message.durationSeconds ?? call.endedAt
      ? (new Date(call.endedAt as string).getTime() - new Date(call.startedAt as string).getTime()) / 1000
      : 0) as number);
    const callerNumber   = (customer.number ?? customer.phoneNumber ?? null) as string | null;
    const endedAt        = (call.endedAt ?? new Date().toISOString()) as string;

    // Detect language from transcript (look for Arabic/French/German/Spanish chars)
    let language = "en";
    const allText = transcript.map((l: any) => l.text).join(" ");
    if (/[؀-ۿ]/.test(allText)) language = "ar";
    else if (/[àâçéèêëîïôùûüœæ]/i.test(allText)) language = "fr";
    else if (/[äöüß]/i.test(allText)) language = "de";
    else if (/[¿¡ñáéíóú]/i.test(allText)) language = "es";

    // Detect appointment booking from summary
    let appointmentBooked: Record<string, unknown> | null = null;
    if (summary && /book|appointment|schedule|reserv|cita|موعد|rendez/i.test(summary)) {
      appointmentBooked = { detected: true, summary: summary.slice(0, 300) };
    }

    const outcome = (call.endedReason === "customer-ended-call" || call.endedReason === "assistant-ended-call")
      ? "completed"
      : (call.endedReason ?? "completed") as string;

    try {
      await admin.from("agent_calls").insert({
        tenant_id:          resolvedTenantId,
        call_type:          "live",
        ended_at:           endedAt,
        duration_seconds:   durationSecs > 0 ? durationSecs : null,
        language,
        caller_number:      callerNumber,
        transcript,
        summary,
        outcome,
        appointment_booked: appointmentBooked,
      });
    } catch (err: any) {
      // Don't fail the webhook — Vapi retries on non-200
      console.error("[call-webhook] insert error:", err?.message ?? err);
    }

    // If appointment was booked, also insert into appointments table
    if (appointmentBooked && callerNumber) {
      try {
        await admin.from("appointments").insert({
          tenant_id:     resolvedTenantId,
          customer_name: callerNumber,
          source:        "ai_phone",
          notes:         summary?.slice(0, 500) ?? null,
          scheduled_at:  new Date(Date.now() + 86400000).toISOString(), // placeholder: tomorrow
        }).select("id").single();
      } catch { /* appointments table may have required fields — ignore */ }
    }

    return NextResponse.json({ ok: true });
  }

  // All other event types — acknowledge silently
  return NextResponse.json({ ok: true });
}
