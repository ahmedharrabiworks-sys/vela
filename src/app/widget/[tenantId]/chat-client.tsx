"use client";

import { useState, useEffect, useRef } from "react";

type Msg = { role: "user" | "assistant"; content: string; id: string };

export default function WidgetChat({
  tenantId,
  websiteId,
  businessName,
  greeting,
  channel,
  accentColor,
}: {
  tenantId: string;
  websiteId?: string;
  businessName: string;
  greeting: string;
  channel: string;
  accentColor?: string | null;
}) {
  // Round 5 FIX 7: was a fixed Vela-brand gradient regardless of the site
  // it's embedded on. Falls back to the Vela brand gradient only when no
  // site accent color was found (e.g. an externally pasted embed).
  const gradient = accentColor
    ? `linear-gradient(135deg,${accentColor},${accentColor})`
    : "linear-gradient(135deg,#FF6B35,#FF3366)";
  const [messages, setMessages] = useState<Msg[]>([
    { id: "welcome", role: "assistant", content: greeting },
  ]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // FIX 4: was sessionStorage, which is cleared the moment the tab/window
  // closes -- every single reopen of the widget (or the site) started a
  // brand new conversation, fragmenting one real visitor into many
  // disconnected threads. localStorage persists across browser restarts;
  // a stored {id, expiresAt} pair with a 48h SLIDING window (refreshed on
  // every message, not just at creation) gives "resume within a
  // reasonable session" without persisting forever.
  const STORAGE_KEY = `vela_conv_${tenantId}`;
  const SESSION_MS = 48 * 60 * 60 * 1000;

  function readStoredConversation(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string; expiresAt?: number };
      if (!parsed.id || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed.id;
    } catch {
      return null;
    }
  }

  function persistConversation(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, expiresAt: Date.now() + SESSION_MS }));
    } catch { /* localStorage unavailable (private mode, quota) -- conversation just won't persist */ }
  }

  /* Restore conversationId + real message history on mount */
  useEffect(() => {
    const stored = readStoredConversation();
    if (stored) {
      setConversationId(stored);
      persistConversation(stored); // touch expiry -- reopening counts as activity
      (async () => {
        try {
          const res = await fetch(`/api/widget/history?tenantId=${encodeURIComponent(tenantId)}&conversationId=${encodeURIComponent(stored)}`);
          const data = await res.json() as { messages?: { role: string; content: string }[] };
          if (data.messages && data.messages.length > 0) {
            setMessages([
              { id: "welcome", role: "assistant", content: greeting },
              ...data.messages.map((m, i) => ({ id: `h-${i}`, role: m.role as "user" | "assistant", content: m.content })),
            ]);
          }
        } catch { /* history fetch failed -- conversation still continues, just without visible prior messages */ }
      })();
    }
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // FIX 3: the widget is otherwise stateless (no websocket/push channel),
  // so a real Takeover reply from the owner (api/conversations/[id]/reply)
  // never reached an already-open widget -- the customer would only see it
  // on their NEXT reopen (full history restore, FIX 4), not while actively
  // chatting. Polling gives real, if not instant, delivery: once a
  // conversation exists, check for new messages every few seconds and
  // append any not already shown. Matches on (role, content) since the
  // history endpoint returns no message id -- a reasonable tradeoff for a
  // lightweight polling mechanism, not a strict dedupe guarantee.
  //
  // messagesRef mirrors `messages` state so the interval callback always
  // dedupes against the CURRENT list, not a snapshot frozen when the effect
  // was set up -- a plain `messages`-derived Set captured once would go
  // stale the moment the visitor sent another message via send() (which
  // doesn't touch this effect), causing the next poll to treat the
  // visitor's own just-sent message and its AI reply as "new" and
  // duplicate them into the thread.
  const messagesRef = useRef<Msg[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/widget/history?tenantId=${encodeURIComponent(tenantId)}&conversationId=${encodeURIComponent(conversationId)}`);
        const data = await res.json() as { messages?: { role: string; content: string }[] };
        if (!data.messages) return;
        const seen = new Set(messagesRef.current.map((m) => `${m.role}:${m.content}`));
        const fresh = data.messages.filter((m) => !seen.has(`${m.role}:${m.content}`));
        if (fresh.length === 0) return;
        setMessages((prev) => [
          ...prev,
          ...fresh.map((m, i) => ({ id: `poll-${Date.now()}-${i}`, role: m.role as "user" | "assistant", content: m.content })),
        ]);
      } catch { /* next poll will retry */ }
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, tenantId]);

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
          websiteId,
          conversationId,
          message: text,
          channel,
          customerName: "Website Visitor",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Logged for the site owner/developer console -- never shown to the
        // visitor, who still gets a friendly reply below. Common causes: an
        // invalid tenantId in the embed script, or a plan message limit hit.
        console.error("[vela-widget] ai/reply failed:", res.status, data?.error);
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
        persistConversation(data.conversationId); // every real message refreshes the 48h expiry
      }

      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "I'll get back to you shortly!",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("[vela-widget] network error:", err);
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
        style={{ background: gradient }}>
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
                style={{ background: gradient }}>
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-white rounded-br-sm"
                  : "text-[#111111] bg-white border border-[#E5E7EB] rounded-bl-sm shadow-sm"
              }`}
              style={msg.role === "user" ? { background: gradient } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mr-2 mt-0.5"
              style={{ background: gradient }}>
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
            style={{ background: gradient }}
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
