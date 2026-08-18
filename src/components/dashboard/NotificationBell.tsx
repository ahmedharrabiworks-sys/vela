"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { fmtTimeAgo } from "@/components/dashboard/CallTranscript";

interface NotificationRow {
  id: string;
  type: "lead" | "appointment" | "missed_call";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

function TypeIcon({ type }: { type: NotificationRow["type"] }) {
  if (type === "lead") {
    return (
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
        <path d="M10 13.75v-1.25a2.5 2.5 0 00-2.5-2.5H3.75A2.5 2.5 0 001.25 12.5v1.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="5.625" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M13.75 13.75v-1.25a2.5 2.5 0 00-1.875-2.413M10 2.587a2.5 2.5 0 010 4.838" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    );
  }
  if (type === "appointment") {
    return (
      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
        <rect x="1.25" y="2.5" width="12.5" height="11.25" rx="1.25" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M10 1.25v2.5M5 1.25v2.5M1.25 6.25h12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <path d="M2.5 3.5c.5 1.8 2.2 3.5 4 4l1-1c.2-.2.4-.2.6-.1.5.2 1.1.3 1.7.3.3 0 .5.2.5.5v1.6c0 .3-.2.5-.5.5C4.5 9.3 2.7 5.5 2.7 3c0-.3.2-.5.5-.5H4.8c.3 0 .5.2.5.5 0 .6.1 1.2.3 1.7.1.2.1.4-.1.6l-1 1z" fill="currentColor"/>
      <path d="M11 3l2.5 2.5M13.5 3L11 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

const TYPE_STYLE: Record<NotificationRow["type"], { bg: string; color: string }> = {
  lead:         { bg: "#FFF5F0", color: "#FF6B35" },
  appointment:  { bg: "#F0FDF4", color: "#22C55E" },
  missed_call:  { bg: "#FEF2F2", color: "#EF4444" },
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const realtimeSub = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: NotificationRow[]; unreadCount: number };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch { /* keep last known state */ }
    setLoading(false);
  }, []);

  // Initial load + resolve tenant for the realtime filter
  useEffect(() => {
    (async () => {
      await fetchNotifications();
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenant } = await (supabase as any)
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (tenant) setTenantId(tenant.id as string);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription -- same postgres_changes pattern used by Conversations
  useEffect(() => {
    if (!tenantId) return;
    const supabase = getSupabase();
    realtimeSub.current = supabase
      .channel(`notifications-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 20)));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();
    return () => { realtimeSub.current?.unsubscribe(); };
  }, [tenantId]);

  // Poll fallback in case realtime is unavailable -- reasonable interval, not aggressive
  useEffect(() => {
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch { /* optimistic update stands; next poll reconciles */ }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch { /* optimistic update stands; next poll reconciles */ }
  };

  const handleClick = (n: NotificationRow) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1.5A5.25 5.25 0 003.75 6.75c0 3.375-1.5 4.5-1.5 4.5h13.5s-1.5-1.125-1.5-4.5A5.25 5.25 0 009 1.5zM10.299 15a1.5 1.5 0 01-2.598 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#FF3366] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // FIX (RTL): `right-0` is a physical offset -- under Arabic (dir="rtl")
        // the header's flex row visually mirrors (this button ends up on the
        // LEFT of the header), so a panel still pinned to "right:0" of its own
        // narrow anchor extended 320px further left off the edge of an
        // already-near-left-edge button, clipping off-screen. `end-0` is
        // Tailwind's logical-property utility (inset-inline-end) -- it
        // resolves to `right` under LTR and `left` under RTL automatically,
        // following the inherited `dir` attribute on <html>, so the panel
        // always opens toward the same side the button visually sits on in
        // both directions.
        <div className="absolute z-[100] top-[calc(100%+8px)] end-0 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#E5E7EB] shadow-card-hover bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <p className="text-sm font-semibold text-[#111111]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-[#FF6B35] hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="py-10 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-sm text-[#9CA3AF]">No notifications yet</p>
                <p className="text-xs text-[#D1D5DB] mt-1">New leads, appointments and missed calls will show up here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_STYLE[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[#F9FAFB] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${n.read ? "text-[#6B7280]" : "text-[#111111] font-semibold"} truncate`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] shrink-0" />}
                      </div>
                      {n.body && (
                        <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-[#D1D5DB] mt-1">{fmtTimeAgo(n.created_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
