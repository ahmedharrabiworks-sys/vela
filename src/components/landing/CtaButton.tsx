"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const SIZE_CLASSES = {
  sm: "text-sm px-6 py-2.5 gap-1.5",
  md: "text-sm px-7 py-3 gap-2",
  lg: "text-base px-8 py-3.5 gap-2.5",
} as const;

function ArrowIcon({ size }: { size: keyof typeof SIZE_CLASSES }) {
  const px = size === "lg" ? 15 : 13;
  return (
    <svg width={px} height={px} viewBox="0 0 15 15" fill="none" className="rtl:-scale-x-100 shrink-0">
      <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One shared CTA button used sitewide (FIX 1, consolidated fix round) --
 * every "Get Started"/"Start for Free" button on the homepage renders
 * through this component instead of each section hand-rolling its own
 * markup, so copy/style/icon can't drift out of sync again. Defaults to the
 * shared landing.nav.getStarted label ("Start for Free"); pass `label` to
 * override for the one deliberate exception (Hero's main CTA keeps its own
 * "Start 14-Day Free Trial" copy from an earlier explicit decision).
 * Styling comes from the shared .btn-primary class (orange gradient, see
 * globals.css) plus this component's own size/padding classes.
 */
export default function CtaButton({
  href = "/auth/signup",
  size = "md",
  className = "",
  onClick,
  fullWidth = false,
  label,
}: {
  href?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  onClick?: () => void;
  fullWidth?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`btn-primary inline-flex items-center ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {label ?? t("landing.nav.getStarted")}
      <ArrowIcon size={size} />
    </Link>
  );
}
