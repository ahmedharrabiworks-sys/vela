/**
 * Shared in-memory sliding-window rate limiter for auth routes (signup,
 * forgot-password, resend). Same pattern already used independently in
 * ai/reply/route.ts and the old signup route -- consolidated here so
 * every auth route that needs a limit uses one implementation instead of
 * each hand-rolling its own Map. Same known limitation as those routes:
 * resets on cold start / does not share state across serverless
 * instances -- an abuse ceiling, not an airtight guarantee. A durable
 * store (e.g. Upstash Redis) would be needed for that; out of scope here.
 */
const buckets = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
}

/** Rejects a request whose declared Content-Length exceeds the cap, before the body is even read. */
export function isBodyTooLarge(req: Request, maxBytes: number): boolean {
  const len = req.headers.get("content-length");
  if (!len) return false; // no declared length -- let JSON parsing itself fail naturally on garbage
  const n = parseInt(len, 10);
  return Number.isFinite(n) && n > maxBytes;
}
