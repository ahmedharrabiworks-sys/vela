"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_ACTIONS = [
  { label: "Today's appointments", message: "What appointments do I have today?" },
  { label: "Recent leads",         message: "Show me my most recent leads" },
  { label: "Needs attention",      message: "Which conversations need human attention?" },
  { label: "Write a reply",        message: "Help me write a professional reply to a customer asking about pricing" },
];

export function VelaAssistant() {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm Vela AI, your business assistant. I can answer questions about your leads, appointments, and conversations — or help you craft replies and marketing copy.",
      }]);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      let reply = data.reply ?? "Sorry, I couldn't process that request.";

      // Handle navigation command
      const navMatch = reply.match(/\[navigate:([^\]]+)\]/);
      if (navMatch) {
        reply = reply.replace(/\[navigate:[^\]]+\]/g, "").trim();
        setTimeout(() => { router.push(navMatch[1]); setOpen(false); }, 800);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  }, [loading, messages, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[140] w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
        aria-label="Open Vela AI Assistant"
      >
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ background: "#FF6B35" }} />
        )}
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="relative z-10">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M8 10h8M8 14h5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[141] bg-black/40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div
            ref={panelRef}
            className="fixed z-[142] inset-0 sm:inset-auto sm:right-6 sm:bottom-[88px] sm:w-96 bg-white sm:rounded-2xl shadow-2xl flex flex-col border border-[#E5E7EB] overflow-hidden"
            style={{ maxHeight: "calc(100vh - 120px)", minHeight: "400px" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 shrink-0"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">Vela AI</p>
                  <p className="text-[11px] text-white/70 mt-0.5">Your business assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-[11px] text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick actions — shown before first user message */}
            {messages.filter((m) => m.role === "user").length === 0 && (
              <div className="px-3 py-2.5 border-b border-[#F3F4F6] shrink-0 bg-[#FAFAFA]">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2 font-semibold px-0.5">Quick questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => send(qa.message)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#374151] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors whitespace-nowrap"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full shrink-0 mr-2 mt-0.5 flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-[#F3F4F6] text-[#111111] rounded-bl-sm"
                    }`}
                    style={msg.role === "user" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                  >
                    {msg.content.split("\n").map((line, j, arr) => (
                      <span key={j}>
                        {line}
                        {j < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    AI
                  </div>
                  <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pt-3 border-t border-[#F3F4F6] shrink-0 bg-white" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your business…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors disabled:opacity-60"
                  style={{ minHeight: "40px", maxHeight: "100px" }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0 hover:opacity-90 transition-opacity"
                  style={{ background: "#FF6B35" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M12.5 1.5L1.5 7.5l4 2m7-8l-7 8m0 0v3l2.5-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-1.5 text-center">
                Press <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[9px]">Enter</kbd> to send · <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[9px]">Shift+Enter</kbd> for new line
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
