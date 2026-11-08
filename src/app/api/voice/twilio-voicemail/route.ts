import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";
import { hasConfirmedCountryCode } from "@/lib/phone-validate";
import { isReliableCallerId } from "@/lib/vapi-webhook";
import { sendAlertEmail } from "@/lib/vapi-health";
import {
  fetchTwilioCall,
  fetchTwilioRecording,
  findTenantByCalledNumber,
  forbidden,
  goodbyeTwiml,
  normalizeTwilioCaller,
  readSignedTwilioRequest,
} from "@/lib/twilio-voice";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

// step=done: <Record> finished, say goodbye (and log the call if the caller
// left nothing). step=recording: the audio is ready, save the voicemail.
export async function POST(req: NextRequest) {
  const params = await readSignedTwilioRequest(req);
  if (!params) return forbidden();

  const step = req.nextUrl.searchParams.get("step");
  const admin = createSupabaseAdmin() as any;

  if (step === "done") {
    if (!params.RecordingUrl || Number(params.RecordingDuration ?? 0) <= 0) {
      try { await logCallWithoutMessage(admin, params.To, params.From); }
      catch (err) { console.error("[twilio-voicemail] missed-call log failed:", (err as Error)?.message); }
    }
    return goodbyeTwiml();
  }

  if (step === "recording") {
    if (params.RecordingStatus === "completed") {
      try { await saveVoicemail(admin, params); }
      catch (err) { console.error("[twilio-voicemail] save failed:", (err as Error)?.message); }
    }
    return NextResponse.json({ ok: true });
  }

  return new Response("Bad request", { status: 400 });
}

async function logCallWithoutMessage(admin: any, to: string | undefined, from: string | undefined) {
  const cfg = await findTenantByCalledNumber(admin, to);
  if (!cfg) return;
  const caller = normalizeTwilioCaller(from);
  await admin.from("agent_calls").insert({
    tenant_id: cfg.tenant_id,
    call_type: "live",
    caller_number: caller,
    transcript: [],
    summary: "Missed call. The caller did not leave a message.",
    outcome: "missed",
  });
  await createNotification(admin, {
    tenantId: cfg.tenant_id,
    type: "missed_call",
    title: "Missed call",
    body: caller ?? "Hidden number",
    link: "/app/ai-agent/overview",
  });
}

async function transcribe(audio: ArrayBuffer): Promise<{ text: string; language: string }> {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) return { text: "", language: "en" };
  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), "voicemail.mp3");
    form.append("model_id", "scribe_v1");
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) { console.warn("[twilio-voicemail] transcription failed:", res.status); return { text: "", language: "en" }; }
    const j = await res.json() as { text?: string; language_code?: string };
    return { text: (j.text ?? "").trim(), language: (j.language_code ?? "").startsWith("ar") ? "ar" : "en" };
  } catch (err) {
    console.warn("[twilio-voicemail] transcription error:", (err as Error)?.name);
    return { text: "", language: "en" };
  }
}

async function saveVoicemail(admin: any, params: Record<string, string>) {
  const { AccountSid: accountSid, CallSid: callSid, RecordingSid: recordingSid } = params;
  const seconds = Math.round(Number(params.RecordingDuration ?? 0));

  // Twilio can retry this callback: one recording, one row.
  const { data: existing } = await admin.from("agent_calls").select("id").eq("kb_extracted->voicemail->>recordingSid", recordingSid).limit(1);
  if (existing && existing.length > 0) return;

  const call = await fetchTwilioCall(accountSid, callSid);
  if (!call) throw new Error("could not read call details");
  const cfg = await findTenantByCalledNumber(admin, call.to);
  if (!cfg) throw new Error("no tenant for called number");
  const tenantId = cfg.tenant_id;
  const caller = normalizeTwilioCaller(call.from);

  const audio = await fetchTwilioRecording(accountSid, recordingSid);
  const { text, language } = audio ? await transcribe(audio) : { text: "", language: "en" };

  const { data: row, error } = await admin.from("agent_calls").insert({
    tenant_id: tenantId,
    call_type: "live",
    duration_seconds: seconds > 0 ? seconds : null,
    language,
    caller_number: caller,
    transcript: text ? [{ role: "user", text }] : [],
    summary: text ? `Voicemail: ${text}`.slice(0, 1000) : `Voicemail (${seconds}s). No transcript available.`,
    outcome: "voicemail",
    kb_extracted: { voicemail: { recordingSid, accountSid, durationSeconds: seconds } },
  }).select("id").single();
  if (error || !row) throw new Error(`agent_calls insert failed: ${error?.message ?? "no row"}`);

  const { data: tenant } = await admin.from("tenants").select("phone, owner_id").eq("id", tenantId).maybeSingle();

  // Same rule as live calls: only a trustworthy caller ID may merge leads.
  const reliable = isReliableCallerId(caller, [tenant?.phone, cfg.vapi_phone_number]);
  const formData = { source: "voicemail", recording_sid: recordingSid, call_sid: callSid };
  const intent = text ? text.slice(0, 200) : null;
  let leadId: string | null = null;
  if (reliable) {
    const { data: lead } = await admin.from("leads").select("id, form_data")
      .eq("tenant_id", tenantId).eq("channel", "phone").eq("phone", caller)
      .is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (lead) {
      leadId = lead.id;
      await admin.from("leads").update({ intent_summary: intent, form_data: { ...(lead.form_data ?? {}), ...formData } }).eq("id", lead.id).eq("tenant_id", tenantId);
    }
  }
  if (!leadId) {
    const phone = reliable ? caller : null;
    await admin.from("leads").insert({
      tenant_id: tenantId,
      name: caller ?? "Voicemail caller",
      phone,
      phone_unconfirmed: !phone || !hasConfirmedCountryCode(phone),
      channel: "phone",
      status: "new",
      intent_summary: intent,
      form_data: formData,
    });
  }

  const who = caller ?? "Hidden number";
  await createNotification(admin, {
    tenantId,
    type: "missed_call",
    title: "New voicemail",
    body: `${who}${text ? `: ${text.slice(0, 140)}` : ""}`,
    link: "/app/ai-agent/overview",
  });

  if (tenant?.owner_id) {
    const { data: owner } = await admin.auth.admin.getUserById(tenant.owner_id);
    const email = owner?.user?.email as string | undefined;
    if (email) {
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://velaos.co").replace(/\/+$/, "");
      await sendAlertEmail(
        email,
        `New voicemail from ${who}`,
        `${who} left a ${seconds}s voicemail.\n\n${text || "No transcript available."}\n\nListen (log in first): ${base}/api/voice/recording?call=${row.id}`,
      );
    }
  }
}
