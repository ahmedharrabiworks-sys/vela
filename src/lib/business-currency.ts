/**
 * The currency a business charges in, and service prices written in it.
 * Prices are owner text ("80", "$80", "QAR 80", "٨٠ ريال", "from 50 per session").
 * They are stored as "<amount> <CODE>" in the business currency, shown with the
 * Arabic symbol in Arabic, and the AI is told the currency word to say.
 * A "$" on a Qatari price list is the wrong symbol, not dollars: the amount is kept.
 */
export type BusinessCurrency = "QAR" | "AED" | "SAR" | "KWD" | "BHD" | "OMR" | "EGP" | "JOD" | "MAD" | "TND" | "USD" | "GBP" | "EUR";

const BY_CALLING_CODE: Array<[string, BusinessCurrency]> = [
  ["974", "QAR"], ["971", "AED"], ["966", "SAR"], ["965", "KWD"], ["973", "BHD"], ["968", "OMR"],
  ["20", "EGP"], ["962", "JOD"], ["212", "MAD"], ["216", "TND"], ["44", "GBP"],
  ["33", "EUR"], ["49", "EUR"], ["39", "EUR"], ["34", "EUR"], ["31", "EUR"], ["32", "EUR"], ["351", "EUR"], ["353", "EUR"], ["43", "EUR"], ["30", "EUR"],
  ["1", "USD"],
];

const AR_SYMBOL: Record<BusinessCurrency, string> = {
  QAR: "ر.ق", AED: "د.إ", SAR: "ر.س", KWD: "د.ك", BHD: "د.ب", OMR: "ر.ع", EGP: "ج.م", JOD: "د.أ", MAD: "د.م", TND: "د.ت", USD: "$", GBP: "£", EUR: "€",
};

const SPOKEN: Record<BusinessCurrency, { en: string; ar: string }> = {
  QAR: { en: "Qatari riyals (say \"riyal\")", ar: "ريال قطري" },
  AED: { en: "UAE dirhams (say \"dirham\")", ar: "درهم إماراتي" },
  SAR: { en: "Saudi riyals (say \"riyal\")", ar: "ريال سعودي" },
  KWD: { en: "Kuwaiti dinars (say \"dinar\")", ar: "دينار كويتي" },
  BHD: { en: "Bahraini dinars (say \"dinar\")", ar: "دينار بحريني" },
  OMR: { en: "Omani riyals (say \"riyal\")", ar: "ريال عماني" },
  EGP: { en: "Egyptian pounds", ar: "جنيه مصري" },
  JOD: { en: "Jordanian dinars", ar: "دينار أردني" },
  MAD: { en: "Moroccan dirhams", ar: "درهم مغربي" },
  TND: { en: "Tunisian dinars", ar: "دينار تونسي" },
  USD: { en: "US dollars", ar: "دولار أمريكي" },
  GBP: { en: "British pounds", ar: "جنيه إسترليني" },
  EUR: { en: "euros", ar: "يورو" },
};

/** From the business number's country. No number yet: QAR (Qatar first). */
export function currencyForPhone(businessPhone: string | null | undefined): BusinessCurrency {
  const digits = (businessPhone ?? "").replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return "QAR";
  const hit = BY_CALLING_CODE.filter(([cc]) => digits.startsWith(`+${cc}`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : "QAR";
}

// Any currency word or symbol an owner (or an import) might have written.
const CURRENCY_TOKENS = /(US\$|\$|€|£|\b(?:QAR|QR|AED|SAR|KWD|BHD|OMR|EGP|JOD|MAD|TND|USD|GBP|EUR|riyals?|rials?|dirhams?|dinars?|dollars?|euros?)\b|ر\.?\s?ق|د\.?\s?إ|ر\.?\s?س|د\.?\s?ك|د\.?\s?ب|ر\.?\s?ع|ريالات|ريال|دراهم|درهم|دنانير|دينار|دولار)/gi;
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/٫/g, ".").replace(/٬/g, ",");

/** "$80" -> "80 QAR"; "from 50 per session" -> "from 50 QAR per session"; "Free" stays "Free". */
export function normalizePrice(raw: string, currency: BusinessCurrency): string {
  const text = latinDigits((raw ?? "").trim());
  if (!/\d/.test(text)) return (raw ?? "").trim();
  const bare = text.replace(CURRENCY_TOKENS, " ").replace(/\s+/g, " ").trim();
  // The first amount, or a range "80-120" / "80 to 120", gets the currency right after it.
  return bare.replace(/(\d[\d,]*(?:\.\d+)?)(\s*(?:-|to|إلى)\s*\d[\d,]*(?:\.\d+)?)?/i, (m) => `${m.replace(/\s*-\s*/, "-")} ${currency}`).replace(/\s+/g, " ").replace(/ \//g, "/").trim();
}

/** For display: Arabic shows the Arabic symbol ("80 ر.ق"), English the code ("80 QAR"). */
export function displayPrice(stored: string, locale: string): string {
  if (locale !== "ar") return stored;
  return stored.replace(/\b(QAR|AED|SAR|KWD|BHD|OMR|EGP|JOD|MAD|TND|USD|GBP|EUR)\b/g, (code) => AR_SYMBOL[code as BusinessCurrency]);
}

/** The prices' currency, read back from normalized service prices. */
export function currencyOfPrices(prices: Array<string | null | undefined>): BusinessCurrency | null {
  for (const p of prices) {
    const m = (p ?? "").match(/\b(QAR|AED|SAR|KWD|BHD|OMR|EGP|JOD|MAD|TND|USD|GBP|EUR)\b/);
    if (m) return m[1] as BusinessCurrency;
  }
  return null;
}

/** One prompt line so the AI never says dollars for riyals. */
export function currencyDirective(currency: BusinessCurrency | null): string {
  if (!currency) return "";
  const s = SPOKEN[currency];
  return `All prices are in ${s.en}; in Arabic say ${s.ar}. ${currency === "USD" ? "" : "Never say dollars or use a $ sign."}`.trim();
}

export function normalizeServicePrices<T extends { price: string }>(services: T[], currency: BusinessCurrency): T[] {
  return services.map((s) => (s.price ? { ...s, price: normalizePrice(s.price, currency) } : s));
}
