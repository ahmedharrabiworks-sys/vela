/**
 * 2-3 soft, static orange/rose blobs positioned behind glass surfaces so the
 * backdrop-filter blur has real color to pick up (glass reads as invisible
 * over plain white). Render as the first child of a `position: relative`
 * section, before the glass card(s). No filter:blur() -- see .glass-blob in
 * globals.css for why a pre-softened radial-gradient is used instead.
 */
export default function GlassBlobs({
  variant = "spread",
}: {
  /** "spread": 3 blobs across a wide section. "tight": 2 blobs for a narrower card-sized section. */
  variant?: "spread" | "tight";
}) {
  if (variant === "tight") {
    return (
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="glass-blob glass-blob--orange" style={{ width: 320, height: 320, top: "-12%", left: "-8%" }} />
        <div className="glass-blob glass-blob--rose" style={{ width: 300, height: 300, bottom: "-15%", right: "-6%" }} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className="glass-blob glass-blob--orange" style={{ width: 420, height: 420, top: "-15%", left: "-5%" }} />
      <div className="glass-blob glass-blob--rose" style={{ width: 380, height: 380, bottom: "-18%", right: "8%" }} />
      <div className="glass-blob glass-blob--orange" style={{ width: 280, height: 280, top: "35%", left: "60%" }} />
    </div>
  );
}
