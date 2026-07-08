"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

type Msg = { role: "ai" | "user"; content: string; isBuilding?: boolean; isError?: boolean };

const INDUSTRY_SUGGESTIONS: Record<string, string[]> = {
  "Gym & Fitness":    ["Build a site for my gym", "Highlight monthly memberships", "Add a free trial offer"],
  "Beauty & Wellness":["Build a luxury salon website", "Show our treatment menu", "Add a before/after section"],
  "Restaurant":       ["Build a restaurant website with menu", "Add reservation button", "Show signature dishes"],
  "Medical Clinic":   ["Build a medical clinic website", "Show our specialties", "Add online booking"],
  "Real Estate":      ["Build a property agency website", "Show featured listings", "Add free valuation CTA"],
  "Coffee Shop":      ["Build a coffee shop website", "Show drinks menu", "Make it cozy and inviting"],
  "Education":        ["Build an education website", "Show our courses", "Highlight student success"],
  "Hotel":            ["Build a hotel website", "Show room types", "Add direct booking button"],
  "Law Firm":         ["Build a law firm website", "Show practice areas", "Add free consultation CTA"],
  "E-Commerce":       ["Build a product showcase site", "Show bestselling products", "Add customer reviews"],
};

const DEFAULT_SUGGESTIONS = [
  "Build a dental clinic website in Dubai Marina",
  "Build a gym website with membership plans",
  "Build a hair salon website with service menu",
];

export default function WebsitePage() {
  const { t } = useI18n();
  const btype = typeof window !== "undefined" ? localStorage.getItem("vela_business_type") : null;
  const suggestions = (btype && INDUSTRY_SUGGESTIONS[btype]) ? INDUSTRY_SUGGESTIONS[btype] : DEFAULT_SUGGESTIONS;

  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "ai",
    content: btype && INDUSTRY_SUGGESTIONS[btype]
      ? `Hi! I see you run a ${btype} business. Tell me your business name and I'll build your website in seconds.\n\nOr pick a suggestion below:`
      : "Hi! Describe your business and I'll build your website instantly — full design, services, and booking buttons.\n\nOr pick a suggestion below:",
  }]);
  const [input, setInput]     = useState("");
  const [html, setHtml]       = useState("");
  const [device, setDevice]   = useState<"desktop" | "mobile">("desktop");
  const [building, setBuilding] = useState(false);
  const [built, setBuilt]     = useState(false);
  const [copied, setCopied]   = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "preview">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, building]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || building) return;
    setInput("");

    const newMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    const loadingMsg: Msg = {
      role: "ai",
      content: built ? "Updating your website…" : "Building your website…",
      isBuilding: true,
    };
    setMsgs([...newMsgs, loadingMsg]);
    setBuilding(true);

    try {
      const res = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, currentHtml: built ? html : undefined }),
      });
      const data = await res.json() as { html?: string; error?: string };

      if (!res.ok || !data.html) {
        const errText = data.error === "Unauthorized"
          ? "Please sign in to use the website builder."
          : data.error === "AI not configured"
          ? "The AI service isn't set up yet — contact support."
          : "Something went wrong generating your site. Please try again.";
        setMsgs([...newMsgs, { role: "ai", content: errText, isError: true }]);
        setBuilding(false);
        return;
      }

      setHtml(data.html);
      setBuilt(true);
      setActiveTab("preview");

      const successMsg = built
        ? "Done! Your website has been updated. What else would you like to change?"
        : "Your website is ready! Switch to the Preview tab to see it.\n\nWhat would you like to change? Try: \"Make the headline bolder\", \"Change the accent colour to blue\", \"Add a testimonials section\".";

      setMsgs([...newMsgs, { role: "ai", content: successMsg }]);
    } catch {
      setMsgs([...newMsgs, { role: "ai", content: "Connection error. Please check your internet and try again.", isError: true }]);
    }
    setBuilding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">{t("website.title")}</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{t("website.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex md:hidden gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {(["chat", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? "bg-[#FF6B35] text-white" : "text-[#6B7280]"}`}>
                {t}
              </button>
            ))}
          </div>
          {built && (
            <button
              onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${copied ? "border-[#16A34A] text-[#16A34A]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}
            >
              {copied ? t("website.copied") : t("website.copyLink")}
            </button>
          )}
          <button
            className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ background: "#FF6B35" }}
            disabled={!built}
          >
            {t("website.publish")}
          </button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* LEFT: Chat */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex w-full md:w-[38%] flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shrink-0`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#FF6B35] text-white rounded-tr-sm"
                    : msg.isError
                    ? "bg-red-50 text-[#991B1B] rounded-tl-sm border border-red-100"
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

          {/* Suggestions — shown before first user message */}
          {msgs.filter((m) => m.role === "user").length === 0 && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">{t("website.quickStarts")}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors text-left">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[#F3F4F6]">
            <div className="flex items-end gap-2 bg-[#F9FAFB] rounded-xl px-3 py-2.5 border border-[#E5E7EB] focus-within:border-[#FF6B35]/50 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={built ? "What would you like to change?" : "Describe your business…"}
                rows={1}
                disabled={building}
                className="flex-1 bg-transparent text-xs text-[#111111] placeholder:text-[#9CA3AF] resize-none focus:outline-none min-h-[20px] max-h-[80px] disabled:opacity-60"
                style={{ lineHeight: "1.5" }}
              />
              <button onClick={handleSend} disabled={!input.trim() || building}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "#FF6B35" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 10.5l9-4.5-9-4.5v3.5l6 1-6 1V10.5z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className={`${activeTab === "chat" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${built ? "bg-green-400 animate-pulse" : "bg-[#9CA3AF]"}`} />
              <p className="text-xs font-medium text-[#6B7280]">{built ? t("website.livePreview") : t("website.previewEmpty")}</p>
            </div>
            {built && (
              <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button key={d} onClick={() => setDevice(d)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all capitalize ${device === d ? "bg-[#111111] text-white" : "text-[#6B7280]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Browser chrome */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6] shrink-0 bg-[#F9FAFB]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1 text-[11px] text-[#9CA3AF] font-mono">
                  yoursite.vela.ai
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#F9FAFB] flex items-start justify-center p-4">
              {building ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 w-full">
                  <div className="w-10 h-10 rounded-full border-[3px] border-[#FF6B35] border-t-transparent animate-spin" />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-[#111111]">{t("website.building")}</p>
                    <p className="text-xs text-[#6B7280]">Generating design, copy, and booking flow</p>
                  </div>
                </div>
              ) : !built ? (
                <div className="flex items-center justify-center h-full w-full">
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
                <div className={`w-full h-full flex ${device === "mobile" ? "justify-center" : ""}`}>
                  <iframe
                    srcDoc={html}
                    title="Website preview"
                    className={`rounded-xl border border-[#E5E7EB] bg-white ${device === "mobile" ? "max-w-[375px] w-full" : "w-full"}`}
                    style={{ height: "100%", minHeight: 400 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
