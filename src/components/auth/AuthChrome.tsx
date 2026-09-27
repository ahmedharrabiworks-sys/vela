"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import MadeInQatar from "@/components/ui/MadeInQatar";
import LanguageToggle from "@/components/landing/LanguageToggle";
import AmbientGlow from "@/components/landing/AmbientGlow";
import { useI18n } from "@/lib/i18n";

export const authInputCls =
  "input-glass w-full ps-10 pe-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] transition-all";

/** Plain (non-icon) glass input, for fields without a leading icon (city, company name, etc). */
export const authPlainInputCls =
  "input-glass w-full px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] transition-all";

/** Glass style for secondary buttons (Back, Continue with Google) and dropdown pills. */
export const authGlassBtnCls = "input-glass transition-all";

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
      className="input-glass w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold text-[#374151] hover:bg-white/70 transition-all duration-200"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

/**
 * 3 static blobs sized/positioned to sit partly behind a .glass-auth
 * card's own edges (render as a sibling BEFORE the card, inside a shared
 * position:relative wrapper that does NOT clip overflow, so the blobs can
 * bleed past the card boundary). Logical start/end insets so the same
 * "top-left / bottom-right" reading holds under RTL mirroring too.
 */
export function AuthBlobs() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="auth-blob auth-blob--orange w-[320px] h-[320px] md:w-[520px] md:h-[520px]"
        style={{ top: "-14%", insetInlineStart: "-14%" }}
      />
      <div
        className="auth-blob auth-blob--rose w-[280px] h-[280px] md:w-[460px] md:h-[460px]"
        style={{ bottom: "-14%", insetInlineEnd: "-12%" }}
      />
      <div
        className="auth-blob auth-blob--peach w-[200px] h-[200px] md:w-[300px] md:h-[300px]"
        style={{ top: "38%", insetInlineEnd: "-8%" }}
      />
    </div>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pt-14 pb-6 sm:py-10 relative overflow-hidden">
      <AmbientGlow pos="start" />
      <AmbientGlow pos="end" />

      <div className="absolute top-0 start-0 p-4 sm:p-6 z-10">
        <Link href="/">
          <Logo showText={false} />
        </Link>
      </div>

      <div className="absolute top-0 end-0 p-4 sm:p-6 z-10">
        <LanguageToggle />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}

        <div className="mt-4 sm:mt-8">
          <MadeInQatar />
        </div>
      </div>
    </div>
  );
}

/**
 * Split card: SOLID (fully opaque, no glass/blur/translucency of any kind)
 * gradient panel on the start side, glass white form panel (children) on
 * the end side. CSS Grid auto-mirrors under dir="rtl" -- no rtl: overrides
 * needed here.
 *
 * Bug fix (glass-bleed round): .glass-auth used to sit on the OUTER card
 * (spanning both panels). Its ::after liquid-sheen pseudo-element is
 * position:absolute with z-index:0, which -- since the orange panel's own
 * div has no elevated z-index of its own -- painted on top of it in DOM
 * order (::after is generated as the element's conceptual last child), a
 * semi-transparent white gradient over vivid orange, which is exactly what
 * washed the panel out to pale pink. Fix: .glass-auth now lives ONLY on
 * the form-panel div. The orange panel is a plain opaque sibling with its
 * own inline gradient and is never touched by any glass pseudo-element.
 * The outer wrapper still clips both to the card's rounded corners via
 * plain `overflow-hidden` + `rounded-[28px]` -- no glass classes on it.
 */
function BrandWordmark({ className = "" }: { className?: string }) {
  return <Wordmark light className={className} />;
}

export function AuthSplitCard({
  children,
  panelHeadline,
  panelBody,
  stepLabel,
}: {
  children: React.ReactNode;
  /** Defaults to the sitewide auth tagline (step 1 / login). Pass a
      step-specific string for steps 2-4. */
  panelHeadline?: string;
  panelBody?: string;
  /** When provided (e.g. "Step 2 of 4"), the panel switches to the slim
      64px mobile banner (wordmark + step label, no headline/body on
      mobile -- there isn't room, and Made in Qatar must stay visible
      without scrolling). Omit for step 1 / login, which keep the taller
      mobile banner with the headline visible. Desktop is unaffected
      either way -- it always shows wordmark + headline + body. */
  stepLabel?: string;
}) {
  const { t } = useI18n();
  const headline = panelHeadline ?? t("landing.auth.tagline");
  const body = panelBody ?? t("landing.auth.taglineBody");
  const slim = !!stepLabel;

  return (
    <div className="relative w-full max-w-4xl">
      <AuthBlobs />
      <div className="relative rounded-[28px] overflow-hidden grid md:grid-cols-[42%_1fr]">
        {/* Decorative panel -- fully opaque, no glass. */}
        <div
          className={`relative overflow-hidden px-6 md:p-10 flex flex-col justify-center ${
            slim ? "h-16 md:h-auto md:min-h-[420px] py-0 md:py-6" : "py-6 md:py-6 min-h-[104px] md:min-h-[420px]"
          }`}
          style={{ background: "var(--vela-gradient)" }}
        >
          <div aria-hidden="true" className={`absolute -bottom-16 -start-10 w-56 h-56 rounded-full bg-white/10 ${slim ? "hidden md:block" : ""}`} />
          <div aria-hidden="true" className={`absolute top-1/3 end-[-3.5rem] w-32 h-32 rounded-full bg-white/10 ${slim ? "hidden md:block" : ""}`} />
          <div aria-hidden="true" className="absolute -top-10 start-1/3 w-24 h-24 rounded-full bg-white/[0.08] hidden md:block" />

          {/* Slim mobile banner: wordmark (start) + step label (end), row
              layout, no headline/body -- md:hidden, replaced by the full
              content block below on desktop. */}
          {slim && (
            <div className="relative flex md:hidden items-center justify-between h-16">
              <BrandWordmark className="text-xl" />
              <span className="text-xs font-semibold text-white/85">{stepLabel}</span>
            </div>
          )}

          <div className={`relative ${slim ? "hidden md:block" : ""}`}>
            <BrandWordmark className={slim ? "text-[40px] mb-5" : "text-[28px] md:text-[40px] mb-5"} />
            <h2 className="vela-heading text-lg md:text-[28px] text-white leading-tight mb-1.5 md:mb-3">
              {headline}
            </h2>
            <p className="hidden md:block text-white/80 text-sm leading-relaxed max-w-[280px]">
              {body}
            </p>
          </div>
        </div>

        {/* Form panel -- the ONLY glass surface on this card. */}
        <div className="glass-auth">
          <div className="glass-auth-content px-6 py-6 sm:px-10 sm:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
