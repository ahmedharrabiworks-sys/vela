"use client";

import { useEffect, useRef, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, PhoneInput, type PhoneCountry } from "@/components/ui/PhoneInput";

const QATAR = PHONE_COUNTRIES.find((c) => c.iso2 === "QA") ?? DEFAULT_PHONE_COUNTRY;

/** Add or change the business number: validated in the browser and again on the server. */
export default function BusinessNumberModal({ current, t, onClose, onSaved }: {
  current: string | null;
  t: (key: string) => string;
  onClose: () => void;
  onSaved: (e164: string) => void;
}) {
  const saved = current ? parsePhoneNumberFromString(current) : undefined;
  const [country, setCountry] = useState<PhoneCountry>(() => (saved && PHONE_COUNTRIES.find((c) => c.iso2 === saved.country)) || QATAR);
  const [number, setNumber] = useState(saved ? String(saved.nationalNumber) : "");
  const [valid, setValid] = useState(false);
  const [e164, setE164] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    box.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const save = async () => {
    setAttempted(true);
    setError(null);
    if (!valid || !e164) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai-agent/phone", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessPhone: e164 }), signal: AbortSignal.timeout(15000) });
      const body = await res.json().catch(() => ({})) as { error?: string; businessPhone?: string };
      if (res.ok && body.businessPhone) { onSaved(body.businessPhone); return; }
      setError(t(body.error === "invalid" ? "agentUi.phone.businessInvalid" : body.error === "bridge" ? "agentUi.phone.businessBridge" : "agentUi.common.saveError"));
    } catch {
      setError(t("agentUi.common.saveError"));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" role="presentation">
      <button type="button" aria-label={t("agentUi.common.close")} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-default" />
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="biz-number-title" data-testid="business-number-modal" className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div>
          <h2 id="biz-number-title" className="text-base font-bold text-[#111111]">{t(current ? "agentUi.phone.client.changeTitle" : "agentUi.phone.client.addTitle")}</h2>
          <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{t("agentUi.phone.businessHint")}</p>
        </div>
        <PhoneInput country={country} onCountryChange={setCountry} value={number} onChange={setNumber} onValidityChange={(v, n) => { setValid(v); setE164(n); }} forceShowError={attempted} />
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 px-5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#FF6B35]">{t("agentUi.common.cancel")}</button>
          <button type="button" data-testid="save-business-number" onClick={save} disabled={busy} className="btn-primary h-11 px-6 text-sm disabled:opacity-60">{busy ? t("agentUi.common.saving") : t("agentUi.common.save")}</button>
        </div>
      </div>
    </div>
  );
}
