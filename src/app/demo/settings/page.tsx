"use client";

import { useState } from "react";
import { DEMO_PROFILE } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

type Section = "business" | "ai" | "notifications" | "billing" | "appearance";

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: 40, height: 22 }}>
      <div className={`w-full h-full rounded-full transition-colors ${checked ? "bg-[#FF6B35]" : "bg-[#E5E7EB] dark:bg-[#2A2A32]"}`} />
      <span
        className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 21 : 3 }}
      />
    </div>
  );
}

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "business",
    label: "Business Info",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="5" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "ai",
    label: "AI Configuration",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5L2.5 4v5L7 11.5 11.5 9V4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="7" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5A4 4 0 003 5.5V9l-1 1h10l-1-1V5.5A4 4 0 007 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        <path d="M5.5 10a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Billing",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M1.5 6.5h11" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 8.5h1.5M7.5 8.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 10c1.5-2 4-2 6 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <circle cx="5" cy="5.5" r="0.8" fill="currentColor"/>
        <circle cx="9" cy="5.5" r="0.8" fill="currentColor"/>
      </svg>
    ),
  },
];

export default function DemoSettingsPage() {
  const [section, setSection] = useState<Section>("business");
  const [showModal, setShowModal] = useState(false);
  const open = () => setShowModal(true);

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-4xl mx-auto space-y-5 pb-8">
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-white">Settings</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* Left nav */}
          <nav className="w-full md:w-44 shrink-0 flex flex-row md:flex-col gap-0.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors w-full text-left shrink-0 ${
                  section === item.id
                    ? "bg-[#FFF5F0] text-[#FF6B35]"
                    : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#2A2A32]"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Content card */}
          <div className="flex-1 min-w-0 bg-white dark:bg-[#1E1E24] rounded-2xl border border-[#E5E7EB] dark:border-[#2A2A32] p-6 space-y-5">

            {/* Business Info */}
            {section === "business" && (
              <>
                <div>
                  <h2 className="font-semibold text-[#111827] dark:text-white">Business Info</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Used by the AI agent and marketing tools.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: "Business Name", value: DEMO_PROFILE.business },
                    { label: "Industry",      value: "Dental / Healthcare" },
                    { label: "Phone",         value: "+971 4 123 4567" },
                    { label: "Email",         value: DEMO_PROFILE.email },
                    { label: "City",          value: "Dubai, UAE" },
                    { label: "Website",       value: "ahmeddentalclinic.ae" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">{label}</label>
                      <input
                        defaultValue={value}
                        onFocus={open}
                        className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">Services</label>
                  <textarea
                    rows={3}
                    defaultValue="Dental Cleaning, Teeth Whitening, Cavity Filling, Root Canal, Orthodontics, Dental Implants"
                    onFocus={open}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none"
                  />
                </div>
                <div className="pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex items-center gap-3">
                  <button
                    onClick={open}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    Save Changes
                  </button>
                  <span className="text-xs text-[#9CA3AF]">No unsaved changes</span>
                </div>
              </>
            )}

            {/* AI Configuration */}
            {section === "ai" && (
              <>
                <div>
                  <h2 className="font-semibold text-[#111827] dark:text-white">AI Configuration</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Controls how your AI agent communicates with customers.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-3">Response Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {["professional", "friendly", "formal", "casual"].map((v) => (
                      <button
                        key={v}
                        onClick={open}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                          v === "professional"
                            ? "text-white"
                            : "bg-[#F9FAFB] dark:bg-[#17171C] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/40"
                        }`}
                        style={v === "professional" ? { background: "var(--vela-gradient)" } : {}}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-3">Language</label>
                  <div className="flex flex-wrap gap-2">
                    {["English", "Arabic", "Auto-detect"].map((v) => (
                      <button
                        key={v}
                        onClick={open}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          v === "English"
                            ? "text-white"
                            : "bg-[#F9FAFB] dark:bg-[#17171C] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/40"
                        }`}
                        style={v === "English" ? { background: "var(--vela-gradient)" } : {}}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-3">Reply Timing</label>
                  <div className="flex flex-wrap gap-2">
                    {["instant", "1-2 min", "5 min"].map((v) => (
                      <button
                        key={v}
                        onClick={open}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          v === "instant"
                            ? "text-white"
                            : "bg-[#F9FAFB] dark:bg-[#17171C] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/40"
                        }`}
                        style={v === "instant" ? { background: "var(--vela-gradient)" } : {}}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] block mb-1.5">Custom Instructions</label>
                  <textarea
                    rows={5}
                    defaultValue="Always mention our free parking. Offer 10% discount to first-time patients. Do not discuss competitor pricing. Remind patients to bring their insurance card."
                    onFocus={open}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none"
                  />
                </div>
                <div className="pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex items-center gap-3">
                  <button
                    onClick={open}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    Save AI Config
                  </button>
                  <span className="text-xs text-[#9CA3AF]">No unsaved changes</span>
                </div>
              </>
            )}

            {/* Notifications */}
            {section === "notifications" && (
              <>
                <div>
                  <h2 className="font-semibold text-[#111827] dark:text-white">Notifications</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Choose which events trigger a notification.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "New Lead Alert",          desc: "Notify when a new lead comes in via any channel",          checked: true  },
                    { label: "Appointment Booked",      desc: "Notify when a new appointment is confirmed",               checked: true  },
                    { label: "AI Handoff",              desc: "Notify when AI transfers a conversation to a human agent", checked: true  },
                    { label: "Daily Summary",           desc: "End-of-day digest with your performance metrics",          checked: false },
                    { label: "WhatsApp Notifications",  desc: "Receive alerts directly on your connected WhatsApp",       checked: true  },
                  ].map(({ label, desc, checked }) => (
                    <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32]">
                      <div>
                        <p className="font-medium text-[#111827] dark:text-white text-sm">{label}</p>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{desc}</p>
                      </div>
                      <button onClick={open}>
                        <Toggle checked={checked} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex items-center gap-3">
                  <button
                    onClick={open}
                    className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    Save Preferences
                  </button>
                </div>
              </>
            )}

            {/* Billing */}
            {section === "billing" && (
              <>
                <div>
                  <h2 className="font-semibold text-[#111827] dark:text-white">Billing</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Manage your plan and payment details.</p>
                </div>
                <div className="p-5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] bg-[#F9FAFB] dark:bg-[#17171C]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[#111827] dark:text-white">Premium Plan</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--vp-color)" }}>ACTIVE</span>
                      </div>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Renews August 21, 2026</p>
                    </div>
                    <span className="text-2xl font-extrabold text-[#FF6B35]">$299<span className="text-sm font-medium text-[#6B7280]">/mo</span></span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={open}
                      className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                      style={{ background: "var(--vela-gradient)" }}
                    >
                      Upgrade Plan
                    </button>
                    <button
                      onClick={open}
                      className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                    >
                      Manage Billing
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--vp-15)" }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1.5L2 4.5v3.5c0 3.1 2.1 6 5 6.8 1 .3 2 0 3-1 1.9-1.7 2-3.3 2-5.8V4.5L8 1.5z"
                            stroke="var(--vp-color)" strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827] dark:text-white">White-label</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">Remove &ldquo;Powered by Vela&rdquo; from your website</p>
                      </div>
                    </div>
                    <button onClick={open}>
                      <Toggle checked={true} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Payment Method</p>
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32]">
                    <div className="w-10 h-7 bg-[#111111] rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                    <span className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</span>
                    <button onClick={open} className="ml-auto text-xs text-[#FF6B35] font-medium hover:underline">Update</button>
                  </div>
                </div>
              </>
            )}

            {/* Appearance */}
            {section === "appearance" && (
              <>
                <div>
                  <h2 className="font-semibold text-[#111827] dark:text-white">Appearance</h2>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Choose an accent colour for your dashboard. Changes apply immediately.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { name: "Classic", desc: "Orange & rose",  color: "#FF6B35", accent: "#FF3366", active: true  },
                    { name: "Ocean",   desc: "Blue & sky",     color: "#3B82F6", accent: "#60A5FA", active: false },
                    { name: "Sunset",  desc: "Warm amber",     color: "#FB8C42", accent: "#FBA94C", active: false },
                  ].map((th) => (
                    <button
                      key={th.name}
                      onClick={open}
                      className={`relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                        th.active ? "shadow-sm" : "border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#D1D5DB] dark:hover:border-[#3A3A42]"
                      }`}
                      style={{ borderColor: th.active ? th.color : undefined }}
                    >
                      <div className="flex gap-1.5">
                        <span className="w-7 h-7 rounded-full" style={{ background: th.color }} />
                        <span className="w-7 h-7 rounded-full" style={{ background: th.accent }} />
                        <span className="w-7 h-7 rounded-full bg-white border border-[#E5E7EB]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827] dark:text-white">{th.name}</p>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{th.desc}</p>
                      </div>
                      {th.active && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: th.color }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
