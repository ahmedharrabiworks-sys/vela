"use client";

import { useState } from "react";
import { DEMO_LEADS, type DemoLead } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

const STAGES = [
  { id: "new",       label: "New",       color: "#6B7280" },
  { id: "contacted", label: "Contacted", color: "#3B82F6" },
  { id: "qualified", label: "Qualified", color: "#8B5CF6" },
  { id: "booked",    label: "Booked",    color: "#FF6B35" },
  { id: "client",    label: "Client",    color: "#16A34A" },
] as const;

type Stage = typeof STAGES[number]["id"];

function ChannelBadge({ ch }: { ch: string }) {
  const map: Record<string, { label: string; color: string }> = {
    whatsapp:  { label: "WA", color: "#25D366" },
    instagram: { label: "IG", color: "#E1306C" },
    website:   { label: "WEB", color: "#6B7280" },
  };
  const cfg = map[ch] ?? { label: ch.slice(0, 2).toUpperCase(), color: "#9CA3AF" };
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
      style={{ background: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function DemoLeadsPage() {
  const [leads, setLeads] = useState<DemoLead[]>(DEMO_LEADS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : leads;

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: Stage) => {
    if (!dragging) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === dragging ? { ...l, status: stage, updated_at: new Date().toISOString() } : l))
    );
    setDragging(null);
  };

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="space-y-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] ">Leads / CRM</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">{leads.length} leads across {STAGES.length} stages</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-sm bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 w-44"
            />
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vp-color)" }}
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const col = filtered.filter((l) => l.status === stage.id);
            return (
              <div
                key={stage.id}
                className="shrink-0 w-[200px] flex flex-col"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-[#374151] ">{stage.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: stage.color }}>
                    {col.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[120px]">
                  {col.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      onClick={() => setShowModal(true)}
                      className={`bg-white border border-[#E5E7EB] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-[#FF6B35]/50 hover:shadow-sm transition-all select-none ${dragging === lead.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: stage.color }}
                        >
                          {getInitials(lead.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111827] truncate">{lead.name}</p>
                          <p className="text-[10px] text-[#9CA3AF] ">{timeAgo(lead.updated_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChannelBadge ch={lead.channel} />
                        {lead.phone && (
                          <span className="text-[9px] text-[#9CA3AF] truncate">{lead.phone}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add card ghost */}
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 w-full py-2 rounded-xl border border-dashed border-[#E5E7EB] text-[11px] text-[#9CA3AF] hover:border-[#FF6B35]/40 hover:text-[#FF6B35] transition-colors"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-[#9CA3AF] text-center">
          Drag leads between stages to update their status
        </p>
      </div>
    </>
  );
}
