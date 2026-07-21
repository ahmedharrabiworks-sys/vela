"use client";

import { DEMO_PROFILE } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2A2A32]">
        <p className="text-sm font-bold text-[#374151] dark:text-[#D1D5DB]">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onFocus }: { label: string; value: string; onFocus: () => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <input
        defaultValue={value}
        onFocus={onFocus}
        className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-2.5 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
      />
    </div>
  );
}

function Toggle({ label, desc, checked, onToggle }: { label: string; desc: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-[#111827] dark:text-white">{label}</p>
        <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? "bg-[#FF6B35]" : "bg-[#E5E7EB] dark:bg-[#2A2A32]"}`}
        style={{ height: "22px" }}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[20px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export default function DemoSettingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [notifs, setNotifs] = useState({ newLead: true, appt: true, missed: false, weekly: true });

  const open = () => setShowModal(true);

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Settings</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Manage your account and preferences</p>
          </div>
          <button
            onClick={open}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--vp-color)" }}
          >
            Save Changes
          </button>
        </div>

        {/* Business Profile */}
        <Section title="Business Profile">
          <Field label="Business Name"     value={DEMO_PROFILE.business}       onFocus={open} />
          <Field label="Owner / Contact"   value={DEMO_PROFILE.name}           onFocus={open} />
          <Field label="Email"             value={DEMO_PROFILE.email}          onFocus={open} />
          <Field label="Phone"             value="+971 4 123 4567"             onFocus={open} />
          <Field label="Address"           value="Building 5, Business Bay, Dubai, UAE" onFocus={open} />
          <Field label="Website"           value="https://ahmeddentalclinic.ae" onFocus={open} />
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Industry</label>
            <select
              onFocus={open}
              defaultValue="dental"
              className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-2.5 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/50 appearance-none"
            >
              <option value="dental">Dental / Healthcare</option>
              <option value="beauty">Beauty & Wellness</option>
              <option value="fitness">Fitness & Sports</option>
            </select>
          </div>
        </Section>

        {/* AI Agent */}
        <Section title="AI Agent">
          <Field label="AI Agent Name"     value="Vela"                        onFocus={open} />
          <Field label="Greeting Message"  value="Hello! Welcome to Ahmed Dental Clinic. How can I help you today?" onFocus={open} />
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">AI Tone</label>
            <select
              onFocus={open}
              defaultValue="professional"
              className="w-full border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-2.5 text-sm text-[#111827] dark:text-white bg-white dark:bg-[#17171C] focus:outline-none focus:border-[#FF6B35]/50 appearance-none"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly & Warm</option>
              <option value="formal">Formal</option>
            </select>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle
            label="New Lead Alert"
            desc="Get notified when a new lead comes in via any channel"
            checked={notifs.newLead}
            onToggle={() => { open(); }}
          />
          <Toggle
            label="Appointment Reminders"
            desc="24-hour reminder before each scheduled appointment"
            checked={notifs.appt}
            onToggle={() => { open(); }}
          />
          <Toggle
            label="Missed Call Alerts"
            desc="Notify when AI couldn't resolve a call and transferred"
            checked={notifs.missed}
            onToggle={() => { open(); }}
          />
          <Toggle
            label="Weekly Report"
            desc="Sunday digest with your weekly performance summary"
            checked={notifs.weekly}
            onToggle={() => { open(); }}
          />
        </Section>

        {/* Plan */}
        <Section title="Plan & Billing">
          <div className="flex items-center justify-between gap-4 p-4 bg-[#FFF8F5] dark:bg-[#1E1A16] border border-[#FF6B35]/30 rounded-xl">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-[#111827] dark:text-white">Pro Plan</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--vp-color)" }}>ACTIVE</span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Unlimited conversations · All channels · Priority support</p>
            </div>
            <button onClick={open} className="text-xs font-semibold text-[#FF6B35] hover:underline whitespace-nowrap">
              Manage Plan →
            </button>
          </div>
          <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
            Your subscription renews on August 21, 2026. Cancel anytime.
          </p>
        </Section>

        {/* Danger zone */}
        <Section title="Account">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#111827] dark:text-white">Export Data</p>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">Download all your leads, conversations, and appointments</p>
            </div>
            <button onClick={open} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
              Export
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#DC2626]">Delete Account</p>
              <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">Permanently delete your account and all data</p>
            </div>
            <button onClick={open} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
              Delete
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}
