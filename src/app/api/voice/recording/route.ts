import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin, createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchTwilioRecording } from "@/lib/twilio-voice";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Plays a voicemail to the signed-in owner of that call's business only.
// Twilio credentials stay on the server.
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const callId = req.nextUrl.searchParams.get("call") ?? "";
  if (!UUID_RE.test(callId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createSupabaseAdmin() as any;
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: row } = await admin.from("agent_calls").select("kb_extracted").eq("id", callId).eq("tenant_id", tenant.id).maybeSingle();
  const vm = row?.kb_extracted?.voicemail as { recordingSid?: string; accountSid?: string } | undefined;
  if (!vm?.recordingSid || !vm.accountSid) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const audio = await fetchTwilioRecording(vm.accountSid, vm.recordingSid);
  if (!audio) return NextResponse.json({ error: "Recording unavailable" }, { status: 502 });
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
}
