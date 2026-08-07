"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  showText?: boolean;
  light?: boolean;
  /**
   * Only affects icon-only renders (showText=false).
   * Wordmark height is always 32px mobile / 40px desktop via CSS — size is ignored.
   */
  size?: number;
}

// Single source of truth for logo height across the entire app.
// h-8  = 32px on mobile  (< 640px)
// sm:h-10 = 40px on desktop (>= 640px)
const H = "h-8 sm:h-10";

export default function Logo({ showText = true, light = false, size }: LogoProps) {
  if (showText) {
    return (
      <div className="flex items-center group cursor-pointer">
        <Image
          src={light ? "/logo-light.png" : "/logo.png"}
          alt="Vela"
          height={40}
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
  // otherwise fall back to responsive CSS height.
  return <LogoMark size={size} light={light} />;
}

function LogoMark({ size, light = false }: { size?: number; light?: boolean }) {
  const [failed, setFailed] = useState(false);
  // Use responsive CSS classes when no explicit size override given
  const hasExplicit = size !== undefined;
  const imgStyle = hasExplicit ? { width: size, height: size } : undefined;
  const imgClass = hasExplicit
    ? "object-contain transition-opacity duration-200 group-hover:opacity-85"
    : `${H} w-auto object-contain transition-opacity duration-200 group-hover:opacity-85`;

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
  const svgSize = size ?? undefined;
  return (
    <div className="flex items-center group cursor-pointer">
      <svg
        width={svgSize}
        height={svgSize}
        className={hasExplicit ? "transition-transform duration-300 group-hover:scale-110" : `${H} w-auto transition-transform duration-300 group-hover:scale-110`}
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
