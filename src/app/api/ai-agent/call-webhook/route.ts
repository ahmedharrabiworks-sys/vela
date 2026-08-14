import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  DEFAULT_VOICE_ID,
  DEFAULT_SPEED,
  getDefaultVoiceId,
  getTranscriberConfig,
  getSpeakingPlanConfig,
  getVoiceConfig,
  buildInboundSystem,
  CALL_LIMITS,
} from "@/lib/vapi-agent-config";
import { mergeKnowledgeBases } from "@/lib/knowledge-base";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  // Fail closed — VAPI_WEBHOOK_SECRET must be set in production env.
  // Without it we cannot verify the request is from Vapi; a forged end-of-call-report
  // would insert fake rows into agent_calls and potentially appointments.
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[call-webhook] VAPI_WEBHOOK_SECRET not configured — rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 401 });
  }
  const incoming = req.headers.get("x-vapi-secret");
  if (incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        .select("tenant_id, agent_settings, knowledge_base, phone_agent_knowledge_base")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      tenantRow = data;
    } else if (phoneNumberId) {
      const { data } = await admin
        .from("tenant_config")
        .select("tenant_id, agent_settings, knowledge_base, phone_agent_knowledge_base")
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

    let rawKb: Record<string, any> = {};
    let rawPhoneKb: Record<string, any> = {};
    let settings: Record<string, any> = {};
    try {
      if (tenantRow.knowledge_base) {
        const raw = tenantRow.knowledge_base;
        rawKb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
      }
      if (tenantRow.phone_agent_knowledge_base) {
        const raw = tenantRow.phone_agent_knowledge_base;
        rawPhoneKb = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
      }
      if (tenantRow.agent_settings) {
        const raw = tenantRow.agent_settings;
        settings = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, any>;
      }
    } catch { /* ignore */ }
    const kb = mergeKnowledgeBases(rawKb, rawPhoneKb);

    const agentName    = (settings.agentName as string | undefined) || "Vela";
    const language     = (settings.language as string | undefined) || "";
    // Owner's explicit choice wins; smart Arabic default only when nothing is saved
    const voiceId      = (settings.voiceId as string | undefined) || getDefaultVoiceId(language);
    const speed        = typeof settings.speed === "number" ? settings.speed : DEFAULT_SPEED;
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
        transcriber: getTranscriberConfig(language),
        firstMessageMode: "assistant-speaks-first-with-model-generated-message",
        stopSpeakingPlan,
        startSpeakingPlan,
        ...CALL_LIMITS,
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

    // A call that never connected/completed -- no talk time and no transcript
    // at all, regardless of the exact endedReason string Vapi reports (those
    // vary by failure type: no answer, busy, voicemail, provider error, etc).
    const wasMissed = durationSecs <= 0 && transcript.length === 0;
    if (wasMissed) {
      await createNotification(admin, {
        tenantId: resolvedTenantId,
        type: "missed_call",
        title: "Missed call",
        body: callerNumber ?? null,
        link: "/app/ai-agent/overview",
      });
    }

    // If appointment was booked, route it into the same appointments table
    // Instagram/WhatsApp/Website use -- appointments always hang off a lead
    // (lead_id is NOT NULL), so find-or-create the caller as a "phone" lead
    // first, tagged consistently with the other channels' lead.channel values.
    if (appointmentBooked && callerNumber) {
      try {
        const { data: existingLead } = await admin
          .from("leads")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone", callerNumber)
          .eq("channel", "phone")
          .maybeSingle();

        let leadId = (existingLead as { id?: string } | null)?.id;
        let isNewLead = false;
        if (leadId) {
          await admin.from("leads").update({ status: "booked" }).eq("id", leadId);
        } else {
          const { data: newLead } = await admin
            .from("leads")
            .insert({
              tenant_id: resolvedTenantId,
              name:      callerNumber,
              phone:     callerNumber,
              channel:   "phone",
              status:    "booked",
            })
            .select("id")
            .single();
          leadId = (newLead as { id?: string } | null)?.id;
          isNewLead = true;
        }

        if (leadId) {
          await admin.from("appointments").insert({
            tenant_id:    resolvedTenantId,
            lead_id:      leadId,
            service_name: "",
            // Placeholder until real date/time extraction exists -- the call
            // summary regex only detects THAT a booking happened, not when.
            datetime:     new Date(Date.now() + 86400000).toISOString(),
            status:       "pending",
            notes:        summary?.slice(0, 500) ?? null,
          });

          if (isNewLead) {
            await createNotification(admin, {
              tenantId: resolvedTenantId,
              type: "lead",
              title: "New lead from Phone",
              body: callerNumber,
              link: "/app/leads",
            });
          }

          await createNotification(admin, {
            tenantId: resolvedTenantId,
            type: "appointment",
            title: "New appointment booked",
            body: callerNumber,
            link: "/app/appointments",
          });
        }
      } catch (err) {
        console.error("[call-webhook] appointment insert error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // All other event types — acknowledge silently
  return NextResponse.json({ ok: true });
}
