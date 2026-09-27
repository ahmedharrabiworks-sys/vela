/**
 * Shared password validator -- imported by BOTH the client (signup/reset
 * UI, live checklist) and the server (/api/auth/signup, /api/auth/reset-
 * password) so the rules can never drift between what the UI shows and
 * what the server actually enforces. The client cannot bypass this: the
 * server re-runs the exact same checkPasswordRules() call independently
 * of whatever the browser sent.
 *
 * The larger ~1000+ entry common-password blocklist lives in a SEPARATE
 * server-only file (password-common-server.ts) so it never ships in the
 * client bundle -- this file only carries a small ~100-entry sample,
 * enough for the client to catch the most obvious cases instantly
 * without a round trip, while the server file is the real gate.
 */

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // bcrypt's real limit -- longer is silently truncated

export interface PasswordRules {
  minLength: boolean;
  maxLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  notCommon: boolean;
  notTrivialPattern: boolean;
  notContainsIdentity: boolean;
}

export type PasswordErrorCode =
  | "tooShort"
  | "tooLong"
  | "needsLower"
  | "needsUpper"
  | "needsDigit"
  | "needsSymbol"
  | "tooCommon"
  | "trivialPattern"
  | "containsIdentity";

export interface PasswordCheckResult {
  valid: boolean;
  rules: PasswordRules;
  /** 0-4, for a 4-segment strength bar (0 = empty/invalid, 4 = all rules + real length margin) */
  score: 0 | 1 | 2 | 3 | 4;
  /** First failing rule, in the order a person should fix them -- for the one-line error message. */
  firstError: PasswordErrorCode | null;
}

// Small, genuinely common base passwords -- safe to ship to the client
// (this is public knowledge, not a secret list). The server file layers
// a much larger blocklist on top; this one alone still catches the
// overwhelming majority of naive attempts for instant client feedback.
export const COMMON_PASSWORDS_CLIENT_SAMPLE: readonly string[] = [
  "password", "123456", "123456789", "12345678", "12345", "1234567",
  "qwerty", "qwerty123", "abc123", "password1", "password123",
  "welcome", "welcome1", "letmein", "monkey", "dragon", "master",
  "iloveyou", "admin", "administrator", "login", "starwars", "sunshine",
  "princess", "football", "baseball", "superman", "batman", "trustno1",
  "whatever", "freedom", "shadow", "michael", "jennifer", "jordan",
  "hunter", "hunter2", "121212", "123123", "654321", "111111", "000000",
  "1q2w3e4r", "1qaz2wsx", "qazwsx", "zxcvbnm", "asdfgh", "asdfghjkl",
  "changeme", "letmein123", "passw0rd", "p@ssword", "p@ssw0rd",
  "welcome123", "qwertyuiop", "iloveyou1", "flower", "summer", "winter",
  "spring", "autumn", "november", "december", "january", "february",
  "computer", "internet", "coffee", "chocolate", "mustang", "cheese",
  "soccer", "hockey", "tennis", "basketball", "gizmodo", "myspace",
  "facebook", "instagram", "twitter", "google", "microsoft", "apple",
  "amazon", "netflix", "spotify", "vela", "vela123", "velaos",
  "doha", "qatar", "qatar123", "dubai", "abudhabi", "riyadh",
  "test1234", "testtest", "temppass", "temp1234", "guest1234",
  "letme1234", "abcd1234", "1234abcd", "aaaaaaaa", "11111111",
] as const;

const COMMON_SET_CLIENT = new Set(COMMON_PASSWORDS_CLIENT_SAMPLE.map((p) => p.toLowerCase()));

// Common keyboard-row / alphabet / digit "walks" -- checked as raw
// substrings (forward and reversed), independent of the common-word list.
const SEQUENCE_WALKS = [
  "0123456789", "1234567890", "abcdefghijklmnopqrstuvwxyz",
  "qwertyuiop", "asdfghjkl", "zxcvbnm", "azertyuiop",
  "qwertzuiop", // azerty/qwertz keyboard layouts
];

function reversed(s: string): string {
  return s.split("").reverse().join("");
}

/** True if `password` (lowercased) contains a 5+ char run of any known sequence/keyboard walk, forward or backward. */
function hasSequenceOrWalk(passwordLower: string): boolean {
  for (const walk of SEQUENCE_WALKS) {
    for (const w of [walk, reversed(walk)]) {
      for (let start = 0; start + 5 <= w.length; start++) {
        const chunk = w.slice(start, start + 5);
        if (passwordLower.includes(chunk)) return true;
      }
    }
  }
  return false;
}

/** True if the whole password is an exact repetition of a 1-4 char substring (aaaa, 1111, Aa1!Aa1!Aa1!, abcabc...). */
function isTrivialRepeat(password: string): boolean {
  if (password.length < 4) return false;
  for (let period = 1; period <= 4; period++) {
    if (password.length % period !== 0 && password.length < period * 2) continue;
    const unit = password.slice(0, period);
    let matches = true;
    for (let i = 0; i < password.length; i += period) {
      if (password.slice(i, i + period) !== unit.slice(0, Math.min(period, password.length - i))) {
        matches = false;
        break;
      }
    }
    if (matches && password.length >= period * 2) return true;
  }
  // Also catch 4+ of the exact same character anywhere (aaaa in the middle of a longer password).
  if (/(.)\1{3,}/.test(password)) return true;
  return false;
}

/** Strips a trailing run of digits/symbols before comparing against the common list, so "Password1!" still matches "password". */
function normalizeForCommonCheck(password: string): string {
  return password.toLowerCase().replace(/[\d!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]+$/g, "");
}

function containsIdentity(passwordLower: string, email?: string, fullName?: string): boolean {
  const fragments: string[] = [];
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) fragments.push(local);
  }
  if (fullName) {
    fragments.push(...fullName.split(/\s+/));
  }
  return fragments
    .map((f) => f.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((f) => f.length >= 4)
    .some((f) => passwordLower.includes(f));
}

export function checkPasswordRules(
  password: string,
  opts?: { email?: string; fullName?: string; commonList?: Iterable<string> }
): PasswordCheckResult {
  const pw = password ?? "";
  const lower = pw.toLowerCase();

  const commonSet = opts?.commonList ? new Set(Array.from(opts.commonList, (s) => s.toLowerCase())) : COMMON_SET_CLIENT;
  const normalized = normalizeForCommonCheck(pw);
  const isCommon = commonSet.has(lower) || commonSet.has(normalized) || COMMON_SET_CLIENT.has(lower) || COMMON_SET_CLIENT.has(normalized);

  const rules: PasswordRules = {
    minLength: pw.length >= PASSWORD_MIN,
    maxLength: pw.length <= PASSWORD_MAX,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSymbol: /[^a-zA-Z0-9]/.test(pw),
    notCommon: !isCommon,
    notTrivialPattern: !isTrivialRepeat(pw) && !hasSequenceOrWalk(lower),
    notContainsIdentity: !containsIdentity(lower, opts?.email, opts?.fullName),
  };

  const order: { key: keyof PasswordRules; code: PasswordErrorCode }[] = [
    { key: "minLength", code: "tooShort" },
    { key: "maxLength", code: "tooLong" },
    { key: "hasLower", code: "needsLower" },
    { key: "hasUpper", code: "needsUpper" },
    { key: "hasDigit", code: "needsDigit" },
    { key: "hasSymbol", code: "needsSymbol" },
    { key: "notCommon", code: "tooCommon" },
    { key: "notTrivialPattern", code: "trivialPattern" },
    { key: "notContainsIdentity", code: "containsIdentity" },
  ];

  const firstFailed = order.find((o) => !rules[o.key]);
  const valid = !firstFailed;

  const metCount = [rules.hasLower, rules.hasUpper, rules.hasDigit, rules.hasSymbol].filter(Boolean).length;
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (rules.minLength && rules.notCommon && rules.notTrivialPattern && rules.notContainsIdentity) {
    if (metCount <= 1) score = 1;
    else if (metCount === 2) score = 2;
    else if (metCount === 3) score = 3;
    else score = pw.length >= 14 ? 4 : 3;
  } else if (pw.length > 0) {
    score = 1;
  }

  return { valid, rules, score, firstError: firstFailed?.code ?? null };
}
