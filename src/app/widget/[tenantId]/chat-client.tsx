"use client";

import { useState, useEffect, useRef } from "react";

type Msg = { role: "user" | "assistant"; content: string; id: string };

export default function WidgetChat({
  tenantId,
  businessName,
  greeting,
}: {
  tenantId: string;
  businessName: string;
  greeting: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: greeting },
  ]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Restore conversationId from sessionStorage */
  useEffect(() => {
    const stored = sessionStorage.getItem(`vela_conv_${tenantId}`);
    if (stored) setConversationId(stored);
    inputRef.current?.focus();
  }, [tenantId]);

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          conversationId,
          message: text,
          channel: "website",
          customerName: "Website Visitor",
        }),
      });

      const data = await res.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem(`vela_conv_${tenantId}`, data.conversationId);
      }

      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "I'll get back to you shortly!",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white font-sans" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-[#F3F4F6] shrink-0"
        style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {businessName[0]?.toUpperCase() ?? "V"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{businessName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            <span className="text-white/75 text-[10px] font-medium">AI Online · Replies instantly</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-white rounded-br-sm"
                  : "text-[#111111] bg-white border border-[#E5E7EB] rounded-bl-sm shadow-sm"
              }`}
              style={msg.role === "user" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              AI
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#F3F4F6] bg-white shrink-0">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a message…"
            disabled={loading}
            className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l3 6-3 6 12-6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Powered by Vela */}
      <div className="py-2 flex items-center justify-center gap-1.5 bg-white border-t border-[#F9FAFB]">
        <span className="w-3 h-3 rounded-sm flex items-center justify-center text-white text-[8px] font-black"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>V</span>
        <span className="text-[10px] text-[#9CA3AF]">Powered by <span className="font-semibold text-[#6B7280]">Vela AI</span></span>
      </div>
    </div>
  );
}
