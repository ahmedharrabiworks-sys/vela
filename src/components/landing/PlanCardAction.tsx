"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const RANK: Record<string, number> = { starter: 0, pro: 1, premium: 2, custom: 3 };

// The action at the bottom of a /pricing card for a signed-in owner. The
// server still decides everything: it only ever changes the session's own
// tenant and refuses when free switching is off.
export default function PlanCardAction({ planId, planName, current, freeSwitch, confirming, onAsk, onCancel, onSwitched }: {
  planId: string;
  planName: string;
  current: string;
  freeSwitch: boolean;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onSwitched: (plan: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (planId === current) {
    return (
      <div className="w-full h-11 rounded-xl bg-[#F3F4F6] text-[#6B7280] text-sm font-semibold flex items-center justify-center">
        {t("planSwitch.currentPlan")}
      </div>
    );
  }

  const label = t("planSwitch.switchTo").replace("{plan}", planName);
  const downgrade = RANK[planId] < RANK[current];

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onAsk}
        disabled={!freeSwitch}
        className={`w-full h-11 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${downgrade ? "border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors" : "btn-primary"}`}
      >
        {label}
      </button>
    );
  }

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const d = await res.json().catch(() => ({})) as { plan?: string; error?: string };
      if (!res.ok) throw new Error(d.error || t("planSwitch.switchError"));
      onSwitched(d.plan ?? planId);
    } catch (e) {
      setError((e as Error).message || t("planSwitch.switchError"));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-[#6B7280]">{t("planSwitch.freeDuringTesting")}</p>
      {downgrade && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
          {planId === "starter" ? t("planSwitch.warnStarter") : t("planSwitch.warnDowngrade")}
        </p>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={confirm} disabled={busy} className="btn-primary flex-1 h-11 text-sm disabled:opacity-60">
          {busy ? t("planSwitch.switching") : label}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="h-11 px-4 rounded-xl border border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]">
          {t("planSwitch.cancel")}
        </button>
      </div>
    </div>
  );
}
