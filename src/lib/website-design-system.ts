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

// ── Section-composition design system (v2 generator) ─────────────────────────

export type DesignMood =
  | "editorial-luxury"
  | "clinical-bright"
  | "bold-energetic"
  | "warm-minimal"
  | "tech-sharp"
  | "dark-premium";

export interface DesignDNA {
  mood:        DesignMood;
  headingFont: string;
  bodyFont:    string;
  palette: {
    bg:     string;
    text:   string;
    accent: string;
    muted:  string;
  };
  isDark: boolean;
}

export const APPROVED_FONTS: Record<string, string> = {
  "Playfair Display":   "family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400",
  "Cormorant Garamond": "family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400",
  "Fraunces":           "family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400",
  "Archivo":            "family=Archivo:wght@400;600;700;800;900",
  "Inter":              "family=Inter:wght@300;400;500;600;700;800",
  "DM Sans":            "family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700",
  "Space Grotesk":      "family=Space+Grotesk:wght@300;400;500;600;700",
  "Plus Jakarta Sans":  "family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800",
  "Libre Baskerville":  "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400",
};

function buildFontImportUrl(heading: string, body: string, fallback: string): string {
  const h = APPROVED_FONTS[heading];
  const b = body !== heading ? APPROVED_FONTS[body] : undefined;
  const parts = [h, b].filter(Boolean) as string[];
  if (!parts.length) return fallback;
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

const MOOD_BASE: Record<DesignMood, NewPresetName> = {
  "editorial-luxury": "hotel",
  "clinical-bright":  "medical",
  "bold-energetic":   "fitness",
  "warm-minimal":     "beauty",
  "tech-sharp":       "fitness",
  "dark-premium":     "hotel",
};
const MOOD_HEADING_WEIGHT: Record<DesignMood, number> = {
  "editorial-luxury": 500, "clinical-bright": 700, "bold-energetic": 800,
  "warm-minimal": 400,     "tech-sharp": 700,      "dark-premium": 400,
};
const MOOD_TRACKING: Record<DesignMood, string> = {
  "editorial-luxury": "-0.02em",  "clinical-bright": "-0.025em", "bold-energetic": "-0.01em",
  "warm-minimal":     "0em",      "tech-sharp": "-0.02em",       "dark-premium": "-0.03em",
};
const MOOD_TRANSFORM: Record<DesignMood, string> = {
  "editorial-luxury": "none", "clinical-bright": "none", "bold-energetic": "uppercase",
  "warm-minimal":     "none", "tech-sharp": "none",      "dark-premium": "none",
};
const MOOD_RADIUS: Record<DesignMood, [string, string]> = {
  "editorial-luxury": ["0px", "2px"],  "clinical-bright": ["10px", "18px"],
  "bold-energetic":   ["4px", "8px"],  "warm-minimal": ["0px", "0px"],
  "tech-sharp":       ["6px", "12px"], "dark-premium": ["0px", "2px"],
};
const MOOD_SECTION_PAD: Record<DesignMood, string> = {
  "editorial-luxury": "112px", "clinical-bright": "112px", "bold-energetic": "100px",
  "warm-minimal":     "128px", "tech-sharp": "100px",      "dark-premium": "112px",
};

export function resolveDesignDNA(dna: DesignDNA): DesignTokens {
  const baseName = MOOD_BASE[dna.mood] ?? "realestate";
  const base = { ...BASE[baseName] };
  const hexOk = (h: string | undefined): h is string =>
    typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);

  const accent = hexOk(dna.palette?.accent) ? dna.palette.accent : base.accent;
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const accentLum = 0.299 * r + 0.587 * g + 0.114 * b;
  const [radius, radiusLg] = MOOD_RADIUS[dna.mood] ?? ["4px", "8px"];
  const hFont = dna.headingFont && APPROVED_FONTS[dna.headingFont] ? dna.headingFont : null;
  const bFont = dna.bodyFont    && APPROVED_FONTS[dna.bodyFont]    ? dna.bodyFont    : null;

  return {
    ...base,
    preset:           baseName,
    dark:             dna.isDark ?? base.dark,
    bg:               hexOk(dna.palette?.bg)    ? dna.palette.bg    : base.bg,
    text:             hexOk(dna.palette?.text)  ? dna.palette.text  : base.text,
    muted:            hexOk(dna.palette?.muted) ? dna.palette.muted : base.muted,
    accent,
    accentFg:         accentLum > 186 ? "#111111" : "#FFFFFF",
    accentAlpha:      `rgba(${r},${g},${b},0.10)`,
    fontHeading:      hFont ? `'${hFont}', ${base.fontHeading}` : base.fontHeading,
    fontBody:         bFont ? `'${bFont}', ${base.fontBody}`    : base.fontBody,
    fontImport:       buildFontImportUrl(dna.headingFont ?? "", dna.bodyFont ?? "", base.fontImport),
    headingWeight:    MOOD_HEADING_WEIGHT[dna.mood] ?? base.headingWeight,
    headingTracking:  MOOD_TRACKING[dna.mood]       ?? base.headingTracking,
    headingTransform: MOOD_TRANSFORM[dna.mood]      ?? base.headingTransform,
    radius,
    radiusLg,
    sectionPad:       MOOD_SECTION_PAD[dna.mood] ?? base.sectionPad,
    heroHeadlineSize: "clamp(2.5rem,5vw,4rem)",
  };
}
