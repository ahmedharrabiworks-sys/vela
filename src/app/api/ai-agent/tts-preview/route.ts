import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_VOICE_ID } from "@/lib/vapi-agent-config";

export const dynamic = "force-dynamic";

const SAMPLE_TEXT =
  "Hello! I'm Vela, your AI phone agent. I'll be handling your business calls with a natural, professional voice — 24 hours a day, 7 days a week.";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add ELEVEN_LABS_API_KEY to .env.local to enable voice previews." },
      { status: 422 }
    );
  }

  const body = await req.json().catch(() => ({})) as { voiceId?: string; speed?: number; text?: string };
  const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;
  const speed   = Math.min(Math.max(body.speed ?? 0.85, 0.5), 2.0);
  const text    = body.text ?? SAMPLE_TEXT;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key":   apiKey,
      "Content-Type": "application/json",
      Accept:         "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability:         0.45,
        similarity_boost:  0.8,
        style:             0.25,
        use_speaker_boost: true,
        speed,
      },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "ElevenLabs API error");
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "Content-Type":  "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
