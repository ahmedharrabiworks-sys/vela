import dns from "node:dns";
import disposableDomains from "disposable-email-domains";
import { isValidEmailSyntax, normalizeEmail } from "./email";

// Server-only. Never import this from a "use client" component -- the
// disposable-domain package (120k+ entries) and Node's `dns` module both
// belong exclusively in Route Handlers.

// Defense-in-depth: explicitly named in the task even though the npm
// package already covers all of these (confirmed) -- kept as a literal
// safety net in case a future package upgrade ever drops one.
const EXPLICIT_DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "temp-mail.org",
  "yopmail.com",
  "tempmail.dev",
  "throwawaymail.com",
  "getnada.com",
  "trashmail.com",
  "fakeinbox.com",
  "sharklasers.com",
  "dispostable.com",
]);

const DISPOSABLE_SET = new Set<string>([...disposableDomains, ...EXPLICIT_DISPOSABLE_DOMAINS]);

export type EmailCheckReason =
  | "invalid_syntax"
  | "disposable_domain"
  | "no_mx_record"
  | "ok";

export interface EmailCheckResult {
  ok: boolean;
  reason: EmailCheckReason;
  email: string;
}

/**
 * MX lookup with a 3s timeout. On genuine DNS timeout (not NXDOMAIN, not
 * "no records" -- an actual hang/network hiccup) this FAILS OPEN (treats
 * the domain as acceptable) and logs it server-side, per the explicit
 * instruction: a real user must never be blocked by a transient DNS
 * problem on Vela's own resolver.
 */
async function hasMxRecord(domain: string): Promise<"has_mx" | "no_mx" | "timeout"> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve("timeout");
      }
    }, 3000);

    dns.resolveMx(domain, (err, addresses) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        // ENOTFOUND / ENODATA both mean "no MX records" -- a domain that
        // genuinely cannot receive mail. Any other error code is treated
        // as an uncertain/transient condition, same as a timeout.
        if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
          resolve("no_mx");
        } else {
          resolve("timeout");
        }
        return;
      }
      resolve(addresses && addresses.length > 0 ? "has_mx" : "no_mx");
    });
  });
}

export async function checkEmailServerSide(raw: string): Promise<EmailCheckResult> {
  const email = normalizeEmail(raw);

  if (!isValidEmailSyntax(email)) {
    return { ok: false, reason: "invalid_syntax", email };
  }

  const domain = email.split("@")[1];

  if (DISPOSABLE_SET.has(domain)) {
    console.warn(`[email-server] blocked disposable domain: ${domain}`);
    return { ok: false, reason: "disposable_domain", email };
  }

  const mx = await hasMxRecord(domain);
  if (mx === "no_mx") {
    console.warn(`[email-server] blocked, no MX record: ${domain}`);
    return { ok: false, reason: "no_mx_record", email };
  }
  if (mx === "timeout") {
    // Fail open, log it -- see hasMxRecord's own comment.
    console.warn(`[email-server] MX lookup timed out, allowing (fail-open): ${domain}`);
  }

  return { ok: true, reason: "ok", email };
}
