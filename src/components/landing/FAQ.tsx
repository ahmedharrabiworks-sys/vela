"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
                className={`glass rounded-2xl transition-shadow duration-200 ${isOpen ? "shadow-md" : ""}`}
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

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="relative z-[1] overflow-hidden"
                    >
                      <p className="px-4 pb-4 md:px-6 md:pb-6 text-sm md:text-base text-[#6B7280] leading-relaxed text-start">
                        {bdiVela(faq.a)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
