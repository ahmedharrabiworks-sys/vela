"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  size?: number;
  showText?: boolean;
  light?: boolean;
}

export default function Logo({ size = 36, showText = true, light = false }: LogoProps) {
  const imgHeight = size;
  const imgWidth  = Math.round(size * 3);

  if (showText) {
    const wordmarkSrc = light ? "/logo-light.png" : "/logo.png";
    return (
      <div className="flex items-center group cursor-pointer">
        <Image
          src={wordmarkSrc}
          alt="Vela"
          height={imgHeight}
          width={imgWidth}
          // width:auto ensures both light and dark PNGs render at identical visual height
          // regardless of internal whitespace differences between the two PNG files
          style={{ height: `${imgHeight}px`, width: "auto", maxWidth: `${imgWidth}px` }}
          className="object-contain transition-opacity duration-200 group-hover:opacity-85"
          priority
          unoptimized
        />
      </div>
    );
  }

  // Icon-only: try /assets/logo-mark.png, fall back to inline SVG V mark
  return <LogoMark size={size} light={light} />;
}

function LogoMark({ size, light }: { size: number; light: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <div className="flex items-center group cursor-pointer">
        <Image
          src="/assets/logo-mark.png"
          alt="Vela"
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="object-contain transition-opacity duration-200 group-hover:opacity-85"
          onError={() => setFailed(true)}
          priority
          unoptimized
        />
      </div>
    );
  }

  // SVG fallback while logo-mark.png is not yet in /public/assets/
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
