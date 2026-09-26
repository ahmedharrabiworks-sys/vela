/**
 * Real Qatar flag: maroon field (#8A1538) with the flag's actual 9-point
 * serrated white band on the hoist side (not a plain two-color rectangle).
 * ViewBox proportions match the flag's real 11:28 ratio.
 */
export default function QatarFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 110"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Qatar flag"
    >
      <rect width="280" height="110" fill="#8A1538" />
      <path
        d="M0,0 L50,0 L85,6.11 L50,12.22 L85,18.33 L50,24.44 L85,30.56 L50,36.67 L85,42.78 L50,48.89 L85,55 L50,61.11 L85,67.22 L50,73.33 L85,79.44 L50,85.56 L85,91.67 L50,97.78 L85,103.89 L50,110 L0,110 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
