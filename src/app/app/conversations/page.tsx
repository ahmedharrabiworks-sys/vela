"use client";

import { useState } from "react";

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
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

const ALL_CONVERSATIONS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "Instagram", preview: "I'd like to book for next week", time: "2m", isNew: true, messages: [
    { role: "user", content: "Hi! I'd like to book an appointment for next week.", time: "10:32" },
    { role: "ai", content: "Hello Ahmed! I'd be happy to help you book an appointment. What service are you interested in?", time: "10:32" },
    { role: "user", content: "I'd like to book a dental cleaning.", time: "10:33" },
    { role: "ai", content: "We have availability on Tuesday at 3 PM or Wednesday at 11 AM. Which works best for you?", time: "10:33" },
  ]},
  { id: 2, name: "Sara Khalid", channel: "WhatsApp", preview: "What are your prices for the premium package?", time: "8m", isNew: false, messages: [
    { role: "user", content: "What are your prices for the premium package?", time: "10:25" },
    { role: "ai", content: "Our Premium Package is AED 1,200 and includes a full consultation, cleaning, and follow-up. Would you like to book?", time: "10:25" },
  ]},
  { id: 3, name: "Mohammed Ali", channel: "Website", preview: "Can you tell me more about dental cleaning?", time: "15m", isNew: true, messages: [
    { role: "user", content: "Can you tell me more about the dental cleaning service?", time: "10:18" },
    { role: "ai", content: "Our dental cleaning is a comprehensive 45-minute procedure. It includes scaling, polishing, and fluoride treatment. Cost is AED 350.", time: "10:18" },
    { role: "user", content: "That sounds good. What days are available?", time: "10:20" },
  ]},
  { id: 4, name: "Layla Hassan", channel: "Instagram", preview: "Is there availability tomorrow morning?", time: "32m", isNew: false, messages: [
    { role: "user", content: "Is there availability tomorrow morning?", time: "10:01" },
    { role: "ai", content: "Yes! We have 9 AM, 10:30 AM, and 11 AM available tomorrow. Which time works for you?", time: "10:01" },
    { role: "user", content: "10:30 AM please", time: "10:02" },
    { role: "ai", content: "Booked! Your appointment is confirmed for tomorrow at 10:30 AM. You will receive a reminder 1 hour before.", time: "10:02" },
  ]},
  { id: 5, name: "Omar Bin Rashid", channel: "WhatsApp", preview: "Thank you! See you on Tuesday at 3pm", time: "1h", isNew: false, messages: [
    { role: "user", content: "Can I book a root canal consultation?", time: "09:15" },
    { role: "ai", content: "Of course! Dr. Hassan has availability on Tuesday at 3 PM or Thursday at 10 AM. Which works?", time: "09:15" },
    { role: "user", content: "Tuesday 3 PM please", time: "09:16" },
    { role: "ai", content: "Perfect! Booked for Tuesday at 3 PM. See you then, Omar!", time: "09:16" },
  ]},
];

export default function ConversationsPage() {
  const [selected, setSelected] = useState(ALL_CONVERSATIONS[0]);
  const [showThread, setShowThread] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Instagram", "WhatsApp", "Website", "Unread"];

  const filtered = ALL_CONVERSATIONS.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Unread") return c.isNew;
    return c.channel === filter;
  });

  const handleSelect = (conv: typeof ALL_CONVERSATIONS[0]) => {
    setSelected(conv);
    setShowThread(true);
  };

  return (
    <div className="h-full flex gap-0 md:gap-5 max-w-7xl mx-auto pb-20">

      {/* Left — list */}
      <div className={`flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden
        ${showThread ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>

        <div className="px-4 py-4 border-b border-[#F3F4F6]">
          <h2 className="font-bold text-[#111827] mb-3 text-sm">Conversations</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                  filter === f ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6]">
          {filtered.map((conv) => {
            const isActive = selected.id === conv.id;
            return (
              <button key={conv.id} onClick={() => handleSelect(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all ${
                  isActive ? "bg-[#FFF8F5] border-l-2 border-[#FF6B35]" : "hover:bg-[#F9FAFB] border-l-2 border-transparent"
                }`}>
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: CHANNEL_COLORS[conv.channel] }}>
                    {conv.name[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: CHANNEL_COLORS[conv.channel], color: "white" }}>
                    <ChannelIcon channel={conv.channel} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-[#111827] truncate">{conv.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {conv.isNew && <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />}
                      <span className="text-[10px] text-[#9CA3AF]">{conv.time}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280] truncate">{conv.preview}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — thread */}
      <div className={`flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>

        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-[#F3F4F6]">
          <button onClick={() => setShowThread(false)}
            className="md:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: CHANNEL_COLORS[selected.channel] }}>
              {selected.name[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: CHANNEL_COLORS[selected.channel], color: "white" }}>
              <ChannelIcon channel={selected.channel} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#111827] text-sm leading-tight">{selected.name}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: CHANNEL_COLORS[selected.channel] }}>{selected.channel}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-[#6B7280]">AI</span>
              <button onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-9 h-5 rounded-full transition-all duration-200 relative ${aiEnabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${aiEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="hidden md:block text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
              Takeover
            </button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
              + Book
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-[#F9FAFB]">
          {selected.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-white text-[#111827] rounded-tl-sm border border-[#E5E7EB]"
                  : "bg-[#FFF3EE] text-[#111827] rounded-tr-sm border border-[#FFD5C2]"
              }`}>
                <p>{msg.content}</p>
                <p className="text-[10px] text-[#9CA3AF] mt-1.5">
                  {msg.role === "ai" ? "Vela AI · " : ""}{msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply */}
        <div className="px-4 md:px-5 py-4 border-t border-[#F3F4F6] bg-white">
          {!aiEnabled && (
            <p className="text-xs text-[#FF6B35] font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> Replying manually
            </p>
          )}
          <div className="flex gap-2 items-end">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply…" rows={2}
              className="flex-1 text-sm resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors min-h-[52px]" />
            <button className="px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
              style={{ background: "#FF6B35" }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
