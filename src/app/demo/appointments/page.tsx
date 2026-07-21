"use client";

import { useState } from "react";
import { DEMO_APPTS, type DemoAppt } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  confirmed: { label: "Confirmed", bg: "bg-[#ECFDF5] dark:bg-[#052E16]/40", text: "text-[#059669] dark:text-[#34D399]", dot: "#16A34A" },
  pending:   { label: "Pending",   bg: "bg-[#FFFBEB] dark:bg-[#451A03]/40", text: "text-[#D97706] dark:text-[#FCD34D]", dot: "#D97706" },
  cancelled: { label: "Cancelled", bg: "bg-[#FEF2F2] dark:bg-[#450A0A]/40", text: "text-[#DC2626] dark:text-[#F87171]", dot: "#DC2626" },
};

const CHANNEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  whatsapp:  { label: "WhatsApp",  color: "#16A34A", bg: "rgba(22,163,74,0.10)"   },
  instagram: { label: "Instagram", color: "#C026D3", bg: "rgba(192,38,211,0.10)"  },
  website:   { label: "Website",   color: "#2563EB", bg: "rgba(37,99,235,0.10)"   },
  direct:    { label: "Direct",    color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

const FILTER_TABS = ["All", "Confirmed", "Pending", "Cancelled"] as const;
type FilterTab = typeof FILTER_TABS[number];

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.direct;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {channel === "whatsapp" && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M4.5 0.75a3.75 3.75 0 010 7.5c-.656 0-1.27-.168-1.806-.463L.75 8.25l.47-1.906A3.732 3.732 0 01.75 4.5 3.75 3.75 0 014.5.75z" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round"/>
        </svg>
      )}
      {channel === "instagram" && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <rect x="0.75" y="0.75" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="0.8"/>
          <circle cx="4.5" cy="4.5" r="1.8" stroke="currentColor" strokeWidth="0.8"/>
          <circle cx="6.75" cy="2.25" r="0.5" fill="currentColor"/>
        </svg>
      )}
      {channel === "website" && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <circle cx="4.5" cy="4.5" r="3.75" stroke="currentColor" strokeWidth="0.8"/>
          <path d="M0.75 4.5h7.5M4.5 0.75c-1 1.4-1 5.1 0 7.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
        </svg>
      )}
      {cfg.label}
    </span>
  );
}

export default function DemoAppointmentsPage() {
  const [filter, setFilter] = useState<FilterTab>("All");
  const [showModal, setShowModal] = useState(false);

  const filtered = DEMO_APPTS.filter((a) => {
    if (filter === "All") return true;
    return a.status === filter.toLowerCase();
  });

  const counts = {
    All:       DEMO_APPTS.length,
    Confirmed: DEMO_APPTS.filter((a) => a.status === "confirmed").length,
    Pending:   DEMO_APPTS.filter((a) => a.status === "pending").length,
    Cancelled: DEMO_APPTS.filter((a) => a.status === "cancelled").length,
  };

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-6xl mx-auto space-y-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Appointments</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Today — Jul 21, 2026</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--vp-color)" }}
          >
            + New Appointment
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today",     value: String(counts.All) },
            { label: "Confirmed", value: String(counts.Confirmed) },
            { label: "Pending",   value: String(counts.Pending) },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#111827] dark:text-white">{s.value}</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search appointments…"
              onFocus={() => setShowModal(true)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl bg-white dark:bg-[#1E1E24] text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
            />
          </div>
          <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-[#2A2A32] w-full">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  filter === tab
                    ? "border-[#FF6B35] text-[#FF6B35]"
                    : "border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]"
                }`}
              >
                {tab}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab ? "bg-[#FF6B35]/15 text-[#FF6B35]" : "bg-[#F3F4F6] dark:bg-[#2A2A32] text-[#6B7280] dark:text-[#9CA3AF]"}`}>
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F3F4F6] dark:border-[#2A2A32]">
                  {["Name", "Phone", "Service", "Date & Time", "Channel", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#2A2A32]">
                {filtered.map((appt: DemoAppt) => {
                  const sc = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr key={appt.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#17171C] transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F3F4F6] dark:bg-[#2A2A32] flex items-center justify-center text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] shrink-0">
                            {appt.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <p className="text-sm font-medium text-[#111827] dark:text-white whitespace-nowrap">{appt.name}</p>
                        </div>
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-3.5">
                        {appt.phone ? (
                          <p className="text-sm text-[#374151] dark:text-[#D1D5DB] whitespace-nowrap font-mono text-xs">{appt.phone}</p>
                        ) : (
                          <span className="text-xs text-[#D1D5DB] dark:text-[#4B5563]">—</span>
                        )}
                      </td>
                      {/* Service */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-[#374151] dark:text-[#D1D5DB] whitespace-nowrap">{appt.service}</p>
                      </td>
                      {/* Date & Time */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-mono font-semibold text-[#111827] dark:text-white">{appt.time}</p>
                        <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">Jul 21</p>
                      </td>
                      {/* Channel */}
                      <td className="px-4 py-3.5">
                        <ChannelBadge channel={appt.channel} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowModal(true)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => setShowModal(true)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setShowModal(true)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                          >
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="px-5 py-3 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
              {filtered.length} appointment{filtered.length !== 1 ? "s" : ""} shown
            </span>
            <div className="flex items-center gap-4">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {cfg.label}: <strong className="text-[#374151] dark:text-[#D1D5DB]">{counts[cfg.label as FilterTab] ?? 0}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
