"use client";

import Image from "next/image";

interface LogoProps {
  size?: number;
  showText?: boolean;
  light?: boolean;
}

export default function Logo({ size = 36, showText = true, light = false }: LogoProps) {
  // height = size; width auto-calculated at 3:1 ratio (typical wordmark)
  const imgHeight = size;
  const imgWidth = Math.round(size * 3);

  if (showText) {
    // Full wordmark PNG — includes both the mark and the text
    return (
      <div className="flex items-center group cursor-pointer">
        <Image
          src="/logo.png"
          alt="Vela"
          height={imgHeight}
          width={imgWidth}
          className={`object-contain transition-opacity duration-200 group-hover:opacity-85${light ? " brightness-[100]" : ""}`}
          priority
          unoptimized
        />
      </div>
    );
  }

  // Icon-only fallback (no text): keep the SVG V mark
  return (
    <div className="flex items-center group cursor-pointer">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-110"
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
