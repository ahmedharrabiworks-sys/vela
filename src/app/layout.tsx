import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { LastRouteTracker } from "@/lib/last-route";
import { LegacyThemeCleanup } from "@/lib/legacy-theme-cleanup";
import CursorGlow from "@/components/ui/CursorGlow";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

// Display/headline font -- H1/H2s only (via .vela-heading + explicit
// font-display usages). Body/UI text stays on Inter everywhere. Fallback
// stack matches Inter's so there's no layout shift while it loads.
// Polish pass #2: swapped from Space Grotesk (didn't land) to Bricolage
// Grotesque -- a distinctive, higher-personality display grotesque
// (irregular jointed letterforms, built-in optical sizing) closer in
// spirit to Cabinet Grotesk/General Sans than a generic geometric sans.
// Not self-hosting Cabinet Grotesk/General Sans/Satoshi directly since
// those are Fontshare-only fonts, not available via next/font/google.
const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Inter", "sans-serif"],
});

// Hero eyebrow round: used ONLY for the Hero section's eyebrow line ("Power
// up your business with AI") -- an elegant serif italic accent, deliberately
// not applied anywhere else on the site. Only ships the one weight/style it
// needs (400 italic), not the whole family.
const eyebrowFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-eyebrow",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "Vela: AI Business Operating System",
  description:
    "One platform. Every tool your business needs. AI that handles Instagram, WhatsApp & website chat 24/7. Plus booking, CRM, and analytics.",
  openGraph: {
    title: "Vela: AI Business Operating System",
    description: "Never miss another lead. Vela runs your customer communications 24/7.",
    type: "website",
  },
};

// Dark mode has been removed from Vela entirely -- this tells the browser
// (and OS-level UI it controls: form controls, scrollbars) that the page
// only ever renders a light UI, so a phone or browser set to system dark
// mode still shows Vela in light, not an auto-inverted or mismatched theme.
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${displayFont.variable} ${eyebrowFont.variable} scroll-smooth`}>
      <body className="font-inter antialiased">
        <I18nProvider>
          <LastRouteTracker />
          <LegacyThemeCleanup />
          <CursorGlow />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
