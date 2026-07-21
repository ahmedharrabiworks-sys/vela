"use client";

import { useState } from "react";
import { DEMO_CALLS, type DemoCall } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

const WEEK_CALLS = [12, 18, 15, 22, 19, 25, 21];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function BarChart() {
  const max = Math.max(...WEEK_CALLS);
  const W = 320; const H = 90; const barW = 30;
  const gap = (W - 7 * barW) / 8;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full max-w-sm">
      <defs>
        <linearGradient id="bar-ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#FF3366" stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" y1={H - f * H} x2={W} y2={H - f * H} stroke="#F1F5F9" strokeWidth="1"/>
      ))}
      <line x1="0" y1={H} x2={W} y2={H} stroke="#E5E7EB" strokeWidth="1.5"/>
      {WEEK_CALLS.map((val, i) => {
        const barH = Math.max((val / max) * H, 4);
        const x = gap + i * (barW + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - barH} width={barW} height={barH} rx="5" fill="url(#bar-ag)"/>
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="#9CA3AF">{DAY_LABELS[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CircleRing({ value, size = 60 }: { value: number; size?: number }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="ring-ag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35"/>
          <stop offset="100%" stopColor="#FF3366"/>
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="5.5"/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ring-ag)" strokeWidth="5.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#374151">{value}%</text>
    </svg>
  );
}

const OUTCOME_CONFIG: Record<DemoCall["outcome"], { label: string; color: string; bg: string }> = {
  resolved:    { label: "Resolved",    color: "#16A34A", bg: "#ECFDF5" },
  booked:      { label: "Booked",      color: "#FF6B35", bg: "#FFF8F5" },
  transferred: { label: "Transferred", color: "#3B82F6", bg: "#EFF6FF" },
  "no-answer": { label: "No Answer",   color: "#9CA3AF", bg: "#F3F4F6" },
};

export default function DemoAIAgentPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const kpis = [
    { label: "Total Calls Handled",  value: "847",  sub: "All time",       icon: "📞" },
    { label: "Resolved by AI",        value: "94%",  sub: "Resolution rate", icon: "✅" },
    { label: "Avg Call Duration",     value: "2:34", sub: "This month",     icon: "⏱" },
    { label: "Calls This Week",       value: "132",  sub: "↑ 12% vs last",  icon: "📈" },
  ];

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">AI Agent</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Your 24/7 voice & chat AI assistant</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
            style={{ background: "var(--vp-color)" }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Test Voice Agent
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4">
              <p className="text-xl mb-0.5">{kpi.icon}</p>
              <p className="text-2xl font-bold text-[#111827] dark:text-white">{kpi.value}</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 leading-tight">{kpi.label}</p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-5">
            <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB] mb-4">Calls This Week</p>
            <BarChart />
          </div>
          <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-5 flex flex-col items-center justify-center gap-4">
            <CircleRing value={94} size={80} />
            <div className="text-center">
              <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">AI Resolution Rate</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">6% escalated to human</p>
            </div>
          </div>
        </div>

        {/* Recent calls */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2A2A32] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">Recent Calls</p>
            <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-[#FF6B35] hover:underline">View all</button>
          </div>
          <div className="divide-y divide-[#F3F4F6] dark:divide-[#2A2A32]">
            {DEMO_CALLS.map((call) => {
              const oc = OUTCOME_CONFIG[call.outcome];
              const isExpanded = expandedId === call.id;
              return (
                <div key={call.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#FAFAFA] dark:hover:bg-[#17171C] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#2A2A32] flex items-center justify-center text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] shrink-0">
                      {call.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#111827] dark:text-white">{call.name}</p>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: oc.bg, color: oc.color }}
                        >
                          {oc.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">{call.summary}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-[#9CA3AF] dark:text-[#6B7280]">{call.duration}</span>
                      <span className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">{call.time}</span>
                      <svg
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                        className={`text-[#9CA3AF] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] bg-[#FAFAFA] dark:bg-[#17171C]">
                      {call.transcript.length === 0 ? (
                        <p className="text-xs text-[#9CA3AF] pt-3">No transcript available.</p>
                      ) : (
                        <div className="pt-3 space-y-2.5">
                          {call.transcript.map((line, i) => (
                            <div key={i} className={`flex gap-2.5 ${line.role === "caller" ? "flex-row-reverse" : ""}`}>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${line.role === "agent" ? "text-[#FF6B35]" : "text-[#6B7280] dark:text-[#9CA3AF]"}`}>
                                {line.role === "agent" ? "AI" : "Caller"}
                              </span>
                              <p className={`text-xs leading-relaxed rounded-xl px-3 py-2 max-w-[80%] ${
                                line.role === "agent"
                                  ? "bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB]"
                                  : "bg-[#FF6B35]/10 text-[#374151] dark:text-[#D1D5DB]"
                              }`}>
                                {line.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
