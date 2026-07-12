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

const BASE: Record<PresetName, DesignTokens> = {
  editorial: {
    preset: "editorial",
    bg:              "#F9F6EF",
    bgAlt:           "#EDE9E4",
    surface:         "#FFFFFF",
    border:          "#E5DFD8",
    heroBg:          "#1C1917",
    heading:         "#1C1917",
    text:            "#44403C",
    muted:           "#A8A29E",
    accent:          "#8B6B4F",
    accentFg:        "#FFFFFF",
    accentAlpha:     "rgba(139,107,79,0.08)",
    fontHeading:     "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontBody:        "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
    fontImport:      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap",
    headingWeight:   600,
    headingTransform:"none",
    headingTracking: "-0.015em",
    radius:          "4px",
    radiusLg:        "8px",
  },
  bold: {
    preset: "bold",
    bg:              "#0D0D0D",
    bgAlt:           "#111111",
    surface:         "#1A1A1A",
    border:          "#2A2A2A",
    heroBg:          "#050505",
    heading:         "#F9FAFB",
    text:            "#D1D5DB",
    muted:           "#6B7280",
    accent:          "#F59E0B",
    accentFg:        "#0D0D0D",
    accentAlpha:     "rgba(245,158,11,0.12)",
    fontHeading:     "'Oswald', 'Arial Black', Arial, sans-serif",
    fontBody:        "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:      "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500&display=swap",
    headingWeight:   700,
    headingTransform:"uppercase",
    headingTracking: "0.04em",
    radius:          "2px",
    radiusLg:        "4px",
  },
  clean: {
    preset: "clean",
    bg:              "#FFFFFF",
    bgAlt:           "#F8FAFC",
    surface:         "#FFFFFF",
    border:          "#E2E8F0",
    heroBg:          "#0F172A",
    heading:         "#0F172A",
    text:            "#334155",
    muted:           "#94A3B8",
    accent:          "#2563EB",
    accentFg:        "#FFFFFF",
    accentAlpha:     "rgba(37,99,235,0.07)",
    fontHeading:     "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontBody:        "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    headingWeight:   700,
    headingTransform:"none",
    headingTracking: "-0.03em",
    radius:          "8px",
    radiusLg:        "12px",
  },
  clinical: {
    preset: "clinical",
    bg:              "#FFFFFF",
    bgAlt:           "#F0FDFA",
    surface:         "#FFFFFF",
    border:          "#CCFBF1",
    heroBg:          "#0F3330",
    heading:         "#134E4A",
    text:            "#374151",
    muted:           "#6B7280",
    accent:          "#0D9488",
    accentFg:        "#FFFFFF",
    accentAlpha:     "rgba(13,148,136,0.08)",
    fontHeading:     "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif",
    fontBody:        "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontImport:      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap",
    headingWeight:   700,
    headingTransform:"none",
    headingTracking: "-0.02em",
    radius:          "10px",
    radiusLg:        "16px",
  },
};

export function resolveTokens(preset: PresetName, accentOverride?: string): DesignTokens {
  const tok = { ...BASE[preset] };
  if (accentOverride) tok.accent = accentOverride;
  return tok;
}
