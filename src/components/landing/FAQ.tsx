"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useI18n();

  const faqs = Array.from({ length: 6 }, (_, i) => ({
    q: t(`landing.faq.questions.${i}.q`),
    a: t(`landing.faq.questions.${i}.a`),
  }));

  return (
    <section id="faq" className="py-20 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="section-label mb-6">{t("landing.faq.badge")}</span>
          <h2 className="vela-heading text-3xl md:text-4xl lg:text-5xl text-[#111111] mt-6">
            {t("landing.faq.headline1")}{" "}
            <span className="vela-gradient-text">{t("landing.faq.headline2")}</span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                open === i ? "border-[#FF6B35]/40 shadow-sm" : "border-[#E5E7EB]"
              }`}
            >
              <button
                className="w-full flex items-center justify-between p-4 md:p-6 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-[#111111] text-sm md:text-base pr-4">{faq.q}</span>
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    open === i
                      ? "bg-gradient-to-br from-[#FF6B35] to-[#FF3366] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className={`transition-transform duration-300 ${open === i ? "rotate-45" : ""}`}
                  >
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <p className="px-4 pb-4 md:px-6 md:pb-6 text-sm md:text-base text-[#6B7280] leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
