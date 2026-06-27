"use client";

import { useState } from "react";

const APPOINTMENTS = [
  { id: 1, name: "Ahmed Al-Rashid", service: "Dental Cleaning", date: "Today", time: "3:00 PM", status: "confirmed", channel: "Instagram", phone: "+971 50 111 2222" },
  { id: 2, name: "Sara Khalid", service: "Consultation", date: "Today", time: "4:30 PM", status: "confirmed", channel: "WhatsApp", phone: "+971 55 333 4444" },
  { id: 3, name: "Mohammed Ali", service: "Teeth Whitening", date: "Tomorrow", time: "10:00 AM", status: "pending", channel: "Website", phone: "+971 52 555 6666" },
  { id: 4, name: "Fatima Al-Zahra", service: "Check-up", date: "Tomorrow", time: "2:00 PM", status: "confirmed", channel: "Instagram", phone: "+971 56 777 8888" },
  { id: 5, name: "Omar Bin Rashid", service: "Root Canal", date: "Wed, Jun 29", time: "9:00 AM", status: "confirmed", channel: "WhatsApp", phone: "+971 58 999 0000" },
  { id: 6, name: "Layla Hassan", service: "Braces Consultation", date: "Thu, Jun 30", time: "11:30 AM", status: "cancelled", channel: "Website", phone: "+971 50 123 4567" },
];

const STATUS_STYLES: Record<string, { card: string; dot: string; text: string }> = {
  confirmed: { card: "border-green-100 bg-green-50/30", dot: "bg-green-500", text: "text-green-600" },
  pending: { card: "border-yellow-100 bg-yellow-50/30", dot: "bg-yellow-400", text: "text-yellow-600" },
  cancelled: { card: "border-red-100 bg-red-50/20", dot: "bg-red-400", text: "text-red-500" },
};

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: "#E1306C",
  WhatsApp: "#25D366",
  Website: "#FF6B35",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = 4;

export default function AppointmentsPage() {
  const [activeDay, setActiveDay] = useState(TODAY_IDX);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A0A00]">Appointments</h1>
          <p className="text-sm text-[#888888] mt-1">June 27, 2026 · {APPOINTMENTS.filter(a => a.status === "confirmed").length} confirmed today</p>
        </div>
        <button className="btn-primary text-xs px-4 py-2.5">+ New Appointment</button>
      </div>

      {/* Week strip */}
      <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-4">
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const date = 23 + i;
            const isActive = activeDay === i;
            const isToday = i === TODAY_IDX;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(i)}
                className={`flex flex-col items-center py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-white shadow-vela"
                    : isToday
                    ? "bg-[#FFF5F0] text-[#FF6B35]"
                    : "text-[#888888] hover:bg-[#FFF5F0]"
                }`}
                style={isActive ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
              >
                <span className="text-[10px] font-medium">{day}</span>
                <span className="text-lg font-bold mt-0.5">{date}</span>
                {/* Dot indicators */}
                <div className="flex gap-0.5 mt-1.5">
                  {[0, 1].map((d) => (
                    <span key={d} className={`w-1 h-1 rounded-full ${isActive ? "bg-white/60" : "bg-[#FF6B35]/40"}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments list */}
      <div className="grid md:grid-cols-2 gap-4">
        {APPOINTMENTS.map((apt) => {
          const s = STATUS_STYLES[apt.status];
          return (
            <div
              key={apt.id}
              className={`bg-white rounded-2xl border shadow-card p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${s.card}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: CHANNEL_COLORS[apt.channel] }}>
                    {apt.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A0A00] text-sm">{apt.name}</p>
                    <p className="text-xs text-[#888888]">{apt.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold capitalize ${s.text}`}>{apt.status}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#888888]">Service:</span>
                  <span className="font-semibold text-[#1A0A00]">{apt.service}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#888888]">Time:</span>
                  <span className="font-semibold text-[#FF6B35]">{apt.date} · {apt.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#888888]">Via:</span>
                  <span className="font-medium" style={{ color: CHANNEL_COLORS[apt.channel] }}>{apt.channel}</span>
                </div>
              </div>

              {apt.status !== "cancelled" && (
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 py-2 text-xs font-semibold border border-[#f0e8e0] rounded-lg text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                    Reschedule
                  </button>
                  <button className="flex-1 py-2 text-xs font-semibold border border-red-100 rounded-lg text-red-400 hover:bg-red-50 transition-all">
                    Cancel
                  </button>
                  <button className="flex-1 py-2 text-xs font-semibold rounded-lg text-white transition-all"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    Message
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
