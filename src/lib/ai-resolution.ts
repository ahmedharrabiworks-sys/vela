/**
 * One definition of "resolved by AI" for every channel.
 *
 * Resolved: the conversation or call ended without a human takeover, transfer
 * or escalation, and was not a failed or unanswered call. A call under 10
 * seconds where the caller never spoke is not a real conversation, so it
 * counts on neither side.
 */

export type Resolution = "ai" | "human" | "excluded";

export interface CallForResolution {
  created_at: string;
  outcome: string | null;
  duration_seconds: number | null;
  transcript: unknown;
}

export interface ChatForResolution {
  created_at: string;
  needs_human: boolean | null;
  needs_human_resolved_at?: string | null;
  ai_enabled?: boolean | null;
}

const SHORT_CALL_SECONDS = 10;
const ENDED_NORMALLY = /^(completed|customer-ended-call|silence-timed-out|exceeded-max-duration)$|^assistant-(ended|said)|book|appointment/;

function callerSpoke(transcript: unknown): boolean {
  let lines = transcript;
  if (typeof lines === "string") {
    try { lines = JSON.parse(lines); } catch { return false; }
  }
  return Array.isArray(lines) && lines.some((l) => (l as { role?: string })?.role === "user" && String((l as { text?: string })?.text ?? "").trim() !== "");
}

export function classifyCall(call: Pick<CallForResolution, "outcome" | "duration_seconds" | "transcript">): Resolution {
  if ((call.duration_seconds ?? 0) < SHORT_CALL_SECONDS && !callerSpoke(call.transcript)) return "excluded";
  return ENDED_NORMALLY.test((call.outcome ?? "").toLowerCase()) ? "ai" : "human";
}

export function classifyChat(chat: Pick<ChatForResolution, "needs_human" | "needs_human_resolved_at" | "ai_enabled">): Resolution {
  return chat.needs_human || chat.needs_human_resolved_at || chat.ai_enabled === false ? "human" : "ai";
}

export interface ResolutionWindow { rate: number | null; handled: number; needed: number }

/** Rate for rows created in [startMs, endMs). Null when nothing real happened. */
export function resolutionInWindow(calls: CallForResolution[], chats: ChatForResolution[], startMs: number, endMs: number): ResolutionWindow {
  const inside = (iso: string) => { const t = new Date(iso).getTime(); return t >= startMs && t < endMs; };
  const results = [
    ...calls.filter((c) => inside(c.created_at)).map(classifyCall),
    ...chats.filter((c) => inside(c.created_at)).map(classifyChat),
  ];
  const handled = results.filter((r) => r === "ai").length;
  const needed = results.filter((r) => r === "human").length;
  return { rate: handled + needed > 0 ? Math.round((handled / (handled + needed)) * 100) : null, handled, needed };
}

/** Current rolling window and the one before it. */
export function resolutionForRange(calls: CallForResolution[], chats: ChatForResolution[], nowMs: number, days: number) {
  const span = days * 86_400_000;
  return {
    current: resolutionInWindow(calls, chats, nowMs - span, nowMs + 1),
    previous: resolutionInWindow(calls, chats, nowMs - span * 2, nowMs - span),
  };
}
