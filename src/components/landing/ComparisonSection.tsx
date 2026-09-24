import Link from "next/link";

// Real markup, not an image -- see git history for the old comparison-bg.png
// version. De-risked (MVP scope-down, Phase 4): named competitors and their
// invented prices removed entirely; AI Website Builder, CRM & Lead
// Pipeline, and Full Funnel Analytics rows removed (those features are
// flagged off, see src/config/features.ts). "Unlimited Text Messages"
// renamed to "Text Messaging" -- no plan is actually unlimited anymore
// (src/lib/pricing.ts). Plain "what's included" list: feature name + a
// checkmark, nothing else invented.
const INCLUDED_ROWS: { label: string; icon: JSX.Element }[] = [
  {
    label: "AI Voice Agent",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="6.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 8.5a5.5 5.5 0 0011 0M9 14v2.5M6.5 16.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "WhatsApp + Instagram + Multi-Chat AI",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.5 15V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115 4v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "AI Trainer / Knowledge Base",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6.75 7.5a2.25 2.25 0 014.5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.25 13.5h7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Booking & Appointments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Text Messaging",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15 10.5a1.5 1.5 0 01-1.5 1.5H5.25L2.5 15V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0115 4v6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M5.5 6.5h7M5.5 9h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Follow-Up Automation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.5 9A6.5 6.5 0 013.7 12.9M2.5 9A6.5 6.5 0 0114.3 5.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2.5 4.5V8h3.5M15.5 13.5V10H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Team Members & Multi-User Access",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12 16.5v-1.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6.75" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
        <path d="M16.5 16.5v-1.5a3 3 0 00-2.25-2.9M12 2.1a3 3 0 010 5.81" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Priority Customer Support (24h)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9.5v-1a6 6 0 0112 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="1.5" y="9.5" width="3.5" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        <rect x="13" y="9.5" width="3.5" height="4.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    label: "Real-Time Reporting Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 15V9.75M7.5 15V6.75M12 15V3.75M16.5 15V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

function CheckBadge() {
  return (
    <span
      className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
      style={{ background: "rgba(255,107,53,0.14)" }}
      aria-label="Included"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6.5l2.5 2.5 5.5-6" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function ComparisonSection() {
  return (
    <section className="py-10 md:py-14" style={{ background: "linear-gradient(180deg,#1A0800 0%,#2A0F00 100%)" }}>
      <div className="max-w-3xl mx-auto px-5 md:px-6">

        {/* Section header */}
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="font-inter font-extrabold text-[26px] sm:text-[32px] md:text-[38px] text-white leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            What&apos;s included with Vela
          </h2>
          <p className="text-white/60 text-base md:text-lg mt-3 max-w-lg mx-auto leading-relaxed">
            One platform. Vela replaces the separate tools you&apos;d otherwise need to piece together.
          </p>
        </div>

        {/* Included list card */}
        <div className="relative">
          <div className="absolute top-1/2 left-1/2 pointer-events-none" aria-hidden="true"
            style={{ width: "calc(100% + 80px)", height: "calc(100% + 80px)", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "rgba(255,107,53,0.2)", filter: "blur(60px)", zIndex: 0 }} />
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "#FDF3EA", zIndex: 1 }}>
            <div className="divide-y divide-black/[0.06]">
              {INCLUDED_ROWS.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[#111111] shrink-0">{row.icon}</span>
                    <span className="text-[#111111] text-sm sm:text-base font-medium">{row.label}</span>
                  </div>
                  <CheckBadge />
                </div>
              ))}
            </div>
          </div>
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
