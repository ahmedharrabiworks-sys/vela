"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    number: "01",
    title: "Customer sends a message",
    description:
      "A lead reaches out on Instagram DM, WhatsApp, or your website chat — any time of day or night.",
    chips: ["Instagram DM", "WhatsApp", "Website Chat"],
  },
  {
    number: "02",
    title: "Vela AI replies in under 60 seconds",
    description:
      "Your AI assistant responds immediately, in your brand voice, in any language — even at 2 AM.",
    chips: ["< 60s response", "Multilingual", "Brand-trained"],
  },
  {
    number: "03",
    title: "AI qualifies the lead",
    description:
      "Smart follow-up questions gather the right information: service interest, timeline, budget — automatically.",
    chips: ["Service type", "Budget range", "Urgency"],
  },
  {
    number: "04",
    title: "Appointment booked into your calendar",
    description:
      "Once qualified, AI offers real available slots and books directly into Google Calendar. No back-and-forth.",
    chips: ["Google Calendar sync", "Real-time slots", "Auto-confirm"],
  },
  {
    number: "05",
    title: "You receive a confirmed booking",
    description:
      "Instant notification with the lead's name, service, and time. You show up. The rest is handled.",
    chips: ["Push notification", "SMS alert", "Email summary"],
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const steps = sectionRef.current?.querySelectorAll(".step-item");
    if (!steps) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = Number(el.dataset.index);
            setTimeout(() => el.classList.add("visible"), idx * 150);
          }
        });
      },
      { threshold: 0.2 }
    );

    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="py-28 bg-[#FFF5F0]">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="section-label mb-6">How It Works</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-[#1A0A00] mt-6">
            From first message to{" "}
            <span className="vela-gradient-text">confirmed booking.</span>
          </h2>
          <p className="mt-5 text-[#888888] text-lg max-w-xl mx-auto">
            Five steps. Fully automated. You only see the result.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-[#FF6B35] via-[#FF3366] to-[#FF6B35]/20 hidden md:block" />

          <div className="flex flex-col gap-10">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                data-index={i}
                className="step-item opacity-0 translate-y-5 transition-all duration-500 ease-out flex gap-6 items-start"
              >
                {/* Step number bubble */}
                <div className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm text-white z-10 shadow-vela"
                  style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}
                >
                  {step.number}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <h3 className="text-xl font-bold text-[#1A0A00] mb-2">{step.title}</h3>
                  <p className="text-[#888888] leading-relaxed mb-4">{step.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.chips.map((chip) => (
                      <span
                        key={chip}
                        className="text-xs font-medium px-3 py-1 rounded-full"
                        style={{ background: "rgba(255,107,53,0.1)", color: "#FF6B35" }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .step-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
