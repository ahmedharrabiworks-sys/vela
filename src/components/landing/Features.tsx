"use client";

import { useEffect, useRef } from "react";

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI Chatbot",
    description: "Replies in under 60 seconds on every channel. Trained on your services, pricing, and FAQs.",
    tag: "Core",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="17" cy="17" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 15.5v1.5l1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
    title: "Instagram Automation",
    description: "Every DM answered instantly. Story replies, comment responses, and lead capture — fully automated.",
    tag: "Channel",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "WhatsApp AI",
    description: "Books appointments, answers questions, and qualifies leads through WhatsApp — your #1 channel.",
    tag: "Channel",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Appointment Booking",
    description: "Synced to Google Calendar in real time. Customers pick slots, AI confirms, you just show up.",
    tag: "Booking",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "CRM",
    description: "Every lead stored and tracked automatically. Pipeline view, conversation history, and follow-up reminders.",
    tag: "CRM",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 8h4M6 11h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Website Builder",
    description: "Professional business site included. Built for conversions, hosted by us, live in hours.",
    tag: "Website",
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll(".feat-card");
    if (!cards) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = Number(el.dataset.index);
            setTimeout(() => el.classList.add("visible"), idx * 80);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="section-label mb-6">Features</span>
          <h2 className="vela-heading text-4xl md:text-5xl text-[#1A0A00] mt-6">
            Everything your business needs.{" "}
            <span className="vela-gradient-text">Nothing you don&apos;t.</span>
          </h2>
          <p className="mt-5 text-[#888888] text-lg max-w-xl mx-auto">
            One platform replaces five tools. No integrations needed.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <div
              key={feat.title}
              data-index={i}
              className="feat-card card-feature opacity-0 translate-y-5 transition-all duration-500 ease-out"
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-[#FF6B35]"
                style={{ background: "rgba(255,107,53,0.08)" }}
              >
                {feat.icon}
              </div>

              {/* Tag */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1A0A00] font-bold text-lg">{feat.title}</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0e8e0] text-[#888888]">
                  {feat.tag}
                </span>
              </div>

              <p className="text-[#888888] text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .feat-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
