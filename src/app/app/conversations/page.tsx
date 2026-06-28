"use client";

import { useState } from "react";

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
};

const ALL_CONVERSATIONS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "Instagram", message: "I'd like to book an appointment for next week", time: "2m ago", status: "new", messages: [
    { role: "user", content: "Hi! I'd like to book an appointment for next week.", time: "10:32" },
    { role: "ai", content: "Hello Ahmed! I'd be happy to help you book an appointment. What service are you interested in?", time: "10:32" },
    { role: "user", content: "I'd like to book a dental cleaning.", time: "10:33" },
    { role: "ai", content: "We have availability on Tuesday at 3 PM or Wednesday at 11 AM. Which works best for you?", time: "10:33" },
  ]},
  { id: 2, name: "Sara Khalid", channel: "WhatsApp", message: "What are your prices for the premium package?", time: "8m ago", status: "replied", messages: [
    { role: "user", content: "What are your prices for the premium package?", time: "10:25" },
    { role: "ai", content: "Our Premium Package is priced at AED 1,200 and includes a full consultation, cleaning, and follow-up. Would you like to book?", time: "10:25" },
  ]},
  { id: 3, name: "Mohammed Ali", channel: "Website", message: "Can you tell me more about dental cleaning?", time: "15m ago", status: "qualified", messages: [
    { role: "user", content: "Can you tell me more about the dental cleaning service?", time: "10:18" },
    { role: "ai", content: "Our dental cleaning is a comprehensive 45-minute procedure. It includes scaling, polishing, and a fluoride treatment. The cost is AED 350.", time: "10:18" },
    { role: "user", content: "That sounds good. What days are available?", time: "10:20" },
  ]},
  { id: 4, name: "Layla Hassan", channel: "Instagram", message: "Is there availability tomorrow morning?", time: "32m ago", status: "booked", messages: [
    { role: "user", content: "Is there availability tomorrow morning?", time: "10:01" },
    { role: "ai", content: "Yes! We have 9 AM, 10:30 AM, and 11 AM available tomorrow. Which time works for you?", time: "10:01" },
    { role: "user", content: "10:30 AM please", time: "10:02" },
    { role: "ai", content: "Booked! ✅ Your appointment is confirmed for tomorrow at 10:30 AM. You'll receive a reminder 1 hour before. See you then!", time: "10:02" },
  ]},
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-600",
  replied: "bg-[#FF6B35]/10 text-[#FF6B35]",
  qualified: "bg-purple-50 text-purple-600",
  booked: "bg-green-50 text-green-600",
};

export default function ConversationsPage() {
  const [selected, setSelected] = useState(ALL_CONVERSATIONS[0]);
  const [showThread, setShowThread] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Instagram", "WhatsApp", "Website", "New", "Booked"];

  const handleSelect = (conv: typeof ALL_CONVERSATIONS[0]) => {
    setSelected(conv);
    setShowThread(true);
  };

  return (
    <div className="h-full flex gap-0 md:gap-5 max-w-7xl mx-auto">
      {/* Left — list (hidden on mobile when thread is open) */}
      <div className={`flex-col bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden
        ${showThread ? "hidden md:flex md:w-80" : "flex w-full md:w-80"}`}>
        <div className="px-4 py-3 border-b border-[#f0e8e0]">
          <h2 className="font-bold text-[#1A0A00] mb-3">Conversations</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                  filter === f ? "text-white" : "bg-[#FFF5F0] text-[#888888]"
                }`}
                style={filter === f ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#f0e8e0]">
          {ALL_CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                selected.id === conv.id ? "bg-[#FFF5F0]" : "hover:bg-[#FFF5F0]/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: CHANNEL_COLORS[conv.channel] }}>
                {conv.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-[#1A0A00] truncate">{conv.name}</span>
                  <span className="text-[9px] text-[#888888] shrink-0">{conv.time}</span>
                </div>
                <p className="text-[10px] text-[#888888] truncate">{conv.message}</p>
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${CHANNEL_COLORS[conv.channel]}15`, color: CHANNEL_COLORS[conv.channel] }}>{conv.channel}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[conv.status]}`}>{conv.status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right — thread (hidden on mobile when list is showing) */}
      <div className={`flex-col bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>
        {/* Thread header */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-[#f0e8e0]">
          <div className="flex items-center gap-3">
            {/* Back button — mobile only */}
            <button
              onClick={() => setShowThread(false)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-[#888888] hover:text-[#1A0A00] hover:bg-[#FFF5F0] transition-all"
              aria-label="Back to list"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: CHANNEL_COLORS[selected.channel] }}>
              {selected.name[0]}
            </div>
            <div>
              <p className="font-bold text-[#1A0A00] text-sm">{selected.name}</p>
              <p className="text-[10px]" style={{ color: CHANNEL_COLORS[selected.channel] }}>{selected.channel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* AI toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888] font-medium hidden sm:inline">AI</span>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-9 h-5 rounded-full transition-all duration-200 relative ${aiEnabled ? "bg-[#FF6B35]" : "bg-[#f0e8e0]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${aiEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="hidden sm:block text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#f0e8e0] text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
              Human Takeover
            </button>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              + Book
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {selected.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#f0e8e0] text-[#1A0A00] rounded-tl-sm"
                  : "text-white rounded-tr-sm"
              }`}
              style={msg.role === "ai" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-[#888888]" : "text-white/60"}`}>
                  {msg.role === "ai" ? "⚡ Vela AI · " : ""}{msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="px-4 py-3 border-t border-[#f0e8e0]">
          {!aiEnabled && (
            <p className="text-xs text-[#FF6B35] font-medium mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> You&apos;re replying manually
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply..."
              rows={2}
              className="flex-1 text-sm resize-none rounded-xl border border-[#f0e8e0] px-3 py-2.5 text-[#1A0A00] placeholder:text-[#888888] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
            />
            <button className="px-4 py-2 rounded-xl text-white text-sm font-semibold self-end transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
