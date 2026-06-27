"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
    a: "All data is stored encrypted in Supabase with Row Level Security — meaning your data is completely isolated from other businesses on the platform. We never share or sell customer data. GDPR and data protection compliance is built in.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, any time. No contracts, no cancellation fees. You can cancel directly from your billing settings. Your data is available for export for 30 days after cancellation.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-28 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="section-label mb-6">FAQ</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-[#1A0A00] mt-6">
            Got questions?{" "}
            <span className="vela-gradient-text">We&apos;ve got answers.</span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                open === i ? "border-[#FF6B35]/40 shadow-sm" : "border-[#f0e8e0]"
              }`}
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-[#1A0A00] pr-4">{faq.q}</span>
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    open === i
                      ? "bg-gradient-to-br from-[#FF6B35] to-[#FF3366] text-white"
                      : "bg-[#f0e8e0] text-[#888888]"
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
                    <p className="px-6 pb-6 text-[#888888] leading-relaxed">{faq.a}</p>
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
