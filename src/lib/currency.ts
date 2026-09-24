// Currency conversion utility, single source of truth for displaying prices
// in a currency other than the base one. Same locked-pattern idea as
// src/lib/pricing.ts: one file, everything else imports from here.
//
// QAR is the base/display currency, prices in src/lib/pricing.ts and
// src/lib/plan-config.ts are QAR. The rates below are static, hardcoded
// current-market approximations (set 2026) -- NOT a live forex feed. QAR
// and AED are both officially pegged to USD (3.64 and 3.6725 respectively),
// so those two conversions are effectively exact and stable. EUR/USD floats
// day to day, so that one rate specifically should be refreshed
// periodically; the others rarely need touching.

export type CurrencyCode = "QAR" | "USD" | "EUR" | "AED";

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "QAR", label: "QAR", symbol: "QAR" },
  { code: "USD", label: "USD", symbol: "$" },
  { code: "EUR", label: "EUR", symbol: "€" },
  { code: "AED", label: "AED", symbol: "AED" },
];

// 1 QAR expressed in each target currency.
const QAR_TO: Record<CurrencyCode, number> = {
  QAR: 1,
  USD: 0.2747, // official peg: 3.64 QAR = 1 USD
  AED: 1.0089, // both pegged to USD (3.64 QAR, 3.6725 AED per USD), near-fixed
  EUR: 0.2543, // floating -- refresh this one periodically, the other two barely move
};

export function convertFromQAR(amountQAR: number, target: CurrencyCode): number {
  return amountQAR * QAR_TO[target];
}

// Whole-number price display -- every plan price here is already a round
// QAR figure, and converted amounts are approximate by definition, so cents
// would be false precision.
export function formatPrice(amountQAR: number, currency: CurrencyCode): string {
  const rounded = Math.round(convertFromQAR(amountQAR, currency));
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
  if (currency === "USD" || currency === "EUR") {
    return `${symbol}${rounded.toLocaleString()}`;
  }
  return `${rounded.toLocaleString()} ${symbol}`;
}
