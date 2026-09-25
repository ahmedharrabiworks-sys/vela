/**
 * One consistent ambient background glow, used across every homepage
 * section (Hero, ProductTourDemo, ProblemSection, DashboardSection,
 * Pricing, Footer). Pure CSS keyframe animation -- no JS, no mousemove, no
 * pointer tracking of any kind, so it behaves identically on desktop and
 * mobile and can never be a source of the hydration/touch-device issues the
 * old mouse-tracked CursorSpotlight risked. Low-opacity, slow drift --
 * texture, not a wash. See .ambient-glow-blob in globals.css for the
 * keyframes and the prefers-reduced-motion override.
 *
 * `pos` varies where the blob sits within its section (center/start/end) so
 * the glow reads as present throughout the scroll rather than one static
 * blob glued to the same spot every time -- same peak color/opacity at
 * every position, only the size and placement changed.
 *
 * Render as a direct child of a `position: relative` section, same
 * placement convention the old CursorSpotlight used.
 */
export default function AmbientGlow({ pos = "center" }: { pos?: "center" | "start" | "end" }) {
  const posClass = pos === "center" ? "" : ` ambient-glow-blob--${pos}`;
  return (
    <div aria-hidden="true" className="ambient-glow pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <div className={`ambient-glow-blob${posClass}`} />
    </div>
  );
}
