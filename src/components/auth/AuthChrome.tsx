"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import QatarFlag from "@/components/ui/QatarFlag";
import LanguageToggle from "@/components/landing/LanguageToggle";
import AmbientGlow from "@/components/landing/AmbientGlow";
import { useI18n } from "@/lib/i18n";

export const authInputCls =
  "w-full bg-white border border-[#E5E7EB] ps-10 pe-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";

export function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="6.5" r="3.25" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M3.5 17c1.2-3.4 4-5 6.5-5s5.3 1.6 6.5 5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.75" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M3.5 5.5l6.5 5 6.5-5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="9" width="12" height="8.5" rx="1.75" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Absolutely-positioned leading icon for icon-prefixed inputs. RTL-safe (start-3, not left-3). */
export function InputIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2">
      {children}
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] transition-all duration-200 bg-white"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pt-20 pb-10 sm:py-10 relative overflow-hidden">
      <AmbientGlow pos="start" />
      <AmbientGlow pos="end" />

      <div className="absolute top-0 start-0 p-6 z-10">
        <Link href="/">
          <Logo showText={false} />
        </Link>
      </div>

      <div className="absolute top-0 end-0 p-6 z-10">
        <LanguageToggle />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}

        <div className="flex items-center justify-center gap-2 mt-8">
          <span className="text-xs text-[#9CA3AF] font-medium">{t("landing.footer.madeInQatar")}</span>
          <QatarFlag
            className="w-5 h-auto rounded-[1.5px]"
            style={{ filter: "drop-shadow(0 0 4px rgba(138,21,56,0.55)) drop-shadow(0 0 9px rgba(138,21,56,0.3))" }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Split card: decorative gradient panel (brand copy + soft circles) on the
 * start side, white icon-prefixed form panel (children) on the end side.
 * CSS Grid auto-mirrors under dir="rtl" -- no rtl: overrides needed here.
 * Liquid-glass treatment on the outer card (translucent white + blur +
 * soft border/shadow), same recipe as the site header.
 */
export function AuthSplitCard({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div
      className="w-full max-w-4xl rounded-[28px] overflow-hidden grid md:grid-cols-[42%_1fr] border border-white/60"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 40px rgba(17,17,17,0.12), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {/* Decorative panel */}
      <div
        className="relative overflow-hidden px-7 py-8 md:p-10 flex flex-col justify-center min-h-[132px] md:min-h-[420px]"
        style={{ background: "var(--vela-gradient)" }}
      >
        <div aria-hidden="true" className="absolute -bottom-16 -start-10 w-56 h-56 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute top-1/3 end-[-3.5rem] w-32 h-32 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -top-10 start-1/3 w-24 h-24 rounded-full bg-white/[0.08] hidden md:block" />

        <div className="relative">
          <div className="hidden md:block mb-6">
            <Logo showText light />
          </div>
          <h2 className="vela-heading text-xl md:text-[28px] text-white leading-tight mb-2 md:mb-3">
            {t("landing.auth.tagline")}
          </h2>
          <p className="hidden md:block text-white/80 text-sm leading-relaxed max-w-[280px]">
            {t("landing.auth.taglineBody")}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="bg-white/70 px-6 py-8 sm:px-10 sm:py-10">{children}</div>
    </div>
  );
}
