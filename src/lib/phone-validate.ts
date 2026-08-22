import { parsePhoneNumberFromString } from "libphonenumber-js";

// FIX 6 (round P): a customer-provided phone number like "280423" was being
// saved as final, equal-status contact info with no validation at all.
// Deliberately does NOT pass a country hint (unlike PhoneInput.tsx's
// isValidPhoneForCountry, used for the OWNER's own business phone where the
// country is already known from a dropdown) -- a customer's number has no
// known country context, so the only honest signal is whether the string
// itself is self-describing (starts with a real country calling code, e.g.
// "+971 50 123 4567" or "00971501234567"). A bare local number with no
// country code correctly fails this and is never confused with a real one.
export function hasConfirmedCountryCode(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = phone.trim();
  // libphonenumber-js's parsePhoneNumberFromString (with no country hint)
  // only recognizes a leading "+" as marking an international number --
  // "00" (the standard international dialing prefix outside North America,
  // e.g. "00971501234567") is a real, equally self-describing alternative
  // that it does NOT normalize on its own. Confirmed via direct testing:
  // "00971501234567" parsed as invalid until rewritten to "+971501234567"
  // below, while "+971501234567" already parsed correctly.
  const normalized = /^00\d/.test(trimmed) ? `+${trimmed.slice(2)}` : trimmed;
  const parsed = parsePhoneNumberFromString(normalized);
  return parsed?.isValid() === true;
}
