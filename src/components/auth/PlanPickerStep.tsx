"use client";

import { useEffect, useRef, useState } from "react";
import { PLANS } from "@/lib/pricing";
import { TAGLINES } from "@/components/landing/Pricing";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import { CurrencyToggle } from "@/components/landing/CurrencyToggle";
import PlanComparisonDetailed from "@/components/landing/PlanComparisonDetailed";
import { useI18n } from "@/lib/i18n";
import { AuthSplitCard } from "@/components/auth/AuthChrome";

const SELECTABLE_PLANS = PLANS.filter((p) => !p.isCustom);

/**
 * Focus-trapped, Escape/backdrop-closing modal reusing PlanComparisonDetailed
 * (same source of truth as /pricing's "Compare Plans" view -- no plan
 * feature copy duplicated here). Desktop: centered card. Mobile: bottom
 * sheet, max-height 85vh with its own internal scroll. Never navigates --
 * "Choose X" inside the table calls back into the parent step instead of
 * following PlanComparisonDetailed's default /auth/signup link, so step
 * 1/2 data already entered in this same signup flow is never lost.
 */
function PlanDetailsModal({
  onClose,
  onChoose,
  triggerRef,
}: {
  onClose: () => void;
  onChoose: (planId: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "rgba(20,10,5,0.25)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${t("landing.planCompare.title1")} ${t("landing.planCompare.titleAccent")}`}
        className="glass-auth relative w-full sm:max-w-3xl sm:mx-6 rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col"
      >
        <div className="glass-auth-content flex flex-col max-h-[85vh] min-h-0">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("landing.auth.signup.step3.closeModal")}
            className="input-glass absolute top-4 end-4 w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="overflow-y-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
            <PlanComparisonDetailed onChoosePlan={onChoose} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanPickerStep({
  plan,
  setPlan,
  billing,
  setBilling,
  currency,
  setCurrency,
  loading,
  authError,
  onBack,
  onSubmit,
  panelHeadline,
  panelBody,
  stepLabel,
}: {
  plan: string;
  setPlan: (id: string) => void;
  billing: "monthly" | "annual";
  setBilling: (b: "monthly" | "annual") => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  loading: boolean;
  authError: string;
  onBack: () => void;
  onSubmit: () => void;
  panelHeadline: string;
  panelBody: string;
  stepLabel: string;
}) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const detailsLinkRef = useRef<HTMLButtonElement>(null);

  const handleRadioKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = SELECTABLE_PLANS[(idx + 1) % SELECTABLE_PLANS.length];
      setPlan(next.id);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = SELECTABLE_PLANS[(idx - 1 + SELECTABLE_PLANS.length) % SELECTABLE_PLANS.length];
      setPlan(prev.id);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setPlan(SELECTABLE_PLANS[idx].id);
    }
  };

  return (
    <>
      <AuthSplitCard panelHeadline={panelHeadline} panelBody={panelBody} stepLabel={stepLabel}>
          <div className="text-center mb-4">
            <h1 className="vela-heading text-xl text-[#111111] mb-1">{t("landing.auth.signup.step3.title")}</h1>
            <p className="text-[#6B7280] text-sm">{t("landing.auth.signup.step3.cancelAnytime")}</p>
          </div>

          {/* Compact toggle row: Monthly/Annual + currency, both glass pills, one row */}
          <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
            <div className="input-glass inline-flex items-center p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  billing === "monthly" ? "bg-white shadow-sm text-[#111111]" : "text-[#6B7280]"
                }`}
              >
                {t("landing.auth.signup.step3.monthly")}
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  billing === "annual" ? "bg-white shadow-sm text-[#111111]" : "text-[#6B7280]"
                }`}
              >
                {t("landing.auth.signup.step3.annual")}
                <span className="ms-1 text-[10px] opacity-70">· {t("landing.auth.signup.step3.save20")}</span>
              </button>
            </div>
            <CurrencyToggle value={currency} onChange={setCurrency} glass />
          </div>

          {/* Compact selectable rows -- radiogroup, each row is the tap target (min 44px, actually ~76px) */}
          <div role="radiogroup" aria-label={t("landing.auth.signup.step3.title")} className="flex flex-col gap-2.5 mb-4">
            {SELECTABLE_PLANS.map((p, idx) => {
              const selected = plan === p.id;
              const price = billing === "annual" ? p.annual : p.monthly;
              return (
                <div
                  key={p.id}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setPlan(p.id)}
                  onKeyDown={(e) => handleRadioKeyDown(e, idx)}
                  className={`input-glass ${p.popular ? "glass-warm" : ""} relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 min-h-[76px] cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/50`}
                  style={selected ? { border: "1.5px solid #FF6B35" } : {}}
                >
                  {p.popular && (
                    <span
                      className="absolute -top-2.5 end-4 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
                      style={{ background: "var(--vela-gradient)" }}
                    >
                      {t("landing.auth.signup.step3.mostPopular")}
                    </span>
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ border: selected ? "none" : "1.5px solid #D1D5DB", background: selected ? "#FF6B35" : "transparent" }}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#111111]">{p.name}</p>
                      <p className="text-xs text-[#6B7280] leading-snug">{TAGLINES[p.id]}</p>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-black text-sm text-[#111111] whitespace-nowrap">
                      {formatPrice(price, currency)} <span className="font-normal text-xs text-[#9CA3AF]">/mo</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mb-5">
            <button
              ref={detailsLinkRef}
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FF6B35] hover:underline"
            >
              {t("landing.auth.signup.step3.seeFullPlanDetails")}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="rtl:-scale-x-100">
                <path d="M2.5 6.5h8M7 4l3 2.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {authError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
              {authError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onBack} className="input-glass flex-1 py-3.5 rounded-xl text-sm text-[#6B7280] transition-colors">
              {t("landing.auth.signup.step3.back")}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
              style={{ background: "var(--vela-gradient)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M14 8a6 6 0 0 0-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {t("landing.auth.signup.step3.settingUp")}
                </span>
              ) : (
                <>{t("landing.auth.signup.step3.continueBtn")} →</>
              )}
            </button>
          </div>
      </AuthSplitCard>

      {modalOpen && (
        <PlanDetailsModal
          onClose={() => setModalOpen(false)}
          onChoose={(id) => {
            setPlan(id);
            setModalOpen(false);
          }}
          triggerRef={detailsLinkRef}
        />
      )}
    </>
  );
}
