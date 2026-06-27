"use client";

import { useState } from "react";

const TABS = ["Business Info", "AI Configuration", "Channels", "Notifications", "Billing"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Business Info");
  const [businessName, setBusinessName] = useState("Ahmed Dental Clinic");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [aiReplyDelay, setAiReplyDelay] = useState("instant");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A0A00]">Settings</h1>
        <p className="text-sm text-[#888888] mt-1">Manage your business configuration and integrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-[#f0e8e0] rounded-xl shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab ? "text-white shadow-sm" : "text-[#888888] hover:text-[#1A0A00]"
            }`}
            style={activeTab === tab ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-6 space-y-6">
        {activeTab === "Business Info" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Business Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: "Business Name", value: businessName, setter: setBusinessName },
                { label: "Industry", value: "Dental Clinic", setter: () => {} },
                { label: "Phone", value: "+971 50 111 2222", setter: () => {} },
                { label: "Email", value: "hello@ahmedclinic.ae", setter: () => {} },
                { label: "City", value: "Dubai, UAE", setter: () => {} },
                { label: "Website", value: "ahmedclinic.ae", setter: () => {} },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">{field.label}</label>
                  <input
                    type="text"
                    defaultValue={field.value}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Services (used by AI)</label>
              <textarea
                rows={4}
                defaultValue="Dental cleaning, Teeth whitening, Root canal, Braces consultation, Check-up, Tooth extraction"
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none"
              />
            </div>

            <button className="btn-primary text-sm px-6 py-2.5">Save Changes</button>
          </>
        )}

        {activeTab === "AI Configuration" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">AI Configuration</h2>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">AI Tone</label>
              <div className="flex flex-wrap gap-2">
                {["professional", "friendly", "formal", "casual"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                      tone === t ? "text-white shadow-sm" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"
                    }`}
                    style={tone === t ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">Response Language</label>
              <div className="flex flex-wrap gap-2">
                {["English", "Arabic", "Auto-detect"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      language === l ? "text-white" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"
                    }`}
                    style={language === l ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">Reply Timing</label>
              <div className="flex flex-wrap gap-2">
                {["instant", "1-2 min", "5 min"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setAiReplyDelay(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      aiReplyDelay === d ? "text-white" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"
                    }`}
                    style={aiReplyDelay === d ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Custom AI Instructions</label>
              <textarea
                rows={5}
                placeholder="e.g. Always mention our free parking. Never discuss competitor pricing. Offer a 10% discount to first-time callers."
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#888888] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none"
              />
            </div>

            <button className="btn-primary text-sm px-6 py-2.5">Save AI Config</button>
          </>
        )}

        {activeTab === "Channels" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Channel Connections</h2>
            <div className="space-y-4">
              {[
                { name: "Instagram", connected: true, icon: "📸", color: "#E1306C" },
                { name: "WhatsApp Business", connected: true, icon: "💬", color: "#25D366" },
                { name: "Website Chat Widget", connected: false, icon: "🌐", color: "#FF6B35" },
              ].map((ch) => (
                <div key={ch.name} className="flex items-center justify-between p-4 rounded-xl border border-[#f0e8e0]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ch.icon}</span>
                    <div>
                      <p className="font-semibold text-[#1A0A00] text-sm">{ch.name}</p>
                      <p className="text-xs" style={{ color: ch.connected ? "#22c55e" : "#888888" }}>
                        {ch.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <button
                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                      ch.connected
                        ? "border border-[#f0e8e0] text-[#888888] hover:border-red-200 hover:text-red-500"
                        : "text-white"
                    }`}
                    style={!ch.connected ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}
                  >
                    {ch.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl border border-[#f0e8e0] bg-[#FFF5F0]">
              <p className="text-xs font-bold text-[#1A0A00] mb-2">Website Embed Code</p>
              <div className="bg-[#1A0A00] rounded-lg p-3 font-mono text-[10px] text-[#FF6B35] overflow-x-auto">
                {`<script src="https://widget.vela.ai/embed.js" data-id="YOUR_ID"></script>`}
              </div>
              <button className="mt-2 text-xs font-semibold text-[#FF6B35] hover:underline">Copy code</button>
            </div>
          </>
        )}

        {activeTab === "Notifications" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Notification Preferences</h2>
            <div className="space-y-3">
              {[
                { label: "New lead notification", sub: "When AI captures a new lead", enabled: true },
                { label: "Booking confirmation", sub: "When an appointment is booked", enabled: true },
                { label: "AI handoff alert", sub: "When AI requests human takeover", enabled: true },
                { label: "Daily summary email", sub: "Morning summary of yesterday's activity", enabled: false },
                { label: "WhatsApp notifications", sub: "Receive alerts via WhatsApp", enabled: true },
              ].map((notif) => (
                <div key={notif.label} className="flex items-center justify-between p-4 rounded-xl border border-[#f0e8e0]">
                  <div>
                    <p className="font-semibold text-[#1A0A00] text-sm">{notif.label}</p>
                    <p className="text-xs text-[#888888]">{notif.sub}</p>
                  </div>
                  <div className={`w-10 h-5.5 rounded-full relative cursor-pointer transition-all ${notif.enabled ? "bg-[#FF6B35]" : "bg-[#f0e8e0]"}`}
                    style={{ width: 40, height: 22 }}>
                    <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${notif.enabled ? "left-5" : "left-0.5"}`}
                      style={{ width: 18, height: 18, top: 2, left: notif.enabled ? 20 : 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary text-sm px-6 py-2.5">Save Preferences</button>
          </>
        )}

        {activeTab === "Billing" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Billing & Subscription</h2>

            <div className="p-5 rounded-xl border-2 border-[#FF6B35]/30 bg-gradient-to-br from-[#FF6B35]/5 to-[#FF3366]/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-[#1A0A00]">Pro Plan</p>
                  <p className="text-xs text-[#888888]">Renews on July 27, 2026</p>
                </div>
                <span className="text-2xl font-extrabold text-[#FF6B35]">$159<span className="text-sm font-medium text-[#888888]">/mo</span></span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Upgrade to Premium
                </button>
                <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#f0e8e0] text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  Manage Billing
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest">Payment Method</p>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#f0e8e0]">
                <div className="w-10 h-7 bg-[#1A0A00] rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                <span className="text-sm text-[#1A0A00]">•••• •••• •••• 4242</span>
                <span className="text-xs text-[#888888] ml-auto">Expires 09/28</span>
              </div>
              <button className="text-xs font-semibold text-[#FF6B35] hover:underline">Update payment method</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
