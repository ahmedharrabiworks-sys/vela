"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"] & {
  preview?: string;
  isNew?: boolean;
  needs_human?: boolean;
};
type Message = Database["public"]["Tables"]["messages"]["Row"];

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "instagram")
    return (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="10" height="10" rx="3" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9.2" cy="2.8" r="0.7" fill="currentColor" />
      </svg>
    );
  if (channel === "whatsapp")
    return (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M6 1a5 5 0 0 1 4.33 7.5L11 11l-2.62-.86A5 5 0 1 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 11h4M6 8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ── Loading skeleton ── */
function ConvSkeleton() {
  return (
    <div className="px-4 py-3.5 flex gap-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[#F3F4F6] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#F3F4F6] rounded-full w-2/3" />
        <div className="h-2.5 bg-[#F3F4F6] rounded-full w-4/5" />
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [tenantId, setTenantId]             = useState<string | null>(null);
  const [conversations, setConversations]   = useState<Conversation[]>([]);
  const [selected, setSelected]             = useState<Conversation | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [filter, setFilter]                 = useState("All");
  const [reply, setReply]                   = useState("");
  const [sending, setSending]               = useState(false);
  const [loading, setLoading]               = useState(true);
  const [msgLoading, setMsgLoading]         = useState(false);
  const [showThread, setShowThread]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const realtimeSub = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  /* ── Init: get tenant + conversations ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: tenant } = await db
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!tenant) {
        setError("No tenant found. Please complete your business setup first.");
        setLoading(false);
        return;
      }

      setTenantId(tenant.id);
      await fetchConversations(tenant.id);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch conversations list ── */
  const fetchConversations = useCallback(async (tId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { data, error: err } = await db
      .from("conversations")
      .select("*, needs_human")
      .eq("tenant_id", tId)
      .order("last_message_at", { ascending: false });

    if (err) {
      setError("Could not load conversations. Please run the Supabase migration first.");
      return;
    }

    // Load preview for each conversation (last message)
    const enriched = await Promise.all(
      (data ?? []).map(async (conv: Conversation) => {
        const { data: msgs } = await db
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const last = msgs?.[0] as { role: string; content: string } | undefined;
        return {
          ...conv,
          preview: last?.content?.slice(0, 60) ?? "",
          isNew: last?.role === "user",
        } as Conversation;
      })
    );

    setConversations(enriched);
  }, []);

  /* ── Fetch messages for a conversation ── */
  const fetchMessages = async (convId: string) => {
    setMsgLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabase() as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);
    setMsgLoading(false);
  };

  /* ── Select conversation + subscribe to realtime ── */
  const selectConv = async (conv: Conversation) => {
    setSelected(conv);
    setShowThread(true);
    await fetchMessages(conv.id);

    // Unsubscribe from previous channel
    if (realtimeSub.current) {
      await realtimeSub.current.unsubscribe();
    }

    const supabase = getSupabase();
    realtimeSub.current = supabase
      .channel(`messages-${conv.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();
  };

  /* ── Cleanup realtime on unmount ── */
  useEffect(() => {
    return () => { realtimeSub.current?.unsubscribe(); };
  }, []);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  /* ── Toggle AI ── */
  const toggleAI = async (enabled: boolean) => {
    if (!selected) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getSupabase() as any)
      .from("conversations")
      .update({ ai_enabled: enabled })
      .eq("id", selected.id);
    const updated = { ...selected, ai_enabled: enabled };
    setSelected(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, ai_enabled: enabled } : c))
    );
  };

  /* ── Send message ── */
  const handleSend = async () => {
    if (!reply.trim() || !selected || !tenantId || sending) return;
    const text = reply.trim();
    setReply("");
    setSending(true);

    if (selected.ai_enabled) {
      // Optimistic: show user message right away
      const tempUser: Message = {
        id: `tmp-u-${Date.now()}`,
        conversation_id: selected.id,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUser]);

      // Call AI engine — it saves both user + AI messages to Supabase
      try {
        const res = await fetch("/api/ai/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            conversationId: selected.id,
            message: text,
            channel: selected.channel,
            customerName: selected.customer_name,
          }),
        });
        const data = await res.json();

        // If realtime is not enabled yet, manually add AI reply
        if (data.reply) {
          setMessages((prev) => {
            // Remove temp user message (realtime may have already added the real one)
            const withoutTemp = prev.filter((m) => m.id !== tempUser.id);
            const hasReal = withoutTemp.some((m) => m.content === text && m.role === "user" && m.id !== tempUser.id);
            const baseList = hasReal ? withoutTemp : [...withoutTemp, { ...tempUser, id: `real-u-${Date.now()}` }];
            // Add AI reply if realtime hasn't already
            const hasAI = baseList.some((m) => m.content === data.reply && m.role === "assistant");
            if (hasAI) return baseList;
            return [
              ...baseList,
              { id: `ai-${Date.now()}`, conversation_id: selected.id, role: "assistant" as const, content: data.reply, created_at: new Date().toISOString() },
            ];
          });
        }
      } catch { /* realtime will sync if available */ }
    } else {
      // Manual mode: owner is replying as themselves (assistant role)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = getSupabase() as any;
      const { data: saved } = await db.from("messages").insert({
        conversation_id: selected.id,
        role: "assistant",
        content: text,
      }).select("*").single();

      if (saved) {
        const savedMsg = saved as Message;
        setMessages((prev) =>
          prev.some((m) => m.id === savedMsg.id) ? prev : [...prev, savedMsg]
        );
      }

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selected.id);
    }

    setSending(false);
    if (tenantId) fetchConversations(tenantId);
  };

  const filters = ["All", "instagram", "whatsapp", "website", "Unread"];

  const filtered = conversations.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Unread") return c.isNew;
    return c.channel === filter;
  });

  /* ── Error state ── */
  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke="#DC2626" strokeWidth="1.5"/></svg>
        </div>
        <p className="font-semibold text-[#111111] mb-2">Setup required</p>
        <p className="text-sm text-[#6B7280]">{error}</p>
        <a href="/app/settings" className="mt-4 inline-block text-sm text-[#FF6B35] font-semibold hover:underline">Go to Settings →</a>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-0 md:gap-5 max-w-7xl mx-auto pb-20">

      {/* ── Conversation list ── */}
      <div className={`flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden
        ${showThread ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>

        <div className="px-4 py-4 border-b border-[#F3F4F6]">
          <h2 className="font-bold text-[#111111] mb-3 text-sm">Conversations</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all capitalize ${
                  filter === f ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:text-[#111111]"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6]">
          {loading && [1, 2, 3].map((i) => <ConvSkeleton key={i} />)}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M16 2H2a1 1 0 0 0-1 1v12l3-3h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" stroke="#9CA3AF" strokeWidth="1.3" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-sm font-semibold text-[#374151]">No conversations yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Messages from your widget will appear here</p>
            </div>
          )}

          {filtered.map((conv) => {
            const isActive = selected?.id === conv.id;
            return (
              <button key={conv.id} onClick={() => selectConv(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all ${
                  isActive ? "bg-[#FFF8F5] border-l-2 border-[#FF6B35]" : "hover:bg-[#F9FAFB] border-l-2 border-transparent"
                }`}>
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm font-bold text-[#374151]">
                    {(conv.customer_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-[#6B7280]">
                    <ChannelIcon channel={conv.channel} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-[#111111] truncate">{conv.customer_name}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {conv.needs_human && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 whitespace-nowrap">Needs attention</span>
                      )}
                      {conv.isNew && !conv.needs_human && <span className="w-2 h-2 rounded-full bg-[#FF3366]" />}
                      <span className="text-[10px] text-[#9CA3AF]">{timeAgo(conv.last_message_at)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6B7280] truncate">{conv.preview || "No messages yet"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Thread ── */}
      <div className={`flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>

        {/* Thread header */}
        {selected ? (
          <>
            <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-[#F3F4F6]">
              <button onClick={() => setShowThread(false)}
                className="md:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm font-bold text-[#374151]">
                  {(selected.customer_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#E5E7EB] border-2 border-white flex items-center justify-center text-[#6B7280]">
                  <ChannelIcon channel={selected.channel} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#111111] text-sm leading-tight">{selected.customer_name}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5 capitalize">via {selected.channel}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs text-[#6B7280]">AI</span>
                  <button onClick={() => toggleAI(!selected.ai_enabled)}
                    className={`w-9 h-5 rounded-full transition-all duration-200 relative ${selected.ai_enabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${selected.ai_enabled ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                <button
                  onClick={() => toggleAI(false)}
                  className="hidden md:block text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  Takeover
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-[#F9FAFB]">
              {msgLoading && (
                <div className="flex justify-center py-8">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#D1D5DB] animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              {!msgLoading && messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-white text-[#111111] rounded-tl-sm border border-[#E5E7EB]"
                      : "text-white rounded-tr-sm"
                  }`}
                    style={msg.role !== "user" ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] mt-1.5 opacity-50">
                      {msg.role === "assistant" ? "Vela AI · " : ""}
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-end">
                  <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-white text-sm"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", opacity: 0.6 }}>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply box */}
            <div className="px-4 md:px-5 py-4 border-t border-[#F3F4F6] bg-white">
              {!selected.ai_enabled && (
                <p className="text-xs text-[#FF6B35] font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> Replying manually as your team
                </p>
              )}
              {selected.ai_enabled && (
                <p className="text-xs text-[#6B7280] font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" /> AI mode — typing here simulates a customer message for testing
                </p>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={selected.ai_enabled ? "Simulate a customer message…" : "Type your reply…"}
                  rows={2}
                  disabled={sending}
                  className="flex-1 text-sm resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors min-h-[52px] disabled:opacity-60"
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity min-h-[44px]"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-bold text-[#111111] mb-1">Select a conversation</p>
            <p className="text-sm text-[#6B7280]">Choose from the left to read messages and reply</p>
          </div>
        )}
      </div>
    </div>
  );
}
