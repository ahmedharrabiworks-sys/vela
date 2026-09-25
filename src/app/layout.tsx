import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { LastRouteTracker } from "@/lib/last-route";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

// Display/headline font -- H1/H2s only (via .vela-heading + explicit
// font-display usages). Body/UI text stays on Inter everywhere. Fallback
// stack matches Inter's so there's no layout shift while it loads.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Inter", "sans-serif"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} scroll-smooth`}>
      <body className="font-inter antialiased">
        <ThemeProvider>
          <I18nProvider>
            <LastRouteTracker />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
