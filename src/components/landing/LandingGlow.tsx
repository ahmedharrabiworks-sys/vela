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
   anchor points, same opacity, same connected-glow look as before.

   faq-fix-2 round (FIX 1.3): a real phone still choked on this -- 7
   separate 560x560 radial-gradient layers, each `contain:paint` (its
   own compositor layer / GPU texture), is 7 textures a weak mobile GPU
   has to keep resident and composite every frame, even though none of
   them individually repaints anymore. Phone (below lg) now renders only
   3 of the 7 (indices 0/3/6 -- top, middle, bottom, kept for the same
   "spread down the page" feel with 3 textures instead of 7) at a
   smaller 320px size; lg+ is unchanged (all 7 at 560px). */

const BLOBS = [
  { top: "6%", left: "22%", mobile: true },
  { top: "20%", left: "82%", mobile: false },
  { top: "36%", left: "12%", mobile: false },
  { top: "52%", left: "78%", mobile: true },
  { top: "68%", left: "18%", mobile: false },
  { top: "84%", left: "80%", mobile: false },
  { top: "96%", left: "30%", mobile: true },
] as const;

export default function LandingGlow() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className={`landing-glow-blob absolute w-[320px] h-[320px] lg:w-[560px] lg:h-[560px] ${b.mobile ? "" : "hidden lg:block"}`}
          style={{ top: b.top, left: b.left, transform: "translate(-50%, -50%)" }}
        />
      ))}
    </div>
  );
}
