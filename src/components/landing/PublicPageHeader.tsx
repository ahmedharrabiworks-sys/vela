"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import CtaButton from "@/components/landing/CtaButton";
import OpenVelaButton from "@/components/landing/OpenVelaButton";
import { useLandingSession } from "@/lib/use-landing-session";

export default function PublicPageHeader({ sessionAware = false }: { sessionAware?: boolean }) {
  const session = useLandingSession();
  const loggedIn = sessionAware && session.status === "in";
  return (
    <div className="w-full max-w-7xl mx-auto px-5 md:px-6 pt-8 pb-3 flex items-center justify-between">
      <Link href="/" aria-label="Vela home">
        <Logo showText />
      </Link>
      <div className="flex items-center gap-4">
        {loggedIn ? (
          <OpenVelaButton size="sm" initials={session.status === "in" ? session.initials : "V"} />
        ) : (
          <>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex text-sm font-semibold text-[#374151] hover:text-[#111111] px-4 py-2.5 rounded-lg transition-colors duration-200"
            >
              Log in
            </Link>
            <CtaButton size="sm" />
          </>
        )}
      </div>
    </div>
  );
}
