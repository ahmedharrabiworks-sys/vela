"use client";

import { useState } from "react";

const PALETTES = [
  "#FF6B35",
  "#0EA5E9",
  "#7C3AED",
  "#059669",
  "#E11D48",
  "#1A0A00",
];

function LogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 9h3M9 9h4M5 12h2M9 6h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="3" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="6" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1.5 13l4-4 3 3 2.5-2.5 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l1.5 4.5H14l-3.75 2.75L11.75 13 8 10.25 4.25 13l1.5-4.75L2 5.5h4.5L8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
    </svg>
  );
}

function DesktopIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}/>
      <path d="M4.5 13.5h6M7.5 10.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function MobileIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="4" y="1" width="7" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}/>
      <circle cx="7.5" cy="11.5" r="0.8" fill="currentColor"/>
    </svg>
  );
}

/* ── Premium website preview ── */
function PremiumPreview({
  businessName, tagline, description, color, isMobile,
}: {
  businessName: string;
  tagline: string;
  description: string;
  color: string;
  isMobile: boolean;
}) {
  const name = businessName || "Ahmed Dental Clinic";
  const headline = tagline || "Excellence in every smile.";
  const isDark = color === "#1A0A00";

  return (
    <div className={`w-full bg-white rounded-xl overflow-hidden shadow-2xl font-sans text-left ${isMobile ? "max-w-[320px] mx-auto" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: color }}>{name[0]}</div>
          <span className="font-bold text-[#111] text-sm tracking-tight">{name}</span>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-6">
            {["Services", "About", "Reviews", "Contact"].map((l) => (
              <span key={l} className="text-xs font-medium text-gray-400 hover:text-gray-700 cursor-pointer transition-colors">{l}</span>
            ))}
          </div>
        )}
        <button className="text-[11px] font-bold px-3.5 py-2 rounded-lg text-white"
          style={{ background: color }}>Book Now</button>
      </nav>

      {/* Hero — dark premium */}
      <div className="relative overflow-hidden" style={{ background: "#0A0A0A" }}>
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% -10%, ${color}22, transparent)` }} />

        <div className={`relative z-10 ${isMobile ? "px-6 py-10" : "px-10 py-14"}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>AI-Powered Clinic</span>
          </div>
          <h1 className={`font-black text-white leading-none tracking-tighter mb-4 ${isMobile ? "text-3xl" : "text-4xl lg:text-5xl"}`}
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {headline}
          </h1>
          <p className={`text-gray-400 leading-relaxed mb-6 ${isMobile ? "text-sm" : "text-sm max-w-md"}`}>
            {description || "Book appointments instantly on WhatsApp, Instagram & your website — 24/7. Powered by Vela AI."}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button className="text-sm font-bold px-5 py-2.5 rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              Book Appointment →
            </button>
            <button className="text-sm font-semibold px-5 py-2.5 rounded-xl text-gray-300 border border-white/10 hover:border-white/20 transition-all">
              View Services
            </button>
          </div>
          {/* Trust strip */}
          {!isMobile && (
            <div className="flex items-center gap-5 mt-8 pt-6 border-t border-white/8">
              {["4.9★ Rating", "500+ Patients", "10 Years Experience"].map((t) => (
                <span key={t} className="text-[11px] text-gray-500 font-medium">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Services grid */}
      <div className={`${isMobile ? "px-5 py-6" : "px-8 py-8"} bg-white`}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color }}>Our Services</p>
        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {[
            { name: "Dental Cleaning", price: "AED 350", desc: "45-min deep clean" },
            { name: "Teeth Whitening", price: "AED 800", desc: "Professional bleaching" },
            { name: "Consultation",    price: "AED 150", desc: "Full examination" },
          ].map((s) => (
            <div key={s.name} className="rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
              <div className="w-7 h-7 rounded-lg mb-3 flex items-center justify-center"
                style={{ background: `${color}12` }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" stroke={color} strokeWidth="1.2"/>
                  <path d="M5 7l1.5 1.5 3-3" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-[#111] mb-0.5">{s.name}</p>
              <p className="text-[10px] text-gray-400 mb-2">{s.desc}</p>
              <p className="text-sm font-black" style={{ color }}>{s.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Booking CTA strip */}
      <div className="px-8 py-5 flex items-center justify-between gap-4" style={{ background: color }}>
        <div>
          <p className={`font-black text-white ${isMobile ? "text-sm" : "text-base"}`}>Book your appointment today</p>
          <p className="text-white/70 text-xs mt-0.5">Available on WhatsApp · Instagram · Website</p>
        </div>
        <button className="shrink-0 text-xs font-bold px-4 py-2.5 rounded-lg bg-white"
          style={{ color }}>Book Now →</button>
      </div>

      {/* AI chat widget */}
      <div className="relative">
        <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-lg border border-gray-100 bg-white">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black"
            style={{ background: color }}>AI</div>
          <div>
            <p className="text-[10px] font-bold text-[#111]">Vela AI</p>
            <p className="text-[9px] text-gray-400">Hi! How can I help? 👋</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        </div>
        {/* spacer so the widget shows */}
        <div className="h-16" />
      </div>
    </div>
  );
}

/* ── Page ── */
export default function WebsitePage() {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [businessName, setBusinessName] = useState("Ahmed Dental Clinic");
  const [tagline, setTagline] = useState("Excellence in every smile.");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [color, setColor] = useState("#FF6B35");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      // Simulate AI parsing the prompt
      const words = prompt.toLowerCase();
      if (words.includes("dental") || words.includes("clinic") || words.includes("tooth")) {
        setBusinessName("Premium Dental Studio");
        setTagline("Excellence in every smile.");
        setDescription("Expert dental care with state-of-the-art technology. From routine cleanings to complete smile transformations — your comfort is our priority.");
      } else if (words.includes("gym") || words.includes("fitness") || words.includes("yoga")) {
        setBusinessName(words.includes("yoga") ? "Zen Yoga Studio" : "Peak Performance Gym");
        setTagline("Push beyond your limits.");
        setDescription("World-class training facilities and expert coaches. Transform your body and mind with personalized programs designed for real results.");
      } else if (words.includes("salon") || words.includes("hair") || words.includes("beauty")) {
        setBusinessName("Luxe Hair Studio");
        setTagline("Your hair, perfected.");
        setDescription("Premium hair care by award-winning stylists. Color, cuts, and treatments that turn heads — every single visit.");
      } else if (words.includes("spa") || words.includes("massage") || words.includes("wellness")) {
        setBusinessName("Serenity Wellness Spa");
        setTagline("Restore. Renew. Revive.");
        setDescription("A sanctuary of calm in the heart of the city. Expert therapists, premium products, and treatments designed to deeply restore your wellbeing.");
      } else {
        setTagline("Excellence you can feel.");
        setDescription(prompt.charAt(0).toUpperCase() + prompt.slice(1) + ". Book instantly via WhatsApp, Instagram, or our website — powered by Vela AI.");
      }
      setGenerating(false);
    }, 1400);
  };

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1A0A00]">Website Builder</h1>
          <p className="text-sm text-[#888888] mt-1">AI-powered booking website, ready in seconds</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#f0e8e0] text-[#888888] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all min-h-[40px]"
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 6.5l3 3 6-6" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M9 1H3a1 1 0 00-1 1v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <rect x="4" y="3" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button className="btn-primary text-xs px-5 py-2.5 min-h-[40px]">
            Publish Website →
          </button>
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

      <div className="flex gap-5 items-start">

        {/* LEFT PANEL */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex flex-col gap-4 w-full md:w-[300px] shrink-0`}>

          {/* AI prompt */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FF6B35]" style={{ background: "#FF6B35" + "15" }}>
                <SparkleIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1A0A00]">Describe Your Website</p>
                <p className="text-[10px] text-[#888888]">AI builds it for you</p>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I run a dental clinic in Dubai. Premium service, clean design, want to attract high-value patients..."
              rows={4}
              className="w-full text-sm resize-none rounded-xl border border-[#f0e8e0] px-3.5 py-3 text-[#1A0A00] placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 transition-colors leading-relaxed"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[46px]"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              {generating ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" strokeDasharray="20 14"/>
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <SparkleIcon />
                  Generate Website
                </>
              )}
            </button>
          </div>

          {/* Business details */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 space-y-4">
            <p className="text-sm font-bold text-[#1A0A00]">Details</p>

            <div>
              <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors min-h-[44px]"/>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Headline</label>
              <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors min-h-[44px]"/>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Short business description…"
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] resize-none placeholder:text-[#bbb] focus:outline-none focus:border-[#FF6B35]/40 transition-colors"/>
            </div>
          </div>

          {/* Upload */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5 space-y-3">
            <p className="text-sm font-bold text-[#1A0A00]">Assets</p>
            {[
              { icon: <LogoIcon />, label: "Upload Logo", sub: "SVG, PNG — max 2MB" },
              { icon: <ImageIcon />, label: "Hero Image", sub: "JPG, PNG — max 5MB" },
            ].map((u) => (
              <button key={u.label}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-[#e8e0d8] hover:border-[#FF6B35]/40 hover:bg-[#FFF5F0] transition-all text-left min-h-[52px]">
                <span className="text-[#bbb]">{u.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-[#888888]">{u.label}</p>
                  <p className="text-[9px] text-[#bbb]">{u.sub}</p>
                </div>
                <svg className="ml-auto text-[#ccc]" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 11v1.5A1.5 1.5 0 002.5 14h9a1.5 1.5 0 001.5-1.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Color palette */}
          <div className="bg-white rounded-2xl border border-[#f0e8e0] shadow-card p-5">
            <p className="text-sm font-bold text-[#1A0A00] mb-3">Accent Color</p>
            <div className="flex items-center gap-2.5">
              {PALETTES.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-[#FF6B35] scale-110" : ""}`}
                  style={{ background: c, ringColor: c }} />
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL — preview */}
        <div className={`${activeTab === "editor" ? "hidden md:flex" : "flex"} flex-1 flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm font-semibold text-[#1A0A00]">Live Preview</p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-white border border-[#f0e8e0] rounded-xl shadow-sm">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] ${
                    device === d ? "text-white" : "text-[#888888] hover:text-[#1A0A00]"
                  }`}
                  style={device === d ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                  {d === "desktop" ? <DesktopIcon active={device === "desktop"} /> : <MobileIcon active={device === "mobile"} />}
                  <span className="capitalize hidden sm:inline">{d}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Browser chrome */}
          <div className="bg-[#EBEBEB] rounded-2xl border border-[#ddd] overflow-hidden shadow-xl">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2F2F2] border-b border-[#ddd]">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-3 bg-white rounded-lg px-3 py-1 text-[11px] text-[#888] border border-[#e0e0e0] flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#bbb]">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M1 5h8M5 1c-1.2 1.5-1.2 6.5 0 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                {businessName ? businessName.toLowerCase().replace(/\s+/g, "") : "yoursite"}.vela.ai
              </div>
            </div>

            {/* Scrollable preview */}
            <div className={`overflow-y-auto bg-gray-50 ${device === "mobile" ? "flex justify-center py-6 px-4" : ""}`}
              style={{ maxHeight: "calc(100vh - 260px)", minHeight: 480 }}>
              {generating ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <svg className="animate-spin text-[#FF6B35]" width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 28" strokeOpacity="0.25"/>
                    <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" strokeDasharray="20 48" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm text-[#888888] font-medium">Building your website…</p>
                </div>
              ) : (
                <PremiumPreview
                  businessName={businessName}
                  tagline={tagline}
                  description={description}
                  color={color}
                  isMobile={device === "mobile"}
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
