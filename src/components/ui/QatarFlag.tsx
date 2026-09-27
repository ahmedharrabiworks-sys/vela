/**
 * Real Qatar flag, hand-built: correct 28:11 ratio, maroon field (#8A1538)
 * with the flag's 9-point serrated white band on the hoist side (not a
 * plain two-color rectangle). The serration's horizontal amplitude
 * (valley at x=6, peak at x=12 -- roughly double the real flag's actual
 * proportion) is deliberately exaggerated versus the physical flag: at
 * the real proportion (~3.3 units wide out of 28) each tooth is under 2px
 * tall at any icon-scale size and is visually indistinguishable from a
 * flat rectangle, which is exactly the bug this fixes. No glow, no blur --
 * a fine 0.5px outline plus a 2px corner rounding for a clean, premium
 * chip instead of a soft blurry blob.
 */
export default function QatarFlag({
  className,
  style,
  heightPx = 16,
}: {
  className?: string;
  style?: React.CSSProperties;
  heightPx?: number;
}) {
  return (
    <svg
      viewBox="0 0 28 11"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Qatar flag"
      shapeRendering="geometricPrecision"
      style={{
        height: heightPx,
        width: "auto",
        display: "block",
        borderRadius: 2,
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      <rect width="28" height="11" fill="#8A1538" />
      <path
        d="M0,0 L6,0 L12,0.61 L6,1.22 L12,1.83 L6,2.44 L12,3.06 L6,3.67 L12,4.28 L6,4.89 L12,5.5 L6,6.11 L12,6.72 L6,7.33 L12,7.94 L6,8.56 L12,9.17 L6,9.78 L12,10.39 L6,11 L0,11 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
