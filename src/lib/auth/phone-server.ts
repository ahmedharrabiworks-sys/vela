import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

// Server-only authoritative phone check. Deliberately imports the /max
// metadata build (not /min) -- see the note in PhoneInput.tsx's glass
// prop area / the FIX 6 report for why: the task asked for min metadata
// (client bundle size) AND a mobile-or-fixed-line type check, which are
// mutually exclusive with this library (min metadata has no getType()).
// Resolved by keeping the CLIENT on the lighter default import (real-time
// AsYouType formatting, basic isValid()) and using /max ONLY here,
// server-side, where bundle size is irrelevant and this is the real gate
// anyway per "server-side re-validation wherever the phone is persisted".

const ACCEPTABLE_TYPES = new Set(["MOBILE", "FIXED_LINE", "FIXED_LINE_OR_MOBILE"]);

export interface PhoneCheckResult {
  ok: boolean;
  e164: string | null;
}

export function checkPhoneServerSide(nationalOrE164: string, iso2?: CountryCode): PhoneCheckResult {
  const trimmed = (nationalOrE164 ?? "").trim();
  if (!trimmed) return { ok: false, e164: null };

  // An E.164 string (starts with "+") is self-describing -- no country
  // hint needed or wanted, it would be ignored anyway. A bare national
  // number requires the hint to know which country's rules to apply.
  const parsed = trimmed.startsWith("+")
    ? parsePhoneNumberFromString(trimmed)
    : iso2
      ? parsePhoneNumberFromString(trimmed, iso2)
      : undefined;
  if (!parsed || !parsed.isValid()) return { ok: false, e164: null };

  const type = parsed.getType();
  // Undefined type (some regions' metadata doesn't classify every number)
  // is allowed through on isValid() alone rather than rejected -- only a
  // CONFIRMED non-mobile/non-fixed-line type (premium rate, toll free,
  // voip, etc.) is rejected.
  if (type && !ACCEPTABLE_TYPES.has(type)) return { ok: false, e164: null };

  return { ok: true, e164: parsed.number };
}
