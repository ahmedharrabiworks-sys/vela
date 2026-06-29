"use client";

import { useState } from "react";

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "Instagram", status: "New", lastMsg: "I'd like to book an appointment for next week", lastContact: "2m ago", value: "AED 1,200", email: "ahmed@email.com", phone: "+971 50 111 2222" },
  { id: 2, name: "Sara Khalid", channel: "WhatsApp", status: "Contacted", lastMsg: "What are your prices for the premium package?", lastContact: "8m ago", value: "AED 350", email: "sara@email.com", phone: "+971 55 333 4444" },
  { id: 3, name: "Mohammed Ali", channel: "Website", status: "Qualified", lastMsg: "Can you tell me more about dental cleaning?", lastContact: "15m ago", value: "AED 800", email: "moh@email.com", phone: "+971 52 555 6666" },
  { id: 4, name: "Layla Hassan", channel: "Instagram", status: "Booked", lastMsg: "10:30 AM works great! See you then!", lastContact: "32m ago", value: "AED 1,500", email: "layla@email.com", phone: "+971 56 777 8888" },
  { id: 5, name: "Omar Bin Rashid", channel: "WhatsApp", status: "Client", lastMsg: "Thank you so much! Very happy with the service.", lastContact: "1h ago", value: "AED 2,400", email: "omar@email.com", phone: "+971 58 999 0000" },
  { id: 6, name: "Fatima Al-Zahra", channel: "Website", status: "New", lastMsg: "Do you offer a payment plan for veneers?", lastContact: "2h ago", value: "AED 600", email: "fatima@email.com", phone: "+971 50 123 4567" },
  { id: 7, name: "Khalid Mansour", channel: "WhatsApp", status: "Contacted", lastMsg: "Is Dr. Hassan available on weekends?", lastContact: "3h ago", value: "AED 450", email: "khalid@email.com", phone: "+971 52 234 5678" },
  { id: 8, name: "Nora Abdulla", channel: "Instagram", status: "Qualified", lastMsg: "How long does a whitening session take?", lastContact: "5h ago", value: "AED 900", email: "nora@email.com", phone: "+971 55 345 6789" },
];

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Booked", "Client"] as const;

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  Contacted: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  Qualified: { bg: "bg-[#FF6B35]/8", text: "text-[#FF6B35]", border: "border-[#FF6B35]/20" },
  Booked: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  Client: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
};

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
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

type ViewMode = "grid" | "kanban";

export default function LeadsPage() {
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");

  const filtered = LEADS.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.channel.toLowerCase().includes(search.toLowerCase()) ||
      l.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Leads & CRM</h1>
          <p className="text-sm text-[#888888] mt-1">{LEADS.length} total leads · 3 new today</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#f0e8e0] shadow-sm">
            {(["grid", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  view === v ? "bg-white text-[#1A0A00] shadow-sm" : "text-[#888888]"
                }`}
                style={view === v ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)", color: "white" } : {}}
              >
                {v === "grid" ? (
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="7" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="1" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Grid
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="4.75" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <rect x="8.5" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Kanban
                  </span>
                )}
              </button>
            ))}
          </div>
          <button className="btn-primary text-xs px-4 py-2.5 min-h-[44px]">+ Add Lead</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search leads by name, channel, or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0e8e0] rounded-xl w-full md:w-96 text-[#1A0A00] placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 shadow-sm transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const s = STAGE_COLORS[lead.status];
            return (
              <div key={lead.id}
                className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                {/* Card header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar with channel badge */}
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold"
                          style={{ background: CHANNEL_COLORS[lead.channel] }}>
                          {lead.name[0]}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                          style={{ background: CHANNEL_COLORS[lead.channel], color: "white" }}>
                          <ChannelIcon channel={lead.channel} />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-[#1A0A00] text-sm leading-tight">{lead.name}</p>
                        <p className="text-[10px] text-[#888888] mt-0.5">{lead.phone}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border} shrink-0`}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Last message */}
                  <div className="bg-[#FFF5F0] rounded-xl px-3 py-2.5 mb-3">
                    <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">&ldquo;{lead.lastMsg}&rdquo;</p>
                    <p className="text-[10px] text-[#bbb] mt-1">{lead.lastContact}</p>
                  </div>

                  {/* Value */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${CHANNEL_COLORS[lead.channel]}15`, color: CHANNEL_COLORS[lead.channel] }}>
                        {lead.channel}
                      </span>
                    </div>
                    <p className="text-base font-extrabold text-[#FF6B35]">{lead.value}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-[#f0e8e0] flex">
                  <button className="flex-1 py-3 text-xs font-semibold text-[#888888] hover:text-[#FF6B35] hover:bg-[#FFF5F0] transition-all min-h-[44px]">
                    Reply
                  </button>
                  <div className="w-px bg-[#f0e8e0]" />
                  <button className="flex-1 py-3 text-xs font-semibold text-white transition-all min-h-[44px]"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    Book Appointment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Kanban view */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = LEADS.filter((l) => l.status === stage);
            const s = STAGE_COLORS[stage];
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{stage}</span>
                  <span className="text-xs text-[#888888] font-medium bg-[#f0e8e0] w-6 h-6 rounded-full flex items-center justify-center">{stageLeads.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id}
                      className="bg-white rounded-xl border border-[#f0e8e0] p-3.5 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer group">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: CHANNEL_COLORS[lead.channel] }}>
                            {lead.name[0]}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                            style={{ background: CHANNEL_COLORS[lead.channel], color: "white" }}>
                            <ChannelIcon channel={lead.channel} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1A0A00] truncate">{lead.name}</p>
                          <p className="text-[9px]" style={{ color: CHANNEL_COLORS[lead.channel] }}>{lead.channel}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#888888] truncate mb-2">{lead.lastMsg}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#FF6B35]">{lead.value}</span>
                        <span className="text-[9px] text-[#bbb]">{lead.lastContact}</span>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-[#f0e8e0] rounded-xl p-4 text-center text-[#bbb] text-xs">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
