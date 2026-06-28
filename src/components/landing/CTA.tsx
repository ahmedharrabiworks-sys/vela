"use client";

import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-20 md:py-28 bg-[#1A0A00] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(255,107,53,0.2),transparent)] animate-pulse-glow pointer-events-none" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#FF6B35 1px,transparent 1px),linear-gradient(90deg,#FF6B35 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 md:px-6 text-center">
        <span className="section-label mb-8">Get Started</span>

        <h2 className="vela-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mt-8 mb-6">
          Stop losing customers
          <br />
          <span className="vela-gradient-text">to slow replies.</span>
        </h2>

        <p className="text-white/60 text-base md:text-xl mb-10 max-w-lg mx-auto">
          Start your free 7-day trial. No credit card required.
          Be live in 7 days.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-14">
          <Link href="/auth/signup" className="btn-primary text-base px-10 py-4 text-lg justify-center">
            Start Free Trial
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.5 9h11M10 5l4.5 4-4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Contact options */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6">
          <a
            href="https://wa.me/971000000000"
            className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center bg-[#25D366]/15 text-[#25D366]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/>
              </svg>
            </span>
            Chat on WhatsApp
          </a>
          <a
            href="mailto:hello@vela.ai"
            className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-sm"
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FF6B35]/15 text-[#FF6B35]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            hello@vela.ai
          </a>
        </div>
      </div>
    </section>
  );
}
