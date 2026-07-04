"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { VelaAssistant } from "@/components/dashboard/VelaAssistant";
import { I18nProvider } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/* ── Command palette ── */
const PALETTE_ITEMS = [
  { label: "Dashboard",        href: "/app",                  group: "Pages",   icon: "grid"     },
  { label: "Conversations",    href: "/app/conversations",    group: "Pages",   icon: "chat"     },
  { label: "Leads / CRM",      href: "/app/leads",            group: "Pages",   icon: "users"    },
  { label: "Appointments",     href: "/app/appointments",     group: "Pages",   icon: "calendar" },
  { label: "Website Builder",  href: "/app/website",          group: "Pages",   icon: "globe"    },
  { label: "Analytics",        href: "/app/analytics",        group: "Pages",   icon: "chart"    },
  { label: "Marketing",        href: "/app/marketing",        group: "Pages",   icon: "star"     },
  { label: "Settings",         href: "/app/settings",         group: "Pages",   icon: "settings" },
  { label: "New Appointment",  href: "/app/appointments",     group: "Actions", icon: "plus"     },
  { label: "Connect Instagram",href: "/app/settings#channels",group: "Actions", icon: "instagram"},
  { label: "Connect WhatsApp", href: "/app/settings#channels",group: "Actions", icon: "whatsapp" },
  { label: "Upgrade Plan",     href: "/auth/signup",          group: "Actions", icon: "upgrade"  },
];

function PaletteIcon({ type }: { type: string }) {
  const cls = "text-[#9CA3AF]";
  if (type === "grid") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>;
  if (type === "chat") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M12.5 8.75a1.25 1.25 0 01-1.25 1.25H4.375L1.875 12.5v-9a1.25 1.25 0 011.25-1.25h8.125a1.25 1.25 0 011.25 1.25v5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
  if (type === "users") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M10 13.75v-1.25a2.5 2.5 0 00-2.5-2.5H3.75A2.5 2.5 0 001.25 12.5v1.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="5.625" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M13.75 13.75v-1.25a2.5 2.5 0 00-1.875-2.413M10 2.587a2.5 2.5 0 010 4.838" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (type === "calendar") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><rect x="1.25" y="2.5" width="12.5" height="11.25" rx="1.25" stroke="currentColor" strokeWidth="1.3"/><path d="M10 1.25v2.5M5 1.25v2.5M1.25 6.25h12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (type === "globe") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7.5h12M7.5 1.5c-1.5 2-1.5 9 0 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (type === "chart") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M2.5 12.5V8.125M5.625 12.5V5.625M8.75 12.5V3.125M11.875 12.5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (type === "star") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M7.5 1.25l1.563 4.687H13.75l-3.75 2.813 1.25 4.375L7.5 10.625l-3.75 2.5 1.25-4.375-3.75-2.813h4.688z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
  if (type === "settings") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><circle cx="7.5" cy="7.5" r="1.875" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 1.25v1.25M7.5 12.5v1.25M1.25 7.5h1.25M12.5 7.5h1.25M3.08 3.08l.884.884M11.036 11.036l.884.884M3.08 11.92l.884-.884M11.036 3.964l.884-.884" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (type === "plus") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (type === "upgrade") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M7.5 2.5L9.063 6.875 13.75 7.5 10.625 10.313l1.25 4.375L7.5 12.5 3.125 14.688l1.25-4.375L1.25 7.5l4.688-.625z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
  if (type === "instagram") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><rect x="1.5" y="1.5" width="12" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.3"/><circle cx="11.25" cy="3.75" r="0.875" fill="currentColor"/></svg>;
  if (type === "whatsapp") return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M7.5 1.25a6.25 6.25 0 0 1 5.413 9.375L13.75 13.75l-3.212-1.075A6.25 6.25 0 1 1 7.5 1.25z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={cls}><path d="M7.5 2.5h5v5M7.5 7.5l5-5M5 2.5H2.5v10h10V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? PALETTE_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : PALETTE_ITEMS;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelected(0); }, [query]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter") { if (filtered[selected]) navigate(filtered[selected].href); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selected, navigate, onClose]);

  const groups = Array.from(new Set(filtered.map((i) => i.group)));

  return (
    <div className="fixed inset-0 z-[200] flex flex-col sm:items-center sm:justify-center sm:pt-[12vh] sm:px-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl mx-auto bg-white sm:rounded-2xl border-0 sm:border border-[#E5E7EB] shadow-2xl overflow-hidden flex-1 sm:flex-none flex flex-col">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F3F4F6]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#9CA3AF] shrink-0">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="flex-1 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none" />
          <kbd className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="flex-1 sm:flex-none sm:max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#9CA3AF]">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((i) => i.group === group);
              return (
                <div key={group}>
                  <div className="px-4 py-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider bg-[#FAFAFA] border-b border-[#F3F4F6]">
                    {group}
                  </div>
                  {items.map((item) => {
                    const idx = filtered.indexOf(item);
                    return (
                      <button key={item.label + item.href} onClick={() => navigate(item.href)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected === idx ? "bg-[#FFF5F0]" : "hover:bg-[#FAFAFA]"}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected === idx ? "bg-[#FF6B35]/10" : "bg-[#F3F4F6]"}`}>
                          <PaletteIcon type={item.icon} />
                        </div>
                        <span className={`text-sm font-medium ${selected === idx ? "text-[#FF6B35]" : "text-[#374151]"}`}>{item.label}</span>
                        {selected === idx && (
                          <kbd className="ml-auto text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded font-mono">Enter</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#F3F4F6] flex items-center gap-4 bg-[#FAFAFA]">
          <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF]"><kbd className="bg-white border border-[#E5E7EB] rounded px-1 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF]"><kbd className="bg-white border border-[#E5E7EB] rounded px-1 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1 text-[10px] text-[#9CA3AF]"><kbd className="bg-white border border-[#E5E7EB] rounded px-1 font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 9.4A6 6 0 016.6 2.5a5.5 5.5 0 100 11 6 6 0 006.9-4.1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <I18nProvider>
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Command palette */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-14 md:h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 md:px-6 shrink-0" style={{ transition: "background 0.2s" }}>
          <div className="flex items-center gap-2 md:gap-3">

            {/* Hamburger — mobile only */}
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-[#374151] hover:bg-[#F3F4F6] transition-colors"
              aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Search — opens command palette */}
            <button onClick={() => setPaletteOpen(true)}
              className="relative hidden sm:flex items-center gap-2 pl-9 pr-4 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl w-56 lg:w-64 text-[#9CA3AF] hover:border-[#FF6B35]/40 transition-colors text-left">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Search…
              <kbd className="ml-auto text-[10px] bg-white border border-[#E5E7EB] rounded px-1.5 py-0.5 font-mono text-[#9CA3AF]">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle />
            <button className="relative w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5A5.25 5.25 0 003.75 6.75c0 3.375-1.5 4.5-1.5 4.5h13.5s-1.5-1.125-1.5-4.5A5.25 5.25 0 009 1.5zM10.299 15a1.5 1.5 0 01-2.598 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3366]" />
            </button>
            {/* Mobile search trigger */}
            <button onClick={() => setPaletteOpen(true)}
              className="sm:hidden w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">
          {children}
        </main>
      </div>

      {/* Global AI Assistant */}
      <VelaAssistant />
    </div>
    </I18nProvider>
  );
}
