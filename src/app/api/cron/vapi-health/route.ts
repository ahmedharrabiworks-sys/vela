import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { LOW_BALANCE_USD, alertPlatformOwner, probeVapiWallet, vapiAlertFor } from "@/lib/vapi-health";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Scheduled in vercel.json. Vercel sends "Authorization: Bearer CRON_SECRET".
// Fails closed if CRON_SECRET isn't set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await probeVapiWallet();
  const admin = createSupabaseAdmin() as any;
  let alert: string = "none";

  if (result.state === "empty" && (result.balance === null || result.balance < LOW_BALANCE_USD)) {
    const a2 = vapiAlertFor("wallet", result.balance);
    alert = await alertPlatformOwner(admin, a2.title, a2.body, 20);
  } else if (result.state === "unreachable") {
    const a2 = vapiAlertFor("unreachable", result.detail);
    alert = await alertPlatformOwner(admin, a2.title, a2.body, 20);
  }

  return NextResponse.json({ ...result, alert });
}
