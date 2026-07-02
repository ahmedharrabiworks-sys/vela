"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

type Msg = { role: "user" | "assistant"; content: string; id: string };

export default function TestAIPage() {
  const [tenantId, setTenantId]     = useState("");
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState("Hi! What services do you offer?");
  const [sending, setSending]       = useState(false);
  const [log, setLog]               = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Load the signed-in user's tenant */
  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await (supabase as any)
        .from("tenants")
        .select("id, business_name")
        .eq("owner_id", user.id)
        .single();

      if (tenant) {
        const t = tenant as { id: string; business_name: string };
        setUserTenantId(t.id);
        setTenantId(t.id);
        setBusinessName(t.business_name);
        addLog(`✓ Found tenant: ${t.business_name} (${t.id})`);
      } else {
        addLog("⚠ No tenant found — enter a tenant ID manually below");
      }
    })();
  }, []);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !tenantId.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    addLog(`→ Sending: "${text.slice(0, 60)}…" to tenant ${tenantId}`);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          conversationId,
          message: text,
          channel: "website",
          customerName: "Test User",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addLog(`✗ Error ${res.status}: ${data.error}`);
        setSending(false);
        return;
      }

      addLog(`✓ AI replied in ${(data.processingMs ?? "?") + "ms"}`);

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        addLog(`✓ Conversation created: ${data.conversationId}`);
      }

      if (data.booked) {
        addLog(`🗓 Booking detected! Service: ${data.booking?.service ?? "unknown"}, DateTime: ${data.booking?.datetime ?? "unknown"}`);
      }

      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "(no reply)",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      addLog(`✗ Network error: ${err}`);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setConversationId(null);
    setMessages([]);
    addLog("↺ Reset — new conversation will be created on next send");
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">AI Reply Engine — Test Console</h1>
            <p className="text-sm text-[#6B7280] mt-1">Test the full loop: message → AI reply → booking detection → Supabase save</p>
          </div>
          <a href="/app/conversations"
            className="text-sm font-semibold px-4 py-2 rounded-xl border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
            View Conversations →
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left — chat + controls */}
          <div className="space-y-4">

            {/* Tenant selector */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Tenant ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="UUID of tenant to test"
                  className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] font-mono focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                />
                {userTenantId && (
                  <button onClick={() => setTenantId(userTenantId)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:text-[#FF6B35] hover:border-[#FF6B35] transition-all whitespace-nowrap">
                    Use mine
                  </button>
                )}
              </div>
              {businessName && tenantId === userTenantId && (
                <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {businessName}
                </p>
              )}
              {conversationId && (
                <p className="text-[11px] text-[#9CA3AF] font-mono mt-2 truncate">Conv: {conversationId}</p>
              )}
            </div>

            {/* Chat window */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                <p className="text-xs font-semibold text-[#111111]">Chat Simulation</p>
                <button onClick={reset} className="text-[10px] font-semibold text-[#9CA3AF] hover:text-[#FF6B35] transition-colors">Reset</button>
              </div>

              <div className="h-80 overflow-y-auto px-4 py-4 space-y-3 bg-[#F9FAFB]">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-xs text-[#9CA3AF]">No messages yet. Type below and hit Send.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-white border border-[#E5E7EB] text-[#111111] rounded-bl-sm"
                    }`}
                      style={msg.role === "user" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 border-t border-[#F3F4F6] bg-white flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Type a test message…"
                  disabled={sending || !tenantId.trim()}
                  className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors disabled:opacity-60"
                />
                <button onClick={send} disabled={sending || !tenantId.trim() || !input.trim()}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>

            {/* Quick test messages */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2.5">Quick tests</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Hi! What services do you offer?",
                  "How much does a consultation cost?",
                  "I want to book tomorrow at 10am",
                  "Do you have availability this Saturday?",
                  "كم سعر الجلسة؟",
                  "ابي احجز موعد",
                ].map((q) => (
                  <button key={q} onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — debug log + info */}
          <div className="space-y-4">

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "API Endpoint",   value: "POST /api/ai/reply",    color: "#FF6B35" },
                { label: "Model",          value: "gpt-4o-mini",           color: "#8B5CF6" },
                { label: "Booking detect", value: "gpt-4o-mini (JSON)",    color: "#059669" },
                { label: "DB writes",      value: "Service role (admin)",  color: "#0284C7" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-[#E5E7EB] px-3.5 py-3">
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">{item.label}</p>
                  <p className="text-xs font-semibold font-mono" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Debug log */}
            <div className="bg-[#0D1117] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <p className="text-xs font-mono text-white/40">Debug log</p>
                <button onClick={() => setLog([])}
                  className="text-[10px] text-white/25 hover:text-white/60 transition-colors">clear</button>
              </div>
              <div className="px-4 py-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
                {log.length === 0 && (
                  <p className="text-white/20">Waiting for first message…</p>
                )}
                {log.map((line, i) => (
                  <p key={i} className={`leading-relaxed ${
                    line.includes("✓") ? "text-green-400" :
                    line.includes("✗") ? "text-red-400" :
                    line.includes("🗓") ? "text-yellow-400" :
                    line.includes("⚠") ? "text-yellow-500" :
                    "text-white/50"
                  }`}>{line}</p>
                ))}
              </div>
            </div>

            {/* What to verify */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <p className="text-xs font-semibold text-[#111111] mb-3">✓ Checklist</p>
              <div className="space-y-2">
                {[
                  ["AI replies in the chat", "Send any message"],
                  ["Conversation appears in dashboard", 'Click "View Conversations"'],
                  ["Booking detection works", 'Try "I want to book tomorrow at 10am"'],
                  ["Arabic replies in Arabic", 'Try "كم سعر الجلسة؟"'],
                  ["Conversation continues across messages", "Send 3+ messages"],
                ].map(([check, hint]) => (
                  <div key={check} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded border border-[#E5E7EB] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-[#374151]">{check}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
