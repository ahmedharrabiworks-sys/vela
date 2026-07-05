"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";

const FAQS = [
  {
    q: "How quickly can I get started?",
    a: "Most businesses are live within 7 days. After signing up, our onboarding team connects your channels, trains the AI on your services, and tests everything before you go live. You don't need to write a single line of code.",
  },
  {
    q: "Does Vela really work on Instagram and WhatsApp?",
    a: "Yes. Vela integrates directly with Instagram's Official API and WhatsApp Business API. Every DM, comment reply, and story response is handled by your AI assistant. WhatsApp is especially powerful for booking-heavy businesses like clinics and salons.",
  },
  {
    q: "Can I customize what the AI says?",
    a: "Absolutely. During setup, you provide your service list, pricing, FAQs, tone of voice, and booking rules. The AI is trained specifically on your business. You can also set escalation rules so the AI hands off to a human for complex cases.",
  },
  {
    q: "What happens if a customer asks something the AI doesn't know?",
    a: "The AI gracefully acknowledges it doesn't have that information and offers to connect the customer with a team member. You receive an instant notification so you can jump in. You can also expand the AI's knowledge base at any time from your settings.",
  },
  {
    q: "Is my customer data safe?",
    a: "All data is stored encrypted with Row Level Security — meaning your data is completely isolated from other businesses on the platform. We never share or sell customer data. GDPR and data protection compliance is built in.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, any time. No contracts, no cancellation fees. You can cancel directly from your billing settings. Your data is available for export for 30 days after cancellation.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section
      id="faq"
      className="relative py-20 md:py-28 overflow-hidden"
      style={{ background: "#0A0908" }}
    >
      {/* Separator */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-8">
        {/* Header */}
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: "#FF6B35" }}>
            FAQ
          </p>
          <h2
            className="text-white"
            style={{ fontSize: "clamp(30px,4vw,52px)", fontWeight: 900, letterSpacing: "-0.03em" }}
          >
            Got questions?{" "}
            <span
              style={{
                fontWeight: 200,
                color: "rgba(255,255,255,0.32)",
              }}
            >
              We&apos;ve got answers.
            </span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: open === i ? "rgba(255,107,53,0.05)" : "rgba(255,255,255,0.03)",
                border: open === i ? "1px solid rgba(255,107,53,0.2)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <button
                className="w-full flex items-center justify-between p-5 md:p-6 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span
                  className="font-semibold text-sm md:text-base pr-4"
                  style={{ color: open === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)" }}
                >
                  {faq.q}
                </span>
                <span
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={
                    open === i
                      ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" }
                      : { background: "rgba(255,255,255,0.07)" }
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    className="transition-transform duration-300"
                    style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    <path
                      d="M6.5 2v9M2 6.5h9"
                      stroke="white"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <p
                      className="px-5 pb-5 md:px-6 md:pb-6 text-sm md:text-base leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                    >
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
