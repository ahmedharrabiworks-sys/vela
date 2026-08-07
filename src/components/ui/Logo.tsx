"use client";

import Image from "next/image";
import { useState } from "react";

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

// Light-background wordmark (/assets/logo-full.png)  →  34px mobile / 44px desktop
const LIGHT_BG_H = "h-[34px] sm:h-11";
// Dark-background wordmark (/logo-light.png)          →  32px mobile / 40px desktop
const DARK_BG_H  = "h-8 sm:h-10";

export default function Logo({ showText = true, light = false, size, heightClass }: LogoProps) {
  if (showText) {
    // light=true  → white wordmark on dark backgrounds  → /logo-light.png
    // light=false → dark wordmark on light backgrounds  → /assets/logo-full.png
    const src = light ? "/logo-light.png" : "/assets/logo-full.png";
    const H   = heightClass ?? (light ? DARK_BG_H : LIGHT_BG_H);
    return (
      <div className="flex items-center group cursor-pointer">
        <Image
          src={src}
          alt="Vela"
          height={light ? 40 : 44}
          width={160}
          className={`${H} w-auto object-contain transition-opacity duration-200 group-hover:opacity-85`}
          style={{ maxWidth: "160px" }}
          priority
          unoptimized
        />
      </div>
    );
  }
  // Icon-only: use explicit size when provided (e.g. collapsed sidebar at 28px),
  // otherwise use responsive CSS height.
  return <LogoMark size={size} light={light} />;
}

function LogoMark({ size, light = false }: { size?: number; light?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasExplicit = size !== undefined;
  const imgStyle = hasExplicit ? { width: size, height: size } : undefined;
  const imgClass = hasExplicit
    ? "object-contain transition-opacity duration-200 group-hover:opacity-85"
    : `${DARK_BG_H} w-auto object-contain transition-opacity duration-200 group-hover:opacity-85`;

  if (!failed) {
    return (
      <div className="flex items-center group cursor-pointer">
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
      </div>
    );
  }

  // SVG fallback when logo-mark.png is absent
  return (
    <div className="flex items-center group cursor-pointer">
      <svg
        width={size}
        height={size}
        className={hasExplicit ? "transition-transform duration-300 group-hover:scale-110" : `${DARK_BG_H} w-auto transition-transform duration-300 group-hover:scale-110`}
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
    </div>
  );
}
