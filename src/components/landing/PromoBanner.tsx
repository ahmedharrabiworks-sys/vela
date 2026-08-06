import Link from "next/link";

export default function PromoBanner() {
  return (
    <div
      className="sticky top-0 z-40 w-full px-5 md:px-8 py-3 flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-4"
      style={{ background: "linear-gradient(90deg, #FF6B35 0%, #FF3366 100%)" }}
    >
      <p className="text-sm font-medium text-white text-center sm:text-left leading-snug">
        Bring your business to the next level with our AI Business Operating System
      </p>
      <Link
        href="/auth/signup"
        className="shrink-0 text-sm font-bold px-5 py-2 rounded-lg bg-white text-[#FF6B35] hover:bg-white/90 transition-colors whitespace-nowrap"
      >
        Get Started
      </Link>
    </div>
  );
}
