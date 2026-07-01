"use client";

import { useState } from "react";

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid",  channel: "Instagram", status: "New",       lastMsg: "I'd like to book an appointment for next week", lastContact: "2m ago",  value: "AED 1,200", phone: "+971 50 111 2222" },
  { id: 2, name: "Sara Khalid",       channel: "WhatsApp",  status: "Contacted", lastMsg: "What are your prices for the premium package?",  lastContact: "8m ago",  value: "AED 350",   phone: "+971 55 333 4444" },
  { id: 3, name: "Mohammed Ali",      channel: "Website",   status: "Qualified", lastMsg: "Can you tell me more about your services?",       lastContact: "15m ago", value: "AED 800",   phone: "+971 52 555 6666" },
  { id: 4, name: "Layla Hassan",      channel: "Instagram", status: "Booked",    lastMsg: "10:30 AM works great! See you then!",             lastContact: "32m ago", value: "AED 1,500", phone: "+971 56 777 8888" },
  { id: 5, name: "Omar Bin Rashid",   channel: "WhatsApp",  status: "Client",    lastMsg: "Thank you so much! Very happy with the service.", lastContact: "1h ago",  value: "AED 2,400", phone: "+971 58 999 0000" },
  { id: 6, name: "Fatima Al-Zahra",  channel: "Website",   status: "New",       lastMsg: "Do you offer a payment plan?",                    lastContact: "2h ago",  value: "AED 600",   phone: "+971 50 123 4567" },
  { id: 7, name: "Khalid Mansour",    channel: "WhatsApp",  status: "Contacted", lastMsg: "Are you available on weekends?",                  lastContact: "3h ago",  value: "AED 450",   phone: "+971 52 234 5678" },
  { id: 8, name: "Nora Abdulla",      channel: "Instagram", status: "Qualified", lastMsg: "How long does a session take?",                   lastContact: "5h ago",  value: "AED 900",   phone: "+971 55 345 6789" },
];

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Booked", "Client"] as const;

const STAGE_COLORS: Record<string, { dot: string; header: string }> = {
  New:       { dot: "#9CA3AF", header: "#6B7280" },
  Contacted: { dot: "#FF6B35", header: "#FF6B35" },
  Qualified: { dot: "#F59E0B", header: "#F59E0B" },
  Booked:    { dot: "#16A34A", header: "#16A34A" },
  Client:    { dot: "#7C3AED", header: "#7C3AED" },
};

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "Instagram") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor"/>
    </svg>
  );
  if (channel === "WhatsApp") return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 6h10M6 1c-1.5 2-1.5 8 0 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");

  const filtered = LEADS.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.channel.toLowerCase().includes(search.toLowerCase()) ||
      l.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111111]">Leads &amp; CRM</h1>
          <p className="text-sm text-[#6B7280] mt-1">{LEADS.length} total leads · 3 new today</p>
        </div>
        <button className="text-xs font-bold px-4 py-2.5 min-h-[40px] rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
          + Add Lead
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input type="text" placeholder="Search leads by name, channel, or status..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl w-full text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = filtered.filter((l) => l.status === stage);
          const colors = STAGE_COLORS[stage];
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.dot }} />
                  <span className="text-xs font-bold text-[#374151]">{stage}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {stageLeads.map((lead) => (
                  <div key={lead.id}
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4 hover:border-[#FF6B35]/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all duration-150">
                    {/* Name + channel */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
                          {lead.name[0]}
                        </div>
                        <p className="text-xs font-semibold text-[#111111] truncate">{lead.name}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] shrink-0 whitespace-nowrap">
                        <ChannelIcon channel={lead.channel} />
                        {lead.channel}
                      </span>
                    </div>

                    {/* Last message */}
                    <p className="text-[10px] text-[#6B7280] line-clamp-2 leading-relaxed mb-3">
                      &ldquo;{lead.lastMsg}&rdquo;
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FF6B35]">{lead.value}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{lead.lastContact}</span>
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center">
                    <p className="text-[11px] text-[#9CA3AF]">No leads</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
