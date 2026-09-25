/**
 * One consistent ambient background glow, used identically across every
 * homepage section (Hero, ProductTourDemo, DashboardSection, Pricing,
 * Footer). Pure CSS keyframe animation -- no JS, no mousemove, no pointer
 * tracking of any kind, so it behaves identically on desktop and mobile
 * and can never be a source of the hydration/touch-device issues the old
 * mouse-tracked CursorSpotlight risked. Small, low-opacity, slow drift --
 * texture, not a wash. See .ambient-glow-blob in globals.css for the
 * keyframes and the prefers-reduced-motion override.
 *
 * Render as a direct child of a `position: relative` section, same
 * placement convention the old CursorSpotlight used.
 */
export default function AmbientGlow() {
  return (
    <div aria-hidden="true" className="ambient-glow pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div className="ambient-glow-blob" />
    </div>
  );
}
