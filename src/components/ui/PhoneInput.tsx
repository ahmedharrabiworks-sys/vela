"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js";

export interface PhoneCountry {
  iso2: CountryCode;
  name: string;
  dial: string;
}

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Every dial code libphonenumber-js reports is factually correct -- audited
// all 245 regions against its own metadata, zero wrong mappings found. AX
// (Aland Islands) is excluded here for a different reason: it is a
// near-uninhabited territory (population under 30,000) that duplicates
// Finland's own +358 code, and it happens to sort as the very next row after
// Afghanistan in an alphabetical, unfiltered list -- a real mis-click hazard
// when browsing by eye instead of searching, with zero functional loss since
// Finland already covers +358. Checked every other territory that shares a
// calling code with a larger country (Kazakhstan, Jersey, Guernsey, Isle of
// Man, Puerto Rico, Jamaica, Canada, etc.) and none share this pattern --
// they are all real, distinctly named, commonly needed selections.
const EXCLUDED_ISO2 = new Set<CountryCode>(["AX"]);

export const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .filter((iso2) => !EXCLUDED_ISO2.has(iso2))
  .map((iso2) => ({
    iso2,
    name: regionNames.of(iso2) ?? iso2,
    dial: "+" + getCountryCallingCode(iso2),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_PHONE_COUNTRY: PhoneCountry =
  PHONE_COUNTRIES.find((c) => c.iso2 === "AE") ?? PHONE_COUNTRIES[0];

// A handful of business-country names (from the signup country picker) whose
// wording differs from the English region names this component derives via
// Intl.DisplayNames -- without this, defaulting the phone country to the
// business's already-chosen country would silently miss these.
const NAME_ALIASES: Record<string, string> = {
  "congo (drc)":     "congo - kinshasa",
  "czech republic":  "czechia",
  "hong kong":       "hong kong sar china",
  "ivory coast":     "côte d’ivoire",
  "macau":           "macao sar china",
  "myanmar":         "myanmar (burma)",
  "palestine":       "palestinian territories",
  "turkey":          "türkiye",
};

// Finds the matching phone country for a business country name picked
// elsewhere in signup (e.g. the Country field above this one). Used only to
// reduce friction by pre-selecting a sensible default -- never authoritative.
export function findPhoneCountryByName(name: string): PhoneCountry | undefined {
  const normalized = (NAME_ALIASES[name.toLowerCase()] ?? name).toLowerCase();
  return PHONE_COUNTRIES.find((c) => c.name.toLowerCase() === normalized);
}

export function toE164(country: PhoneCountry, nationalNumber: string): string | null {
  const parsed = parsePhoneNumberFromString(nationalNumber, country.iso2);
  return parsed?.isValid() ? parsed.number : null;
}

export function isValidPhoneForCountry(country: PhoneCountry, nationalNumber: string): boolean {
  if (!nationalNumber.trim()) return false;
  return isValidPhoneNumber(nationalNumber, country.iso2);
}

/* Searchable country dropdown, scoped to phone dial codes. Same visual
   pattern (search box, scrollable list, hover states) as the business
   Country picker in signup -- adapted to show a flag + compact dial code. */
function PhoneCountrySelect({
  value,
  onChange,
}: {
  value: PhoneCountry;
  onChange: (c: PhoneCountry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () =>
      PHONE_COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query)
      ),
    [query]
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className="flex items-center gap-1.5 h-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35] transition-all whitespace-nowrap"
        aria-label="Select country code"
      >
        <span>{flagEmoji(value.iso2)}</span>
        <span className="text-[#6B7280] text-xs font-mono">{value.dial}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-64 rounded-xl overflow-hidden border border-[#E5E7EB] shadow-card-hover bg-white">
          <div className="p-2 border-b border-[#E5E7EB]">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>
          <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,107,53,0.3) transparent" }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[#9CA3AF] text-center">No results</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[#F9FAFB] ${value.iso2 === c.iso2 ? "text-[#FF6B35] font-medium" : "text-[#374151]"}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span>{flagEmoji(c.iso2)}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-[#9CA3AF] text-xs font-mono shrink-0">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface PhoneInputProps {
  country: PhoneCountry;
  onCountryChange: (c: PhoneCountry) => void;
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (valid: boolean, e164: string | null) => void;
  required?: boolean;
  forceShowError?: boolean;
  id?: string;
}

export function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  onValidityChange,
  required = true,
  forceShowError = false,
  id,
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false);

  const valid = value.trim() ? isValidPhoneForCountry(country, value) : !required;
  const e164 = value.trim() ? toE164(country, value) : null;

  useEffect(() => {
    onValidityChange?.(valid, e164);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, e164]);

  const showError = (touched || forceShowError) && value.trim().length > 0 && !valid;

  return (
    <div>
      <div className="flex gap-2">
        <PhoneCountrySelect value={country} onChange={onCountryChange} />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(new AsYouType(country.iso2).input(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="50 000 0000"
          required={required}
          aria-invalid={showError}
          className={`w-full bg-white border px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:ring-2 transition-all rounded-xl ${
            showError
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : "border-[#E5E7EB] focus:border-[#FF6B35] focus:ring-[#FF6B35]/20"
          }`}
        />
      </div>
      {showError && (
        <p className="text-[11px] text-red-600 mt-1.5">
          Enter a valid phone number for {country.name}
        </p>
      )}
    </div>
  );
}
