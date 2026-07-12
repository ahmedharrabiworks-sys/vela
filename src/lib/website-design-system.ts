export interface DesignTokens {
  preset: "editorial" | "bold" | "clean" | "clinical";
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

export type PresetName = "editorial" | "bold" | "clean" | "clinical";

// ── Curated premium palettes ──────────────────────────────────────────────────
//
// Each palette is derived from a real reference site aesthetic.
// "editorial" → studio-mcgee.com: warm cream ground, terracotta accent, serif display
// "bold"      → f45training.com: near-black ground, red-orange accent, condensed sans
// "clean"     → compass.com: pure white ground, charcoal text, confident navy accent
// "clinical"  → medical standard: pure white ground, deep navy hero, sky-blue accent
//
// Dominant backgrounds are always light (white / off-white / warm neutral) so photography
// provides the color. Accent appears only in buttons and small details.
// heroBg is used only for the hero section's background color when no photo is present.
//
const BASE: Record<PresetName, DesignTokens> = {
  // ── Studio McGee / luxury editorial ──────────────────────────────────────────
  editorial: {
    preset:           "editorial",
    bg:               "#F7F4EF",
    bgAlt:            "#EDE9E2",
    surface:          "#FFFFFF",
    border:           "#E4DEDA",
    heroBg:           "#1C1714",
    heading:          "#1C1714",
    text:             "#44403C",
    muted:            "#9B8E87",
    accent:           "#8B6347",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(139,99,71,0.08)",
    fontHeading:      "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontBody:         "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap",
    headingWeight:    600,
    headingTransform: "none",
    headingTracking:  "-0.015em",
    radius:           "4px",
    radiusLg:         "8px",
  },

  // ── F45-style bold / gym / fitness / sports ───────────────────────────────────
  bold: {
    preset:           "bold",
    bg:               "#0A0A0A",
    bgAlt:            "#111111",
    surface:          "#161616",
    border:           "#252525",
    heroBg:           "#050505",
    heading:          "#F5F5F5",
    text:             "#C9C9C9",
    muted:            "#666666",
    accent:           "#E8390E",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(232,57,14,0.14)",
    fontHeading:      "'Oswald', 'Arial Black', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500&display=swap",
    headingWeight:    700,
    headingTransform: "uppercase",
    headingTracking:  "0.04em",
    radius:           "2px",
    radiusLg:         "4px",
  },

  // ── Compass.com style / real estate / law / professional services ─────────────
  clean: {
    preset:           "clean",
    bg:               "#FFFFFF",
    bgAlt:            "#F6F7F9",
    surface:          "#FFFFFF",
    border:           "#E2E5EB",
    heroBg:           "#111827",
    heading:          "#111827",
    text:             "#374151",
    muted:            "#9CA3AF",
    accent:           "#1A56DB",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(26,86,219,0.07)",
    fontHeading:      "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    headingWeight:    700,
    headingTransform: "none",
    headingTracking:  "-0.03em",
    radius:           "8px",
    radiusLg:         "12px",
  },

  // ── Medical / dental / clinical — pure white, deep navy, sky blue ─────────────
  // heroBg is deep navy (NOT dark green). Accent is Apple-Health sky blue — trusted,
  // clean, immediately readable as medical without being harsh.
  clinical: {
    preset:           "clinical",
    bg:               "#FFFFFF",
    bgAlt:            "#F4F8FC",
    surface:          "#FFFFFF",
    border:           "#D5E8F5",
    heroBg:           "#0C1A35",
    heading:          "#0C1A35",
    text:             "#374151",
    muted:            "#6B7280",
    accent:           "#0070C9",
    accentFg:         "#FFFFFF",
    accentAlpha:      "rgba(0,112,201,0.08)",
    fontHeading:      "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif",
    fontBody:         "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:       "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap",
    headingWeight:    700,
    headingTransform: "none",
    headingTracking:  "-0.02em",
    radius:           "10px",
    radiusLg:         "16px",
  },
};

export function resolveTokens(preset: PresetName, accentOverride?: string): DesignTokens {
  const tok = { ...BASE[preset] };
  if (accentOverride) tok.accent = accentOverride;
  return tok;
}
