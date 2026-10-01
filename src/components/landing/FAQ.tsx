"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { bdiVela } from "@/lib/bdi";

interface FaqData {
  q: string;
  a: string;
}

/* faq-fix-2 round (FIX 1.5): extracted + React.memo'd so clicking one
   item only re-renders that item (isOpen flips) and whatever was
   previously open (isOpen flips back) -- the other 8 bail out of
   re-rendering entirely via memo's shallow prop comparison. Requires
   `faq` and `onToggle` to stay referentially stable across the parent's
   re-renders (see FAQ() below: faqs is useMemo'd, onToggle is a single
   useCallback with no closure over `open`), otherwise every item would
   "change" on every render regardless of memo. */
const FaqItem = memo(function FaqItem({
  index,
  faq,
  isOpen,
  onToggle,
}: {
  index: number;
  faq: FaqData;
  isOpen: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <div className={`glass faq-card-mobile-light rounded-2xl transition-shadow duration-200 ${isOpen ? "md:shadow-md" : ""}`}>
      <button
        type="button"
        className="relative z-[1] w-full flex items-center justify-between gap-4 p-4 md:p-6 text-start"
        onClick={() => onToggle(index)}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        id={`faq-trigger-${index}`}
      >
        <span className="font-bold text-[#111111] text-sm md:text-base">{bdiVela(faq.q)}</span>
        <span
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isOpen ? "text-white" : "bg-[#F3F4F6] text-[#6B7280]"
          }`}
          style={isOpen ? { background: "var(--vela-gradient)" } : undefined}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={`transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
          >
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {/* faq-fix-2 round (FIX 1.4): below lg, this row has NO transition
          property set at all -- grid-template-rows changes instantly
          (CSS's own default, 0s, when nothing says otherwise), so the
          answer appears/disappears directly in layout with zero
          per-frame animation cost. lg: adds the grid-rows transition
          back (hero-v6's fix, kept for desktop, which has the GPU
          headroom this was never actually a problem on). Opacity fade
          stays in both cases -- 150ms on phone (just the text settling
          in, not fighting layout for frame budget), 300ms on desktop
          (synced to the row's own 300ms). */}
      <div
        className="relative z-[1] grid lg:transition-[grid-template-rows] lg:duration-300 lg:ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        id={`faq-panel-${index}`}
        role="region"
        aria-labelledby={`faq-trigger-${index}`}
        aria-hidden={!isOpen}
      >
        <div
          className="overflow-hidden transition-opacity duration-150 lg:duration-300"
          style={{ opacity: isOpen ? 1 : 0 }}
        >
          <p className="px-4 pb-4 md:px-6 md:pb-6 text-sm md:text-base text-[#6B7280] leading-relaxed text-start">
            {bdiVela(faq.a)}
          </p>
        </div>
      </div>
    </div>
  );
});

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useI18n();

  // faq-fix-2 round (FIX 1.5): was a fresh Array.from(...) -- new array,
  // new objects -- on every render, which alone would defeat FaqItem's
  // memo regardless of isOpen (every `faq` prop reference would "change"
  // every time). useMemo keyed on `t` keeps these stable across re-
  // renders that don't actually change the translations.
  const faqs = useMemo<FaqData[]>(
    () => Array.from({ length: 10 }, (_, i) => ({
      q: t(`landing.faq.questions.${i}.q`),
      a: t(`landing.faq.questions.${i}.a`),
    })),
    [t]
  );

  const toggle = useCallback((i: number) => {
    setOpen((o) => (o === i ? null : i));
  }, []);

  return (
    <section id="faq" className="relative py-12 md:py-16 bg-white scroll-mt-0 lg:scroll-mt-[110px]">
      <div className="relative max-w-[900px] mx-auto px-5 md:px-6">
        {/* Header -- same pill badge + headline pattern as every other
            section (Problem/Comparison), not the old plain section-label. */}
        <div className="text-center mb-10 md:mb-14">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border mb-4"
            style={{ background: "#FFF3EE", borderColor: "rgba(255,107,53,0.25)", color: "#C2410C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
            {t("landing.faq.badge")}
          </span>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[32px] md:text-[38px] text-[#111111] leading-tight">
            {t("landing.faq.headline")}
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-3">
            {t("landing.faq.subtitle")}
          </p>
        </div>

        {/* Accordion -- glass cards, one open at a time. */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} index={i} faq={faq} isOpen={open === i} onToggle={toggle} />
          ))}
        </div>
      </div>
    </section>
  );
}
