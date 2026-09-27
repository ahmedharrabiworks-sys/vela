"use client";

import Image from "next/image";
import { useState } from "react";
import Wordmark from "./Wordmark";

interface LogoProps {
  showText?: boolean;
  light?: boolean;
  /**
   * Only affects icon-only renders (showText=false).
   * Wordmark height is controlled by CSS classes, not this prop.
   */
  size?: number;
  /**
   * Override the default responsive height CSS classes for wordmark renders.
   * Use when a specific context needs a non-standard height (e.g. Hero navbar).
   */
  heightClass?: string;
}

// Icon height for the combined icon+wordmark render → 34px mobile / 44px desktop.
const LIGHT_BG_H = "h-[34px] sm:h-11";
const DARK_BG_H  = "h-[34px] sm:h-11";
// Wordmark text size paired with the icon heights above -- proportioned so
// "Vela"'s cap-height roughly matches the icon's visual weight next to it
// (same relationship the old baked-PNG logo had between its icon and text).
const WORDMARK_TEXT = "text-2xl sm:text-[28px]";
// heightClass overrides (e.g. Hero's "!h-14") pair with a larger fixed size --
// same 34/44 -> 24/28 ratio scaled up.
const WORDMARK_TEXT_LG = "text-[38px]";

export default function Logo({ showText = true, light = false, size, heightClass }: LogoProps) {
  if (showText) {
    // light=true  → white wordmark on dark backgrounds
    // light=false → brand-orange wordmark on light backgrounds
    const H = heightClass ?? (light ? DARK_BG_H : LIGHT_BG_H);
    const textSize = heightClass ? WORDMARK_TEXT_LG : WORDMARK_TEXT;
    return (
      <div className="flex items-center gap-2 group cursor-pointer">
        <span className={`${H} shrink-0 flex items-center transition-transform duration-300 group-hover:scale-110`}>
          <LogoMark light={light} bare className="h-full w-auto" />
        </span>
        <Wordmark light={light} className={`${textSize} transition-opacity duration-200 group-hover:opacity-85`} />
      </div>
    );
  }
  // Icon-only: use explicit size when provided (e.g. collapsed sidebar at 28px),
  // otherwise use responsive CSS height.
  return <LogoMark size={size} light={light} />;
}

function LogoMark({ size, light = false, className, bare = false }: { size?: number; light?: boolean; className?: string; bare?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasExplicit = size !== undefined;
  const imgStyle = hasExplicit && !className ? { width: size, height: size } : undefined;
  const imgClass =
    className ??
    (hasExplicit
      ? "object-contain transition-opacity duration-200 group-hover:opacity-85"
      : `${DARK_BG_H} w-auto object-contain transition-opacity duration-200 group-hover:opacity-85`);

  // bare=true (used inside Logo's combined icon+Wordmark render, which
  // already provides its own outer flex/group wrapper) skips the redundant
  // inner wrapper div so hover/group state isn't duplicated.
  const content = !failed ? (
    <Image
      src="/assets/logo-mark.png"
      alt="Vela"
      width={size ?? 40}
      height={size ?? 40}
      className={imgClass}
      style={imgStyle}
      onError={() => setFailed(true)}
      priority
      unoptimized
    />
  ) : (
    // SVG fallback when logo-mark.png is absent
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className ?? (hasExplicit ? "transition-transform duration-300 group-hover:scale-110" : `${DARK_BG_H} w-auto transition-transform duration-300 group-hover:scale-110`)}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vela-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--vp-color)" />
          <stop offset="100%" stopColor="var(--va-color)" />
        </linearGradient>
      </defs>
      <path
        d="M5 7L18 28L31 7"
        stroke={light ? "white" : "url(#vela-logo-grad)"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18" cy="30" r="2.5" fill={light ? "white" : "url(#vela-logo-grad)"} />
    </svg>
  );

  if (bare) return content;
  return <div className="flex items-center group cursor-pointer">{content}</div>;
}
