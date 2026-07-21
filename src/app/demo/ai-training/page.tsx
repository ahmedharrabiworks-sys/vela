"use client";

import { useState } from "react";
import { DEMO_KB } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

type Tab = "Services" | "Business Info" | "Extra";
const TABS: Tab[] = ["Services", "Business Info", "Extra"];

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#FF6B35" : "#DC2626";
  return (
    <div className="flex items-center gap-3">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#F3F4F6" strokeWidth="3.5"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
        <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <div>
        <p className="text-sm font-bold text-[#374151] dark:text-[#D1D5DB]">AI Score: Excellent</p>
        <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">Your AI is well-trained</p>
      </div>
    </div>
  );
}

export default function DemoAITrainingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Services");
  const [showModal, setShowModal] = useState(false);

  const AI_SCORE = 96;

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-4xl mx-auto space-y-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Train Your AI</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Teach your AI about your business</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--vp-color)" }}
          >
            Save Changes
          </button>
        </div>

        {/* Score card */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <ProgressRing pct={AI_SCORE} />
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "Services", done: true },
              { label: "Hours", done: true },
              { label: "Address", done: true },
              { label: "Booking Policy", done: true },
              { label: "Extra Info", done: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${item.done ? "bg-[#ECFDF5]" : "bg-[#F3F4F6] dark:bg-[#2A2A32]"}`}>
                  {item.done ? (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="#16A34A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                  )}
                </span>
                <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          <div className="flex border-b border-[#E5E7EB] dark:border-[#2A2A32]">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-[#FF6B35] text-[#FF6B35]"
                    : "border-transparent text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Services tab */}
            {activeTab === "Services" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider">Your Service Menu</p>
                <div className="border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#F3F4F6] dark:border-[#2A2A32] bg-[#FAFAFA] dark:bg-[#17171C]">
                        {["Service", "Price", "Duration", "Description"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#2A2A32]">
                      {DEMO_KB.services.map((svc, i) => (
                        <tr key={i} className="hover:bg-[#FAFAFA] dark:hover:bg-[#17171C]">
                          <td className="px-4 py-2.5">
                            <button onClick={() => setShowModal(true)} className="text-sm font-medium text-[#111827] dark:text-white text-left hover:text-[#FF6B35] transition-colors">
                              {svc.name}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-[#374151] dark:text-[#D1D5DB]">{svc.price}</td>
                          <td className="px-4 py-2.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">{svc.duration}</td>
                          <td className="px-4 py-2.5 text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-[200px] truncate">{svc.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sm font-semibold text-[#FF6B35] hover:underline"
                >
                  + Add Service
                </button>
              </div>
            )}

            {/* Business Info tab */}
            {activeTab === "Business Info" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Opening Hours</label>
                  <textarea
                    defaultValue={DEMO_KB.business.hours}
                    onFocus={() => setShowModal(true)}
                    rows={3}
                    className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Address</label>
                  <input
                    defaultValue={DEMO_KB.business.address}
                    onFocus={() => setShowModal(true)}
                    className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Booking Policy</label>
                  <textarea
                    defaultValue={DEMO_KB.business.bookingPolicy}
                    onFocus={() => setShowModal(true)}
                    rows={3}
                    className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">AI Tone</label>
                  <select
                    defaultValue="professional"
                    onFocus={() => setShowModal(true)}
                    className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none appearance-none"
                  >
                    <option>Professional</option>
                    <option>Friendly</option>
                    <option>Formal</option>
                  </select>
                </div>
              </div>
            )}

            {/* Extra tab */}
            {activeTab === "Extra" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">
                    Additional Information &amp; FAQs
                  </label>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mb-2">Add anything else your AI should know — FAQs, special instructions, certifications, etc.</p>
                  <textarea
                    defaultValue={DEMO_KB.extra}
                    onFocus={() => setShowModal(true)}
                    rows={8}
                    className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-[#E5E7EB] dark:border-[#2A2A32] flex items-center justify-between bg-[#FAFAFA] dark:bg-[#17171C]">
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Changes auto-save after 2 seconds</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vp-color)" }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
