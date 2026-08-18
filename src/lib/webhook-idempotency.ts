// In-memory, per-instance idempotency guard for inbound channel webhooks.
// Root cause of the "duplicate AI reply" bug: Meta retries webhook delivery
// (WhatsApp/Instagram) if the handler doesn't ack fast enough, and a single
// /api/ai/reply turn can involve 2-3 sequential OpenAI calls -- comfortably
// slow enough under real latency to miss the retry window. Without this, a
// retried delivery reprocesses the exact same inbound message end to end:
// second AI generation, second send, identical text delivered twice.
//
// Keyed by a unique message id from the provider (WhatsApp's messages[].id,
// Instagram's message.mid). Limitation: resets on cold start and isn't
// shared across serverless instances -- same known tradeoff as the existing
// per-tenant rate limiter in ai/reply/route.ts; still catches the realistic
// case (a fast retry landing on the same warm instance).
const SEEN_MESSAGE_IDS = new Map<string, number>();
const TTL_MS = 10 * 60 * 1000; // comfortably longer than any realistic webhook retry window

export function isDuplicateWebhookMessage(id: string): boolean {
  const now = Date.now();
  for (const [key, ts] of SEEN_MESSAGE_IDS) {
    if (now - ts > TTL_MS) SEEN_MESSAGE_IDS.delete(key);
  }
  if (SEEN_MESSAGE_IDS.has(id)) return true;
  SEEN_MESSAGE_IDS.set(id, now);
  return false;
}
