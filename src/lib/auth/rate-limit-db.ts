import { createSupabaseAdmin } from "@/lib/supabase-server";
import { isRateLimited as isRateLimitedMemory, peekAttemptCount } from "./rate-limit";

/**
 * Durable, Postgres-backed rate limiting via the auth_rate_hit() /
 * auth_email_status() SECURITY DEFINER functions (see
 * supabase/migrations/auth_security.sql -- Oussama must run this in the
 * Supabase SQL Editor). Every call here fails SAFE: if the migration
 * hasn't run yet (missing function/table -- PostgREST PGRST202/42883, or
 * the table missing 42P01) or the RPC call otherwise errors, this falls
 * back to the existing in-memory limiter (rate-limit.ts) and generic
 * messaging instead of either crashing the auth flow or opening it wide.
 * A warning is logged either way so the gap is visible in server logs.
 */

export type EmailAccountStatus = "none" | "password" | "google_only" | "unconfirmed";

export interface RateHitResult {
  allowed: boolean;
  /** Best-effort remaining-attempts count for UX ("X tries left"). Not
      guaranteed precise across the DB/memory fallback boundary -- purely
      informational, never the actual security boundary (that's `allowed`). */
  remaining: number;
  /** true when this result came from the in-memory fallback, not the DB. */
  usedFallback: boolean;
}

export async function rateHit(key: string, limit: number, windowSeconds: number): Promise<RateHitResult> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.rpc("auth_rate_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const allowed = data === true;

    let remaining = 0;
    if (allowed) {
      const { data: row } = await admin
        .from("auth_rate_limits")
        .select("count")
        .eq("key", key)
        .maybeSingle();
      const used = (row as { count?: number } | null)?.count ?? 0;
      remaining = Math.max(0, limit - used);
    }
    return { allowed, remaining, usedFallback: false };
  } catch (err) {
    console.warn(`[rate-limit-db] auth_rate_hit unavailable for key=${key}, falling back to in-memory limiter: ${(err as Error)?.message}`);
    const blocked = isRateLimitedMemory(key, limit, windowSeconds * 1000);
    const used = peekAttemptCount(key);
    return { allowed: !blocked, remaining: Math.max(0, limit - used), usedFallback: true };
  }
}

/**
 * Read-only peek at a durable rate-limit bucket, WITHOUT incrementing it --
 * used by the wrong-code lockout (verify-code/route.ts) to block an
 * already-exhausted email before even calling Supabase, without that check
 * itself burning an attempt. Returns null when the migration hasn't run,
 * the key has never been hit, or its window has already expired (i.e.
 * "not currently limited" in every one of those cases).
 */
export async function peekRateCount(key: string, windowSeconds: number): Promise<{ count: number } | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("auth_rate_limits")
      .select("count, window_start")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as { count: number; window_start: string };
    const ageMs = Date.now() - new Date(row.window_start).getTime();
    if (ageMs >= windowSeconds * 1000) return null; // window expired -- treat as fresh
    return { count: row.count };
  } catch (err) {
    console.warn(`[rate-limit-db] peekRateCount unavailable for key=${key}: ${(err as Error)?.message}`);
    return null;
  }
}

/** null = lookup unavailable (migration not run / error) -- caller must fall back to generic messaging, never assume 'none'. */
export async function getEmailAccountStatus(email: string): Promise<EmailAccountStatus | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.rpc("auth_email_status", { p_email: email });
    if (error) throw error;
    const status = data as string;
    if (status === "none" || status === "password" || status === "google_only" || status === "unconfirmed") {
      return status;
    }
    return null;
  } catch (err) {
    console.warn(`[rate-limit-db] auth_email_status unavailable: ${(err as Error)?.message}`);
    return null;
  }
}
