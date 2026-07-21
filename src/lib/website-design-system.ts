export type PresetName =
  | "editorial-luxury"
  | "minimal-warm"
  | "saas-sharp"
  | "estate-elegant"
  | "clinical-bright"
  // Legacy names — stored in older DB specs; resolved in resolveTokens
  | "editorial"
  | "bold"
  | "clean"
  | "clinical";

export type NewPresetName =
  | "editorial-luxury"
  | "minimal-warm"
  | "saas-sharp"
  | "estate-elegant"
  | "clinical-bright";

export interface DesignTokens {
  preset: NewPresetName;
  dark: boolean;
  heroLayout: "full-bleed-bottom" | "full-bleed-center" | "split-right" | "centered-glow";
  heroHeadlineSize: string;
  heroContentAlign: "left" | "center";
  heroOverlay: string;
  sectionPad: string;
  bg: string;
  bgAlt: string;
  surface: string;
  border: string;
  heroBg: string;
  heading: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
  accentAlpha: string;
  fontHeading: string;
  fontBody: string;
  fontImport: string;
  headingWeight: number;
  headingTransform: string;
  headingTracking: string;
  radius: string;
  radiusLg: string;
}

// ── Five design DNAs ──────────────────────────────────────────────────────────

const BASE: Record<NewPresetName, DesignTokens> = {

  // ── Kelly Wearstler — dark editorial luxury ───────────────────────────────
  // Near-black warm ground, oversized 300w Cormorant, full-bleed photography,
  // champagne-gold accent, zero chrome.
  "editorial-luxury": {
    preset:           "editorial-luxury",
    dark:             false,  // Body is light; hero stays dark via photo + overlay
    heroLayout:       "full-bleed-bottom",
    heroHeadlineSize: "clamp(5rem,12vw,11rem)",
    heroContentAlign: "left",
    heroOverlay:      "linear-gradient(to top,rgba(0,0,0,0.84) 0%,rgba(0,0,0,0.38) 55%,rgba(0,0,0,0.06) 100%)",
    sectionPad:       "160px",
    bg:               "#FAF8F5",
    bgAlt:            "#F0EBE3",
    surface:          "#FFFFFF",
    border:           "#E8E2D9",
    heroBg:           "#050403",  // Used for hero image fallback + cta_banner
    heading:          "#1A1714",
    text:             "#3D3930",
    muted:            "#7A7368",
    accent:           "#C4A882",
    accentFg:         "#0C0B09",
    accentAlpha:      "rgba(196,168,130,0.10)",
    fontHeading:      "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    fontBody:         "'Instrument Sans', 'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500&display=swap",
    headingWeight:    300,
    headingTransform: "none",
    headingTracking:  "-0.02em",
    radius:           "0px",
    radiusLg:         "0px",
  },

  // ── Aesop — minimal warm organic ─────────────────────────────────────────
  // Warm parchment ground, DM Serif Display at modest scale, side-by-side
  // hero with contained photography, very generous whitespace.
  "minimal-warm": {
    preset:           "minimal-warm",
    dark:             false,
    heroLayout:       "split-right",
    heroHeadlineSize: "clamp(2.4rem,4.5vw,5rem)",
    heroContentAlign: "left",
    heroOverlay:      "none",
    sectionPad:       "140px",
    bg:               "#F5F0E8",
    bgAlt:            "#EDE8DF",
    surface:          "#FAF7F2",
    border:           "#E0D9CF",
    heroBg:           "#2C2520",
    heading:          "#1E1A16",
    text:             "#4A4440",
    muted:            "#8C857D",
    accent:           "#5C4A32",
    accentFg:         "#F5F0E8",
    accentAlpha:      "rgba(92,74,50,0.08)",
    fontHeading:      "'DM Serif Display', Georgia, 'Times New Roman', serif",
    fontBody:         "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Instrument+Sans:wght@300;400;500&display=swap",
    headingWeight:    400,
    headingTransform: "none",
    headingTracking:  "-0.01em",
    radius:           "0px",
    radiusLg:         "2px",
  },

  // ── Linear — dark SaaS / sports / fitness ────────────────────────────────
  // Cool near-black ground, crisp Inter, tight feature grid, violet accent,
  // radial glow on hero, subtle gradient borders.
  "saas-sharp": {
    preset:           "saas-sharp",
    dark:             true,
    heroLayout:       "centered-glow",
    heroHeadlineSize: "clamp(2.8rem,6vw,5.5rem)",
    heroContentAlign: "center",
    heroOverlay:      "none",
    sectionPad:       "100px",
    bg:               "#08080A",
    bgAlt:            "#0F0F12",
    surface:          "#141418",
    border:           "#232328",
    heroBg:           "#05050A",
    heading:          "#F9F9FB",
    text:             "#ADADBA",
    muted:            "#52525B",
    accent:           "#7C3AED",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(124,58,237,0.12)",
    fontHeading:      "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    headingWeight:    700,
    headingTransform: "none",
    headingTracking:  "-0.04em",
    radius:           "8px",
    radiusLg:         "12px",
  },

  // ── Sotheby's Realty — estate elegant ────────────────────────────────────
  // Warm near-white ground, Cormorant Garamond at 500w, full-bleed landscape
  // photography, centered hero text, aged-gold restraint.
  "estate-elegant": {
    preset:           "estate-elegant",
    dark:             false,
    heroLayout:       "full-bleed-center",
    heroHeadlineSize: "clamp(3rem,5.5vw,6.5rem)",
    heroContentAlign: "center",
    heroOverlay:      "linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.48) 100%)",
    sectionPad:       "140px",
    bg:               "#FAFAF8",
    bgAlt:            "#F3F2EE",
    surface:          "#FFFFFF",
    border:           "#E4E2DC",
    heroBg:           "#1A1712",
    heading:          "#1A1712",
    text:             "#4A4840",
    muted:            "#8A8880",
    accent:           "#8D6E3F",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(141,110,63,0.08)",
    fontHeading:      "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    fontBody:         "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:wght@300;400;500&display=swap",
    headingWeight:    500,
    headingTransform: "none",
    headingTracking:  "-0.02em",
    radius:           "0px",
    radiusLg:         "4px",
  },

  // ── SmileSet — clinical bright ────────────────────────────────────────────
  // Pure white ground, bright sky-blue accent, rounded friendly cards,
  // split hero with photo, clear CTA hierarchy, Plus Jakarta Sans.
  "clinical-bright": {
    preset:           "clinical-bright",
    dark:             false,
    heroLayout:       "split-right",
    heroHeadlineSize: "clamp(2.2rem,4vw,4.2rem)",
    heroContentAlign: "left",
    heroOverlay:      "none",
    sectionPad:       "100px",
    bg:               "#FFFFFF",
    bgAlt:            "#F0F7FF",
    surface:          "#FFFFFF",
    border:           "#CFE2F7",
    heroBg:           "#0F172A",
    heading:          "#0F172A",
    text:             "#1E293B",
    muted:            "#64748B",
    accent:           "#0EA5E9",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(14,165,233,0.08)",
    fontHeading:      "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    700,
    headingTransform: "none",
    headingTracking:  "-0.025em",
    radius:           "12px",
    radiusLg:         "20px",
  },
};

// ── Legacy preset names → new presets ────────────────────────────────────────
const LEGACY: Record<string, NewPresetName> = {
  editorial: "editorial-luxury",
  bold:      "saas-sharp",
  clean:     "estate-elegant",
  clinical:  "clinical-bright",
};

export function resolveTokens(preset: PresetName, accentOverride?: string): DesignTokens {
  const effective = (LEGACY[preset as string] ?? preset) as NewPresetName;
  const tok = { ...BASE[effective] ?? BASE["estate-elegant"] };
  if (accentOverride && /^#[0-9a-f]{6}$/i.test(accentOverride)) {
    tok.accent = accentOverride;
    const r = parseInt(accentOverride.slice(1, 3), 16);
    const g = parseInt(accentOverride.slice(3, 5), 16);
    const b = parseInt(accentOverride.slice(5, 7), 16);
    tok.accentAlpha = `rgba(${r},${g},${b},0.09)`;
  }
  return tok;
}
