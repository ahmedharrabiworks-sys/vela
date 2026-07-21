"use client";

import { SignupModal } from "@/app/demo/_components/SignupModal";
import { useState } from "react";

const CHANNELS = [
  {
    id: "instagram",
    name: "Instagram",
    handle: "@ahmeddentalclinic",
    desc: "Respond to DMs and comments automatically via your AI agent",
    color: "#E1306C",
    bg: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#833AB4]",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    stats: [
      { label: "DMs handled", value: "312" },
      { label: "Avg response", value: "< 1 min" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    handle: "+971 4 123 4567",
    desc: "Handle WhatsApp messages 24/7 and book appointments automatically",
    color: "#25D366",
    bg: "bg-[#25D366]",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.847L0 24l6.337-1.506A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.001-1.368l-.36-.213-3.713.883.934-3.618-.234-.373A9.818 9.818 0 012.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/>
      </svg>
    ),
    stats: [
      { label: "Messages handled", value: "535" },
      { label: "Bookings via WA", value: "47" },
    ],
  },
  {
    id: "website",
    name: "Website Chat",
    handle: "ahmeddentalclinic.ae",
    desc: "Chat widget on your website — live AI conversations with visitors",
    color: "#6366F1",
    bg: "bg-[#6366F1]",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
        <path d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    stats: [
      { label: "Website visitors", value: "1,240" },
      { label: "Chat conversions", value: "8.3%" },
    ],
  },
];

export default function DemoChannelsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Channels</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Your connected messaging channels</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--vp-color)" }}
          >
            + Connect Channel
          </button>
        </div>

        {/* Summary banner */}
        <div className="bg-[#ECFDF5] dark:bg-[#052E16]/30 border border-[#A7F3D0] dark:border-[#065F46]/50 rounded-xl px-5 py-4 flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="#16A34A" fillOpacity="0.15"/>
            <path d="M5 9l2.5 2.5 5.5-5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm font-semibold text-[#065F46] dark:text-[#34D399]">
            All 3 channels connected — your AI agent is live across Instagram, WhatsApp, and your website
          </p>
        </div>

        {/* Channel cards */}
        <div className="space-y-4">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${ch.bg} flex items-center justify-center shrink-0`}>
                    {ch.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-[#111827] dark:text-white">{ch.name}</p>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-[#052E16]/40 text-[#059669] dark:text-[#34D399]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        Connected
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">{ch.handle}</p>
                    <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 leading-relaxed">{ch.desc}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors whitespace-nowrap"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex gap-6 flex-wrap">
                  {ch.stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-base font-bold text-[#111827] dark:text-white">{stat.value}</p>
                      <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
