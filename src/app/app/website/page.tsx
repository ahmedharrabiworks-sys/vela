"use client";

import { useState } from "react";

const BUSINESS_TYPES = [
  { id: "dental", icon: "🦷", label: "Dental Clinic", desc: "Appointments & consults" },
  { id: "salon", icon: "✂️", label: "Hair Salon", desc: "Cuts, color & styling" },
  { id: "fitness", icon: "💪", label: "Gym / Fitness", desc: "Classes & memberships" },
  { id: "spa", icon: "🧖", label: "Spa & Wellness", desc: "Treatments & packages" },
  { id: "restaurant", icon: "🍽️", label: "Restaurant", desc: "Reservations & orders" },
  { id: "retail", icon: "🛍️", label: "Retail Shop", desc: "Products & bookings" },
];

const COLOR_SCHEMES = [
  { id: "orange", primary: "#FF6B35", label: "Sunset" },
  { id: "blue", primary: "#0EA5E9", label: "Ocean" },
  { id: "green", primary: "#059669", label: "Forest" },
  { id: "purple", primary: "#7C3AED", label: "Royal" },
  { id: "rose", primary: "#E11D48", label: "Rose" },
  { id: "dark", primary: "#1A0A00", label: "Midnight" },
];

function WebsitePreview({
  businessName, businessType, color, tagline, isMobile,
}: {
  businessName: string; businessType: string; color: string; tagline: string; isMobile: boolean;
}) {
  const type = BUSINESS_TYPES.find((t) => t.id === businessType) ?? BUSINESS_TYPES[0];
  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-[#f0e8e0] ${isMobile ? "w-[280px]" : "w-full"} mx-auto`}>
      {/* Nav */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${color}20` }}>
        <span className="font-extrabold text-sm" style={{ color }}>{businessName || "Your Business"}</span>
        <div className="flex items-center gap-3">
          {!isMobile && ["Services", "About", "Contact"].map((l) => (
            <span key={l} className="text-xs text-gray-400">{l}</span>
          ))}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: color }}>Book Now</span>
        </div>
      </div>
      {/* Hero */}
      <div className="px-5 py-8" style={{ background: `linear-gradient(135deg, ${color}10, ${color}05)` }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>{type.icon} {type.label}</span>
        <h1 className={`font-extrabold text-[#1A0A00] mt-2 leading-tight ${isMobile ? "text-lg" : "text-2xl"}`}>
          {tagline || `Welcome to ${businessName || "Your Business"}`}
        </h1>
        <p className="text-xs text-gray-400 mt-2 mb-4">AI booking on WhatsApp, Instagram & Website — 24/7</p>
        <button className="text-xs font-bold px-4 py-2.5 rounded-xl text-white" style={{ background: color }}>
          Book Appointment →
        </button>
      </div>
      {/* Services */}
      <div className="px-5 py-4" style={{ borderTop: `1px solid ${color}15` }}>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Services</p>
        <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {["Consultation", "Treatment", "Follow-up"].map((s) => (
            <div key={s} className="rounded-xl p-3 text-center" style={{ border: `1px solid ${color}20`, background: `${color}05` }}>
              <p className="text-xs font-semibold text-[#1A0A00]">{s}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">From AED 200</p>
            </div>
          ))}
        </div>
      </div>
      {/* AI widget */}
      <div className="px-5 pb-5">
        <div className="rounded-2xl p-3 flex items-center gap-2.5" style={{ border: `1px solid ${color}25`, background: `${color}08` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: color }}>AI</div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#1A0A00]">Vela AI Assistant</p>
            <p className="text-[9px] text-gray-400">Hi! How can I help you today? 👋</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function WebsitePage() {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [businessType, setBusinessType] = useState("dental");
  const [businessName, setBusinessName] = useState("Ahmed Dental Clinic");
  const [tagline, setTagline] = useState("Your smile is our priority");
  const [color, setColor] = useState("#FF6B35");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Website Builder</h1>
          <p className="text-sm text-[#888888] mt-1">Build your AI-powered booking website</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#f0e8e0] text-[#888888] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all min-h-[44px]">
            Preview Live ↗
          </button>
          <button className="btn-primary text-sm px-5 py-2.5 min-h-[44px]">Publish</button>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="flex gap-1 p-1 bg-white border border-[#f0e8e0] rounded-xl shadow-sm mb-5 md:hidden">
        {(["editor", "preview"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all min-h-[44px] ${activeTab === tab ? "text-white" : "text-[#888888]"}`}
            style={activeTab === tab ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
            {tab === "editor" ? "✏️ Editor" : "👁 Preview"}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Left panel — editor */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex flex-col gap-4 w-full md:w-[320px] shrink-0`}>

          {/* Business type */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h3 className="text-sm font-bold text-[#1A0A00] mb-3">Business Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map((type) => (
                <button key={type.id} onClick={() => setBusinessType(type.id)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left min-h-[80px] ${
                    businessType === type.id ? "border-[#FF6B35] bg-[#FFF5F0]" : "border-[#f0e8e0] hover:border-[#FF6B35]/30 hover:bg-[#FFF5F0]/50"
                  }`}>
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-xs font-semibold text-[#1A0A00] leading-tight">{type.label}</span>
                  <span className="text-[9px] text-[#888888] leading-tight">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Business info */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 space-y-3.5">
            <h3 className="text-sm font-bold text-[#1A0A00]">Business Info</h3>
            {[
              { label: "Business Name", value: businessName, setter: setBusinessName },
              { label: "Hero Tagline", value: tagline, setter: setTagline },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input type="text" value={f.value} onChange={(e) => f.setter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors min-h-[44px]" />
              </div>
            ))}
          </div>

          {/* Color scheme */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h3 className="text-sm font-bold text-[#1A0A00] mb-3">Color Scheme</h3>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <button key={scheme.id} onClick={() => setColor(scheme.primary)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all min-h-[64px] ${
                    color === scheme.primary ? "border-[#FF6B35] bg-[#FFF5F0]" : "border-[#f0e8e0] hover:border-gray-300"
                  }`}>
                  <span className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ background: scheme.primary }} />
                  <span className="text-[9px] font-medium text-[#888888]">{scheme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Connected channels */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h3 className="text-sm font-bold text-[#1A0A00] mb-3">AI Channels</h3>
            <div className="space-y-2">
              {[
                { label: "WhatsApp", color: "#25D366", connected: true },
                { label: "Instagram", color: "#E1306C", connected: true },
                { label: "Website Chat", color: "#FF6B35", connected: false },
              ].map((ch) => (
                <div key={ch.label} className="flex items-center justify-between py-2 min-h-[44px]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ch.color }} />
                    <span className="text-sm font-medium text-[#1A0A00]">{ch.label}</span>
                  </div>
                  {ch.connected ? (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Connected</span>
                  ) : (
                    <button className="text-[10px] font-semibold text-[#FF6B35] bg-[#FF6B35]/10 px-2.5 py-1 rounded-full hover:bg-[#FF6B35]/20 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — preview */}
        <div className={`${activeTab === "editor" ? "hidden md:flex" : "flex"} flex-1 flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#1A0A00]">Live Preview</p>
            <div className="flex items-center gap-1 p-1 bg-white border border-[#f0e8e0] rounded-xl shadow-sm">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                    device === d ? "text-white" : "text-[#888888] hover:text-[#1A0A00]"
                  }`}
                  style={device === d ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                  {d === "desktop" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 12h5M7 10v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="3.5" y="1" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="7" cy="11" r="0.7" fill="currentColor"/>
                    </svg>
                  )}
                  <span className="capitalize hidden sm:inline">{d}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`bg-[#f7f3f0] rounded-2xl border border-[#f0e8e0] flex items-start justify-center p-6 md:p-10 min-h-[500px] overflow-auto`}>
            <WebsitePreview
              businessName={businessName}
              businessType={businessType}
              color={color}
              tagline={tagline}
              isMobile={device === "mobile"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
