export type PresetName =
  | "hotel"
  | "medical"
  | "fitness"
  | "beauty"
  | "realestate"
  | "restaurant"
  // Legacy names — stored in older DB specs; resolved in resolveTokens
  | "editorial-luxury"
  | "minimal-warm"
  | "saas-sharp"
  | "estate-elegant"
  | "clinical-bright"
  | "editorial"
  | "bold"
  | "clean"
  | "clinical";

export type NewPresetName =
  | "hotel"
  | "medical"
  | "fitness"
  | "beauty"
  | "realestate"
  | "restaurant";

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

// ── Six category design DNAs ──────────────────────────────────────────────────

const BASE: Record<NewPresetName, DesignTokens> = {

  // ── Hotel — ref editionhotels.com ─────────────────────────────────────────
  // Playfair Display + Inter. Charcoal #1A1A1A, warm sand #C9A961, off-white
  // #FAF8F5. Full-bleed hero, 35% dark overlay, centered type. Body always light.
  "hotel": {
    preset:           "hotel",
    dark:             false,
    heroLayout:       "full-bleed-center",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "center",
    heroOverlay:      "rgba(0,0,0,0.35)",
    sectionPad:       "112px",
    bg:               "#FAF8F5",
    bgAlt:            "#F2EDE3",
    surface:          "#FFFFFF",
    border:           "#E8E0D5",
    heroBg:           "#1A1A1A",
    heading:          "#1A1A1A",
    text:             "#3D3830",
    muted:            "#857D72",
    accent:           "#C9A961",
    accentFg:         "#1A1A1A",
    accentAlpha:      "rgba(201,169,97,0.10)",
    fontHeading:      "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    500,
    headingTransform: "none",
    headingTracking:  "-0.02em",
    radius:           "0px",
    radiusLg:         "2px",
  },

  // ── Medical — ref forward.com ─────────────────────────────────────────────
  // All-Inter, clinical, generous whitespace. White, deep blue #0A2540,
  // accent #2563EB. Split hero. ALWAYS bright, never dark.
  "medical": {
    preset:           "medical",
    dark:             false,
    heroLayout:       "split-right",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "left",
    heroOverlay:      "none",
    sectionPad:       "112px",
    bg:               "#FFFFFF",
    bgAlt:            "#F6F9FC",
    surface:          "#FFFFFF",
    border:           "#D1E3F5",
    heroBg:           "#0A2540",
    heading:          "#0A2540",
    text:             "#1E3A5F",
    muted:            "#64748B",
    accent:           "#2563EB",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(37,99,235,0.08)",
    fontHeading:      "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    headingWeight:    700,
    headingTransform: "none",
    headingTracking:  "-0.025em",
    radius:           "10px",
    radiusLg:         "18px",
  },

  // ── Fitness — ref equinox.com ─────────────────────────────────────────────
  // Archivo condensed bold uppercase + Inter body. Near-black #0B0B0B, white,
  // energy accent #E8FF3A. Full-bleed dark hero. DARK throughout.
  "fitness": {
    preset:           "fitness",
    dark:             true,
    heroLayout:       "full-bleed-bottom",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "left",
    heroOverlay:      "linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.40) 50%,rgba(0,0,0,0.10) 100%)",
    sectionPad:       "100px",
    bg:               "#0B0B0B",
    bgAlt:            "#111111",
    surface:          "#161616",
    border:           "#262626",
    heroBg:           "#050505",
    heading:          "#FFFFFF",
    text:             "#D1D5DB",
    muted:            "#6B7280",
    accent:           "#E8FF3A",
    accentFg:         "#0B0B0B",
    accentAlpha:      "rgba(232,255,58,0.10)",
    fontHeading:      "'Archivo', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    800,
    headingTransform: "uppercase",
    headingTracking:  "-0.01em",
    radius:           "4px",
    radiusLg:         "8px",
  },

  // ── Beauty — ref aesop.com ────────────────────────────────────────────────
  // Cormorant Garamond + Inter. Warm off-white #F7F5F0, brown-black #1C1A17,
  // muted olive #6B705C. Heavy whitespace, almost no color. Soft split hero.
  "beauty": {
    preset:           "beauty",
    dark:             false,
    heroLayout:       "split-right",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "left",
    heroOverlay:      "none",
    sectionPad:       "128px",
    bg:               "#F7F5F0",
    bgAlt:            "#EDE9E2",
    surface:          "#FAF8F4",
    border:           "#E0DAD1",
    heroBg:           "#1C1A17",
    heading:          "#1C1A17",
    text:             "#3A3730",
    muted:            "#6B705C",
    accent:           "#6B705C",
    accentFg:         "#F7F5F0",
    accentAlpha:      "rgba(107,112,92,0.08)",
    fontHeading:      "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    400,
    headingTransform: "none",
    headingTracking:  "0em",
    radius:           "0px",
    radiusLg:         "0px",
  },

  // ── Real Estate — ref serhant.com ─────────────────────────────────────────
  // Playfair Display + Inter. Black, white, gold #B8945F.
  // Full-bleed property hero, centered editorial type.
  "realestate": {
    preset:           "realestate",
    dark:             false,
    heroLayout:       "full-bleed-center",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "center",
    heroOverlay:      "linear-gradient(to bottom,rgba(0,0,0,0.12) 0%,rgba(0,0,0,0.54) 100%)",
    sectionPad:       "112px",
    bg:               "#FAFAF8",
    bgAlt:            "#F3F1EC",
    surface:          "#FFFFFF",
    border:           "#E4E0D8",
    heroBg:           "#0A0A0A",
    heading:          "#0A0A0A",
    text:             "#3A3830",
    muted:            "#8A8880",
    accent:           "#B8945F",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(184,148,95,0.08)",
    fontHeading:      "'Playfair Display', Georgia, serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    600,
    headingTransform: "none",
    headingTracking:  "-0.02em",
    radius:           "0px",
    radiusLg:         "2px",
  },

  // ── Restaurant — ref noma.dk ──────────────────────────────────────────────
  // Minimal editorial, image-led. Warm cream #F5F1EA, charcoal #211F1C,
  // muted terracotta #A65D45. Playfair Display. Restrained type.
  "restaurant": {
    preset:           "restaurant",
    dark:             false,
    heroLayout:       "full-bleed-center",
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
    heroContentAlign: "center",
    heroOverlay:      "rgba(33,31,28,0.40)",
    sectionPad:       "112px",
    bg:               "#F5F1EA",
    bgAlt:            "#EDE8DE",
    surface:          "#FAF8F3",
    border:           "#DDD8CE",
    heroBg:           "#211F1C",
    heading:          "#211F1C",
    text:             "#3A3730",
    muted:            "#7A756C",
    accent:           "#A65D45",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(166,93,69,0.08)",
    fontHeading:      "'Playfair Display', 'DM Serif Display', Georgia, serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    400,
    headingTransform: "none",
    headingTracking:  "-0.01em",
    radius:           "0px",
    radiusLg:         "2px",
  },
};

// ── Legacy preset names → new presets ────────────────────────────────────────
const LEGACY: Record<string, NewPresetName> = {
  // Old 5 preset names
  "editorial-luxury": "hotel",
  "minimal-warm":     "beauty",
  "saas-sharp":       "fitness",
  "estate-elegant":   "realestate",
  "clinical-bright":  "medical",
  // Even older aliases
  "editorial":        "hotel",
  "bold":             "fitness",
  "clean":            "realestate",
  "clinical":         "medical",
};

export function resolveTokens(preset: PresetName, accentOverride?: string): DesignTokens {
  const effective = (LEGACY[preset as string] ?? preset) as NewPresetName;
  const tok = { ...BASE[effective] ?? BASE["realestate"] };
  if (accentOverride && /^#[0-9a-f]{6}$/i.test(accentOverride)) {
    tok.accent = accentOverride;
    const r = parseInt(accentOverride.slice(1, 3), 16);
    const g = parseInt(accentOverride.slice(3, 5), 16);
    const b = parseInt(accentOverride.slice(5, 7), 16);
    tok.accentAlpha = `rgba(${r},${g},${b},0.09)`;
  }
  return tok;
}
