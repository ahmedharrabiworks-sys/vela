import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";
import { BOOK_APPOINTMENT_TOOL, collectCallerFields } from "@/lib/vapi-webhook";
import { bookAppointmentFromCall } from "@/lib/phone-booking";
import { prepareInboundCall, parseJson, TENANT_PHONE_COLS, type TenantPhoneCfg } from "@/lib/phone-call-setup";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TenantCfg = TenantPhoneCfg;

/**
 * Resolves the tenant for a Vapi event and enforces that it is the RIGHT one:
 * - tenantId in the query (set by us in server.url) must be a real tenant;
 * - when Vapi reports which phone number the call came in on, it must be the
 *   number linked to that tenant (a URL copied onto another number, or a
 *   number unlinked via DELETE /api/ai-agent/phone, is refused);
 * - with no tenantId, the phone number alone must map to exactly one tenant.
 */
async function resolveTenant(
  admin: any,
  reqUrl: string,
  phoneNumberId: string | undefined,
): Promise<{ ok: true; cfg: TenantCfg } | { ok: false; status: number; reason: string }> {
  const tenantId = new URL(reqUrl).searchParams.get("tenantId");
  const cols = TENANT_PHONE_COLS;

  if (tenantId) {
    if (!UUID_RE.test(tenantId)) return { ok: false, status: 400, reason: "invalid tenantId" };
    const { data } = await admin.from("tenant_config").select(cols).eq("tenant_id", tenantId).maybeSingle();
    if (!data) return { ok: false, status: 404, reason: "tenant not found" };
    if (phoneNumberId && data.vapi_phone_number_id !== phoneNumberId) {
      return { ok: false, status: 403, reason: "phone number does not belong to this tenant" };
    }
    return { ok: true, cfg: data as TenantCfg };
  }
  if (phoneNumberId) {
    const { data } = await admin.from("tenant_config").select(cols).eq("vapi_phone_number_id", phoneNumberId).maybeSingle();
    if (!data) return { ok: false, status: 404, reason: "no tenant for this phone number" };
    return { ok: true, cfg: data as TenantCfg };
  }
  return { ok: false, status: 400, reason: "cannot identify tenant" };
}

/** Server-side only: what the carrier/Twilio actually reports about the caller. Never secrets. */
function logCallerFields(event: string, message: Record<string, any>) {
  try {
    const fields = collectCallerFields({ call: message.call, customer: message.customer, phoneNumber: message.phoneNumber });
    console.log(`[call-webhook] caller-fields ${event}`, JSON.stringify(fields));
  } catch { /* logging must never break a call */ }
}

export async function POST(req: NextRequest) {
  // Fail closed, VAPI_WEBHOOK_SECRET must be set in production env.
  // Without it we cannot verify the request is from Vapi; a forged event
  // could create fake calls/appointments.
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[call-webhook] VAPI_WEBHOOK_SECRET not configured, rejecting request");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 401 });
  }
  // Timing-safe compare (a plain !== leaks matching-prefix length via timing).
  const incoming = req.headers.get("x-vapi-secret") ?? "";
  const incomingBuf = Buffer.from(incoming);
  const secretBuf   = Buffer.from(secret);
  const validSecret = incomingBuf.length === secretBuf.length && crypto.timingSafeEqual(incomingBuf, secretBuf);
  if (!validSecret) {
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
  const call = (message.call ?? {}) as Record<string, any>;
  const phoneNumberId = (call.phoneNumberId ?? call.phone_number_id ?? message.phoneNumber?.id) as string | undefined;
  const callerNumber = ((call.customer ?? message.customer ?? {}).number ?? null) as string | null;
  const callId = (call.id ?? null) as string | null;

  // ── assistant-request: build this tenant's assistant for this call ────────
  if (msgType === "assistant-request") {
    logCallerFields("assistant-request", message);
    const admin = createSupabaseAdmin() as any;
    const tenant = await resolveTenant(admin, req.url, phoneNumberId);
    if (!tenant.ok) {
      console.warn("[call-webhook] assistant-request refused:", tenant.reason);
      return NextResponse.json({ error: tenant.reason }, { status: tenant.status });
    }
    // Same per-call setup as the Vela front door (/api/voice/twilio-inbound).
    const prepared = await prepareInboundCall(admin, tenant.cfg, callerNumber);
    if (!prepared.ok) {
      if (prepared.reason === "plan_paused") {
        // Starter: voice paused. Vapi speaks this to the caller; never
        // mention plans, credits or errors.
        console.log("[call-webhook] voice paused for plan", JSON.stringify({ tenantId: tenant.cfg.tenant_id }));
        return NextResponse.json({ error: `Thanks for calling ${prepared.businessName}. We can't take your call right now. Please call again a little later.` });
      }
      return NextResponse.json({ error: "Service misconfigured" }, { status: 500 });
    }
    // Receptionist v2; end-of-call-report and tool calls come back here, signed.
    return NextResponse.json({ assistant: prepared.assistant });
  }

  // ── tool-calls (current Vapi) / function-call (legacy): book_appointment ──
  if (msgType === "tool-calls" || msgType === "function-call") {
    const admin = createSupabaseAdmin() as any;
    const tenant = await resolveTenant(admin, req.url, phoneNumberId);
    if (!tenant.ok) {
      console.warn("[call-webhook] tool call refused:", tenant.reason);
      return NextResponse.json({ error: tenant.reason }, { status: tenant.status });
    }
    const tenantId = tenant.cfg.tenant_id;

    const runTool = async (name: string | undefined, rawArgs: unknown): Promise<string> => {
      if (name !== BOOK_APPOINTMENT_TOOL) return `Unknown tool "${name ?? ""}".`;
      const args = parseJson(rawArgs);
      const result = await bookAppointmentFromCall(admin, { tenantId, args, callId, callerNumber });
      console.log("[call-webhook] book_appointment", JSON.stringify({ tenantId, callId, status: result.status, appointmentId: result.appointmentId ?? null }));
      return result.message;
    };

    if (msgType === "function-call") {
      const fc = (message.functionCall ?? {}) as Record<string, any>;
      return NextResponse.json({ result: await runTool(fc.name, fc.parameters) });
    }

    const list = ((message.toolCallList as any[] | undefined)
      ?? (message.toolWithToolCallList as any[] | undefined)?.map((t) => t.toolCall)
      ?? []).filter(Boolean);
    const results = [];
    for (const tc of list) {
      results.push({
        toolCallId: tc.id,
        result: await runTool(tc.function?.name ?? tc.name, tc.function?.arguments ?? tc.arguments ?? tc.parameters),
      });
    }
    return NextResponse.json({ results });
  }

  // ── end-of-call-report: log call to agent_calls ───────────────────────────
  if (msgType === "end-of-call-report" || msgType === "call.ended") {
    logCallerFields("end-of-call-report", message);
    const admin = createSupabaseAdmin() as any;
    const tenant = await resolveTenant(admin, req.url, phoneNumberId);
    if (!tenant.ok) {
      // 200 so Vapi doesn't retry an event we will never accept.
      console.warn("[call-webhook] end-of-call ignored:", tenant.reason);
      return NextResponse.json({ ok: true });
    }
    const resolvedTenantId = tenant.cfg.tenant_id;
    const artifact = (message.artifact ?? {}) as Record<string, any>;

    // Parse transcript messages
    const rawMessages = (artifact.messages ?? message.messages ?? []) as Array<any>;
    const transcript = rawMessages
      .filter((m: any) => m.role === "bot" || m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role === "bot" ? "assistant" : m.role as string,
        text: (m.message ?? m.text ?? m.content ?? "") as string,
      }));

    const summary = (message.analysis?.summary ?? message.summary ?? artifact.summary ?? null) as string | null;

    // C4: prefer Vapi's own durationSeconds. The old expression
    // `message.durationSeconds ?? call.endedAt ? a : b` parsed as
    // `(durationSeconds ?? endedAt) ? a : b`, ignoring durationSeconds and
    // producing NaN when the call object had no startedAt.
    const reported = typeof message.durationSeconds === "number" ? message.durationSeconds
      : typeof call.durationSeconds === "number" ? call.durationSeconds
      : NaN;
    let durationSecs = Number.isFinite(reported) && reported >= 0 ? reported : NaN;
    if (!Number.isFinite(durationSecs)) {
      const start = Date.parse(message.startedAt ?? call.startedAt ?? "");
      const end   = Date.parse(message.endedAt ?? call.endedAt ?? "");
      durationSecs = Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 1000 : 0;
    }
    durationSecs = Math.round(durationSecs);

    const endedAt = (message.endedAt ?? call.endedAt ?? new Date().toISOString()) as string;

    // Detect language from transcript (look for Arabic/French/German/Spanish chars)
    let language = "en";
    const allText = transcript.map((l: any) => l.text).join(" ");
    if (/[؀-ۿ]/.test(allText)) language = "ar";
    else if (/[àâçéèêëîïôùûüœæ]/i.test(allText)) language = "fr";
    else if (/[äöüß]/i.test(allText)) language = "de";
    else if (/[¿¡ñáéíóú]/i.test(allText)) language = "es";

    // C3: the appointment (if any) was booked for real DURING the call by
    // the book_appointment tool. Link it to this call record; never infer a
    // booking from the summary text, never invent a date.
    let appointmentBooked: Record<string, unknown> | null = null;
    if (callId) {
      try {
        const { data: lead } = await admin.from("leads").select("id")
          .eq("tenant_id", resolvedTenantId).eq("form_data->>last_vapi_call_id", callId)
          .limit(1).maybeSingle();
        if (lead) {
          const { data: appt } = await admin.from("appointments")
            .select("id, datetime, service_name, status, notes")
            .eq("tenant_id", resolvedTenantId).eq("lead_id", lead.id)
            .neq("status", "cancelled").is("deleted_at", null)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (appt) {
            appointmentBooked = { appointmentId: appt.id, datetime: appt.datetime, service: appt.service_name, status: appt.status };
            if (summary) {
              await admin.from("appointments")
                .update({ notes: `${appt.notes ?? ""} Call summary: ${summary}`.trim().slice(0, 1000) })
                .eq("id", appt.id).eq("tenant_id", resolvedTenantId);
              await admin.from("leads")
                .update({ intent_summary: summary.slice(0, 200) })
                .eq("id", lead.id).eq("tenant_id", resolvedTenantId);
            }
          }
        }
      } catch (err) {
        console.error("[call-webhook] linking booked appointment failed:", err);
      }
    }

    const outcome = (call.endedReason === "customer-ended-call" || call.endedReason === "assistant-ended-call")
      ? "completed"
      : (message.endedReason ?? call.endedReason ?? "completed") as string;

    try {
      const { error } = await admin.from("agent_calls").insert({
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
      if (error) console.error("[call-webhook] agent_calls insert error:", error.message);
    } catch (err: any) {
      // Don't fail the webhook, Vapi retries on non-200
      console.error("[call-webhook] insert error:", err?.message ?? err);
    }

    // A call that never connected: no talk time and no transcript at all.
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

    return NextResponse.json({ ok: true });
  }

  // All other event types, acknowledge silently
  return NextResponse.json({ ok: true });
}
