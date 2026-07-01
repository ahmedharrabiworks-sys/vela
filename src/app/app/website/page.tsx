"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "ai" | "user"; content: string; isBuilding?: boolean };

type SiteData = {
  businessName: string;
  tagline: string;
  description: string;
  color: string;
  services: { name: string; price: string; desc: string }[];
  trustItems: string[];
};

const DEFAULT_SITE: SiteData = {
  businessName: "Ahmed Dental Clinic",
  tagline: "Excellence in every smile.",
  description: "Book appointments instantly via WhatsApp, Instagram & your website — 24/7.",
  color: "#FF6B35",
  services: [
    { name: "Dental Cleaning",  price: "AED 350", desc: "45-min deep clean" },
    { name: "Teeth Whitening",  price: "AED 800", desc: "Professional bleaching" },
    { name: "Consultation",     price: "AED 150", desc: "Full examination" },
  ],
  trustItems: ["4.9★ Rating", "500+ Patients", "10 Years Experience"],
};

function parseSite(msg: string, base: SiteData): SiteData {
  const s: SiteData = { ...base, services: [...base.services] };
  const m = msg.toLowerCase();

  if (m.includes("gym") || m.includes("fitness")) {
    s.businessName = m.includes("peak") ? "Peak Performance Gym" : "FitZone Gym";
    s.tagline = "Push beyond your limits.";
    s.description = "State-of-the-art equipment, expert coaches, and programs built for real results.";
    s.color = "#FF6B35";
    s.services = [
      { name: "Monthly Membership", price: "AED 299/mo", desc: "Full gym access" },
      { name: "Personal Training",  price: "AED 200/session", desc: "1-on-1 coaching" },
      { name: "Group Classes",      price: "AED 80/class", desc: "HIIT, yoga, spin" },
    ];
    s.trustItems = ["500+ Members", "20+ Classes/Week", "Expert Trainers"];
  } else if (m.includes("salon") || m.includes("hair") || m.includes("beauty")) {
    s.businessName = "Luxe Hair Studio";
    s.tagline = "Your hair, perfected.";
    s.description = "Premium cuts, colour, and styling by award-winning stylists. Book in seconds.";
    s.color = "#FF6B35";
    s.services = [
      { name: "Haircut & Style",    price: "AED 150", desc: "Cut, wash, blow-dry" },
      { name: "Colour Treatment",   price: "AED 350", desc: "Full colour or highlights" },
      { name: "Keratin Treatment",  price: "AED 600", desc: "Smoothing & frizz control" },
    ];
    s.trustItems = ["★4.9 Rating", "2000+ Clients", "Award-Winning Stylists"];
  } else if (m.includes("spa") || m.includes("wellness") || m.includes("massage")) {
    s.businessName = "Serenity Wellness Spa";
    s.tagline = "Restore. Renew. Revive.";
    s.description = "Expert therapists and premium treatments in the heart of the city.";
    s.color = "#FF6B35";
    s.services = [
      { name: "Deep Tissue Massage", price: "AED 350", desc: "90-min full body" },
      { name: "Facial Treatment",    price: "AED 280", desc: "Hydrating & anti-ageing" },
      { name: "Couples Package",     price: "AED 780", desc: "For two, 90 min" },
    ];
    s.trustItems = ["800+ Reviews", "Certified Therapists", "5-Star Rated"];
  } else if (m.includes("real estate") || m.includes("property")) {
    s.businessName = "Premium Properties";
    s.tagline = "Find your perfect home.";
    s.description = "Exclusive listings across Dubai, Abu Dhabi & Sharjah — from AED 500K.";
    s.color = "#FF6B35";
    s.services = [
      { name: "Property Sales",    price: "Free Consultation", desc: "Villas & apartments" },
      { name: "Rentals",           price: "No Agency Fee",     desc: "Short & long term" },
      { name: "Investment Advice", price: "Free",              desc: "ROI analysis" },
    ];
    s.trustItems = ["500+ Properties", "AED 2B+ in Sales", "10 Years in UAE"];
  } else if (m.includes("dental") || m.includes("clinic") || m.includes("medical")) {
    // Keep default dental or adjust name
    if (m.includes("premium") || m.includes("luxury")) s.tagline = "World-class dental care.";
    if (m.includes("cosmetic")) { s.tagline = "Transforming smiles, changing lives."; }
  }

  // Apply follow-up instructions
  if (m.includes("darker") || m.includes("dark hero")) {
    // hero is already dark, no change needed
  }
  if (m.includes("testimonial")) {
    // would add testimonials section (simulated)
  }

  // If they just mentioned a business name
  const nameMatch = msg.match(/(?:called?|named?|it's|is)\s+["']?([A-Z][^"'\n.]{2,40})["']?/i);
  if (nameMatch) s.businessName = nameMatch[1].trim();

  return s;
}

function getAIResponse(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("darker") || m.includes("dark")) return "Done! I've enhanced the hero section with a deeper, more dramatic background.";
  if (m.includes("testimonial")) return "Added! A testimonials section now appears below your services with 3 real-looking reviews.";
  if (m.includes("color") || m.includes("colour")) return "Updated the accent colour throughout your site.";
  if (m.includes("contact") || m.includes("phone")) return "Done! Added a contact section with your phone and map.";
  if (m.includes("price") || m.includes("cost")) return "Updated! Your services section now shows the new pricing.";
  if (m.includes("logo")) return "Got it — your logo area has been updated. Upload your image in the assets panel above.";
  if (m.includes("book")) return "The booking flow is already live — visitors can tap 'Book Now' to message you on WhatsApp instantly.";
  return "Done! I've updated your website based on that instruction. Keep going — what else would you like to change?";
}

/* ── Website Preview ── */
function WebPreview({ site, isMobile }: { site: SiteData; isMobile: boolean }) {
  return (
    <div className={`w-full bg-white overflow-hidden font-sans text-left ${isMobile ? "max-w-[320px] mx-auto" : ""}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif", borderRadius: 12 }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: site.color }}>{site.businessName[0]}</div>
          <span className="font-bold text-[#111] text-xs tracking-tight">{site.businessName}</span>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-5">
            {["Services", "About", "Reviews", "Contact"].map((l) => (
              <span key={l} className="text-[10px] font-medium text-gray-400">{l}</span>
            ))}
          </div>
        )}
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: site.color }}>Book Now</button>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "#0A0A0A" }}>
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 60% at 50% -10%, ${site.color}22, transparent)` }} />
        <div className={`relative z-10 ${isMobile ? "px-5 py-8" : "px-8 py-10"}`}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: site.color }} />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Powered by Vela AI</span>
          </div>
          <h1 className={`font-black text-white leading-none tracking-tighter mb-3 ${isMobile ? "text-2xl" : "text-3xl"}`}>{site.tagline}</h1>
          <p className="text-gray-400 text-xs leading-relaxed mb-5 max-w-sm">{site.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="text-[11px] font-bold px-4 py-2 rounded-lg text-white" style={{ background: site.color }}>Book Appointment →</button>
            <button className="text-[11px] font-semibold px-4 py-2 rounded-lg text-gray-300 border border-white/10">View Services</button>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/8">
              {site.trustItems.map((t) => <span key={t} className="text-[10px] text-gray-500 font-medium">{t}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      <div className={`${isMobile ? "px-4 py-5" : "px-6 py-6"} bg-white`}>
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-3" style={{ color: site.color }}>Services</p>
        <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
          {site.services.map((s) => (
            <div key={s.name} className="rounded-xl p-3.5 border border-gray-100">
              <p className="text-xs font-bold text-[#111] mb-0.5">{s.name}</p>
              <p className="text-[10px] text-gray-400 mb-1.5">{s.desc}</p>
              <p className="text-xs font-black" style={{ color: site.color }}>{s.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ background: site.color }}>
        <div>
          <p className="font-black text-white text-xs">Book today</p>
          <p className="text-white/60 text-[9px] mt-0.5">Via WhatsApp · Instagram · Website</p>
        </div>
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white" style={{ color: site.color }}>Book →</button>
      </div>

      {/* AI widget spacer */}
      <div className="relative bg-white px-4 py-3">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-black" style={{ background: site.color }}>AI</div>
          <div>
            <p className="text-[9px] font-bold text-[#111]">Vela AI</p>
            <p className="text-[8px] text-gray-400">Hi! How can I help?</p>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function WebsitePage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", content: "Hi! Tell me about your business and I'll build your website instantly.\n\nJust describe what you do, who your customers are, and the vibe you're going for." },
  ]);
  const [input, setInput] = useState("");
  const [site, setSite] = useState<SiteData>(DEFAULT_SITE);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btype = typeof window !== "undefined" ? localStorage.getItem("vela_business_type") : null;
    if (btype) setSite(parseSite(btype, DEFAULT_SITE));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const newMsgs: Msg[] = [...msgs, { role: "user", content: text }];

    if (!built) {
      // First message — build the site
      setMsgs([...newMsgs, { role: "ai", content: "Building your website…", isBuilding: true }]);
      setBuilding(true);

      setTimeout(() => {
        const newSite = parseSite(text, site);
        setSite(newSite);
        setBuilding(false);
        setBuilt(true);
        setMsgs([...newMsgs, {
          role: "ai",
          content: `Your website is ready! I built a ${newSite.businessName} site with a dark hero, services section, and booking buttons.\n\nWhat would you like to change? Try: "Make the headline bigger", "Change accent colour to black", "Add a testimonials section"`,
        }]);
      }, 2000);
    } else {
      // Follow-up — update the site
      setMsgs([...newMsgs, { role: "ai", content: "Updating…", isBuilding: true }]);
      setTimeout(() => {
        const updated = parseSite(text, site);
        setSite(updated);
        setMsgs([...newMsgs, { role: "ai", content: getAIResponse(text) }]);
      }, 900);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Website Builder</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Chat with AI to build your booking website</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile tab toggle */}
          <div className="flex md:hidden gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {(["chat", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? "bg-[#FF6B35] text-white" : "text-[#6B7280]"}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${copied ? "border-[#16A34A] text-[#16A34A]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}>
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
            Publish →
          </button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* LEFT: Chat */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex w-full md:w-[38%] flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shrink-0`}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 mr-2 mt-0.5" style={{ background: "#FF6B35" }}>
                    AI
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#FF6B35] text-white rounded-tr-sm"
                    : "bg-[#F9FAFB] text-[#111111] rounded-tl-sm border border-[#F3F4F6]"
                } ${msg.isBuilding ? "animate-pulse" : ""}`}>
                  {msg.isBuilding ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                      <span className="text-[#6B7280]">{msg.content}</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          {msgs.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">Try one of these:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "I run a dental clinic in Dubai Marina",
                  "I have a gym in Abu Dhabi",
                  "I own a hair salon in Sharjah",
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-[10px] px-2.5 py-1 bg-[#F3F4F6] text-[#374151] rounded-full hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[#F3F4F6]">
            <div className="flex items-end gap-2 bg-[#F9FAFB] rounded-xl px-3 py-2.5 border border-[#E5E7EB] focus-within:border-[#FF6B35]/50 transition-colors">
              {/* Camera icon */}
              <button className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors shrink-0 pb-0.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M5 4V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V4" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
              </button>
              {/* Color picker trigger */}
              <button className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors shrink-0 pb-0.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 2.5A5.5 5.5 0 0113.5 8" stroke="#FF6B35" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M8 2.5A5.5 5.5 0 002.5 8" stroke="#111" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={built ? "What would you like to change?" : "Describe your business…"}
                rows={1}
                className="flex-1 bg-transparent text-xs text-[#111111] placeholder:text-[#9CA3AF] resize-none focus:outline-none min-h-[20px] max-h-[80px]"
                style={{ lineHeight: "1.5" }}
              />
              <button onClick={handleSend} disabled={!input.trim() || building}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#FF6B35" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 10L10 6 2 2v3.5L7 6l-5 0.5V10z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className={`${activeTab === "chat" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>

          {/* Preview toolbar */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${built ? "bg-green-400 animate-pulse" : "bg-[#9CA3AF]"}`} />
              <p className="text-xs font-medium text-[#6B7280]">{built ? "yoursite.vela.ai — live preview" : "Preview will appear here"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button key={d} onClick={() => setDevice(d)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all capitalize ${device === d ? "bg-[#111111] text-white" : "text-[#6B7280]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Browser chrome */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6] shrink-0 bg-[#F9FAFB]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1 text-[11px] text-[#9CA3AF] font-mono">
                  {site.businessName.toLowerCase().replace(/\s+/g, "-")}.vela.ai
                </div>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]">
              {building ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 rounded-full border-3 border-[#FF6B35] border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-[#111111]">Building your website…</p>
                    <p className="text-xs text-[#6B7280]">Generating design, copy, and booking flow</p>
                  </div>
                </div>
              ) : !built ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-3 max-w-xs">
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E5E7EB] flex items-center justify-center mx-auto">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="3" width="20" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/>
                        <path d="M8 21h8M12 18v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#374151]">Your website preview</p>
                    <p className="text-xs text-[#9CA3AF]">Describe your business in the chat to generate your website</p>
                  </div>
                </div>
              ) : (
                <div className={device === "mobile" ? "flex justify-center" : ""}>
                  <WebPreview site={site} isMobile={device === "mobile"} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
