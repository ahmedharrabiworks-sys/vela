import test from "node:test";
import assert from "node:assert/strict";
import { currencyDirective, currencyForPhone, currencyOfPrices, displayPrice, normalizePrice } from "../business-currency";

test("currency from the business number", () => {
  assert.equal(currencyForPhone("+97477202345"), "QAR");
  assert.equal(currencyForPhone("+971501234567"), "AED");
  assert.equal(currencyForPhone("+966501234567"), "SAR");
  assert.equal(currencyForPhone("+15125550123"), "USD");
  assert.equal(currencyForPhone("+21655123456"), "TND", "longest code wins over +2");
  assert.equal(currencyForPhone(null), "QAR", "Qatar first");
});

test("the real stored prices become QAR", () => {
  for (const [raw, want] of [["$80", "80 QAR"], ["$1,200", "1,200 QAR"], ["QAR 40", "40 QAR"], ["40 QR", "40 QAR"], ["40", "40 QAR"], ["٨٠ ريال", "80 QAR"], ["80 ر.ق", "80 QAR"], ["40 riyals", "40 QAR"]]) {
    assert.equal(normalizePrice(raw, "QAR"), want, raw);
  }
});

test("ranges, words and free text", () => {
  assert.equal(normalizePrice("$80 - $120", "QAR"), "80-120 QAR");
  assert.equal(normalizePrice("from $50 per session", "QAR"), "from 50 QAR per session");
  assert.equal(normalizePrice("Free", "QAR"), "Free");
  assert.equal(normalizePrice("On request", "QAR"), "On request");
  assert.equal(normalizePrice("80 QAR", "QAR"), "80 QAR", "stable when run twice");
  assert.equal(normalizePrice("$100/month (3-year term)", "QAR"), "100 QAR/month (3-year term)");
  assert.equal(normalizePrice("100 QAR/month (3-year term)", "QAR"), "100 QAR/month (3-year term)", "no drift on resave");
});

test("display: Arabic symbol in Arabic", () => {
  assert.equal(displayPrice("40 QAR", "ar"), "40 ر.ق");
  assert.equal(displayPrice("40 QAR", "en"), "40 QAR");
});

test("the AI is told riyals, never dollars", () => {
  assert.equal(currencyOfPrices(["", "80 QAR"]), "QAR");
  const d = currencyDirective("QAR");
  assert.ok(/riyal/.test(d) && /ريال/.test(d) && /Never say dollars/.test(d));
  assert.equal(currencyDirective(null), "");
});
