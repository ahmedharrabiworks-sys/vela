// ============================================================
// Mission Control — auth primitives
// HARD RULE 21: OWNER_EMAILS is a hardcoded const in source code.
// Changing access requires a real code deployment — never a DB row or env var.
// This file uses only Web Crypto API, btoa/atob, and fetch — fully Edge-compatible.
// ============================================================

// ── Allowlist ─────────────────────────────────────────────────────────────────
// To grant/revoke access: edit this array and deploy.
// Re-checked on EVERY request, not only at login.
export const OWNER_EMAILS: string[] = [
  "owner@placeholder.com",
  "partner@placeholder.com",
];

export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
}

// ── TOTP ──────────────────────────────────────────────────────────────────────
// Placeholder base32 secret — replace before going live.
// Generate a real secret (run once, store the output here, never in env/DB):
//   node -e "const {authenticator}=require('otplib');console.log(authenticator.generateSecret())"
// Never store in env vars or DB — must live here alongside the allowlist.
export const MC_TOTP_SECRET = "JBSWY3DPEHPK3PXP"; // placeholder

// ── Cookie names & TTLs ───────────────────────────────────────────────────────
// Dedicated to /mission-control — never shared with the main app's sb-xxx-auth-token
export const MC_SESSION_COOKIE  = "mc_session_verified";
export const MC_PENDING_COOKIE  = "mc_totp_pending";
export const MC_SESSION_TTL_MS  = 8 * 60 * 60 * 1000;   // 8 hours
export const MC_PENDING_TTL_MS  = 5 * 60 * 1000;         // 5 minutes

// ── HMAC helpers (Web Crypto API — Edge-compatible) ───────────────────────────
async function hmacSha256(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-dev-key"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildSignedCookie(payload: Record<string, unknown>): Promise<string> {
  const encoded = btoa(JSON.stringify(payload));
  const sig = await hmacSha256(encoded);
  return `${encoded}.${sig}`;
}

async function verifySignedCookie(
  value: string,
): Promise<Record<string, unknown> | null> {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = value.slice(0, dot);
  const sig     = value.slice(dot + 1);

  const expected = await hmacSha256(encoded);
  if (expected.length !== sig.length) return null;

  // Constant-time comparison to prevent timing attacks
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    return JSON.parse(atob(encoded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Session cookie (set after TOTP passes) ────────────────────────────────────
export async function buildMcSessionCookie(email: string): Promise<string> {
  return buildSignedCookie({ email, exp: Date.now() + MC_SESSION_TTL_MS });
}

export async function verifyMcSessionCookie(value: string): Promise<string | null> {
  const data = await verifySignedCookie(value);
  if (!data || typeof data.email !== "string" || typeof data.exp !== "number") return null;
  if (data.exp < Date.now()) return null;
  if (!isOwnerEmail(data.email)) return null; // re-check allowlist on every verify
  return data.email;
}

// ── Pending cookie (set after OAuth passes, before TOTP) ─────────────────────
export async function buildPendingCookie(email: string): Promise<string> {
  return buildSignedCookie({ email, exp: Date.now() + MC_PENDING_TTL_MS });
}

export async function verifyPendingCookie(value: string): Promise<string | null> {
  const data = await verifySignedCookie(value);
  if (!data || typeof data.email !== "string" || typeof data.exp !== "number") return null;
  if (data.exp < Date.now()) return null;
  return data.email;
}

// ── Audit log (direct Supabase REST — Edge-compatible) ───────────────────────
export async function logMcAttempt(params: {
  email: string;
  outcome: "granted" | "denied_not_allowlisted" | "denied_no_session";
  ip: string | null;
  userAgent: string | null;
  route: string;
}): Promise<void> {
  const sbUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!sbUrl || !svcKey || !anonKey) return;

  try {
    await fetch(`${sbUrl}/rest/v1/mission_control_access_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:          anonKey,
        Authorization:   `Bearer ${svcKey}`,
        Prefer:          "return=minimal",
      },
      body: JSON.stringify({
        email:      params.email,
        outcome:    params.outcome,
        ip_address: params.ip,
        user_agent: params.userAgent,
        route:      params.route,
      }),
    });
  } catch {
    // Logging failure is non-fatal — never block a response for it
  }
}
