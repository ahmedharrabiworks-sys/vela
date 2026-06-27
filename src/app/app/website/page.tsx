"use client";

import { useState } from "react";

const TEMPLATES = [
  { id: "clinic", name: "Medical Clinic", tags: ["Healthcare", "Booking"], active: true },
  { id: "salon", name: "Beauty Salon", tags: ["Beauty", "Booking"], active: false },
  { id: "realestate", name: "Real Estate", tags: ["Property", "Leads"], active: false },
  { id: "gym", name: "Fitness Studio", tags: ["Fitness", "Membership"], active: false },
];

const SECTIONS = [
  { label: "Hero Banner", enabled: true },
  { label: "Services", enabled: true },
  { label: "About Us", enabled: true },
  { label: "Testimonials", enabled: false },
  { label: "Gallery", enabled: false },
  { label: "Contact / Booking", enabled: true },
];

export default function WebsitePage() {
  const [activeTemplate, setActiveTemplate] = useState("clinic");
  const [sections, setSections] = useState(SECTIONS);
  const [published, setPublished] = useState(false);
  const [domain, setDomain] = useState("ahmedclinic");

  const toggleSection = (i: number) => {
    setSections((prev) => prev.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A0A00]">Website Builder</h1>
          <p className="text-sm text-[#888888] mt-1">Your business site, built and hosted by Vela.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFF5F0] border border-[#f0e8e0] text-sm">
            <span className="text-[#888888]">vela.site/</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-transparent text-[#1A0A00] font-semibold w-32 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setPublished(true)}
            className="btn-primary text-xs px-5 py-2.5"
          >
            {published ? "✓ Published" : "Publish Site"}
          </button>
        </div>
      </div>

      {published && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-green-700">Your site is live at</span>
          <a href="#" className="font-bold text-green-600 underline">vela.site/{domain}</a>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left — controls */}
        <div className="space-y-4">
          {/* Template picker */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h2 className="font-bold text-[#1A0A00] mb-4 text-sm">Template</h2>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    activeTemplate === t.id
                      ? "border-[#FF6B35] bg-[#FF6B35]/5"
                      : "border-[#f0e8e0] hover:border-[#FF6B35]/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1A0A00]">{t.name}</p>
                    <div className="flex gap-1 mt-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f0e8e0] text-[#888888]">{tag}</span>
                      ))}
                    </div>
                  </div>
                  {activeTemplate === t.id && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sections toggle */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h2 className="font-bold text-[#1A0A00] mb-4 text-sm">Page Sections</h2>
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-[#f0e8e0] last:border-0">
                  <span className="text-sm text-[#1A0A00]">{s.label}</span>
                  <button
                    onClick={() => toggleSection(i)}
                    className="relative w-9 h-5 rounded-full transition-all duration-200"
                    style={{ background: s.enabled ? "#FF6B35" : "#f0e8e0" }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                      style={{ left: s.enabled ? 18 : 2 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <h2 className="font-bold text-[#1A0A00] mb-4 text-sm">Brand Colors</h2>
            <div className="space-y-3">
              {[
                { label: "Primary", color: "#FF6B35" },
                { label: "Background", color: "#FFFFFF" },
                { label: "Text", color: "#1A0A00" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-sm text-[#888888]">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#888888]">{c.color}</span>
                    <div className="w-7 h-7 rounded-lg border border-[#f0e8e0] cursor-pointer" style={{ background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — live preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f0e8e0] shadow-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f0e8e0] bg-[#FFF5F0]">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-[#888888] border border-[#f0e8e0]">
              vela.site/{domain}
            </div>
          </div>

          {/* Mockup preview */}
          <div className="h-[520px] overflow-hidden">
            {/* Hero section preview */}
            <div className="h-52 relative flex items-center px-10" style={{ background: "linear-gradient(135deg,#1A0A00,#2d1200)" }}>
              <div>
                <div className="text-[10px] font-semibold text-[#FF6B35] uppercase tracking-widest mb-2">Dental Excellence</div>
                <div className="text-2xl font-extrabold text-white leading-tight mb-3" style={{ letterSpacing: "-0.03em" }}>
                  Your smile is our<br />priority.
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Book Now</div>
                  <div className="px-4 py-1.5 rounded-lg text-white/60 text-xs font-semibold border border-white/20">Our Services</div>
                </div>
              </div>
              <div className="absolute right-10 bottom-0 w-28 h-28 rounded-full bg-[#FF6B35]/10" />
            </div>

            {/* Services preview */}
            {sections[1].enabled && (
              <div className="px-8 py-5 bg-white">
                <p className="text-[10px] font-bold text-[#888888] uppercase tracking-widest mb-3">Services</p>
                <div className="grid grid-cols-3 gap-2">
                  {["Cleaning", "Whitening", "Braces"].map((s) => (
                    <div key={s} className="rounded-xl border border-[#f0e8e0] p-3 text-center">
                      <div className="w-8 h-8 rounded-full mx-auto mb-1.5 bg-[#FF6B35]/10" />
                      <p className="text-[10px] font-semibold text-[#1A0A00]">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact preview */}
            {sections[5].enabled && (
              <div className="px-8 py-5 bg-[#FFF5F0]">
                <p className="text-[10px] font-bold text-[#888888] uppercase tracking-widest mb-3">Book an Appointment</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-7 rounded-lg bg-white border border-[#f0e8e0]" />
                  <div className="px-3 h-7 rounded-lg text-white text-[10px] font-semibold flex items-center" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Book</div>
                </div>
              </div>
            )}

            <div className="px-8 py-3 border-t border-[#f0e8e0] flex items-center justify-between">
              <span className="text-[9px] text-[#888888]">Powered by Vela</span>
              <div className="flex gap-1 w-16 h-1.5 rounded-full bg-green-100 overflow-hidden">
                <div className="w-3/4 h-full bg-green-400 rounded-full" />
              </div>
              <span className="text-[9px] text-green-500 font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
