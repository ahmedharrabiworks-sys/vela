import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { LastRouteTracker } from "@/lib/last-route";
import CursorGlow from "@/components/ui/CursorGlow";

// The single brand font (font-match round): identified as the closest
// available match to the real logo's wordmark lettering (single-story "a",
// circular geometric "e"/"a" bowls, flat-cut terminals) among the
// candidates tested in verification/font-match.png and
// verification/font-match-overlay.png. Questrial's proportions traced
// marginally closer but it ships as a single weight (400 only) with no
// bold/semibold cut, which the "600/700 headings, 400 body" requirement
// needs -- Poppins is the nearest match that actually has the weight
// range. One font, one variable, used for EVERYTHING Latin: body,
// headings, buttons, inputs. Bricolage Grotesque and Inter are both gone
// -- see tailwind.config.ts, where `sans`/`inter`/`display` all now point
// at this same variable (kept as three key names so the many existing
// font-inter/font-display call sites across landing/pricing components
// don't need touching -- they already render the one right font).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
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
    <html lang="en" className={`${poppins.variable} scroll-smooth`}>
      <body className="font-inter antialiased">
        <ThemeProvider>
          <I18nProvider>
            <LastRouteTracker />
            <CursorGlow />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
