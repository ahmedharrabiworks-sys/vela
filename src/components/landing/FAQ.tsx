"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { bdiVela } from "@/lib/bdi";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useI18n();

  const faqs = Array.from({ length: 10 }, (_, i) => ({
    q: t(`landing.faq.questions.${i}.q`),
    a: t(`landing.faq.questions.${i}.a`),
  }));

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
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`glass faq-card-mobile-light rounded-2xl transition-shadow duration-200 ${isOpen ? "md:shadow-md" : ""}`}
              >
                <button
                  type="button"
                  className="relative z-[1] w-full flex items-center justify-between gap-4 p-4 md:p-6 text-start"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
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

                {/* hero-v6 round (FIX 1): CSS grid-template-rows 0fr->1fr
                    instead of framer-motion's height:"auto" -- the old
                    version animated a JS-measured pixel height every
                    frame (real layout-thrash cost, confirmed in the
                    round's trace); this is one CSS transition the
                    browser's own layout+compositor pipeline owns
                    directly. Content stays mounted always (not
                    conditionally rendered via AnimatePresence) so the
                    transition runs on every toggle, not just on mount/
                    unmount -- overflow:hidden on the inner wrapper is
                    what lets the 0fr row genuinely collapse to zero
                    (it overrides the grid item's default auto min-size). */}
                <div
                  className="relative z-[1] grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  aria-hidden={!isOpen}
                >
                  <div
                    className="overflow-hidden transition-opacity duration-300"
                    style={{ opacity: isOpen ? 1 : 0 }}
                  >
                    <p className="px-4 pb-4 md:px-6 md:pb-6 text-sm md:text-base text-[#6B7280] leading-relaxed text-start">
                      {bdiVela(faq.a)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
