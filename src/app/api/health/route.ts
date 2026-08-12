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

  // TEMPORARY DIAGNOSTIC — added to pin down why an updated ELEVEN_LABS_API_KEY
  // in Vercel wasn't taking effect. Never returns the full key, only presence,
  // length, and the first 4 characters, so the deployed value can be confirmed
  // against what was set in Vercel without exposing the secret. Remove once the
  // key mismatch is confirmed resolved.
  const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;
  const elevenLabsKeyPresent = !!elevenLabsKey;
  const elevenLabsKeyLength = elevenLabsKey?.length ?? 0;
  const elevenLabsKeyPrefix = elevenLabsKey ? elevenLabsKey.slice(0, 4) : null;
  let elevenLabsReachable = false;
  let elevenLabsError: string | undefined;
  let elevenLabsErrorDetail: string | undefined;

  if (elevenLabsKeyPresent) {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": elevenLabsKey! },
        signal: AbortSignal.timeout(4000),
      });
      elevenLabsReachable = res.ok;
      if (!res.ok) {
        elevenLabsError = res.status === 401 ? "invalid_api_key" : `http_${res.status}`;
        // ElevenLabs' own error message about the request, not our secret -- safe to
        // surface, truncated defensively in case it ever echoes back request headers.
        elevenLabsErrorDetail = (await res.text().catch(() => "")).slice(0, 300);
      }
    } catch {
      elevenLabsError = "network_error";
    }
  } else {
    elevenLabsError = "key_not_set";
  }

  // TEMPORARY DIAGNOSTIC — added while root-causing the Vapi "ejected / Meeting
  // has ended" failure on Training and the generic call failure on Overview, to
  // rule in or out a Vapi account/credit/auth problem as a shared cause. Never
  // returns the full key, only presence, length, and reachability against
  // Vapi's own /org endpoint. Remove once the call failures are confirmed fixed.
  const vapiKey = process.env.VAPI_API_KEY;
  const vapiKeyPresent = !!vapiKey;
  const vapiKeyLength = vapiKey?.length ?? 0;
  const vapiKeyPrefix = vapiKey ? vapiKey.slice(0, 4) : null;
  let vapiReachable = false;
  let vapiError: string | undefined;
  let vapiErrorDetail: string | undefined;

  if (vapiKeyPresent) {
    try {
      const res = await fetch("https://api.vapi.ai/org", {
        headers: { Authorization: `Bearer ${vapiKey}` },
        signal: AbortSignal.timeout(4000),
      });
      vapiReachable = res.ok;
      if (!res.ok) {
        vapiError = res.status === 401 ? "invalid_api_key" : `http_${res.status}`;
        vapiErrorDetail = (await res.text().catch(() => "")).slice(0, 300);
      }
    } catch {
      vapiError = "network_error";
    }
  } else {
    vapiError = "key_not_set";
  }

  const vapiPublicKeyPresent = !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const vapiWebhookSecretPresent = !!process.env.VAPI_WEBHOOK_SECRET;

  return NextResponse.json({
    openaiKeyPresent,
    openaiReachable,
    ...(openaiError ? { openaiError } : {}),
    supabaseReachable,
    elevenLabsKeyPresent,
    elevenLabsKeyLength,
    elevenLabsKeyPrefix,
    elevenLabsReachable,
    ...(elevenLabsError ? { elevenLabsError } : {}),
    ...(elevenLabsErrorDetail ? { elevenLabsErrorDetail } : {}),
    vapiKeyPresent,
    vapiKeyLength,
    vapiKeyPrefix,
    vapiReachable,
    ...(vapiError ? { vapiError } : {}),
    ...(vapiErrorDetail ? { vapiErrorDetail } : {}),
    vapiPublicKeyPresent,
    vapiWebhookSecretPresent,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "not set",
  });
}
