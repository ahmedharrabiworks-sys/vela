"use client";

import { useState } from "react";
import { DEMO_CONVS, DEMO_MSG_THREADS, type DemoConv, type DemoMsg } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

/* ── Channel icon ── */
function ChannelIcon({ ch, size = 16 }: { ch: string; size?: number }) {
  if (ch === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.847L0 24l6.337-1.506A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.001-1.368l-.36-.213-3.713.883.934-3.618-.234-.373A9.818 9.818 0 012.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/>
      </svg>
    );
  }
  if (ch === "instagram") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id="ig-conv" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F58529"/>
            <stop offset="50%" stopColor="#DD2A7B"/>
            <stop offset="100%" stopColor="#833AB4"/>
          </linearGradient>
        </defs>
        <path fill="url(#ig-conv)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#6B7280" strokeWidth="1.5"/>
      <path d="M12 8v4l3 3" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const FILTERS = ["All", "whatsapp", "instagram", "website", "Unread"] as const;
type Filter = typeof FILTERS[number];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function DemoConversationsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string>("c1");
  const [reply, setReply] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = DEMO_CONVS.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Unread") return c.isNew;
    return c.channel === filter;
  });

  const selected = DEMO_CONVS.find((c) => c.id === selectedId) ?? DEMO_CONVS[0];
  const thread: DemoMsg[] = DEMO_MSG_THREADS[selected.id] ?? [];

  const filterLabel = (f: Filter) => {
    if (f === "whatsapp") return "WhatsApp";
    if (f === "instagram") return "Instagram";
    if (f === "website") return "Website";
    return f;
  };

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="h-[calc(100vh-56px)] flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#E5E7EB] dark:border-[#2A2A32] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Conversations</h1>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vp-color)" }}
            >
              + New
            </button>
          </div>
          {/* Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => {
              const count = f === "All" ? DEMO_CONVS.length : f === "Unread" ? DEMO_CONVS.filter((c) => c.isNew).length : DEMO_CONVS.filter((c) => c.channel === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f
                      ? "text-white"
                      : "bg-[#F3F4F6] dark:bg-[#2A2A32] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#E5E7EB] dark:hover:bg-[#333340]"
                  }`}
                  style={filter === f ? { background: "var(--vp-color)" } : undefined}
                >
                  {filterLabel(f)}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f ? "bg-white/20" : "bg-[#E5E7EB] dark:bg-[#3A3A48] text-[#6B7280] dark:text-[#9CA3AF]"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: conversation list */}
          <div className="w-[280px] shrink-0 border-r border-[#E5E7EB] dark:border-[#2A2A32] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-[#9CA3AF] text-center pt-12">No conversations</p>
            )}
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-[#F3F4F6] dark:border-[#2A2A32] hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E24] transition-colors relative ${
                  conv.id === selectedId
                    ? "bg-[#FFF8F5] dark:bg-[#1E1A16] border-l-2 border-l-[#FF6B35] pl-[14px]"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] dark:bg-[#2A2A32] flex items-center justify-center text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] shrink-0 relative">
                  {getInitials(conv.customer_name)}
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <ChannelIcon ch={conv.channel} size={13} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold text-[#111827] dark:text-white truncate">{conv.customer_name}</p>
                    <span className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{conv.preview}</p>
                </div>
                {conv.isNew && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF6B35]" />
                )}
              </button>
            ))}
          </div>

          {/* Right: thread */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#2A2A32] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#2A2A32] flex items-center justify-center text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF]">
                  {getInitials(selected.customer_name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">{selected.customer_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ChannelIcon ch={selected.channel} size={11} />
                    <span className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] capitalize">{selected.channel}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] dark:text-[#9CA3AF] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
              >
                Mark resolved
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#F9FAFB] dark:bg-[#13131A]">
              {thread.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "agent" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1" style={{ background: "var(--vp-color)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="2.2" stroke="white" strokeWidth="1.2"/>
                        <path d="M1 6h1M10 6h1M6 1v1M6 10v1" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FF6B35] text-white rounded-br-sm"
                        : "bg-white dark:bg-[#1E1E24] text-[#111827] dark:text-white border border-[#E5E7EB] dark:border-[#2A2A32] rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/70" : "text-[#9CA3AF] dark:text-[#6B7280]"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="px-5 py-3 border-t border-[#E5E7EB] dark:border-[#2A2A32] bg-white dark:bg-[#17171C] shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setShowModal(true)}
                  placeholder="Type a reply…"
                  rows={2}
                  className="flex-1 border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-3.5 py-2.5 text-sm text-[#111827] dark:text-white bg-[#F9FAFB] dark:bg-[#1E1E24] placeholder:text-[#9CA3AF] focus:outline-none resize-none"
                />
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "var(--vp-color)" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
