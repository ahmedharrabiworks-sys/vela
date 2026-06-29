"use client";

import { useState, useMemo } from "react";

type SortKey = "name" | "service" | "date" | "channel" | "status";
type SortDir = "asc" | "desc";
type FilterKey = "all" | "today" | "week" | "upcoming";

const RAW_APPOINTMENTS = [
  { id: 1,  name: "Ahmed Al-Rashid",  phone: "+971 50 111 2222", service: "Dental Cleaning",      dateLabel: "Today",        sortDate: 0, time: "3:00 PM",  status: "confirmed", channel: "Instagram" },
  { id: 2,  name: "Sara Khalid",      phone: "+971 55 333 4444", service: "Consultation",          dateLabel: "Today",        sortDate: 0, time: "4:30 PM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 3,  name: "Mohammed Ali",     phone: "+971 52 555 6666", service: "Teeth Whitening",       dateLabel: "Tomorrow",     sortDate: 1, time: "10:00 AM", status: "pending",   channel: "Website"   },
  { id: 4,  name: "Fatima Al-Zahra",  phone: "+971 56 777 8888", service: "Check-up",              dateLabel: "Tomorrow",     sortDate: 1, time: "2:00 PM",  status: "confirmed", channel: "Instagram" },
  { id: 5,  name: "Omar Bin Rashid",  phone: "+971 58 999 0000", service: "Root Canal",            dateLabel: "Wed, Jun 29",  sortDate: 2, time: "9:00 AM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 6,  name: "Layla Hassan",     phone: "+971 50 123 4567", service: "Braces Consultation",   dateLabel: "Thu, Jun 30",  sortDate: 3, time: "11:30 AM", status: "cancelled", channel: "Website"   },
  { id: 7,  name: "Khalid Mansour",   phone: "+971 52 234 5678", service: "Dental Cleaning",       dateLabel: "Fri, Jul 1",   sortDate: 4, time: "1:00 PM",  status: "confirmed", channel: "WhatsApp"  },
  { id: 8,  name: "Nora Abdulla",     phone: "+971 55 345 6789", service: "Veneers Consultation",  dateLabel: "Fri, Jul 1",   sortDate: 4, time: "3:30 PM",  status: "pending",   channel: "Instagram" },
  { id: 9,  name: "Youssef Al-Noor",  phone: "+971 50 456 7890", service: "Teeth Whitening",       dateLabel: "Sat, Jul 2",   sortDate: 5, time: "10:30 AM", status: "confirmed", channel: "Website"   },
  { id: 10, name: "Amira Bensalem",   phone: "+971 56 567 8901", service: "Consultation",          dateLabel: "Sun, Jul 3",   sortDate: 6, time: "12:00 PM", status: "pending",   channel: "Instagram" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  confirmed: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",  label: "Confirmed" },
  pending:   { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400", label: "Pending"   },
  cancelled: { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400",    label: "Cancelled" },
};

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp:  "#25D366",
  Website:   "#FF6B35",
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "today",    label: "Today" },
  { key: "week",     label: "This Week" },
  { key: "upcoming", label: "Upcoming" },
];

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: "name",    label: "Patient",     width: "min-w-[200px]" },
  { key: "service", label: "Service",     width: "min-w-[160px]" },
  { key: "date",    label: "Date & Time", width: "min-w-[160px]" },
  { key: "channel", label: "Channel",     width: "min-w-[120px]" },
  { key: "status",  label: "Status",      width: "min-w-[120px]" },
];

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`transition-colors ${active ? "text-[#FF6B35]" : "text-[#ccc]"}`}>
      <path d={dir === "asc" ? "M6 9V3M3 6l3-3 3 3" : "M6 3v6M3 6l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const rows = useMemo(() => {
    let data = [...RAW_APPOINTMENTS];

    // Filter
    if (filter === "today")    data = data.filter((a) => a.sortDate === 0);
    if (filter === "week")     data = data.filter((a) => a.sortDate <= 6);
    if (filter === "upcoming") data = data.filter((a) => a.sortDate >= 1);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.service.toLowerCase().includes(q) ||
        a.channel.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "name")    { va = a.name;     vb = b.name; }
      if (sortKey === "service") { va = a.service;  vb = b.service; }
      if (sortKey === "date")    { va = a.sortDate; vb = b.sortDate; }
      if (sortKey === "channel") { va = a.channel;  vb = b.channel; }
      if (sortKey === "status")  { va = a.status;   vb = b.status; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [search, filter, sortKey, sortDir]);

  const confirmedCount = RAW_APPOINTMENTS.filter((a) => a.status === "confirmed" && a.sortDate === 0).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111827]">Appointments</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            June 29, 2026 · <span className="font-semibold text-green-600">{confirmedCount} confirmed today</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export */}
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all min-h-[40px]">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export
          </button>
          <button className="btn-primary text-xs px-4 py-2.5 min-h-[40px]">+ New Appointment</button>
        </div>
      </div>

      {/* Toolbar: search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="Search by name, service, channel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 shadow-sm transition-colors"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#888] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all min-h-[36px] ${
                filter === f.key ? "text-white shadow-sm" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35]/40 hover:text-[#FF6B35]"
              }`}
              style={filter === f.key ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Row count */}
        <span className="text-xs text-[#9CA3AF] ml-auto hidden sm:block">
          {rows.length} of {RAW_APPOINTMENTS.length} appointments
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
                {/* Checkbox col */}
                <th className="w-10 pl-5 pr-2 py-3.5">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#ddd] accent-[#FF6B35]" />
                </th>

                {COLUMNS.map((col) => (
                  <th key={col.key}
                    className={`text-left py-3.5 pr-4 ${col.width}`}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] transition-colors group"
                    >
                      {col.label}
                      <SortIcon dir={sortKey === col.key ? sortDir : "asc"} active={sortKey === col.key} />
                    </button>
                  </th>
                ))}

                {/* Actions col — not sortable */}
                <th className="text-left py-3.5 pr-5 min-w-[200px]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-[#9CA3AF]">
                    No appointments match your search.
                  </td>
                </tr>
              ) : (
                rows.map((apt, i) => {
                  const s = STATUS_CONFIG[apt.status];
                  const isEven = i % 2 === 1;
                  return (
                    <tr key={apt.id}
                      className={`border-b border-[#E5E7EB] last:border-none transition-colors hover:bg-[#F9FAFB] ${isEven ? "bg-[#FAFAFA]" : "bg-white"}`}>

                      {/* Checkbox */}
                      <td className="pl-5 pr-2 py-3.5">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#ddd] accent-[#FF6B35]" />
                      </td>

                      {/* Name + Avatar */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: CHANNEL_COLORS[apt.channel] }}>
                            {apt.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#111827] whitespace-nowrap">{apt.name}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{apt.phone}</p>
                          </div>
                        </div>
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
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ background: `${CHANNEL_COLORS[apt.channel]}15`, color: CHANNEL_COLORS[apt.channel] }}>
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
                        <div className="flex items-center gap-1.5">
                          {apt.status !== "cancelled" && (
                            <>
                              <button className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all whitespace-nowrap min-h-[30px]">
                                Reschedule
                              </button>
                              <button className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-all whitespace-nowrap min-h-[30px]">
                                Cancel
                              </button>
                            </>
                          )}
                          <button className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white transition-all hover:opacity-90 whitespace-nowrap min-h-[30px]"
                            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between gap-4 flex-wrap">
            <span className="text-xs text-[#6B7280]">
              Showing <span className="font-semibold text-[#111827]">{rows.length}</span> of <span className="font-semibold text-[#111827]">{RAW_APPOINTMENTS.length}</span> appointments
            </span>
            <div className="flex items-center gap-1">
              {["Confirmed", "Pending", "Cancelled"].map((s) => {
                const cfg = STATUS_CONFIG[s.toLowerCase()];
                const count = rows.filter((a) => a.status === s.toLowerCase()).length;
                return (
                  <span key={s} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {count} {s}
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
