"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FFF5F0]">

      {/* Mobile overlay — closes sidebar on tap */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-14 md:h-16 bg-white border-b border-[#f0e8e0] flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-[#1A0A00] hover:bg-[#FFF5F0] transition-colors"
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Search — hidden on mobile */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search leads, conversations..."
                className="pl-9 pr-4 py-2 text-sm bg-[#FFF5F0] border border-[#f0e8e0] rounded-xl w-56 lg:w-64 text-[#1A0A00] placeholder:text-[#888888] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button className="relative w-9 h-9 rounded-xl bg-[#FFF5F0] flex items-center justify-center text-[#888888] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5A5.25 5.25 0 003.75 6.75c0 3.375-1.5 4.5-1.5 4.5h13.5s-1.5-1.125-1.5-4.5A5.25 5.25 0 009 1.5zM10.299 15a1.5 1.5 0 01-2.598 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3366]" />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
