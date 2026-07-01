"use client";

import { useEffect, useState } from "react";
import { getProfile, getVocab } from "@/lib/business-profile";

const CHANNEL_COLORS: Record<string, string> = { Instagram: "#E1306C", WhatsApp: "#25D366", Website: "#FF6B35" };

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = { confirmed: "#16A34A", pending: "#FF6B35", cancelled: "#DC2626" };
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: colors[status] || "#9CA3AF" }} />;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<{ businessName: string; businessType: string; ownerName: string } | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (p) setProfile({ businessName: p.businessName, businessType: p.businessType, ownerName: p.ownerName });
  }, []);

  const vocab = getVocab(profile?.businessType);
  const bName = profile?.businessName || "";
  const firstName = profile?.ownerName?.split(" ")[0] || "there";

  const KPI_CARDS = [
    { label: "Revenue (AED)",        value: "48,200", trend: "+12%", up: true  },
    { label: `New ${vocab.customers}`, value: "184",   trend: "+23",  up: true  },
    { label: vocab.bookings,          value: "67",     trend: "12 today", up: true  },
    { label: "Avg Response",          value: "1m 24s", trend: "-18s", up: true  },
    { label: "Conversion",            value: "34%",    trend: "+2pp", up: true  },
  ];

  const CONVS = [
    { name: "Ahmed Al-Rashid", preview: `I'd like to book a ${vocab.booking.toLowerCase()} for next week`, time: "2m", isNew: true, channel: "Instagram" },
    { name: "Sara Khalid",     preview: "What are your prices?",                                           time: "8m", isNew: false, channel: "WhatsApp" },
    { name: "Mohammed Ali",    preview: `More info on your ${vocab.services.toLowerCase()}?`,              time: "15m", isNew: true, channel: "Website" },
    { name: "Layla Hassan",    preview: "Available tomorrow morning?",                                     time: "32m", isNew: false, channel: "Instagram" },
  ];

  const APPTS = [
    { time: "09:00", name: "Ahmed Al-Rashid", service: vocab.bucket === "healthcare" ? "Dental Cleaning" : vocab.bucket === "fitness" ? "Personal Training" : vocab.bucket === "beauty" ? "Hair Cut" : "Consultation", status: "confirmed" },
    { time: "10:30", name: "Layla Hassan",    service: vocab.bucket === "healthcare" ? "Whitening Treatment" : vocab.bucket === "fitness" ? "Group Class" : vocab.bucket === "beauty" ? "Colour Treatment" : "Follow-up", status: "confirmed" },
    { time: "12:00", name: "Omar Bin Rashid", service: vocab.bucket === "healthcare" ? "Root Canal Consult" : vocab.bucket === "realestate" ? "Property Viewing" : "Consultation", status: "pending" },
    { time: "14:00", name: "Sara Khalid",     service: vocab.bucket === "healthcare" ? "Check-up & X-Ray" : "Service", status: "confirmed" },
    { time: "16:30", name: "Fatima Al-Nasser",service: vocab.bucket === "healthcare" ? "Braces Adjustment" : "Consultation", status: "pending" },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-7">

      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-[#111111]">Good morning, {firstName}</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{bName ? `${bName} · ` : ""}Tuesday, 1 July 2026</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-5">
            <p className="text-[11px] text-[#6B7280] mb-3">{k.label}</p>
            <p className="text-2xl font-bold text-[#111111] leading-none mb-2">{k.value}</p>
            <p className={`text-[11px] font-medium ${k.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {k.up ? "↑" : "↓"} {k.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Conversations — 2 cols */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111111]">Recent Messages</h2>
            <a href="/app/conversations" className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {CONVS.map((c, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">
                    {c.name[0]}
                  </div>
                  {c.isNew && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#111111] truncate">{c.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0 ml-2">{c.time}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{c.preview}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments — 3 cols */}
        <div className="lg:col-span-3 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-bold text-[#111111]">Today&apos;s {vocab.bookings}</h2>
            <a href="/app/appointments" className="text-xs text-[#FF6B35] font-semibold hover:underline">View all</a>
          </div>
          <div className="divide-y divide-[#F9FAFB]">
            {APPTS.map((a, i) => (
              <div key={i} className="flex items-center gap-5 px-6 py-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer">
                <span className="text-xs font-mono text-[#6B7280] w-12 shrink-0">{a.time}</span>
                <div className="w-px h-8 bg-[#FF6B35] rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#111111] truncate">{a.name}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{a.service}</p>
                </div>
                <StatusDot status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
