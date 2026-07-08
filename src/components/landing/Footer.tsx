import Link from "next/link";
import Logo from "@/components/ui/Logo";

const LINKS = {
  Product: ["Features", "Pricing", "How It Works", "FAQ"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
};

export default function Footer() {
  return (
    <footer className="bg-[#F9FAFB] border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col items-center sm:items-start">
            <Logo showText />
            <p className="mt-4 text-[#6B7280] text-sm leading-relaxed max-w-[220px] text-center sm:text-left">
              One platform. Every tool your business needs.
            </p>
            {/* Social icons */}
            <div className="flex gap-3 mt-6">
              {["instagram", "twitter", "linkedin"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-all duration-200"
                  aria-label={social}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <rect width="16" height="16" rx="8" fillOpacity="0" />
                    <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" fillOpacity="0.6" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group} className="flex flex-col items-center sm:items-start">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF] mb-4">
                {group}
              </p>
              <ul className="flex flex-col gap-3 items-center sm:items-start">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-[#6B7280] hover:text-[#111111] transition-colors duration-200"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E5E7EB] pt-8 flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
          <p className="text-sm text-[#9CA3AF] text-center md:text-left">© 2026 Vela. All rights reserved.</p>
          <p className="text-sm text-[#9CA3AF] text-center md:text-left">
            Built for businesses that don&apos;t sleep.{" "}
            <span className="vela-gradient-text font-medium">Neither does Vela.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
