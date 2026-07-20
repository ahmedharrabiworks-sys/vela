"use client";

import Link from "next/link";

export default function DemoPageNotYet() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-5">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 3C7 3 4 6 4 10s3 7 7 7 7-3 7-7-3-7-7-7z" stroke="#9CA3AF" strokeWidth="1.4"/>
          <path d="M11 7v4M11 15h.01" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-base font-bold text-[#111111] mb-1.5">Live in the full version</p>
      <p className="text-sm text-[#6B7280] mb-6 max-w-xs leading-relaxed">
        Create a free account to access this feature with your real business data — no credit card required.
      </p>
      <Link
        href="/auth/signup"
        className="text-sm font-bold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
        style={{ background: "var(--vp-color)" }}
      >
        Get Started Free →
      </Link>
    </div>
  );
}
