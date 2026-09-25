"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import AmbientGlow from "@/components/landing/AmbientGlow";

// Stat callouts: only real, honest, non-fabricated claims -- no invented
// percentages. "24/7" and the channel list are true and already used
// elsewhere on the site; "Multi-language" is a plain label, not a number.
// Kept EXACTLY as-is per the consolidated fix round's explicit instruction.
const STAT_KEYS = ["always", "multiLang", "everyChannel"] as const;

// Problem -> solution timeline, in our own words (not mirroring any
// competitor's specific copy beyond the general shape of the idea). The
// last step is the resolution and gets the highlighted/orange treatment.
const TIMELINE_KEYS = ["step1", "step2", "step3", "step4", "step5"] as const;

export default function ProblemSection() {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-14 md:py-20 bg-white overflow-hidden">
      <AmbientGlow />
      <div className="relative max-w-7xl mx-auto px-5 md:px-6" style={{ zIndex: 1 }}>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: badge + headline + description + stats */}
          <div className="text-center lg:text-start">
            {/* Badge -- restyled from plain uppercase text into a real pill
                badge (FIX 8), matching Hero's badge visual language for
                sitewide consistency, in Vela orange only. */}
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border mb-4"
              style={{ background: "#FFF3EE", borderColor: "rgba(255,107,53,0.25)", color: "#C2410C" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
              {t("landing.problem.eyebrow")}
            </span>
            <h2 className="font-display font-extrabold text-[26px] sm:text-[32px] md:text-[38px] text-[#111111] leading-tight">
              {t("landing.problem.headline")}{" "}
              <span className="vela-gradient-text">{t("landing.problem.headlineHighlight")}</span>
            </h2>
            {/* FIX 7: own description now, no longer reusing Hero's subtext
                verbatim (that was a real duplicated-copy bug). */}
            <p className="text-[#4B5563] text-base md:text-lg leading-relaxed mt-4 max-w-[520px] mx-auto lg:mx-0">
              {t("landing.problem.description")}
            </p>

            {/* Stat row -- unchanged content, still the same 3 honest callouts */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8">
              {STAT_KEYS.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-4 text-center"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
                >
                  <p className="font-display font-extrabold text-[#111111] leading-tight" style={{ fontSize: key === "multiLang" ? 16 : 22 }}>
                    {t(`landing.problem.stats.${key}.value`)}
                  </p>
                  <p className="text-[11px] text-[#6B7280] mt-1.5 leading-snug">
                    {t(`landing.problem.stats.${key}.label`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: step-by-step timeline card -- enlarged (FIX 5): more
              padding, bigger text/dots, taller row spacing, deeper shadow
              so it reads as a substantial, premium element instead of a
              plain small list. Each step staggers in on scroll instead of
              all appearing at once. */}
          <motion.div
            initial={prefersReducedMotion ? undefined : "hidden"}
            whileInView={prefersReducedMotion ? undefined : "show"}
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } } }}
            className="rounded-3xl border border-[#E5E7EB] bg-white p-8 md:p-10"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}
          >
            <div className="flex flex-col">
              {TIMELINE_KEYS.map((key, i) => {
                const isLast = i === TIMELINE_KEYS.length - 1;
                return (
                  <motion.div
                    key={key}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}
                    className="flex items-stretch gap-5"
                  >
                    {/* Dot + connecting line -- flex row auto-mirrors under
                        RTL (dot column stays on the "start" edge), no
                        manual left/right or order overrides needed. */}
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className="rounded-full shrink-0 flex items-center justify-center"
                        style={
                          isLast
                            ? { background: "var(--vela-gradient)", width: 32, height: 32, marginInlineStart: -7 }
                            : { background: "#E5E7EB", width: 16, height: 16 }
                        }
                      >
                        {isLast && (
                          <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {!isLast && <span className="w-px flex-1 bg-[#E5E7EB] my-1.5" />}
                    </div>
                    <div className={isLast ? "pb-0" : "pb-8"}>
                      <p className={`font-bold text-lg leading-snug ${isLast ? "text-[#C2410C]" : "text-[#111111]"}`}>
                        {t(`landing.problem.timeline.${key}.title`)}
                      </p>
                      <p className="text-[#6B7280] mt-1.5 leading-relaxed">
                        {t(`landing.problem.timeline.${key}.desc`)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
