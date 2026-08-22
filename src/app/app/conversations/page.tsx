"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import ChannelIcon, { channelIconBg } from "@/components/ui/ChannelIcon";
// FIX 5 (round P): shared toast used by every delete/recycle-bin action.
import Toast from "@/components/ui/Toast";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"] & {
  preview?: string;
  isNew?: boolean;
  needs_human?: boolean;
};
type Message = Database["public"]["Tables"]["messages"]["Row"] & { is_test?: boolean; is_owner_reply?: boolean };

// website = the auto-injected widget on a Vela-built site; website_embed = the
// same widget pasted onto an external site via the Channels embed code.
function channelLabel(channel: string): string {
  if (channel === "instagram") return "Instagram";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "website_embed") return "Website (embed)";
  return "Website";
}

function timeAgo(ts: string | null, t: (key: string) => string) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return t("dashboard.timeNow");
  if (diff < 3600) return `${Math.floor(diff / 60)}${t("dashboard.timeMinutes")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t("dashboard.timeHours")}`;
  return `${Math.floor(diff / 86400)}${t("dashboard.timeDays")}`;
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
  const { t } = useI18n();
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
  const [resolving, setResolving]           = useState<string | null>(null);
  const [replyError, setReplyError]         = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId]         = useState<string | null>(null);
  const [menuPos, setMenuPos]               = useState<{ top: number; left: number } | null>(null);
  const [renamingId, setRenamingId]         = useState<string | null>(null);
  const [renameValue, setRenameValue]       = useState("");
  const [deleteTarget, setDeleteTarget]     = useState<Conversation | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [toast, setToast]                   = useState("");
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
        setError(t("conversations.errorNoTenant"));
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
    // FIX 8: exclude soft-deleted conversations (Recycle Bin). Fallback: if
    // migration_v30.sql (adds conversations.deleted_at) hasn't run yet,
    // PostgREST rejects the whole query over one unknown column -- retry
    // without the filter rather than showing an empty inbox.
    let { data, error: err } = await db
      .from("conversations")
      .select("*, needs_human")
      .eq("tenant_id", tId)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false });
    if (err?.code === "PGRST204" || err?.code === "42703") {
      console.warn("[conversations] deleted_at column missing — run migration_v30.sql. Retrying without the filter.");
      ({ data, error: err } = await db
        .from("conversations")
        .select("*, needs_human")
        .eq("tenant_id", tId)
        .order("last_message_at", { ascending: false }));
    }

    if (err) {
      setError(t("conversations.errorLoadFailed"));
      return;
    }

    // Load preview for each conversation (last message)
    const enriched = await Promise.all(
      (data ?? []).map(async (conv: Conversation) => {
        const { data: msgs } = await db
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .eq("is_test", false)
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

  /* ── Resolve escalation ── */
  const handleResolve = async (convId: string) => {
    if (resolving) return;
    setResolving(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}/resolve`, { method: "PATCH" });
      if (!res.ok) throw new Error("resolve failed");
      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, needs_human: false } : c)
      );
      if (selected?.id === convId) setSelected((s) => s ? { ...s, needs_human: false } : s);
    } catch {
      // Silently fail — next refetch will sync
    } finally {
      setResolving(null);
    }
  };

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

  /* ── Rename ── */
  const handleStartRename = (conv: Conversation) => {
    setMenuOpenId(null);
    setMenuPos(null);
    setRenamingId(conv.id);
    setRenameValue(conv.customer_name ?? "");
  };

  const handleSaveRename = async (convId: string, name: string) => {
    const trimmed = name.trim();
    setRenamingId(null);
    if (!trimmed) return;
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, customer_name: trimmed } : c));
    if (selected?.id === convId) setSelected((s) => s ? { ...s, customer_name: trimmed } : s);
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok && tenantId) fetchConversations(tenantId); // resync if it failed server-side
    } catch {
      if (tenantId) fetchConversations(tenantId);
    }
  };

  /* ── Delete ── */
  const handleConfirmDelete = async () => {
    const conv = deleteTarget;
    if (!conv || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      if (selected?.id === conv.id) {
        setSelected(null);
        setMessages([]);
        setShowThread(false);
      }
      setDeleteTarget(null);
      setToast("Conversation moved to Recycle Bin");
    } catch {
      setReplyError("Failed to delete conversation. Please try again");
      setTimeout(() => setReplyError(null), 5000);
    } finally {
      setDeleting(false);
    }
  };

  /* ── Send message ── */
  const handleSend = async () => {
    if (!reply.trim() || !selected || !tenantId || sending) return;
    const text = reply.trim();
    setReply("");
    setSending(true);

    if (selected.ai_enabled) {
      // Test the AI — simulates a customer message. Marked is_test=true so it never
      // affects previews, usage counts, or real AI context history.
      const tempUser: Message = {
        id: `tmp-u-${Date.now()}`,
        conversation_id: selected.id,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
        is_test: true,
      };
      setMessages((prev) => [...prev, tempUser]);

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
            isTest: true,
          }),
        });
        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempUser.id);
            const hasReal = withoutTemp.some((m) => m.content === text && m.role === "user" && m.id !== tempUser.id);
            const baseList = hasReal ? withoutTemp : [...withoutTemp, { ...tempUser, id: `real-u-${Date.now()}` }];
            const hasAI = baseList.some((m) => m.content === data.reply && m.role === "assistant");
            if (hasAI) return baseList;
            return [
              ...baseList,
              { id: `ai-${Date.now()}`, conversation_id: selected.id, role: "assistant" as const, content: data.reply, created_at: new Date().toISOString(), is_test: true },
            ];
          });
        }
      } catch { /* realtime will sync if available */ }
    } else {
      // Takeover mode — send real message to the actual customer via their channel.
      // Optimistic: show message in thread immediately.
      const tempMsg: Message = {
        id: `tmp-t-${Date.now()}`,
        conversation_id: selected.id,
        role: "assistant",
        content: text,
        created_at: new Date().toISOString(),
        is_test: false,
        is_owner_reply: true,
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const res = await fetch(`/api/conversations/${selected.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json() as { ok?: boolean; error?: string; channelError?: string; channelNote?: string };

        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
          setReplyError(data.error || "Failed to send. Please try again");
          setTimeout(() => setReplyError(null), 5000);
        } else if (data.channelError) {
          setReplyError(data.channelError);
          setTimeout(() => setReplyError(null), 7000);
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setReplyError("Network error. Please try again");
        setTimeout(() => setReplyError(null), 5000);
      }
    }

    setSending(false);
    if (tenantId) fetchConversations(tenantId);
  };

  const filters = ["All", "instagram", "whatsapp", "website", "Unread"];
  const filterLabel = (f: string) =>
    f === "All" ? t("conversations.filterAll") : f === "Unread" ? t("conversations.filterUnread") : f;

  const filtered = conversations.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Unread") return c.isNew;
    if (filter === "website") return c.channel === "website" || c.channel === "website_embed";
    return c.channel === filter;
  });

  /* ── Error state ── */
  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke="#DC2626" strokeWidth="1.5"/></svg>
        </div>
        <p className="font-semibold text-[#111111] mb-2">{t("conversations.setupRequired")}</p>
        <p className="text-sm text-[#6B7280]">{error}</p>
        <a href="/app/settings" className="mt-4 inline-block text-sm text-[#FF6B35] font-semibold hover:underline">{t("conversations.goToSettings")}</a>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-0 md:gap-5 max-w-7xl mx-auto pb-20">

      {/* ── Conversation list ── */}
      <div className={`flex-col bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden
        ${showThread ? "hidden md:flex md:w-72" : "flex w-full md:w-72"}`}>

        <div className="px-4 py-4 border-b border-[#F3F4F6]">
          <h2 className="font-bold text-[#111111] mb-3 text-sm">{t("conversations.title")}</h2>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all capitalize ${
                  filter === f ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:text-[#111111]"
                }`}>
                {filterLabel(f)}
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
              <p className="text-sm font-semibold text-[#374151]">{t("conversations.noConversations")}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">{t("conversations.widgetHint")}</p>
            </div>
          )}

          {filtered.map((conv) => {
            const isActive = selected?.id === conv.id;
            const isRenaming = renamingId === conv.id;
            return (
              <div key={conv.id}
                className={`group relative w-full flex items-start gap-3 pl-4 pr-1 py-3.5 transition-all ${
                  isActive ? "bg-[#FFF8F5] border-l-2 border-[#FF6B35]" : "hover:bg-[#F9FAFB] border-l-2 border-transparent"
                }`}>
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-sm font-bold text-[#374151]">
                    {(conv.customer_name ?? "?")[0].toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${channelIconBg(conv.channel)}`}>
                    <ChannelIcon channel={conv.channel} size={9} />
                  </div>
                </div>

                {isRenaming ? (
                  <div className="flex-1 min-w-0 py-0.5">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(conv.id, renameValue);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => handleSaveRename(conv.id, renameValue)}
                      placeholder={t("conversations.renamePlaceholder")}
                      className="w-full text-xs font-semibold px-2 py-1 border border-[#FF6B35] rounded-lg outline-none text-[#111111]"
                    />
                  </div>
                ) : (
                  <button onClick={() => selectConv(conv)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-[#111111] truncate">{conv.customer_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {conv.needs_human && (
                          <>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 whitespace-nowrap">{t("conversations.needsAttention")}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleResolve(conv.id); }}
                              disabled={resolving === conv.id}
                              aria-label="Mark resolved"
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap min-h-[20px]">
                              {resolving === conv.id ? "…" : "Resolved"}
                            </button>
                          </>
                        )}
                        {conv.isNew && !conv.needs_human && <span className="w-2 h-2 rounded-full bg-[#FF3366]" />}
                        <span className="text-[10px] text-[#9CA3AF]">{timeAgo(conv.last_message_at, t)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#6B7280] truncate">{conv.preview || t("conversations.noMessages")}</p>
                  </button>
                )}

                {!isRenaming && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (menuOpenId === conv.id) {
                        setMenuOpenId(null); setMenuPos(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, left: rect.right - 112 });
                        setMenuOpenId(conv.id);
                      }
                    }}
                    aria-label="Conversation options"
                    className="shrink-0 w-6 h-6 mt-0.5 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-md hover:bg-[#E5E7EB] transition-all text-[#9CA3AF] hover:text-[#374151]">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                    </svg>
                  </button>
                )}
              </div>
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
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${channelIconBg(selected.channel)}`}>
                  <ChannelIcon channel={selected.channel} size={9} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {renamingId === selected.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(selected.id, renameValue);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => handleSaveRename(selected.id, renameValue)}
                    placeholder={t("conversations.renamePlaceholder")}
                    className="w-full text-sm font-bold px-2 py-1 -ml-2 border border-[#FF6B35] rounded-lg outline-none text-[#111111]"
                  />
                ) : (
                  <p className="font-bold text-[#111111] text-sm leading-tight">{selected.customer_name}</p>
                )}
                <p className="text-[10px] text-[#6B7280] mt-0.5">{t("conversations.via")} {channelLabel(selected.channel)}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs text-[#6B7280]">{t("conversations.aiLabel")}</span>
                  <button onClick={() => toggleAI(!selected.ai_enabled)}
                    className={`w-9 h-5 rounded-full transition-all duration-200 relative ${selected.ai_enabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${selected.ai_enabled ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                {selected.needs_human && (
                  <button
                    onClick={() => handleResolve(selected.id)}
                    disabled={resolving === selected.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-all whitespace-nowrap min-h-[36px]">
                    {resolving === selected.id ? "…" : "Mark Resolved"}
                  </button>
                )}
                <button
                  onClick={() => toggleAI(false)}
                  className="hidden md:block text-xs font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  {t("conversations.takeover")}
                </button>
                <button
                  onClick={(e) => {
                    if (menuOpenId === selected.id) {
                      setMenuOpenId(null); setMenuPos(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: rect.bottom + 4, left: rect.right - 112 });
                      setMenuOpenId(selected.id);
                    }
                  }}
                  aria-label="Conversation options"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="6" cy="2" r="1.2" /><circle cx="6" cy="6" r="1.2" /><circle cx="6" cy="10" r="1.2" />
                  </svg>
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

              {!msgLoading && messages.map((msg) => {
                const isTestMsg = msg.is_test === true;
                const isOwnerReply = msg.is_owner_reply === true;
                return (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? isTestMsg
                          ? "bg-[#FFF8F5] text-[#374151] rounded-tl-sm border border-[#FFD8C7]"
                          : "bg-white text-[#111111] rounded-tl-sm border border-[#E5E7EB]"
                        : isTestMsg
                          ? "bg-[#F3F4F6] text-[#374151] rounded-tr-sm border border-[#E5E7EB]"
                          : "text-white rounded-tr-sm"
                    }`}
                      style={msg.role !== "user" && !isTestMsg ? { background: "var(--vela-gradient)" } : {}}>
                      {isTestMsg && (
                        <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1.5 block">Test</span>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-[10px] mt-1.5 opacity-50">
                        {msg.role === "assistant" && !isTestMsg
                          ? (isOwnerReply ? t("conversations.ownerReplyPrefix") : t("conversations.velaAiPrefix"))
                          : ""}
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex justify-end">
                  <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-white text-sm"
                    style={{ background: "var(--vela-gradient)", opacity: 0.6 }}>
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
              {replyError && (
                <p className="text-xs text-red-500 font-medium mb-2 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  {replyError}
                </p>
              )}
              {!selected.ai_enabled && !replyError && (
                <p className="text-xs text-[#FF6B35] font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35]" /> {t("conversations.replyingManually")}
                </p>
              )}
              {selected.ai_enabled && (
                <p className="text-xs text-[#6B7280] font-medium mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" /> {t("conversations.aiModeHint")}
                </p>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={selected.ai_enabled ? t("conversations.simulatePlaceholder") : t("conversations.replyPlaceholder")}
                  rows={2}
                  disabled={sending}
                  className="flex-1 text-sm resize-none rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors min-h-[52px] disabled:opacity-60"
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity min-h-[44px]"
                  style={{ background: "var(--vela-gradient)" }}>
                  {t("conversations.send")}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--vela-gradient)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-bold text-[#111111] mb-1">{t("conversations.selectConversation")}</p>
            <p className="text-sm text-[#6B7280]">{t("conversations.selectHint")}</p>
          </div>
        )}
      </div>

      {/* Backdrop — clicking outside the ⋯ dropdown closes it */}
      {menuOpenId !== null && (
        <div className="fixed inset-0" style={{ zIndex: 199 }}
          onClick={() => { setMenuOpenId(null); setMenuPos(null); }} />
      )}

      {/* ⋯ conversation context menu — fixed position so it escapes list overflow:hidden */}
      {menuOpenId !== null && menuPos !== null && (() => {
        const mc = conversations.find((c) => c.id === menuOpenId);
        if (!mc) return null;
        return (
          <div
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 200 }}
            className="bg-white border border-[#E5E7EB] rounded-lg shadow-xl py-1 w-28">
            <button
              onClick={() => handleStartRename(mc)}
              className="w-full text-left px-3 py-1.5 text-[11px] text-[#374151] hover:bg-[#F9FAFB]">
              {t("conversations.renameConversation")}
            </button>
            <button
              onClick={() => { setMenuOpenId(null); setMenuPos(null); setDeleteTarget(mc); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50">
              {t("conversations.deleteConversation")}
            </button>
          </div>
        );
      })()}

      {/* Delete Conversation Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111111]">{t("conversations.deleteConfirmTitle")}</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">{t("conversations.deleteConfirmBody")}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors">
                {t("conversations.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? "…" : t("conversations.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
  );
}
