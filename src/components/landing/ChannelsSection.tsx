import Link from "next/link";

// Replaces the old "What's included with Vela" table + robot-mascot panel
// (both deleted -- Phase 6). White background, orange accents only, no
// stock/AI-generated photography, no invented stats. Three real channels
// Vela actually connects to (WhatsApp, Instagram, Phone), drawn in a single
// consistent monochrome-orange icon language rather than each channel's own
// brand color, then visually funneled into one line: "One inbox."
const CHANNELS = [
  {
    name: "WhatsApp",
    desc: "Answers every WhatsApp message the moment it lands.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 00-7.75 13.5L3 21l4.65-1.22A9 9 0 1012 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.3 8.6c.2-.6.8-.6 1.1-.6.3 0 .5 0 .7.4.2.5.7 1.6.7 1.7.1.1.1.3 0 .5-.1.2-.2.3-.3.4-.1.2-.3.3-.4.5-.1.1-.3.3-.1.6.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.7 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.2 1.6-.3.7-1.6 1.4-2.2 1.4-.6.1-1.3.1-4.5-1.3-3.8-1.7-6.1-5.5-6.3-5.8-.2-.3-1.4-1.9-1.4-3.7 0-1.7.9-2.6 1.2-3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    desc: "Replies to DMs and comments in your brand voice, instantly.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Phone",
    desc: "Picks up every call, day or night, and books the appointment.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 4.5h3.2l1.4 4.3-2 1.5a11 11 0 006.1 6.1l1.5-2 4.3 1.4V19a1.5 1.5 0 01-1.6 1.5C11.6 20 4 12.4 3.5 6.1A1.5 1.5 0 015 4.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function ChannelsSection() {
  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-5xl mx-auto px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#FF6B35" }}>
            How it works
          </span>
          <h2 className="font-display font-extrabold text-[24px] sm:text-[30px] md:text-[36px] text-[#111111] leading-tight">
            One AI. <span className="vela-gradient-text">Every channel.</span>
          </h2>
          <p className="text-[#6B7280] text-base md:text-lg mt-3 max-w-md mx-auto leading-relaxed">
            Connect WhatsApp, Instagram, and your phone number. Vela answers on all three, instantly.
          </p>
        </div>

        {/* Channel cards, connected by a thin line funneling into one inbox */}
        <div className="relative">
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
            {CHANNELS.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-7 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                  style={{ background: "#FFF3EE", color: "#FF6B35" }}
                >
                  {c.icon}
                </span>
                <p className="text-[#111111] font-bold text-base">{c.name}</p>
                <p className="text-[#6B7280] text-sm mt-1.5 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Connecting lines -> funnel into "One inbox" pill (desktop only) */}
          <div className="hidden sm:flex justify-center mt-3" aria-hidden="true">
            <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" style={{ maxWidth: 420 }}>
              <path d="M8 0 V10 Q8 14 12 14 H88 Q92 14 92 10 V0" stroke="rgba(255,107,53,0.35)" strokeWidth="1.5" fill="none" />
              <path d="M50 14 V24" stroke="rgba(255,107,53,0.35)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>

        <div className="flex justify-center mt-1 md:mt-2">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "#FFF3EE", color: "#C2410C" }}
          >
            One unified inbox
          </span>
        </div>

        <div className="text-center mt-8">
          <Link href="/auth/signup" className="btn-primary whitespace-nowrap text-sm py-3 px-7 sm:text-base sm:py-3.5 sm:px-8">
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
