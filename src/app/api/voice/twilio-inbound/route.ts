import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { prepareInboundCall } from "@/lib/phone-call-setup";
import {
  findTenantByCalledNumber,
  forbidden,
  normalizeTwilioCaller,
  politeVoicemailTwiml,
  readSignedTwilioRequest,
  twiml,
} from "@/lib/twilio-voice";
import { alertPlatformOwner, handOffToVapi, vapiAlertFor } from "@/lib/vapi-health";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Vela's front door for phone calls (the Twilio number's Voice URL).
// Healthy: Vapi takes the call. Anything else: polite voicemail in Twilio's
// own voice, so a caller never hears a provider's billing or error message.
export async function POST(req: NextRequest) {
  const params = await readSignedTwilioRequest(req);
  if (!params) return forbidden();

  const caller = normalizeTwilioCaller(params.From);
  let businessName: string | null = null;

  try {
    const admin = createSupabaseAdmin() as any;
    const cfg = await findTenantByCalledNumber(admin, params.To);
    if (!cfg) {
      console.warn("[twilio-inbound] no tenant for called number");
      return politeVoicemailTwiml(null);
    }

    const prepared = await prepareInboundCall(admin, cfg, caller);
    businessName = prepared.businessName;

    if (!prepared.ok) {
      console.log("[twilio-inbound] voicemail", JSON.stringify({ tenantId: cfg.tenant_id, reason: prepared.reason }));
      return politeVoicemailTwiml(businessName);
    }
    if (!cfg.vapi_phone_number_id) {
      console.warn("[twilio-inbound] voicemail: number not linked to Vapi", JSON.stringify({ tenantId: cfg.tenant_id }));
      return politeVoicemailTwiml(businessName);
    }

    const handOff = await handOffToVapi({
      phoneNumberId: cfg.vapi_phone_number_id,
      callerNumber: caller,
      assistant: prepared.assistant,
    });
    if (handOff.ok) {
      console.log("[twilio-inbound] handed to Vapi", JSON.stringify({ tenantId: cfg.tenant_id, callId: handOff.callId }));
      return twiml(handOff.twiml.replace(/^<\?xml[^>]*\?>\s*/, ""));
    }

    const detail = handOff.reason === "wallet" ? handOff.balance : handOff.detail;
    console.error("[twilio-inbound] hand-off failed", JSON.stringify({ tenantId: cfg.tenant_id, reason: handOff.reason, detail }));
    // A hidden caller ID being refused is about that one call, not an outage.
    if (handOff.reason !== "rejected" || caller) {
      const alert = vapiAlertFor(handOff.reason, detail);
      await alertPlatformOwner(admin, alert.title, alert.body).catch(() => "failed");
    }
    return politeVoicemailTwiml(businessName);
  } catch (err) {
    console.error("[twilio-inbound] error, playing voicemail:", (err as Error)?.message);
    return politeVoicemailTwiml(businessName);
  }
}
