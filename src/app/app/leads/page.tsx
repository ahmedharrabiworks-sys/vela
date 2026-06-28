"use client";

import { useState } from "react";

const LEADS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "Instagram", status: "New", lastContact: "2m ago", value: "AED 1,200", email: "ahmed@email.com", phone: "+971 50 111 2222" },
  { id: 2, name: "Sara Khalid", channel: "WhatsApp", status: "Contacted", lastContact: "8m ago", value: "AED 350", email: "sara@email.com", phone: "+971 55 333 4444" },
  { id: 3, name: "Mohammed Ali", channel: "Website", status: "Qualified", lastContact: "15m ago", value: "AED 800", email: "moh@email.com", phone: "+971 52 555 6666" },
  { id: 4, name: "Layla Hassan", channel: "Instagram", status: "Booked", lastContact: "32m ago", value: "AED 1,500", email: "layla@email.com", phone: "+971 56 777 8888" },
  { id: 5, name: "Omar Bin Rashid", channel: "WhatsApp", status: "Client", lastContact: "1h ago", value: "AED 2,400", email: "omar@email.com", phone: "+971 58 999 0000" },
  { id: 6, name: "Fatima Al-Zahra", channel: "Website", status: "New", lastContact: "2h ago", value: "AED 600", email: "fatima@email.com", phone: "+971 50 123 4567" },
];

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Booked", "Client"];

const STAGE_COLORS: Record<string, string> = {
  New: "bg-blue-50 text-blue-600",
  Contacted: "bg-[#FF6B35]/10 text-[#FF6B35]",
  Qualified: "bg-purple-50 text-purple-600",
  Booked: "bg-green-50 text-green-600",
  Client: "bg-[#FF3366]/10 text-[#FF3366]",
};

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
};

export default function LeadsPage() {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");

  const filtered = LEADS.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.channel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Leads & CRM</h1>
          <p className="text-sm text-[#888888] mt-1">{LEADS.length} total leads</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#FFF5F0] rounded-xl border border-[#f0e8e0]">
            {(["list", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  view === v ? "bg-white text-[#1A0A00] shadow-sm" : "text-[#888888]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="btn-primary text-xs px-4 py-2.5">+ Add Lead</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 text-sm bg-white border border-[#f0e8e0] rounded-xl w-full md:w-80 text-[#1A0A00] placeholder:text-[#888888] focus:outline-none focus:border-[#FF6B35]/40 shadow-sm transition-colors"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>

      {view === "list" ? (
        /* List view */
        <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#f0e8e0] bg-[#FFF5F0]">
                {["Name", "Channel", "Status", "Last Contact", "Value", "Actions"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-[#888888] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8e0]">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#FFF5F0] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: CHANNEL_COLORS[lead.channel] }}>
                        {lead.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A0A00]">{lead.name}</p>
                        <p className="text-[10px] text-[#888888]">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${CHANNEL_COLORS[lead.channel]}15`, color: CHANNEL_COLORS[lead.channel] }}>
                      {lead.channel}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#888888]">{lead.lastContact}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#1A0A00]">{lead.value}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#f0e8e0] text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">Reply</button>
                      <button className="text-[10px] font-semibold px-2.5 py-1 rounded-lg text-white transition-all"
                        style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Book</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* Kanban view */
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = LEADS.filter((l) => l.status === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-60">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[stage]}`}>{stage}</span>
                  <span className="text-xs text-[#888888] font-medium">{stageLeads.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="bg-white rounded-xl border border-[#f0e8e0] p-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: CHANNEL_COLORS[lead.channel] }}>
                          {lead.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1A0A00] truncate">{lead.name}</p>
                          <p className="text-[9px]" style={{ color: CHANNEL_COLORS[lead.channel] }}>{lead.channel}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#FF6B35]">{lead.value}</span>
                        <span className="text-[9px] text-[#888888]">{lead.lastContact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
