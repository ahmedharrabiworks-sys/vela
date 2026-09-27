import Image from "next/image";

/**
 * The real logo, everywhere (brand-font round, FIX 3). Replaces the
 * previous round's live-rendered Wordmark text component entirely --
 * Oussama's explicit call: the brand uses the actual logo asset, not a
 * font rendering of "Vela", however close the font match is. Two full-
 * logo variants (mark + wordmark) plus a mark-only render for collapsed
 * contexts (sidebar collapsed state, compact mobile headers).
 *
 * Sources: public/brand/logo-color.png (orange mark, dark/orange
 * wordmark -- light backgrounds), public/brand/logo-white.png (mark +
 * wordmark both white -- the orange auth panels / dark backgrounds),
 * public/brand/logo-mark.png (icon only, trimmed, highest-res source
 * available). Built via src/scripts/build-brand-assets.mjs from the
 * best-quality existing source files -- a fresh SVG trace was considered
 * (per the task) and not attempted: the PNG sources are already sharp at
 * every display size this project uses (742x336 / 639x612 shown at a
 * 28-40px display height is 15-20x oversampled), so a hand-traced vector
 * would add risk (subtle shape drift from the real logo) for no visible
 * sharpness gain. Revisit only if the logo is ever needed at poster/print
 * scale, which no current call site does.
 */

const FULL_SRC = {
  color: "/brand/logo-color.png",
  white: "/brand/logo-white.png",
} as const;
const FULL_DIMS = { width: 742, height: 336 };

const MARK_SRC = "/brand/logo-mark.png";
const MARK_DIMS = { width: 639, height: 612 };

// Consistent sizes across the site (spec'd sizes, FIX 3):
// sm = 28px flat (sidebar, mobile-only compact spots)
// md = 28px mobile / 32px desktop (headers)
// lg = 30px mobile / 40px desktop (auth panels)
const SIZE_CLASSES = {
  sm: "h-7",
  md: "h-7 sm:h-8",
  lg: "h-[30px] sm:h-10",
} as const;

export type LogoVariant = "color" | "white";
export type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** Icon mark only (no wordmark) -- collapsed sidebar, compact mobile capsule. */
  markOnly?: boolean;
  className?: string;
}

export default function Logo({ variant = "color", size = "md", markOnly = false, className = "" }: LogoProps) {
  const src = markOnly ? MARK_SRC : FULL_SRC[variant];
  const dims = markOnly ? MARK_DIMS : FULL_DIMS;
  const sizeCls = SIZE_CLASSES[size];

  return (
    <Image
      src={src}
      alt="Vela"
      width={dims.width}
      height={dims.height}
      className={`${sizeCls} w-auto object-contain transition-opacity duration-200 hover:opacity-85 ${className}`}
      priority
      unoptimized
    />
  );
}
