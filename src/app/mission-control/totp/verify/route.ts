import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import {
  MC_TOTP_SECRET,
  MC_SESSION_COOKIE,
  MC_SESSION_TTL_MS,
  MC_PENDING_COOKIE,
  buildMcSessionCookie,
  verifyPendingCookie,
  isOwnerEmail,
  logMcAttempt,
} from "@/lib/mission-control-auth";

// ── Self-contained RFC 6238 TOTP (no external library) ────────────────────────
function decodeBase32(input: string): Buffer {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of input.toUpperCase().replace(/=+$/, "")) {
    const idx = alpha.indexOf(c);
    if (idx !== -1) bits += idx.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{1,8}/g) ?? []).map((b) => parseInt(b, 2)));
}

function totpCode(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", decodeBase32(secret)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

// ±1 window handles up to 30s of clock skew between server and authenticator app
function verifyTotp(token: string, secret: string, step = 30): boolean {
  const counter = Math.floor(Date.now() / 1000 / step);
  return [-1, 0, 1].some((w) => totpCode(secret, counter + w) === token);
}

export async function POST(request: NextRequest) {
  // Verify the pending cookie set by the OAuth callback
  const pendingValue = request.cookies.get(MC_PENDING_COOKIE)?.value;
  const email = pendingValue ? await verifyPendingCookie(pendingValue) : null;

  if (!email) {
    return NextResponse.redirect(
      new URL("/mission-control/login?error=session_expired", request.url),
    );
  }

  // Defense in depth: re-check allowlist even though it was checked at OAuth time
  if (!isOwnerEmail(email)) {
    return NextResponse.redirect(
      new URL("/mission-control/login?error=not_authorized", request.url),
    );
  }

  const formData = await request.formData();
  const code = ((formData.get("code") as string | null) ?? "").replace(/\s/g, "");

  const isValid = verifyTotp(code, MC_TOTP_SECRET);

  if (!isValid) {
    return NextResponse.redirect(
      new URL("/mission-control/totp?error=invalid_code", request.url),
    );
  }

  // Both factors passed — issue the MC session cookie
  const sessionValue = await buildMcSessionCookie(email);

  await logMcAttempt({
    email,
    outcome: "granted",
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
    route: "/mission-control/totp/verify",
  });

  const response = NextResponse.redirect(
    new URL("/mission-control", request.url),
  );

  response.cookies.set(MC_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   Math.floor(MC_SESSION_TTL_MS / 1000),
    path:     "/mission-control",
  });

  // Clear the pending cookie
  response.cookies.set(MC_PENDING_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/mission-control",
  });

  return response;
}
