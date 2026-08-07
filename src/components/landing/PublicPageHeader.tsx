"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useI18n } from "@/lib/i18n";

export default function PublicPageHeader() {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-6 pt-8 pb-3 flex items-center justify-between">
      <Link href="/" aria-label="Vela home">
        <Logo showText size={48} />
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/auth/login"
          className="hidden sm:inline-flex text-sm font-semibold text-[#374151] hover:text-[#111111] px-4 py-2.5 rounded-lg transition-colors duration-200"
        >
          Log in
        </Link>
        <Link href="/auth/signup" className="btn-primary text-sm px-6 py-2.5 justify-center">
          {t("landing.nav.getStarted")}
        </Link>
      </div>
    </div>
  );
}
