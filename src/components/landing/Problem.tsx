"use client";

import { useEffect, useRef } from "react";

const PAINS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4z" stroke="#FF6B35" strokeWidth="1.5"/>
        <path d="M14 9v5l3 3" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "DMs go unanswered",
    body: "Leads choose the competitor who replies first. Every hour of silence is a booking you never see.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M6 22L10 10l4 8 4-12 4 14" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "No follow-up system",
    body: "Warm leads go cold in 24 hours. Without automated follow-up, revenue silently disappears.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="8" width="20" height="14" rx="2" stroke="#FF6B35" strokeWidth="1.5"/>
        <path d="M9 12h10M9 16h6" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 4v4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Staff do repetitive work",
    body: "Your team answers the same 10 questions all day. Their time is wasted on tasks AI can handle instantly.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="#FF6B35" strokeWidth="1.5"/>
        <rect x="15" y="4" width="9" height="9" rx="1.5" stroke="#FF6B35" strokeWidth="1.5"/>
        <rect x="4" y="15" width="9" height="9" rx="1.5" stroke="#FF6B35" strokeWidth="1.5"/>
        <rect x="15" y="15" width="9" height="9" rx="1.5" stroke="#FF6B35" strokeWidth="1.5"/>
      </svg>
    ),
    title: "No unified view",
    body: "Leads are scattered across Instagram, WhatsApp, and email. Nothing is connected. Leads fall through the cracks.",
  },
];

export default function Problem() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll(".pain-card");
    if (!cards) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = Number(el.dataset.index);
            setTimeout(() => el.classList.add("visible"), idx * 120);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-28 bg-[#1A0A00] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(255,107,53,0.12),transparent)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 reveal-child">
          <span className="section-label mb-6">The Problem</span>
          <h2 className="vela-heading text-4xl md:text-5xl lg:text-6xl text-white mt-6">
            Every slow reply is a{" "}
            <span className="vela-gradient-text">lost client.</span>
          </h2>
        </div>

        {/* Pain cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {PAINS.map((pain, i) => (
            <div
              key={pain.title}
              data-index={i}
              className="pain-card opacity-0 translate-y-6 transition-all duration-500 ease-out card-glass p-7 group hover:border-[#FF6B35]/30"
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center mb-5 group-hover:bg-[#FF6B35]/20 transition-colors">
                {pain.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{pain.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{pain.body}</p>
            </div>
          ))}
        </div>

        {/* Stat */}
        <div className="mt-14 text-center">
          <div className="inline-block rounded-2xl border border-[#FF6B35]/20 bg-[#FF6B35]/5 px-8 py-5">
            <p className="text-2xl md:text-3xl font-bold text-white">
              <span className="vela-gradient-text">78%</span> of customers book with the first
              business that replies.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pain-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
