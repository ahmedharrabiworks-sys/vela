"use client";

import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

// Small currency-select control shared by the landing/pricing cards and the
// signup plan step. QAR is the real base/display currency (src/lib/pricing.ts);
// switching this just re-renders the converted price via src/lib/currency.ts
// for reference -- it never changes what's actually billed.
export function CurrencyToggle({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <label className="inline-flex items-center gap-2 text-xs text-[#9CA3AF]">
        <span>{t("landing.pricing.showPricesIn")}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as CurrencyCode)}
          className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#111111] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {value !== "QAR" && (
        <p className="text-[11px] text-[#9CA3AF]">{t("landing.pricing.approxNote")}</p>
      )}
    </div>
  );
}
