"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n";

const SECTIONS = [
  {
    key: "product",
    links: [
      { key: "features",    href: "/#features" },
      { key: "pricing",     href: "/pricing" },
      { key: "howItWorks",  href: "/#how-it-works" },
      { key: "faq",         href: "/#faq" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "about",    href: "#" },
      { key: "blog",     href: "#" },
      { key: "careers",  href: "#" },
      { key: "contact",  href: "mailto:hello@tryvela.com" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "privacy",  href: "/privacy" },
      { key: "terms",    href: "/terms" },
      { key: "cookies",  href: "#" },
    ],
  },
];

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

const SOCIALS = [
  { id: "instagram", href: "#", label: "Instagram", Icon: InstagramIcon },
  { id: "twitter",   href: "#", label: "X / Twitter", Icon: TwitterIcon },
  { id: "linkedin",  href: "#", label: "LinkedIn", Icon: LinkedInIcon },
];

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="section-tint border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col items-center sm:items-start">
            <Logo showText />
            <p className="mt-4 text-[#6B7280] text-sm leading-relaxed max-w-[220px] text-center sm:text-left">
              {t("landing.footer.tagline")}
            </p>
            <div className="flex gap-3 mt-6">
              {SOCIALS.map(({ id, href, label, Icon }) => (
                <a
                  key={id}
                  href={href}
                  className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:bg-[var(--vp-10)] hover:text-[var(--vp-color)] transition-all duration-200"
                  aria-label={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {SECTIONS.map((sec) => (
            <div key={sec.key} className="flex flex-col items-center sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-4">
                {t(`landing.footer.sections.${sec.key}`)}
              </p>
              <ul className="flex flex-col gap-3 items-center sm:items-start">
                {sec.links.map(({ key, href }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors duration-200"
                    >
                      {t(`landing.footer.links.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E5E7EB] pt-8 flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
          <p className="text-sm text-[#9CA3AF] text-center md:text-left">{t("landing.footer.copyright")}</p>
          <p className="text-sm text-[#9CA3AF] text-center md:text-left">
            {t("landing.footer.slogan1")}{" "}
            <span className="vela-gradient-text font-medium">{t("landing.footer.slogan2")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
