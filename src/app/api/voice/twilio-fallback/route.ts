import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { findTenantByCalledNumber, forbidden, politeVoicemailTwiml, readSignedTwilioRequest } from "@/lib/twilio-voice";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The Twilio number's Voice Fallback URL: Twilio calls this if the main
// webhook errors or times out. Always the polite message, no Vapi involved.
export async function POST(req: NextRequest) {
  const params = await readSignedTwilioRequest(req);
  if (!params) return forbidden();

  let businessName: string | null = null;
  try {
    const admin = createSupabaseAdmin() as any;
    const cfg = await findTenantByCalledNumber(admin, params.To);
    if (cfg) {
      const { data } = await admin.from("tenants").select("business_name").eq("id", cfg.tenant_id).maybeSingle();
      businessName = (data?.business_name as string | undefined) || "our team";
    }
  } catch (err) {
    console.error("[twilio-fallback] lookup failed:", (err as Error)?.message);
  }
  return politeVoicemailTwiml(businessName);
}
