"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { PLAN_CONFIG, announcePlanChange, type PlanId } from "@/lib/plans";

// Testing-phase plan picker. Lists Starter / Pro / Premium with the current
// one marked, allows upgrade AND downgrade, confirms, then POST /api/plan
// (server checks session tenant + allowlist + FREE_PLAN_SWITCH). On success
// every usePlan()/Sidebar updates live via announcePlanChange.

const PLANS: PlanId[] = ["starter", "pro", "premium"];
const PLAN_NAMES: Record<string, string> = { starter: "Starter", pro: "Pro", premium: "Premium", custom: "Custom" };
const RANK: Record<string, number> = { starter: 0, pro: 1, premium: 2, custom: 3 };

type Step = { kind: "pick" } | { kind: "confirm"; target: PlanId } | { kind: "done"; plan: PlanId };

export default function PlanSwitchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [current, setCurrent] = useState<PlanId | null>(null);
  const [freeSwitch, setFreeSwitch] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep({ kind: "pick" });
    setError(null);
    let cancelled = false;
    fetch("/api/plan")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { plan: string; freeSwitch: boolean }) => {
        if (cancelled) return;
        setCurrent((d.plan in PLAN_CONFIG ? d.plan : "starter") as PlanId);
        setFreeSwitch(!!d.freeSwitch);
      })
      .catch(() => { if (!cancelled) setError(t("planSwitch.loadError")); });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !mounted) return null;

  // Short brand names, Latin in every language (same as the pricing page).
  const planName = (p: string) => PLAN_NAMES[p] ?? p;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const features = (p: PlanId): string[] => {
    const c = PLAN_CONFIG[p];
    return [
      c.voiceAgent ? t("planSwitch.voiceMinutes").replace("{n}", fmt(c.voiceMinutes)) : t("planSwitch.noVoice"),
      c.textMessages === Infinity ? t("planSwitch.unlimitedText") : t("planSwitch.textMessages").replace("{n}", fmt(c.textMessages)),
      c.channels >= 3 ? t("planSwitch.allChannels") : t("planSwitch.oneChannel"),
      c.teamMembers === Infinity ? t("planSwitch.unlimitedTeam") : t("planSwitch.oneMember"),
    ];
  };

  const confirmSwitch = async (target: PlanId) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string }).error || t("planSwitch.switchError"));
      const plan = ((d as { plan?: string }).plan ?? target) as PlanId;
      setCurrent(plan);
      announcePlanChange(plan);
      setStep({ kind: "done", plan });
      setTimeout(onClose, 1400);
    } catch (e) {
      setError((e as Error).message || t("planSwitch.switchError"));
    }
    setBusy(false);
  };

  const downgradeWarning = (target: PlanId): string | null => {
    if (!current || RANK[target] >= RANK[current]) return null;
    return target === "starter" ? t("planSwitch.warnStarter") : t("planSwitch.warnDowngrade");
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("planSwitch.title")}
        className="relative w-full md:max-w-3xl max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-5 md:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">{t("planSwitch.title")}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{t("planSwitch.subtitle")}</p>
          </div>
          <button onClick={onClose} aria-label={t("planSwitch.close")} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-[#FFF5F5] p-3 mb-4 text-xs text-red-600">{error}</div>
        )}

        {step.kind === "done" && (
          <div className="py-8 text-center">
            <p className="text-base font-semibold text-[#111111]">{t("planSwitch.done").replace("{plan}", planName(step.plan))}</p>
          </div>
        )}

        {step.kind === "confirm" && (
          <div className="py-2">
            <p className="text-base font-semibold text-[#111111]">{t("planSwitch.confirmTitle").replace("{plan}", planName(step.target))}</p>
            <p className="text-sm text-[#6B7280] mt-1">{t("planSwitch.freeDuringTesting")}</p>
            {downgradeWarning(step.target) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {downgradeWarning(step.target)}
              </div>
            )}
            <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button onClick={() => setStep({ kind: "pick" })} disabled={busy} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]">
                {t("planSwitch.cancel")}
              </button>
              <button onClick={() => confirmSwitch(step.target)} disabled={busy} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
                {busy ? t("planSwitch.switching") : t("planSwitch.confirmBtn").replace("{plan}", planName(step.target))}
              </button>
            </div>
          </div>
        )}

        {step.kind === "pick" && (
          <>
            {freeSwitch === false && (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 mb-4 text-sm text-[#374151]">
                {t("planSwitch.billingOnly")}{" "}
                <Link href="/pricing" className="font-semibold text-[#FF6B35]" onClick={onClose}>{t("planSwitch.seePricing")}</Link>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PLANS.map((p) => {
                const isCurrent = current === p;
                const isUp = current ? RANK[p] > RANK[current] : true;
                return (
                  <div key={p} className={`rounded-xl border p-4 flex flex-col ${isCurrent ? "border-[#FF6B35] bg-[#FFF8F4]" : "border-[#E5E7EB] bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#111111]">{planName(p)}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B35] text-white">{t("planSwitch.currentPlan")}</span>
                      )}
                    </div>
                    <p className="mt-2 text-xl font-extrabold text-[#111111]" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
                      {fmt(PLAN_CONFIG[p].price)} QAR<span className="text-xs font-medium text-[#6B7280]"> / {t("planSwitch.month")}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5 flex-1">
                      {features(p).map((f) => (
                        <li key={f} className="text-xs text-[#4B5563] flex gap-2">
                          <span className="text-[#FF6B35]">•</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setStep({ kind: "confirm", target: p })}
                      disabled={isCurrent || current === null || freeSwitch !== true}
                      className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${isCurrent ? "bg-[#F3F4F6] text-[#9CA3AF]" : isUp ? "btn-primary disabled:opacity-50" : "border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"}`}
                    >
                      {isCurrent ? t("planSwitch.currentPlan") : isUp ? t("planSwitch.upgradeTo").replace("{plan}", planName(p)) : t("planSwitch.downgradeTo").replace("{plan}", planName(p))}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
