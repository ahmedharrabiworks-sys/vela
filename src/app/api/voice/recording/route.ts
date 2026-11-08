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

  // Byte ranges: iPhone Safari refuses to play audio without them.
  const total = audio.byteLength;
  const headers = { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "Accept-Ranges": "bytes" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    return new Response(audio.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(audio, { headers: { ...headers, "Content-Length": String(total) } });
}
