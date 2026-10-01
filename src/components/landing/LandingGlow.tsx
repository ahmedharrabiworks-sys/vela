/* hero-v6 round (FIX 1): replaces the `.landing-glow-bg` background-image
   that used to live directly on <main> (see globals.css, now unused by
   the landing page). That background's 7 radial-gradient() stops were
   positioned in PERCENT relative to <main>'s own box -- so <main>'s
   total height (the whole scrollable page) was part of the paint's own
   sizing input. Expanding an FAQ item changes that height on every
   animation frame, forcing the browser to recompute and repaint the
   ENTIRE multi-thousand-pixel gradient each frame (confirmed the
   dominant cost in a 4x-throttled 390px trace -- see the round's
   report). Each blob below is its own fixed-PIXEL-size div instead: its
   own background painting is a one-time cost that never depends on
   <main>'s height, and `contain: paint` gives it an isolated paint/
   containing block so an ancestor's layout/size change can never force
   it to repaint -- only (cheaply, compositor-only) reposition. Same 7
   anchor points, same opacity, same connected-glow look as before. */

const BLOBS = [
  { top: "6%", left: "22%" },
  { top: "20%", left: "82%" },
  { top: "36%", left: "12%" },
  { top: "52%", left: "78%" },
  { top: "68%", left: "18%" },
  { top: "84%", left: "80%" },
  { top: "96%", left: "30%" },
] as const;

export default function LandingGlow() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {BLOBS.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: 560,
            height: 560,
            transform: "translate(-50%, -50%)",
            contain: "paint",
            background: "radial-gradient(circle 280px at center, rgba(255,107,53,0.13), transparent 45%)",
          }}
        />
      ))}
    </div>
  );
}
