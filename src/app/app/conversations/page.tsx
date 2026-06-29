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

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 px-5 py-3.5 bg-[#f0e8e0] rounded-2xl rounded-tl-sm">
        {[0, 160, 320].map((delay, i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-[#888888] animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1.1s" }} />
        ))}
      </div>
    </div>
  );
}

const ALL_CONVERSATIONS = [
  { id: 1, name: "Ahmed Al-Rashid", channel: "Instagram", message: "I'd like to book an appointment for next week", time: "2m ago", status: "new", typing: true, messages: [
    { role: "user", content: "Hi! I'd like to book an appointment for next week.", time: "10:32" },
    { role: "ai", content: "Hello Ahmed! I'd be happy to help you book an appointment. What service are you interested in?", time: "10:32" },
    { role: "user", content: "I'd like to book a dental cleaning.", time: "10:33" },
    { role: "ai", content: "We have availability on Tuesday at 3 PM or Wednesday at 11 AM. Which works best for you?", time: "10:33" },
  ]},
  { id: 2, name: "Sara Khalid", channel: "WhatsApp", message: "What are your prices for the premium package?", time: "8m ago", status: "replied", typing: false, messages: [
    { role: "user", content: "What are your prices for the premium package?", time: "10:25" },
    { role: "ai", content: "Our Premium Package is priced at AED 1,200 and includes a full consultation, cleaning, and follow-up. Would you like to book?", time: "10:25" },
  ]},
  { id: 3, name: "Mohammed Ali", channel: "Website", message: "Can you tell me more about dental cleaning?", time: "15m ago", status: "qualified", typing: false, messages: [
    { role: "user", content: "Can you tell me more about the dental cleaning service?", time: "10:18" },
    { role: "ai", content: "Our dental cleaning is a comprehensive 45-minute procedure. It includes scaling, polishing, and a fluoride treatment. The cost is AED 350.", time: "10:18" },
    { role: "user", content: "That sounds good. What days are available?", time: "10:20" },
  ]},
  { id: 4, name: "Layla Hassan", channel: "Instagram", message: "Is there availability tomorrow morning?", time: "32m ago", status: "booked", typing: false, messages: [
    { role: "user", content: "Is there availability tomorrow morning?", time: "10:01" },
    { role: "ai", content: "Yes! We have 9 AM, 10:30 AM, and 11 AM available tomorrow. Which time works for you?", time: "10:01" },
    { role: "user", content: "10:30 AM please", time: "10:02" },
    { role: "ai", content: "Booked! ✅ Your appointment is confirmed for tomorrow at 10:30 AM. You'll receive a reminder 1 hour before. See you then!", time: "10:02" },
  ]},
  { id: 5, name: "Omar Bin Rashid", channel: "WhatsApp", message: "Thank you! See you on Tuesday at 3pm", time: "1h ago", status: "booked", typing: false, messages: [
    { role: "user", content: "Can I book a root canal consultation?", time: "09:15" },
    { role: "ai", content: "Of course! Dr. Hassan has availability on Tuesday at 3 PM or Thursday at 10 AM. Which works?", time: "09:15" },
    { role: "user", content: "Tuesday 3 PM please", time: "09:16" },
    { role: "ai", content: "Perfect! Booked for Tuesday at 3 PM. See you then, Omar! 😊", time: "09:16" },
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
    <div className="h-full flex gap-0 md:gap-5 max-w-7xl mx-auto pb-20">

      {/* Left — conversation list */}
      <div className={`flex-col bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden
        ${showThread ? "hidden md:flex md:w-80" : "flex w-full md:w-80"}`}>
        <div className="px-4 py-4 border-b border-[#f0e8e0]">
          <h2 className="font-bold text-[#1A0A00] mb-3">Conversations</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all min-h-[32px] ${
                  filter === f ? "text-white" : "bg-[#FFF5F0] text-[#888888] hover:text-[#FF6B35]"
                }`}
                style={filter === f ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#f0e8e0]">
          {ALL_CONVERSATIONS.map((conv) => {
            const isActive = selected.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-all min-h-[72px] ${
                  isActive ? "bg-[#FFF5F0] border-l-[3px] border-[#FF6B35]" : "hover:bg-[#FFF5F0]/50 border-l-[3px] border-transparent"
                }`}
              >
                {/* Avatar with channel badge */}
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: CHANNEL_COLORS[conv.channel] }}>
                    {conv.name[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: CHANNEL_COLORS[conv.channel], color: "white" }}>
                    <ChannelIcon channel={conv.channel} />
                  </div>
                  {conv.status === "new" && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-semibold truncate ${isActive ? "text-[#1A0A00]" : "text-[#1A0A00]"}`}>{conv.name}</span>
                    <span className="text-[10px] text-[#bbb] shrink-0 ml-1">{conv.time}</span>
                  </div>
                  <p className="text-[11px] text-[#888888] truncate mb-1.5">{conv.message}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${CHANNEL_COLORS[conv.channel]}15`, color: CHANNEL_COLORS[conv.channel] }}>
                      {conv.channel}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[conv.status]}`}>
                      {conv.status}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — thread */}
      <div className={`flex-col bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>

        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-[#f0e8e0]">
          {/* Back — mobile only */}
          <button
            onClick={() => setShowThread(false)}
            className="md:hidden p-2 -ml-1 rounded-xl text-[#888888] hover:text-[#1A0A00] hover:bg-[#FFF5F0] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: CHANNEL_COLORS[selected.channel] }}>
              {selected.name[0]}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: CHANNEL_COLORS[selected.channel], color: "white" }}>
              <ChannelIcon channel={selected.channel} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1A0A00] text-sm leading-tight">{selected.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold" style={{ color: CHANNEL_COLORS[selected.channel] }}>{selected.channel}</span>
              {selected.typing && (
                <span className="text-[10px] text-[#888888] flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-green-400" />
                  typing…
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI toggle */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-[#888888] font-medium">AI</span>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-9 h-5 rounded-full transition-all duration-200 relative ${aiEnabled ? "bg-[#FF6B35]" : "bg-[#f0e8e0]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${aiEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            <button className="hidden md:block text-xs font-semibold px-3 py-2 rounded-xl border border-[#f0e8e0] text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all min-h-[36px]">
              Takeover
            </button>
            <button className="text-xs font-semibold px-3 py-2 rounded-xl text-white transition-all hover:opacity-90 min-h-[36px]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              + Book
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-5 space-y-4">
          {selected.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[78%] md:max-w-[70%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#f0e8e0] text-[#1A0A00] rounded-tl-sm"
                  : "text-white rounded-tr-sm"
              }`}
              style={msg.role === "ai" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-[#888888]" : "text-white/60"}`}>
                  {msg.role === "ai" ? "⚡ Vela AI · " : ""}{msg.time}
                </p>
              </div>
            </div>
          ))}
          {/* Typing indicator */}
          {selected.typing && <TypingIndicator />}
        </div>

        {/* Reply box */}
        <div className="px-4 md:px-5 py-4 border-t border-[#f0e8e0]">
          {!aiEnabled && (
            <p className="text-xs text-[#FF6B35] font-medium mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> You&apos;re replying manually
            </p>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply…"
              rows={2}
              className="flex-1 text-sm resize-none rounded-xl border border-[#f0e8e0] px-4 py-3 text-[#1A0A00] placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 transition-colors min-h-[52px]"
            />
            <button className="px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02] min-h-[44px]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
