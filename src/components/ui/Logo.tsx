"use client";

interface LogoProps {
  size?: number;
  showText?: boolean;
  light?: boolean;
}

export default function Logo({ size = 36, showText = true, light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5 group cursor-pointer">
      {/* V mark with dot */}
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
            <stop offset="0%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#FF3366" />
          </linearGradient>
        </defs>
        {/* V shape — two sharp angled strokes meeting at a point */}
        <path
          d="M5 7L18 28L31 7"
          stroke="url(#vela-logo-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Dot at the bottom point */}
        <circle cx="18" cy="30" r="2.5" fill="url(#vela-logo-grad)" />
      </svg>

      {showText && (
        <span
          className="text-xl font-extrabold tracking-tightest transition-all duration-300"
          style={{
            letterSpacing: "-0.04em",
            color: light ? "#ffffff" : "#1A0A00",
          }}
        >
          vela
        </span>
      )}
    </div>
  );
}
