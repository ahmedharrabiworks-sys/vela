/**
 * ONE page-level ambient glow layer, replacing the old per-section
 * <AmbientGlow /> instances (Hero/ProductTourDemo/ProblemSection/
 * DashboardSection/Pricing/ComparisonTable/Footer each used to mount their
 * own copy, each clipped to that section's own `overflow-hidden` box).
 *
 * Root cause of the hard horizontal lines at section boundaries: every
 * section clipped its own glow independently, so the gradient visibly cut
 * off exactly at each section's edge instead of fading continuously into
 * the next one. Moving to a single absolutely-positioned layer that spans
 * the full page height (sized against <main>'s own position:relative,
 * whose height is the natural height of every section stacked together)
 * removes the per-section clip boundaries entirely -- the same blobs, just
 * no longer individually fenced in.
 *
 * Renders as the first child of `<main>` in page.tsx. Reuses the exact
 * same `.ambient-glow-blob` class (pre-softened radial-gradient, no
 * filter:blur(), CSS-only drift animation, prefers-reduced-motion
 * override) that every removed per-section instance already used, so
 * performance characteristics are unchanged -- just consolidated.
 */
const BLOBS: { top: string; left: string; delay: string }[] = [
  { top: "6%",  left: "22%", delay: "0s" },
  { top: "20%", left: "82%", delay: "-3s" },
  { top: "36%", left: "12%", delay: "-7s" },
  { top: "52%", left: "78%", delay: "-2s" },
  { top: "68%", left: "18%", delay: "-9s" },
  { top: "84%", left: "80%", delay: "-5s" },
  { top: "96%", left: "30%", delay: "-11s" },
];

export default function PageAmbientField() {
  return (
    <div aria-hidden="true" className="ambient-glow pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="ambient-glow-blob"
          style={{ top: b.top, left: b.left, animationDelay: b.delay }}
        />
      ))}
    </div>
  );
}
