"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n";
import MadeInQatar from "@/components/ui/MadeInQatar";
import { bdiVela } from "@/lib/bdi";

// Footer cleanup round: only links that really work. Every Product link
// targets a real section id on the landing page (/#... so it also works
// from the legal pages, which render this same footer), every Legal link
// is a real route. No placeholder "#" links, no social icons until real
// accounts exist.
const SUPPORT_EMAIL = "velaOsSupport@gmail.com";

const SECTIONS = [
  {
    key: "product",
    links: [
      { key: "features",   href: "/#features" },
      { key: "pricing",    href: "/#pricing" },
      { key: "howItWorks", href: "/#how-it-works" },
      { key: "faq",        href: "/#faq" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "privacy", href: "/privacy" },
      { key: "terms",   href: "/terms" },
      { key: "cookies", href: "/cookies" },
    ],
  },
] as const;

const HEADING = "text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-4";
const LINK = "text-sm text-[#6B7280] hover:text-[#111111] transition-colors duration-200";
const COLUMN = "flex flex-col items-center text-center md:items-start md:text-start";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="relative section-tint">
      <div className="relative max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16" style={{ zIndex: 1 }}>
        {/* 375px: brand full width, Product + Legal side by side, Contact full
            width. md+: four columns. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mb-14">
          {/* Brand */}
          <div className={`col-span-2 md:col-span-1 ${COLUMN}`}>
            <Logo showText />
            <p className="mt-4 text-[#6B7280] text-sm leading-relaxed max-w-[240px]">
              {t("landing.footer.tagline")}
            </p>
          </div>

          {/* Product + Legal */}
          {SECTIONS.map((sec) => (
            <nav key={sec.key} aria-label={t(`landing.footer.sections.${sec.key}`)} className={COLUMN}>
              <p className={HEADING}>{t(`landing.footer.sections.${sec.key}`)}</p>
              <ul className="flex flex-col gap-3 items-center md:items-start">
                {sec.links.map(({ key, href }) => (
                  <li key={key}>
                    <Link href={href} className={LINK}>
                      {t(`landing.footer.links.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div className={`col-span-2 md:col-span-1 ${COLUMN}`}>
            <p className={HEADING}>{t("landing.footer.sections.contact")}</p>
            <ul className="flex flex-col gap-3 items-center md:items-start">
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} dir="ltr" className={`${LINK} [overflow-wrap:anywhere]`}>
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="text-sm text-[#6B7280]">{t("landing.footer.location")}</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E5E7EB] pt-8 flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
          <p className="flex items-center flex-wrap justify-center md:justify-start gap-1.5 text-sm text-[#9CA3AF]">
            <span>{bdiVela(t("landing.footer.copyright"))}</span>
            <span>·</span>
            <MadeInQatar />
          </p>
          <p className="text-sm text-[#9CA3AF] text-center md:text-start">
            {t("landing.footer.slogan1")}{" "}
            <span className="vela-gradient-text font-medium">{bdiVela(t("landing.footer.slogan2"))}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
