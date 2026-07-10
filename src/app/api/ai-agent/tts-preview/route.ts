import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_VOICE_ID, clampSpeed } from "@/lib/vapi-agent-config";

export const dynamic = "force-dynamic";

// Short text — less to generate = less latency for preview
const SAMPLE_TEXT = "Hi, I'm Vela — your AI phone agent. How can I help you today?";

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
  const speed   = clampSpeed(body.speed ?? 0.85);
  const text    = body.text ?? SAMPLE_TEXT;

  // eleven_turbo_v2_5: faster generation than eleven_multilingual_v2, still multilingual
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key":   apiKey,
      "Content-Type": "application/json",
      Accept:         "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
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
