"use client";

import Link from "next/link";

export function SignupModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1E1E24] rounded-2xl border border-[#E5E7EB] dark:border-[#2A2A32] shadow-2xl p-8 max-w-sm w-full text-center"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--vela-gradient-tint)" }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M13 3C8 3 4 7 4 12s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="#FF6B35" strokeWidth="1.6"/>
            <path d="M13 8v4l3 3" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-2">
          Sign up to do this for real
        </h3>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mb-6 leading-relaxed">
          Create a free account to use this feature with your actual business data — no credit card required.
        </p>
        <Link
          href="/auth/signup"
          className="block w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity mb-3"
          style={{ background: "var(--vp-color)" }}
        >
          Get Started Free →
        </Link>
        <button
          onClick={onClose}
          className="text-sm text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors"
        >
          Continue exploring demo
        </button>
      </div>
    </div>
  );
}
