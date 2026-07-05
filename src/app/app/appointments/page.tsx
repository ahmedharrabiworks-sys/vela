"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { usePlan } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

type SortKey = "name" | "phone" | "service" | "date" | "channel" | "status";
type SortDir = "asc" | "desc";
type FilterKey = "all" | "today" | "week" | "upcoming" | "past";

interface Appointment {
  id: string;
  name: string;
  phone: string;
  service: string;
  dateLabel: string;
  sortDate: number;
  time: string;
  rawDatetime: string;
  status: string;
  channel: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  label: "Confirmed" },
  pending:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400", label: "Pending"   },
  cancelled: { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400",    label: "Cancelled" },
};

const FILTER_KEYS: FilterKey[] = ["all", "today", "week", "upcoming", "past"];

const SORT_COL_KEYS: { key: SortKey; label: string; width: string }[] = [
  { key: "name",    label: "Name",       width: "min-w-[170px]" },
  { key: "phone",   label: "Phone",      width: "min-w-[140px]" },
  { key: "service", label: "Service",    width: "min-w-[150px]" },
  { key: "date",    label: "Date & Time",width: "min-w-[150px]" },
  { key: "channel", label: "Channel",    width: "min-w-[110px]" },
  { key: "status",  label: "Status",     width: "min-w-[110px]" },
];

function formatDateLabel(dt: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function calcSortDate(dt: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function MessageModal({ apt, onSend, onClose }: { apt: Appointment; onSend: (msg: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ta.current?.focus(); }, []);
  const SUGGESTIONS = [
    `Hi ${apt.name.split(" ")[0]}, your ${apt.service} is confirmed for ${apt.dateLabel} at ${apt.time}.`,
    `Hi ${apt.name.split(" ")[0]}, reminder about your appointment tomorrow at ${apt.time}. See you soon!`,
    `Hi ${apt.name.split(" ")[0]}, please arrive 5 minutes early for your ${apt.service}.`,
  ];
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#111111]">Message {apt.name}</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">via {apt.channel} · {apt.phone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="space-y-2 mb-3">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setText(s)}
              className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35]/40 hover:bg-[#FFF5F0] transition-all line-clamp-2">
              {s}
            </button>
          ))}
        </div>
        <textarea ref={ta} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Or write a custom message…" rows={4}
          className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 resize-none mb-4" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB]">Cancel</button>
          <button onClick={() => { if (text.trim()) onSend(text.trim()); }} disabled={!text.trim()}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: "#FF6B35" }}>
            Send Message
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RescheduleModal({ apt, onReschedule, onClose }: { apt: Appointment; onReschedule: (date: string, time: string) => void; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Reschedule Appointment</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">{apt.name} · {apt.service}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 mb-5 text-sm">
          <p className="text-[11px] text-[#9CA3AF] mb-0.5">Current appointment</p>
          <p className="font-semibold text-[#111111]">{apt.dateLabel} · {apt.time}</p>
        </div>
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">New Date</label>
            <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35]/50" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">New Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35]/50" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB]">Cancel</button>
          <button onClick={() => { if (date && time) onReschedule(date, time); }} disabled={!date || !time}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
            style={{ background: "#FF6B35" }}>
            Confirm Reschedule
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CancelModal({ apt, onConfirm, onClose }: { apt: Appointment; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 7v4M9 13h.01M3 15h12a1.5 1.5 0 001.3-2.25L10.3 3.75a1.5 1.5 0 00-2.6 0L1.7 12.75A1.5 1.5 0 003 15z" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 className="font-bold text-[#111111] mb-2">Cancel appointment?</h3>
        <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
          <span className="font-semibold text-[#111111]">{apt.name}&apos;s</span> {apt.service} on{" "}
          <span className="font-semibold text-[#111111]">{apt.dateLabel} at {apt.time}</span> will be cancelled.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#374151] border border-[#E5E7EB]">Keep it</button>
          <button onClick={onConfirm} className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 bg-red-500">
            Yes, Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-colors ${active ? "text-[#FF6B35]" : "text-[#ddd]"}`}>
      <path d={dir === "asc" ? "M6 9V3M3 6l3-3 3 3" : "M6 3v6M3 6l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AppointmentsPage() {
  const [tenantId, setTenantId]       = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<FilterKey>("all");
  const [sortKey, setSortKey]         = useState<SortKey>("date");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");
  const [modal, setModal]             = useState<{ type: "message" | "reschedule" | "cancel"; id: string } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [msgSentId, setMsgSentId]     = useState<string | null>(null);
  const { isStarter, config }         = usePlan();
  const { t }                         = useI18n();

  const loadData = useCallback(async (tId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { data } = await db
      .from("appointments")
      .select("id, service_name, datetime, status, leads(name, phone, channel)")
      .eq("tenant_id", tId)
      .order("datetime", { ascending: true });

    type Raw = { id: string; service_name: string | null; datetime: string; status: string; leads?: { name: string | null; phone: string | null; channel: string | null } | null };
    const rows: Appointment[] = ((data ?? []) as Raw[]).map((a) => {
      const dt = new Date(a.datetime);
      return {
        id: a.id,
        name: a.leads?.name ?? "Unknown",
        phone: a.leads?.phone ?? "",
        service: a.service_name ?? "Appointment",
        dateLabel: formatDateLabel(dt),
        sortDate: calcSortDate(dt),
        time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        rawDatetime: a.datetime,
        status: a.status,
        channel: a.leads?.channel ?? "website",
      };
    });
    setAppointments(rows);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = getSupabase() as any;
      const { data: { user } } = await db.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: tenant } = await db.from("tenants").select("id").eq("owner_id", user.id).single();
      if (!tenant) { setLoading(false); return; }
      setTenantId(tenant.id);
      await loadData(tenant.id);
      setLoading(false);
    })();
  }, [loadData]);

  const flashRow = (id: string) => {
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1400);
  };

  const handleSendMessage = () => {
    if (!modal) return;
    const id = modal.id;
    setModal(null);
    setMsgSentId(id);
    flashRow(id);
    setTimeout(() => setMsgSentId(null), 2500);
  };

  const handleReschedule = async (date: string, time: string) => {
    if (!modal || !tenantId) return;
    const id = modal.id;
    setModal(null);
    const newDatetime = new Date(`${date}T${time}`).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getSupabase() as any).from("appointments").update({ datetime: newDatetime }).eq("id", id);
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const dt = new Date(newDatetime);
        return { ...a, dateLabel: formatDateLabel(dt), sortDate: calcSortDate(dt), time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), rawDatetime: newDatetime };
      })
    );
    flashRow(id);
  };

  const handleCancel = async () => {
    if (!modal) return;
    const id = modal.id;
    setModal(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getSupabase() as any).from("appointments").update({ status: "cancelled" }).eq("id", id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    flashRow(id);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const rows = useMemo(() => {
    let data = [...appointments];
    if (filter === "today")    data = data.filter((a) => a.sortDate === 0);
    if (filter === "week")     data = data.filter((a) => a.sortDate >= 0 && a.sortDate <= 6);
    if (filter === "upcoming") data = data.filter((a) => a.sortDate >= 1);
    if (filter === "past")     data = data.filter((a) => a.sortDate < 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((a) => a.name.toLowerCase().includes(q) || a.service.toLowerCase().includes(q) || a.channel.toLowerCase().includes(q) || a.status.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "name")    { va = a.name;     vb = b.name; }
      if (sortKey === "phone")   { va = a.phone;    vb = b.phone; }
      if (sortKey === "service") { va = a.service;  vb = b.service; }
      if (sortKey === "date")    { va = a.sortDate; vb = b.sortDate; }
      if (sortKey === "channel") { va = a.channel;  vb = b.channel; }
      if (sortKey === "status")  { va = a.status;   vb = b.status; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [appointments, search, filter, sortKey, sortDir]);

  const confirmedToday = appointments.filter((a) => a.status === "confirmed" && a.sortDate === 0).length;
  const bookingsThisMonth = appointments.filter((a) => {
    const d = new Date(a.rawDatetime);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status !== "cancelled";
  }).length;
  const modalApt = modal ? appointments.find((a) => a.id === modal.id) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">
      {modal?.type === "message"    && modalApt && <MessageModal    apt={modalApt} onSend={handleSendMessage}  onClose={() => setModal(null)} />}
      {modal?.type === "reschedule" && modalApt && <RescheduleModal apt={modalApt} onReschedule={handleReschedule} onClose={() => setModal(null)} />}
      {modal?.type === "cancel"     && modalApt && <CancelModal     apt={modalApt} onConfirm={handleCancel}    onClose={() => setModal(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111827]">{t("appointments.title")}</h1>
          <div className="flex items-center flex-wrap gap-3 mt-1">
            {!loading && <span className="text-sm font-semibold text-green-600">{confirmedToday} {t("appointments.confirmedToday")}</span>}
            {!loading && isStarter && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                bookingsThisMonth >= config.bookingsPerMonth
                  ? "bg-red-50 text-red-600"
                  : bookingsThisMonth >= config.bookingsPerMonth * 0.8
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              }`}>
                {bookingsThisMonth} / {config.bookingsPerMonth} {t("appointments.bookingCounter")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all min-h-[40px]">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export CSV
          </button>
          <button className="text-xs font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity min-h-[40px]" style={{ background: "#FF6B35" }}>
            + New Appointment
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input type="text" placeholder="Search by name, service, channel…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_KEYS.map((key) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all min-h-[36px] capitalize ${
                filter === key ? "text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
              }`}
              style={filter === key ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
              {t(`appointments.filters.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Table — always rendered; empty state lives inside */}
      {(
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
                  <th className="w-10 pl-5 pr-3 py-3.5 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">#</span>
                  </th>
                  {SORT_COL_KEYS.map((col) => (
                    <th key={col.key} className={`text-left py-3.5 pr-4 ${col.width}`}>
                      <button onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] hover:text-[#111827]">
                        {col.label}
                        <SortIcon dir={sortKey === col.key ? sortDir : "asc"} active={sortKey === col.key} />
                      </button>
                    </th>
                  ))}
                  <th className="text-left py-3.5 pr-5 min-w-[200px]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-[#E5E7EB] animate-pulse">
                      <td className="pl-5 pr-3 py-4"><div className="h-2.5 bg-[#F3F4F6] rounded w-4" /></td>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="py-4 pr-4"><div className="h-2.5 bg-[#F3F4F6] rounded w-24" /></td>
                      ))}
                      <td className="py-4 pr-5"><div className="h-2.5 bg-[#F3F4F6] rounded w-32" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 && appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="flex flex-col items-center gap-3 py-14 text-center">
                        <div className="w-11 h-11 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.3"/><path d="M6 2v2M14 2v2M2 7h16" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </div>
                        <p className="text-sm font-semibold text-[#374151]">No appointments yet — they&apos;ll appear here automatically</p>
                        <p className="text-xs text-[#9CA3AF] max-w-xs">When customers book through your AI chat, appointments show up here in real time.</p>
                        <Link href="/app/channels" className="text-xs font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 mt-1" style={{ background: "#FF6B35" }}>
                          Connect a channel
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-[#9CA3AF]">
                      {filter === "past" ? "No past appointments." : "No appointments match your search."}
                    </td>
                  </tr>
                ) : (
                  rows.map((apt, i) => {
                    const s = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.pending;
                    const isHighlighted = highlightId === apt.id;
                    const isMsgSent = msgSentId === apt.id;
                    return (
                      <tr key={apt.id}
                        className={`border-b border-[#E5E7EB] last:border-none transition-colors duration-500 ${
                          isHighlighted ? "bg-[#FFF5F0]" : i % 2 === 1 ? "bg-[#FAFAFA] hover:bg-[#F5F5F5]" : "bg-white hover:bg-[#F9FAFB]"
                        }`}>
                        <td className="pl-5 pr-3 py-3.5"><span className="text-xs text-[#9CA3AF] font-mono">{i + 1}</span></td>
                        <td className="py-3.5 pr-4"><p className="text-sm font-semibold text-[#111827] whitespace-nowrap">{apt.name}</p></td>
                        <td className="py-3.5 pr-4"><span className="text-sm text-[#6B7280] whitespace-nowrap">{apt.phone || "—"}</span></td>
                        <td className="py-3.5 pr-4"><span className="text-sm text-[#111827]">{apt.service}</span></td>
                        <td className="py-3.5 pr-4">
                          <span className="text-sm font-semibold text-[#111827]">{apt.dateLabel}</span>
                          <span className="text-sm text-[#6B7280]"> · {apt.time}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#374151] whitespace-nowrap capitalize">{apt.channel}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                            {s.label}
                          </span>
                        </td>
                        <td className="py-3.5 pr-5">
                          {isMsgSent ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6l3 3 6-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Sent
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              {apt.status !== "cancelled" && (
                                <>
                                  <button onClick={() => setModal({ type: "reschedule", id: apt.id })}
                                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all whitespace-nowrap min-h-[30px]">
                                    Reschedule
                                  </button>
                                  <button onClick={() => setModal({ type: "cancel", id: apt.id })}
                                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all whitespace-nowrap min-h-[30px]">
                                    Cancel
                                  </button>
                                </>
                              )}
                              <button onClick={() => setModal({ type: "message", id: apt.id })}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 whitespace-nowrap min-h-[30px]"
                                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                                Message
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-[#6B7280]">
                Showing <span className="font-semibold text-[#111827]">{rows.length}</span> appointments
              </span>
              <div className="flex items-center gap-1.5">
                {["Confirmed", "Pending", "Cancelled"].map((st) => {
                  const cfg = STATUS_CONFIG[st.toLowerCase()];
                  const count = rows.filter((a) => a.status === st.toLowerCase()).length;
                  return (
                    <span key={st} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {count} {st}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
