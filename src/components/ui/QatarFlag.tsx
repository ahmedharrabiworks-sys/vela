/**
 * Real Qatar flag, hand-built: correct 28:11 ratio, maroon field (#8A1538)
 * with the flag's actual 9-point serrated white band on the hoist side (not
 * a plain two-color rectangle). Rendered small and crisp -- no glow, no
 * blur, a fine 0.5px outline plus a 2px corner rounding so it reads as a
 * clean, premium little chip rather than a soft blurry blob.
 */
export default function QatarFlag({
  className,
  style,
  heightPx = 14,
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
        d="M0,0 L7.6,0 L10.9,0.61 L7.6,1.22 L10.9,1.83 L7.6,2.44 L10.9,3.06 L7.6,3.67 L10.9,4.28 L7.6,4.89 L10.9,5.5 L7.6,6.11 L10.9,6.72 L7.6,7.33 L10.9,7.94 L7.6,8.56 L10.9,9.17 L7.6,9.78 L10.9,10.39 L7.6,11 L0,11 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
