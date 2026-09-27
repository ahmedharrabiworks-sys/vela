/**
 * Client-safe email checks: syntax validation + typo suggestions. The
 * disposable-domain blocklist and MX lookup are SERVER-ONLY (email-
 * server.ts) -- a 120k-entry npm package and Node's `dns` module have no
 * business in the browser bundle, and disposable-domain checking must not
 * be bypassable by a client that just skips calling it.
 */

// RFC 5322 is notoriously complex to fully match; this is the same
// pragmatic "good enough, rejects obvious garbage" pattern used
// throughout the industry (including Supabase's own client-side check).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmailSyntax(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 5 || email.length > 254) return false;
  if (!EMAIL_RE.test(email)) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (domain.split(".").some((label) => label.length === 0)) return false;
  return true;
}

// Common typo'd domains -> the real domain a person almost certainly
// meant. Shown as a tappable "Did you mean...?" suggestion, never auto-
// applied. Plus-addressing (name+tag@gmail.com) is untouched by this --
// it only rewrites the DOMAIN half.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmailcom": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllook.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlokk.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "iclod.com": "icloud.com",
  "iclould.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
};

export function suggestEmailTypoFix(raw: string): string | null {
  const email = normalizeEmail(raw);
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const fix = DOMAIN_TYPOS[domain];
  if (!fix) return null;
  return `${local}@${fix}`;
}
