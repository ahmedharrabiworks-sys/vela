"use client";

import { useEffect, useState } from "react";
import BusinessNumberModal from "@/components/dashboard/BusinessNumberModal";

/** One quiet line for accounts made before signup asked for the business number. */
export default function BusinessNumberPrompt({ t }: { t: (key: string) => string }) {
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ai-agent/phone")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { businessPhone?: string | null } | null) => setMissing(!!d && !d.businessPhone))
      .catch(() => {});
  }, []);

  if (!missing) return null;
  return (
    <>
      <p data-testid="business-number-prompt" className="text-sm text-[#6B7280]">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 font-semibold text-[#C2410C] hover:underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="currentColor" /></svg>
          {t("agentUi.phone.client.addPrompt")}
        </button>
      </p>
      {open && <BusinessNumberModal current={null} t={t} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setMissing(false); }} />}
    </>
  );
}
