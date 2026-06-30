"use client";

import { useState } from "react";

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid",  channel: "Instagram", status: "New",       lastMsg: "I'd like to book an appointment for next week", lastContact: "2m ago",  value: "AED 1,200", phone: "+971 50 111 2222" },
  { id: 2, name: "Sara Khalid",       channel: "WhatsApp",  status: "Contacted", lastMsg: "What are your prices for the premium package?",  lastContact: "8m ago",  value: "AED 350",   phone: "+971 55 333 4444" },
  { id: 3, name: "Mohammed Ali",      channel: "Website",   status: "Qualified", lastMsg: "Can you tell me more about dental cleaning?",     lastContact: "15m ago", value: "AED 800",   phone: "+971 52 555 6666" },
  { id: 4, name: "Layla Hassan",      channel: "Instagram", status: "Booked",    lastMsg: "10:30 AM works great! See you then!",             lastContact: "32m ago", value: "AED 1,500", phone: "+971 56 777 8888" },
  { id: 5, name: "Omar Bin Rashid",   channel: "WhatsApp",  status: "Client",    lastMsg: "Thank you so much! Very happy with the service.", lastContact: "1h ago",  value: "AED 2,400", phone: "+971 58 999 0000" },
  { id: 6, name: "Fatima Al-Zahra",  channel: "Website",   status: "New",       lastMsg: "Do you offer a payment plan for veneers?",        lastContact: "2h ago",  value: "AED 600",   phone: "+971 50 123 4567" },
  { id: 7, name: "Khalid Mansour",    channel: "WhatsApp",  status: "Contacted", lastMsg: "Is Dr. Hassan available on weekends?",            lastContact: "3h ago",  value: "AED 450",   phone: "+971 52 234 5678" },
  { id: 8, name: "Nora Abdulla",      channel: "Instagram", status: "Qualified", lastMsg: "How long does a whitening session take?",         lastContact: "5h ago",  value: "AED 900",   phone: "+971 55 345 6789" },
];

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Booked", "Client"] as const;

const STATUS_DOT: Record<string, string> = {
  New:       "#9CA3AF",
  Contacted: "#FF6B35",
  Qualified: "#FF6B35",
  Booked:    "#16A34A",
  Client:    "#16A34A",
};

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "Instagram") return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor"/>
    </svg>
  );
  if (channel === "WhatsApp") return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
          <h1 className="text-xl md:text-2xl font-bold text-[#111111]">Leads &amp; CRM</h1>
          <p className="text-sm text-[#6B7280] mt-1">{LEADS.length} total leads · 3 new today</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#E5E7EB]">
            {(["grid", "kanban"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all min-h-[36px] ${
                  view === v ? "text-white" : "text-[#6B7280] hover:text-[#111111]"
                }`}
                style={view === v ? { background: "#FF6B35" } : {}}>
                {v === "grid" ? (
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                    Grid
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="4.75" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="1" width="2.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                    Kanban
                  </span>
                )}
              </button>
            ))}
          </div>
          <button className="text-xs font-bold px-4 py-2.5 min-h-[44px] rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>+ Add Lead</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Search leads by name, channel, or status..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl w-full md:w-96 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <div key={lead.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#FF6B35]/30 transition-all duration-200 overflow-hidden">
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm font-bold text-[#374151]">
                        {lead.name[0]}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#F3F4F6] border-2 border-white flex items-center justify-center text-[#6B7280]">
                        <ChannelIcon channel={lead.channel} />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-[#111111] text-sm leading-tight">{lead.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{lead.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[lead.status] }} />
                    <span className="text-[10px] font-medium text-[#6B7280]">{lead.status}</span>
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">&ldquo;{lead.lastMsg}&rdquo;</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">{lead.lastContact}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                    {lead.channel}
                  </span>
                  <p className="text-base font-extrabold text-[#FF6B35]">{lead.value}</p>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] flex">
                <button className="flex-1 py-3 text-xs font-semibold text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FFF5F0] transition-all min-h-[44px]">
                  Reply
                </button>
                <div className="w-px bg-[#E5E7EB]" />
                <button className="flex-1 py-3 text-xs font-semibold text-white transition-all min-h-[44px] hover:opacity-90"
                  style={{ background: "#FF6B35" }}>
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = LEADS.filter((l) => l.status === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-60">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[stage] }} />
                    <span className="text-xs font-bold text-[#374151]">{stage}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{stageLeads.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id}
                      className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 hover:border-[#FF6B35]/30 hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151] shrink-0">
                          {lead.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111111] truncate">{lead.name}</p>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{lead.channel}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#6B7280] truncate mb-2">{lead.lastMsg}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#FF6B35]">{lead.value}</span>
                        <span className="text-[9px] text-[#9CA3AF]">{lead.lastContact}</span>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-4 text-center text-[#9CA3AF] text-xs">
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
