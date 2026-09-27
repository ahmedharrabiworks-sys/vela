"use client";

import { useI18n } from "@/lib/i18n";
import QatarFlag from "@/components/ui/QatarFlag";

/** Small crisp inline heart -- renders identically on Windows/iOS/Android,
    unlike the ❤️ emoji glyph it replaces (font/rendering-dependent, looked
    inconsistent across platforms). */
function HeartIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E0245E" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 21s-6.7-4.2-9.5-8.1C.7 10.2 1.4 6.6 4.3 5c2.2-1.2 4.8-.5 6.2 1.4l1.5 2 1.5-2c1.4-1.9 4-2.6 6.2-1.4 2.9 1.6 3.6 5.2 1.8 7.9C18.7 16.8 12 21 12 21z" />
    </svg>
  );
}

/**
 * "Made in Qatar [heart] [flag]" -- one shared component reused everywhere
 * this line appears (auth pages + landing footer), so it can never drift
 * out of sync between contexts. Mirrors correctly in RTL: flex row order
 * is source order (text, heart, flag) and the browser reverses it under
 * dir="rtl" like any other row, no manual overrides needed.
 */
export default function MadeInQatar({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} style={{ fontSize: 13, color: "#6B6B70" }}>
      <span>{t("landing.footer.madeInQatar")}</span>
      <HeartIcon size={12} />
      <QatarFlag heightPx={16} />
    </span>
  );
}
