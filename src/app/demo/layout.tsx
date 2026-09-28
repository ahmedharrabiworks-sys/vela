"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";

import { DEMO_PROFILE } from "@/lib/demo-data";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Demo banner */}
      <div className="shrink-0 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 bg-[#111111]">
        <p className="text-sm flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: "var(--vp-color)" }} />
          <span className="text-white font-semibold">Demo mode</span>
          <span className="hidden sm:inline text-white/40 truncate">Explore every feature, no sign-up required</span>
        </p>
        <Link
          href="/auth/signup"
          className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity"
          style={{ background: "var(--vp-color)" }}
        >
          Get Started →
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pathPrefix="/demo"
          demoProfile={DEMO_PROFILE}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 md:px-6 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-[#374151] hover:bg-[#F3F4F6] transition-colors"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm text-[#9CA3AF] select-none">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#C4C9D4]">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span>Search…</span>
              <span className="ml-3 text-[10px] bg-white border border-[#E5E7EB] rounded px-1.5 py-0.5 font-mono text-[#C4C9D4]">⌘K</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Unlock CTA */}
              <Link
                href="/auth/signup"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M8.5 5H2.5M2.5 5L5 2.5M2.5 5L5 7.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Unlock Full Access
              </Link>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
