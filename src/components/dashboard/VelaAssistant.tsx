"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/business-profile";

type Message = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  retryText?: string;
};

const QUICK_ACTIONS = [
  { label: "Today's appointments", message: "What appointments do I have today?" },
  { label: "Recent leads",         message: "Show me my most recent leads" },
  { label: "Needs attention",      message: "Which conversations need human attention?" },
  { label: "Write a reply",        message: "Help me write a professional reply to a customer asking about pricing" },
  { label: "Train me", message: "", isInterview: true },
];

function extractSaveKbToken(text: string): { json: string; stripped: string } | null {
  const start = text.indexOf("[save_kb:");
  if (start === -1) return null;
  const jsonStart = start + "[save_kb:".length;
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
  if (jsonEnd === -1 || text[jsonEnd] !== "]") return null;
  return {
    json: text.slice(jsonStart, jsonEnd),
    stripped: (text.slice(0, start) + text.slice(jsonEnd + 1)).replace(/\n{3,}/g, "\n\n").trim(),
  };
}

function VAvatar({ size = 24, mt = false }: { size?: number; mt?: boolean }) {
  const icon = Math.round(size * 0.52);
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center${mt ? " mt-0.5" : ""}`}
      style={{ width: size, height: size, background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
    >
      <svg width={icon} height={icon} viewBox="0 0 14 14" fill="none">
        <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export function VelaAssistant() {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [firstName, setFirstName] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile?.ownerName) setFirstName(profile.ownerName.split(" ")[0]);
  }, []);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const hi = firstName ? `Hi ${firstName}! ` : "Hi! ";
      setMessages([{
        role: "assistant",
        content: `${hi}I'm Vela, your AI business assistant. Ask me about your leads, appointments, or conversations — or I'll help you write replies and marketing copy.`,
      }]);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages.length, firstName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string, startInterview = false) => {
    if (!text.trim() || loading) return;
    const isInterview = startInterview || interviewMode;
    if (startInterview) setInterviewMode(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-10), interviewMode: isInterview }),
      });
      const data = await res.json() as { reply?: string; error?: string };

      if (!res.ok) {
        const errText =
          data.error === "Unauthorized"
            ? "Please sign in to use Vela AI."
            : data.error === "Tenant not found"
            ? "Finish setting up your account to unlock the assistant."
            : data.error === "AI not configured"
            ? "The AI service isn't configured yet. Contact support."
            : "Something went wrong — tap Retry below to try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: errText, isError: true, retryText: text }]);
        setLoading(false);
        return;
      }

      let reply = data.reply ?? "I couldn't generate a response. Please try again.";

      // Handle [navigate:/path] token
      const navMatch = reply.match(/\[navigate:([^\]]+)\]/);
      if (navMatch) {
        reply = reply.replace(/\[navigate:[^\]]+\]/g, "").trim();
        setTimeout(() => { router.push(navMatch[1]); setOpen(false); }, 800);
      }

      // Handle [save_kb:{...}] token
      const kbToken = extractSaveKbToken(reply);
      if (kbToken) {
        reply = kbToken.stripped;
        try {
          const kbData = JSON.parse(kbToken.json);
          await fetch("/api/ai-training?merge=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kbData),
          });
          setInterviewMode(false);
          reply = (reply ? reply + "\n\n" : "") + "✓ Your AI knowledge base has been updated! Visit Train your AI to review or adjust anything.";
        } catch {
          reply = (reply ? reply + "\n\n" : "") + "I've finished the interview but had trouble saving — please visit Train your AI to save manually.";
          setInterviewMode(false);
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Connection error — check your internet and tap Retry.",
        isError: true,
        retryText: text,
      }]);
    }
    setLoading(false);
  }, [loading, messages, router, interviewMode]);

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

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-[141] bg-black/40 sm:hidden" onClick={() => setOpen(false)} />

          {/* Panel */}
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
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
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
                      onClick={() => {
                        if (qa.isInterview) {
                          send("I want to train my AI — please start the interview now.", true);
                        } else {
                          send(qa.message);
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                        qa.isInterview
                          ? "border-[#FF6B35] text-[#FF6B35] bg-[#FFF5F0] hover:bg-[#FF6B35] hover:text-white font-semibold"
                          : "border-[#E5E7EB] text-[#374151] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      }`}
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
                  {msg.role === "assistant" && <VAvatar size={24} mt />}
                  <div className={`flex flex-col max-w-[82%]${msg.role === "assistant" ? " ml-2" : ""}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-br-sm"
                          : msg.isError
                          ? "bg-red-50 text-[#991B1B] rounded-bl-sm border border-red-100"
                          : "bg-[#F3F4F6] text-[#111111] rounded-bl-sm"
                      }`}
                      style={msg.role === "user" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                    >
                      {msg.content.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                    {msg.isError && msg.retryText && (
                      <button
                        onClick={() => send(msg.retryText!)}
                        className="mt-1.5 text-[11px] font-semibold text-[#FF6B35] hover:text-[#FF3366] flex items-center gap-1 transition-colors self-start"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6a4 4 0 014-4 4 4 0 013.46 2M10 2v3H7M10 6a4 4 0 01-4 4 4 4 0 01-3.46-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start items-end gap-2">
                  <VAvatar size={24} />
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
