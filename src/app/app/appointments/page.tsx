"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { usePlan } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";

type SortKey = "name" | "phone" | "service" | "date" | "channel" | "status";
type SortDir = "asc" | "desc";
type FilterKey = "all" | "today" | "week" | "upcoming" | "past";

interface Appointment {
  id: number;
  name: string;
  phone: string;
  service: string;
  dateLabel: string;
  sortDate: number;
  time: string;
  status: string;
  channel: string;
}

const INITIAL: Appointment[] = [
  { id: 1,  name: "Ahmed Al-Rashid",  phone: "+971 50 111 2222", service: "Consultation",     dateLabel: "Today",        sortDate: 0,  time: "3:00 PM",  status: "confirmed", channel: "Instagram" },
  { id: 2,  name: "Sara Khalid",      phone: "+971 55 333 4444", service: "Consultation",     dateLabel: "Today",        sortDate: 0,  time: "4:30 PM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 3,  name: "Mohammed Ali",     phone: "+971 52 555 6666", service: "Service Session",  dateLabel: "Tomorrow",     sortDate: 1,  time: "10:00 AM", status: "pending",   channel: "Website"   },
  { id: 4,  name: "Fatima Al-Zahra",  phone: "+971 56 777 8888", service: "Check-up",         dateLabel: "Tomorrow",     sortDate: 1,  time: "2:00 PM",  status: "confirmed", channel: "Instagram" },
  { id: 5,  name: "Omar Bin Rashid",  phone: "+971 58 999 0000", service: "Premium Package",  dateLabel: "Wed, Jul 2",   sortDate: 2,  time: "9:00 AM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 6,  name: "Layla Hassan",     phone: "+971 50 123 4567", service: "Consultation",     dateLabel: "Thu, Jul 3",   sortDate: 3,  time: "11:30 AM", status: "cancelled", channel: "Website"   },
  { id: 7,  name: "Khalid Mansour",   phone: "+971 52 234 5678", service: "Routine Session",  dateLabel: "Fri, Jul 4",   sortDate: 4,  time: "1:00 PM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 8,  name: "Nora Abdulla",     phone: "+971 55 345 6789", service: "Consultation",     dateLabel: "Fri, Jul 4",   sortDate: 4,  time: "3:30 PM",  status: "pending",   channel: "Instagram" },
  { id: 9,  name: "Youssef Al-Noor",  phone: "+971 50 456 7890", service: "Premium Package",  dateLabel: "Sat, Jul 5",   sortDate: 5,  time: "10:30 AM", status: "confirmed", channel: "Website"   },
  { id: 10, name: "Amira Bensalem",   phone: "+971 56 567 8901", service: "Consultation",     dateLabel: "Sun, Jul 6",   sortDate: 6,  time: "12:00 PM", status: "pending",   channel: "Instagram" },
  { id: 11, name: "Rania Samara",     phone: "+971 54 678 9012", service: "Follow-up",        dateLabel: "Mon, Jun 30",  sortDate: -1, time: "2:00 PM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 12, name: "Hassan Al-Farsi",  phone: "+971 52 789 0123", service: "Consultation",     dateLabel: "Sun, Jun 29",  sortDate: -2, time: "11:00 AM", status: "cancelled", channel: "Website"   },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  label: "Confirmed" },
  pending:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400", label: "Pending"   },
  cancelled: { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400",    label: "Cancelled" },
};

const FILTER_KEYS: FilterKey[] = ["all", "today", "week", "upcoming", "past"];

const SORT_COL_KEYS: { key: SortKey; labelKey: string; width: string }[] = [
  { key: "name",    labelKey: "appointments.columns.patient",  width: "min-w-[170px]" },
  { key: "phone",   labelKey: "appointments.columns.phone",    width: "min-w-[140px]" },
  { key: "service", labelKey: "appointments.columns.service",  width: "min-w-[150px]" },
  { key: "date",    labelKey: "appointments.columns.dateTime", width: "min-w-[150px]" },
  { key: "channel", labelKey: "appointments.columns.channel",  width: "min-w-[110px]" },
  { key: "status",  labelKey: "appointments.columns.status",   width: "min-w-[110px]" },
];

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function calcSortDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/* ── Modals ── */
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
    `Hi ${apt.name.split(" ")[0]}, just a reminder about your appointment tomorrow at ${apt.time}. See you soon!`,
    `Hi ${apt.name.split(" ")[0]}, we look forward to seeing you for your ${apt.service}. Please arrive 5 min early.`,
  ];

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#111111]">Message {apt.name}</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">via {apt.channel} · {apt.phone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-all">
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
          className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 resize-none transition-colors mb-4" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Cancel</button>
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-all">
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
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">New Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Cancel</button>
          <button onClick={() => { if (date && time) onReschedule(date, time); }} disabled={!date || !time}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
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
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#374151] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Keep it</button>
          <button onClick={onConfirm} className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity bg-red-500">
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
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modal, setModal] = useState<{ type: "message" | "reschedule" | "cancel"; id: number } | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [msgSentId, setMsgSentId] = useState<number | null>(null);
  const { isStarter, config } = usePlan();
  const { t } = useI18n();
  // Mock booking counter — in production would come from Supabase
  const bookingsThisMonth = 34;

  const flashRow = (id: number) => {
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 1400);
  };

  const handleSendMessage = (msg: string) => {
    if (!modal) return;
    const id = modal.id;
    setModal(null);
    setMsgSentId(id);
    flashRow(id);
    setTimeout(() => setMsgSentId(null), 2500);
  };

  const handleReschedule = (date: string, time: string) => {
    if (!modal) return;
    const id = modal.id;
    setModal(null);
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, dateLabel: formatDateLabel(date), time: formatTime12h(time), sortDate: calcSortDate(date), status: a.status === "cancelled" ? "confirmed" : a.status }
          : a
      )
    );
    flashRow(id);
  };

  const handleCancel = () => {
    if (!modal) return;
    const id = modal.id;
    setModal(null);
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
  const modalApt = modal ? appointments.find((a) => a.id === modal.id) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">

      {/* Modals */}
      {modal?.type === "message"    && modalApt && <MessageModal    apt={modalApt} onSend={handleSendMessage}      onClose={() => setModal(null)} />}
      {modal?.type === "reschedule" && modalApt && <RescheduleModal apt={modalApt} onReschedule={handleReschedule} onClose={() => setModal(null)} />}
      {modal?.type === "cancel"     && modalApt && <CancelModal     apt={modalApt} onConfirm={handleCancel}        onClose={() => setModal(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111827]">{t("appointments.title")}</h1>
          <div className="flex items-center flex-wrap gap-3 mt-1">
            <span className="text-sm font-semibold text-green-600">{confirmedToday} {t("appointments.confirmedToday")}</span>
            {isStarter && (
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
            {isStarter && bookingsThisMonth >= config.bookingsPerMonth && (
              <span className="text-xs text-red-600 font-medium">
                {t("appointments.bookingLimitReached")}
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
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#888]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_KEYS.map((key) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all min-h-[36px] ${
                filter === key ? "text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
              }`}
              style={filter === key ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
              {t(`appointments.filters.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
                {/* # column */}
                <th className="w-10 pl-5 pr-3 py-3.5 text-left">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">#</span>
                </th>
                {SORT_COL_KEYS.map((col) => (
                  <th key={col.key} className={`text-left py-3.5 pr-4 ${col.width}`}>
                    <button onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] transition-colors">
                      {t(col.labelKey)}
                      <SortIcon dir={sortKey === col.key ? sortDir : "asc"} active={sortKey === col.key} />
                    </button>
                  </th>
                ))}
                <th className="text-left py-3.5 pr-5 min-w-[200px]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{t("appointments.columns.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-sm text-[#9CA3AF]">
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

                      {/* # */}
                      <td className="pl-5 pr-3 py-3.5">
                        <span className="text-xs text-[#9CA3AF] font-mono">{i + 1}</span>
                      </td>

                      {/* Patient Name */}
                      <td className="py-3.5 pr-4">
                        <p className="text-sm font-semibold text-[#111827] whitespace-nowrap">{apt.name}</p>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-[#6B7280] whitespace-nowrap">{apt.phone}</span>
                      </td>

                      {/* Service */}
                      <td className="py-3.5 pr-4">
                        <span className="text-sm text-[#111827]">{apt.service}</span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 pr-4">
                        <span className="text-sm font-semibold text-[#111827]">{apt.dateLabel}</span>
                        <span className="text-sm text-[#6B7280]"> · {apt.time}</span>
                      </td>

                      {/* Channel */}
                      <td className="py-3.5 pr-4">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#374151] whitespace-nowrap">
                          {apt.channel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>

                      {/* Actions */}
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
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white transition-all hover:opacity-90 whitespace-nowrap min-h-[30px]"
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
    </div>
  );
}
