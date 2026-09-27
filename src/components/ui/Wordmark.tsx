/**
 * The single shared "Vela" wordmark component (FIX 9, auth-system
 * follow-up round). Used everywhere the brand name renders as text --
 * landing header/footer, auth panels, app sidebar, and (via its own
 * inline-styled HTML twin) the email templates. Previously there were 3
 * different fonts in play: the landing logo's baked-into-a-PNG font, the
 * auth panel's fallback to Tailwind's default system-ui stack (font-sans
 * was never actually mapped to Inter before this round), and Arial in
 * emails. All three now resolve to Inter 800 with tight tracking, via one
 * component instead of three independent implementations.
 *
 * Renders plain text, not an image -- pairs with LogoMark (Logo.tsx) for
 * the orange mountain/star icon, which is UNCHANGED and kept exactly where
 * it already renders (icon-only Logo calls, and inside Logo's showText
 * path immediately before this component).
 */
export default function Wordmark({
  light = false,
  className = "",
}: {
  /** true = white text (for dark/gradient backgrounds), false = brand orange (for light backgrounds). */
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-block font-sans font-extrabold tracking-[-0.03em] leading-none ${
        light ? "text-white" : "text-[var(--vp-color)]"
      } ${className}`}
    >
      Vela
    </span>
  );
}
