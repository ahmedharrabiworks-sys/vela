"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const SIZE_CLASSES = {
  xs: "text-sm ps-4 pe-3.5 py-2 gap-1.5",
  sm: "text-sm px-5 py-2.5 gap-1.5",
  md: "text-sm px-6 py-3 gap-2",
  // Hero mobile-navbar-bigger round: 16px font, 48px min tap height, for
  // the taller (52px->64px) mobile pill. Additive -- xs/sm/md untouched.
  nav: "text-base ps-5 pe-4 py-3 min-h-[48px] gap-2",
} as const;

const AVATAR_SIZE_CLASSES = {
  xs: "w-[18px] h-[18px] text-[8px]",
  sm: "w-5 h-5 text-[9px]",
  md: "w-6 h-6 text-[10px]",
  nav: "w-6 h-6 text-[10px]",
} as const;

/**
 * Logged-in-visitor replacement for the header's "Log in" + "Start for
 * Free" pair (logged-in header round). Same shared .btn-primary gradient
 * as CtaButton, with a small initials avatar at the leading edge -- this
 * is deliberately its own component rather than a new CtaButton prop,
 * since CtaButton is reused all over the landing page (pricing cards,
 * DashboardSection, etc.) where "Start for Free" must keep showing
 * regardless of session state; only the header (and the Hero's own CTA,
 * handled separately via CtaButton's existing href/label props) swaps.
 */
export default function OpenVelaButton({
  initials,
  size = "md",
  className = "",
  fullWidth = false,
  onClick,
}: {
  initials: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  fullWidth?: boolean;
  onClick?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Link
      href="/app"
      onClick={onClick}
      className={`btn-primary inline-flex items-center whitespace-nowrap ${SIZE_CLASSES[size]} ${fullWidth ? "w-full justify-center" : ""} ${className}`}
    >
      <span
        className={`rounded-full flex items-center justify-center font-bold shrink-0 ${AVATAR_SIZE_CLASSES[size]}`}
        style={{ background: "rgba(255,255,255,0.25)" }}
        aria-hidden="true"
      >
        {initials}
      </span>
      {t("landing.nav.openVela")}
      <svg width={size === "md" || size === "nav" ? 14 : 13} height={size === "md" || size === "nav" ? 14 : 13} viewBox="0 0 15 15" fill="none" className="rtl:-scale-x-100 shrink-0">
        <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
