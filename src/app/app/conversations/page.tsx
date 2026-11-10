"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import ChannelIcon, { channelIconBg } from "@/components/ui/ChannelIcon";
// FIX 5 (round P): shared toast used by every delete/recycle-bin action.
import Toast from "@/components/ui/Toast";
import { VoicemailPlayer, fmtDuration, type CallRecord } from "@/components/dashboard/CallTranscript";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"] & {
  preview?: string;
  isNew?: boolean;
  needs_human?: boolean;
  last_read_at?: string | null;
};
type Message = Database["public"]["Tables"]["messages"]["Row"] & { is_test?: boolean; is_owner_reply?: boolean };

// website = the auto-injected widget on a Vela-built site; website_embed = the
// same widget pasted onto an external site via the Channels embed code.
function channelLabel(channel: string): string {
  if (channel === "phone") return "Phone";
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

const CHANNEL_TINT: Record<string, string> = {
  instagram: "bg-[#FDF0F6] text-[#B8327A]",
  whatsapp:  "bg-[#EAF9F0] text-[#12804A]",
  phone:     "bg-[#FFF1EA] text-[#D94E1B]",
};

function Avatar({ name, channel }: { name: string | null; channel: string }) {
  const isNumber = !name || /^[+\d]/.test(name);
  return (
    <div className="relative shrink-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${CHANNEL_TINT[channel] ?? "bg-[#F1F2FE] text-[#5457D6]"}`}>
        {isNumber ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>
        ) : name[0].toUpperCase()}
      </div>
      <div className={`absolute -bottom-0.5 -end-0.5 w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center ${channelIconBg(channel)}`}>
        <ChannelIcon channel={channel} size={9} />
      </div>
    </div>
  );
}

// A call has no read column on the server, so opened calls are remembered in this browser.
const READ_CALLS_KEY = "vela_read_calls";

function CallThread({ call, name, onBack, onDelete, t }: { call: CallRecord; name: string; onBack: () => void; onDelete: () => void; t: (k: string) => string }) {
  const lines = (call.transcript ?? []).filter((l) => l.text?.trim());
  return (
    <>
      <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-[#F3F4F6]">
        <button onClick={onBack} aria-label={t("agentUi.conv.back")} className="md:hidden p-2 -ms-1 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] min-h-[44px] min-w-[44px] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100"><path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <Avatar name={call.caller_number ?? null} channel="phone" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#111111] text-sm leading-tight text-start"><span dir="ltr">{name}</span></p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{t("agentUi.conv.phoneCall")} · {fmtDuration(call.duration_seconds)} · {new Date(call.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button type="button" data-testid="call-delete" onClick={onDelete} aria-label={t("conversations.deleteConversation")} title={t("conversations.deleteConversation")} className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 3h10M5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M10.5 3l-.75 7a.9.9 0 01-.9.8H4.15a.9.9 0 01-.9-.8L2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-5 space-y-3 bg-[#FAFAFA]">
        {call.summary && (
          <div className="rounded-xl border border-[#EEF0F3] bg-white p-4">
            <p className="text-[11px] font-medium text-[#9CA3AF] mb-1.5">{t("agentUi.conv.aiSummary")}</p>
            <p dir="auto" className="text-sm text-[#374151] leading-relaxed text-start">{call.summary}</p>
          </div>
        )}
        {call.has_recording && (
          <div className="rounded-xl border border-[#EEF0F3] bg-white p-4"><VoicemailPlayer callId={call.id} isDark={false} /></div>
        )}
        {lines.map((l, i) => (
          <div key={i} className={`flex ${l.role === "user" ? "justify-start" : "justify-end"}`}>
            <div dir="auto" className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${l.role === "user" ? "bg-white text-[#111111] rounded-ss-sm border border-[#EEF0F3]" : "text-white rounded-se-sm"}`}
              style={l.role === "user" ? undefined : { background: "var(--vela-gradient)" }}>
              {l.text}
            </div>
          </div>
        ))}
        {lines.length === 0 && !call.summary && !call.has_recording && (
          <p className="text-center text-sm text-[#9CA3AF] py-10">{t("agentUi.conv.noTranscript")}</p>
        )}
      </div>
    </>
  );
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
  // Round M2 FIX 7: real root cause of "Rename does nothing" -- when the
  // conversation being renamed is ALSO the currently-selected one, it's
  // shown in BOTH the list row AND the detail-panel header at once. Both
  // surfaces shared the same `renamingId` check, so both their rename
  // &lt;input&gt;s mounted simultaneously, both with autoFocus -- the second to
  // mount stole focus from the first, firing that first input's onBlur
  // (which calls handleSaveRename, immediately closing edit mode again)
  // before the user ever got a keystroke in. Renaming the CURRENTLY-
  // SELECTED conversation always hits this, since the detail panel only
  // exists for it. Tracks which surface's "..." menu is open so only ONE
  // input ever renders/autofocuses for a given rename.
  const [menuSource, setMenuSource]         = useState<"list" | "detail" | null>(null);
  const [deleteItems, setDeleteItems]       = useState<Array<{ kind: "chat" | "call"; id: string }> | null>(null);
  const [selectMode, setSelectMode]         = useState(false);
  const [picked, setPicked]                 = useState<Set<string>>(new Set());
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [deleting, setDeleting]             = useState(false);
  const [toast, setToast]                   = useState("");
  const [calls, setCalls]                   = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall]     = useState<CallRecord | null>(null);
  const [readCalls, setReadCalls]           = useState<Set<string>>(new Set());
  const bottomRef   = useRef<HTMLDivElement>(null);
  const openedFromLink = useRef(false);
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
      try { setReadCalls(new Set(JSON.parse(localStorage.getItem(READ_CALLS_KEY) || "[]") as string[])); } catch { /* start empty */ }
      await Promise.all([
        fetchConversations(tenant.id),
        fetch("/api/ai-agent/calls").then((r) => (r.ok ? r.json() : { calls: [] }))
          .then((d: { calls?: CallRecord[] }) => setCalls((d.calls ?? []).filter((c) => c.call_type === "live")))
          .catch(() => { /* phone calls simply don't appear */ }),
      ]);
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
      console.warn("[conversations] deleted_at column missing, run migration_v30.sql. Retrying without the filter.");
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
        // Round M8 FIX 4: was `last?.role === "user"` -- that's really "is
        // the AI/owner still owing a reply," not "has the owner actually
        // seen this," so a conversation the owner had already opened and
        // read (but where the customer's message still happens to be the
        // most recent one, e.g. AI is paused or the thread needs_human)
        // stayed marked unread forever with no way to clear it. Now a real
        // read/unread signal: unread whenever the conversation has ever had
        // a message and either was never opened (last_read_at null) or has
        // new activity since it was last opened.
        const lastReadAt = (conv as Conversation).last_read_at;
        const isNew = !!last && (!lastReadAt || (conv.last_message_at != null && new Date(conv.last_message_at).getTime() > new Date(lastReadAt).getTime()));
        return {
          ...conv,
          preview: last?.content?.slice(0, 60) ?? "",
          isNew,
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

  // Deep link from an appointment: ?open=call:<id> or ?open=conv:<id>.
  useEffect(() => {
    if (loading || openedFromLink.current) return;
    const params = new URLSearchParams(window.location.search);
    // ?open=call:<id> / ?open=conv:<id>, or plain ?id=<id> (either kind).
    const open = params.get("open") ?? (params.get("id") ? `any:${params.get("id")}` : null);
    if (!open) return;
    openedFromLink.current = true;
    const [kind, id] = open.split(":");
    const call = kind !== "conv" ? calls.find((c) => c.id === id) : undefined;
    const conv = kind !== "call" && !call ? conversations.find((c) => c.id === id) : undefined;
    if (call || conv) {
      setFilter("All");
      if (call) selectCall(call); else if (conv) selectConv(conv);
      // Bring the row into view in the list (it may be far down).
      setTimeout(() => document.querySelector(`[data-item-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" }), 60);
    }
    window.history.replaceState({}, "", "/app/conversations");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, calls, conversations]);

  /* ── Select conversation + subscribe to realtime ── */
  const selectCall = async (call: CallRecord) => {
    setSelected(null);
    setMessages([]);
    setSelectedCall(call);
    setShowThread(true);
    setReadCalls((prev) => {
      const next = new Set(prev).add(call.id);
      try { localStorage.setItem(READ_CALLS_KEY, JSON.stringify(Array.from(next).slice(-500))); } catch { /* private mode */ }
      return next;
    });
    if (realtimeSub.current) { await realtimeSub.current.unsubscribe(); realtimeSub.current = null; }
  };

  const selectConv = async (conv: Conversation) => {
    setSelectedCall(null);
    setSelected(conv);
    setShowThread(true);
    await fetchMessages(conv.id);

    // Round M8 FIX 4: mark read the moment the owner actually opens it.
    // Optimistic local clear first (instant badge/dot update), server call
    // fire-and-forget -- a failure here just means the badge doesn't clear
    // until the next real fetch, never a broken conversation view.
    const readAt = new Date().toISOString();
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, isNew: false, last_read_at: readAt } : c)));
    if (selected?.id !== conv.id) {
      fetch(`/api/conversations/${conv.id}/read`, { method: "PATCH" }).catch(() => { /* next real fetch reconciles */ });
    }

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
      // Silently fail, next refetch will sync
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
    const items = deleteItems;
    if (!items || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/conversations/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("delete failed");
      const chats = new Set(items.filter((i) => i.kind === "chat").map((i) => i.id));
      const gone = new Set(items.filter((i) => i.kind === "call").map((i) => i.id));
      setConversations((prev) => prev.filter((c) => !chats.has(c.id)));
      setCalls((prev) => prev.filter((c) => !gone.has(c.id)));
      if (selected && chats.has(selected.id)) { setSelected(null); setMessages([]); setShowThread(false); }
      if (selectedCall && gone.has(selectedCall.id)) { setSelectedCall(null); setShowThread(false); }
      setDeleteItems(null);
      setSelectMode(false);
      setPicked(new Set());
      setToast(t("conversations.deletedToast"));
    } catch {
      setDeleteItems(null);
      setToast(t("conversations.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const keyOf = (kind: "chat" | "call", id: string) => `${kind}:${id}`;
  const togglePick = (key: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const startPress = (key: string) => {
    longPressed.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setSelectMode(true);
      togglePick(key);
    }, 500);
  };
  const endPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const pickedItems = (): Array<{ kind: "chat" | "call"; id: string }> => Array.from(picked).map((k) => {
    const [kind, id] = k.split(":");
    return { kind: kind as "chat" | "call", id };
  });

  /* ── Send message ── */
  const handleSend = async () => {
    if (!reply.trim() || !selected || !tenantId || sending) return;
    const text = reply.trim();
    setReply("");
    setSending(true);

    if (selected.ai_enabled) {
      // Test the AI, simulates a customer message. Marked is_test=true so it never
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
      // Takeover mode, send real message to the actual customer via their channel.
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

  const filters = ["All", "instagram", "whatsapp", "phone", "Unread"];
  const filterLabel = (f: string) =>
    f === "All" ? t("conversations.filterAll")
    : f === "Unread" ? t("conversations.filterUnread")
    : f === "phone" ? t("agentUi.conv.phone")
    : channelLabel(f);

  const callName = (c: CallRecord) => c.caller_number || t("agentUi.conv.hiddenNumber");
  type Item = { kind: "chat"; id: string; time: number; conv: Conversation; unread: boolean } | { kind: "call"; id: string; time: number; call: CallRecord; unread: boolean };
  const items: Item[] = [
    ...conversations.map((conv): Item => ({ kind: "chat", id: conv.id, time: new Date(conv.last_message_at ?? 0).getTime(), conv, unread: !!conv.isNew })),
    ...calls.map((call): Item => ({ kind: "call", id: call.id, time: new Date(call.created_at).getTime(), call, unread: !readCalls.has(call.id) })),
  ].sort((a, b) => b.time - a.time);
  const unreadCount = items.filter((i) => i.unread).length;
  const filtered = items.filter((i) => {
    if (filter === "All") return true;
    if (filter === "Unread") return i.unread;
    if (i.kind === "call") return filter === "phone";
    return i.conv.channel === filter;
  });
  const emptyTitle = filter === "Unread" ? t("agentUi.conv.emptyUnread") : t("agentUi.conv.emptyTitle");
  const emptyHint = filter === "Unread" ? t("agentUi.conv.emptyUnreadHint") : t("agentUi.conv.emptyHint");

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
      <div className={`flex-col bg-white rounded-2xl border border-[#EEF0F3] overflow-hidden
        ${showThread ? "hidden md:flex md:w-[23rem] md:shrink-0" : "flex w-full md:w-[23rem] md:shrink-0"}`}>

        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-3 min-h-[32px]">
            <h2 className="font-semibold text-[#111111] text-base">{t("conversations.title")}</h2>
            {items.length > 0 && (
              <button type="button" data-testid="select-toggle" onClick={() => { setSelectMode((v) => !v); setPicked(new Set()); }} className="text-xs font-semibold text-[#6B7280] hover:text-[#111111] min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-0 px-1.5">
                {selectMode ? t("conversations.cancel") : t("conversations.select")}
              </button>
            )}
          </div>
          {selectMode && (
            <div data-testid="bulk-bar" className="flex items-center justify-between gap-2 mb-3 rounded-lg bg-[#FAFAFA] px-2.5 py-1.5">
              <button type="button" onClick={() => setPicked(new Set(filtered.map((i) => keyOf(i.kind, i.id))))} className="text-xs font-semibold text-[#C2410C] min-h-[32px]">{t("conversations.selectAll")}</button>
              <button type="button" data-testid="bulk-delete" disabled={picked.size === 0} onClick={() => setDeleteItems(pickedItems())} className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg px-3 h-8 transition-colors">
                {t("conversations.deleteSelected").replace("{n}", String(picked.size))}
              </button>
            </div>
          )}
          <div className="flex flex-wrap md:flex-nowrap gap-1.5">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`shrink-0 inline-flex items-center justify-center gap-1 text-xs px-3 min-w-[44px] h-11 sm:h-8 sm:min-w-0 sm:px-2.5 rounded-full transition-colors ${
                  filter === f ? "bg-[#111111] text-white font-medium" : "bg-[#F5F5F6] text-[#6B7280] hover:text-[#111111]"
                }`}>
                {filterLabel(f)}
                {f === "Unread" && unreadCount > 0 && (
                  <span className={`text-[10px] font-semibold tabular-nums ${filter === f ? "text-white/70" : "text-[#FF6B35]"}`}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading && [1, 2, 3].map((i) => <ConvSkeleton key={i} />)}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true" className="mb-4">
                <path d="M38 22c0 7.7-7.2 14-16 14-2 0-4-.3-5.8-.9L8 38l2.3-6.6C7.6 29 6 25.700 6 22 6 14.300 13.200 8 22 8s16 6.300 16 14z" stroke="#E5E7EB" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="16" cy="22" r="1.500" fill="#FF6B35"/><circle cx="22" cy="22" r="1.500" fill="#FF6B35" opacity=".6"/><circle cx="28" cy="22" r="1.500" fill="#FF6B35" opacity=".3"/>
              </svg>
              <p className="text-sm font-medium text-[#374151]">{emptyTitle}</p>
              <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{emptyHint}</p>
            </div>
          )}

          {filtered.map((item) => {
            const isActive = item.kind === "chat" ? selected?.id === item.id : selectedCall?.id === item.id;
            const conv = item.kind === "chat" ? item.conv : null;
            const isRenaming = !!conv && renamingId === conv.id && menuSource === "list";
            const name = conv ? (conv.customer_name ?? "") : callName(item.kind === "call" ? item.call : ({} as CallRecord));
            const preview = conv ? (conv.preview || t("conversations.noMessages")) : ((item.kind === "call" && item.call.summary) || t("agentUi.conv.phoneCall"));
            const when = conv ? conv.last_message_at : (item.kind === "call" ? item.call.created_at : null);
            return (
              <div key={item.id}
                data-item-id={item.id}
                data-testid="inbox-row"
                onTouchStart={() => startPress(keyOf(item.kind, item.id))}
                onTouchEnd={endPress}
                onTouchMove={endPress}
                onContextMenu={(e) => { if (longPressed.current) e.preventDefault(); }}
                className={`group relative flex items-center gap-3 ps-2.5 pe-1 py-2.5 rounded-xl transition-colors select-none md:select-auto ${isActive ? "bg-[#FFF5F0]" : "hover:bg-[#FAFAFA]"}`}>
                {selectMode && (
                  <input type="checkbox" data-testid="row-check" aria-label={name} checked={picked.has(keyOf(item.kind, item.id))} onChange={() => togglePick(keyOf(item.kind, item.id))} className="w-4 h-4 shrink-0 accent-[#FF6B35]" />
                )}
                <Avatar name={conv ? conv.customer_name : (item.kind === "call" ? item.call.caller_number ?? null : null)} channel={conv ? conv.channel : "phone"} />

                {isRenaming && conv ? (
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
                  <button onClick={() => {
                    if (longPressed.current) { longPressed.current = false; return; }
                    if (selectMode) { togglePick(keyOf(item.kind, item.id)); return; }
                    if (item.kind === "chat") selectConv(item.conv); else selectCall(item.call);
                  }} className="flex-1 min-w-0 text-start">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span dir={conv ? "auto" : "ltr"} className={`text-[13px] truncate ${item.unread ? "font-semibold text-[#111111]" : "font-medium text-[#374151]"}`}>{name}</span>
                      <span className={`text-[11px] shrink-0 tabular-nums ${item.unread ? "text-[#FF6B35] font-medium" : "text-[#9CA3AF]"}`}>{timeAgo(when, t)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p dir="auto" className={`text-xs truncate text-start flex-1 ${item.unread ? "text-[#374151]" : "text-[#9CA3AF]"}`}>{preview}</p>
                      {conv?.needs_human ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 whitespace-nowrap shrink-0">{t("conversations.needsAttention")}</span>
                      ) : item.unread ? (
                        <span className="w-2 h-2 rounded-full bg-[#FF6B35] shrink-0" aria-label={t("conversations.filterUnread")} />
                      ) : null}
                    </div>
                  </button>
                )}

                {!isRenaming && !selectMode && (
                  <button
                    data-testid="row-menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (menuOpenId === item.id) {
                        setMenuOpenId(null); setMenuPos(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 112) });
                        setMenuOpenId(item.id);
                        setMenuSource("list");
                      }
                    }}
                    aria-label="Conversation options"
                    className="shrink-0 w-11 h-11 sm:w-7 sm:h-7 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 rounded-md hover:bg-[#E5E7EB] transition-opacity text-[#9CA3AF] hover:text-[#374151]">
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
      <div className={`flex-col min-w-0 bg-white rounded-2xl border border-[#EEF0F3] overflow-hidden
        ${showThread ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>

        {/* Thread header */}
        {selected ? (
          <>
            <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-[#F3F4F6]">
              <button onClick={() => setShowThread(false)}
                className="md:hidden p-2 -ms-1 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
                  <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <Avatar name={selected.customer_name} channel={selected.channel} />

              <div className="flex-1 min-w-0">
                {renamingId === selected.id && menuSource === "detail" ? (
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
                      setMenuSource("detail");
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
            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-5 space-y-3 bg-[#FAFAFA]">
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
                          ? "bg-[#FFF8F5] text-[#374151] rounded-ss-sm border border-[#FFD8C7]"
                          : "bg-white text-[#111111] rounded-ss-sm border border-[#EEF0F3]"
                        : isTestMsg
                          ? "bg-[#F3F4F6] text-[#374151] rounded-se-sm border border-[#E5E7EB]"
                          : "text-white rounded-se-sm"
                    }`}
                      style={msg.role !== "user" && !isTestMsg ? { background: "var(--vela-gradient)" } : {}}>
                      {isTestMsg && (
                        <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1.5 block">Test</span>
                      )}
                      <p dir="auto" className="text-start">{msg.content}</p>
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
                  <div className="px-4 py-3 rounded-2xl rounded-se-sm text-white text-sm"
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
        ) : selectedCall ? (
          <CallThread call={selectedCall} name={callName(selectedCall)} onBack={() => setShowThread(false)} onDelete={() => setDeleteItems([{ kind: "call", id: selectedCall.id }])} t={t} />
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <svg width="52" height="52" viewBox="0 0 44 44" fill="none" aria-hidden="true" className="mb-4">
              <path d="M38 22c0 7.700-7.200 14-16 14-2 0-4-.3-5.800-.9L8 38l2.300-6.600C7.600 29 6 25.700 6 22 6 14.300 13.200 8 22 8s16 6.300 16 14z" stroke="#E5E7EB" strokeWidth="1.500" strokeLinejoin="round"/>
            </svg>
            <p className="font-semibold text-[#111111] mb-1">{t("conversations.selectConversation")}</p>
            <p className="text-sm text-[#6B7280]">{t("conversations.selectHint")}</p>
          </div>
        )}
      </div>

      {/* Backdrop, clicking outside the ⋯ dropdown closes it */}
      {menuOpenId !== null && (
        <div className="fixed inset-0" style={{ zIndex: 199 }}
          onClick={() => { setMenuOpenId(null); setMenuPos(null); }} />
      )}

      {/* ⋯ conversation context menu, fixed position so it escapes list overflow:hidden */}
      {menuOpenId !== null && menuPos !== null && (() => {
        const mc = conversations.find((c) => c.id === menuOpenId);
        if (!mc && !calls.some((c) => c.id === menuOpenId)) return null;
        return (
          <div
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 200 }}
            className="bg-white border border-[#E5E7EB] rounded-lg shadow-xl py-1 w-28">
            {mc && (
              <button
                onClick={() => handleStartRename(mc)}
                className="w-full text-start px-3 py-1.5 text-[11px] text-[#374151] hover:bg-[#F9FAFB]">
                {t("conversations.renameConversation")}
              </button>
            )}
            <button
              data-testid="menu-delete"
              onClick={() => { const id = menuOpenId as string; setMenuOpenId(null); setMenuPos(null); setDeleteItems([{ kind: mc ? "chat" : "call", id }]); }}
              className="w-full text-start px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50">
              {t("conversations.deleteConversation")}
            </button>
          </div>
        );
      })()}

      {/* Delete Conversation Confirmation Modal -- Round M2 FIX 8: now
          byte-for-byte matched to the reference clean pattern (settings.tsx
          Recycle Bin "Delete Permanently" modal): dark-mode classes added
          (this modal previously had none, unlike the reference), and the
          button ratio changed from equal flex-1/flex-1 -- which wrapped
          "Delete conversation" onto two lines at max-w-sm width -- to the
          asymmetric flex-1/flex-[2] + whitespace-nowrap the reference uses. */}
      {deleteItems && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111111] ">{deleteItems.length > 1 ? t("conversations.deleteManyTitle").replace("{n}", String(deleteItems.length)) : t("conversations.deleteConfirmTitle")}</h2>
            <p className="text-sm text-[#6B7280] leading-relaxed">{t("conversations.deleteConfirmBody")}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setDeleteItems(null)}
                disabled={deleting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors">
                {t("conversations.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-[2] text-sm font-semibold px-4 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap">
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
