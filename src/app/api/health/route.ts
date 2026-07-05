import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

function classifyOpenAIError(err: unknown): string {
  if (!(err instanceof Error)) return "unknown_error";
  const apiErr = err as { status?: number; error?: { type?: string; code?: string } };
  if (apiErr.error?.type) return apiErr.error.type;
  if (apiErr.status === 401) return "invalid_api_key";
  if (apiErr.status === 429) return "rate_limited";
  if (apiErr.status === 402) return "insufficient_quota";
  const msg = err.message.toLowerCase();
  if (msg.includes("quota") || msg.includes("billing") || msg.includes("insufficient")) return "insufficient_quota";
  if (msg.includes("incorrect api key") || (msg.includes("invalid") && msg.includes("key"))) return "invalid_api_key";
  if (msg.includes("rate limit") || msg.includes("rate_limit")) return "rate_limited";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("connect") || msg.includes("network") || msg.includes("fetch failed")) return "network_error";
  return "unknown_error";
}

export async function GET() {
  const openaiKeyPresent = !!process.env.OPENAI_API_KEY;
  let openaiReachable = false;
  let openaiError: string | undefined;

  if (openaiKeyPresent) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      });
      openaiReachable = true;
    } catch (err) {
      openaiError = classifyOpenAIError(err);
      const s = (err as { status?: number }).status;
      if (s) openaiError += `_http${s}`;
    }
  } else {
    openaiError = "key_not_set";
  }

  let supabaseReachable = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(4000),
      });
      supabaseReachable = res.status < 500;
    }
  } catch { /* unreachable */ }

  return NextResponse.json({
    openaiKeyPresent,
    openaiReachable,
    ...(openaiError ? { openaiError } : {}),
    supabaseReachable,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "not set",
  });
}
