"use client";

import { useState } from "react";
import { DEMO_MARKETING } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

type Tool = "social" | "broadcast" | "video";

const TOOLS: { id: Tool; label: string; desc: string; color: string }[] = [
  { id: "social",    label: "Social Post",    desc: "AI-generated posts for Instagram, Facebook & more", color: "#E1306C" },
  { id: "broadcast", label: "Broadcast",      desc: "Bulk WhatsApp & Instagram message campaigns",       color: "#25D366" },
  { id: "video",     label: "Video Script",   desc: "Scene-by-scene scripts for Reels & TikTok",         color: "#7C3AED" },
];

export default function DemoMarketingPage() {
  const [active, setActive] = useState<Tool>("social");
  const [copied, setCopied] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => null);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeTool = TOOLS.find((t) => t.id === active)!;

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[#111827] dark:text-white">Marketing</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">AI-powered content creation for your clinic</p>
        </div>

        {/* Tool selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActive(tool.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                active === tool.id
                  ? "border-[#FF6B35] bg-[#FFF8F5] dark:bg-[#1E1A16]"
                  : "bg-white dark:bg-[#1E1E24] border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#9CA3AF] dark:hover:border-[#3A3A48]"
              }`}
            >
              <p className={`text-sm font-bold mb-0.5 ${active === tool.id ? "text-[#FF6B35]" : "text-[#111827] dark:text-white"}`}>
                {tool.label}
              </p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{tool.desc}</p>
            </button>
          ))}
        </div>

        {/* Active tool panel */}
        <div className="bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl overflow-hidden">
          {/* Tool header */}
          <div className="px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2A2A32] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: activeTool.color }}
              >
                {activeTool.label.toUpperCase()}
              </span>
              <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Pre-generated example</span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:underline"
            >
              ✦ Generate New
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: inputs (read-only) */}
            <div className="p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-[#F3F4F6] dark:border-[#2A2A32]">
              {active === "social" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Topic</label>
                    <div className="border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-[#FAFAFA] dark:bg-[#17171C]">
                      {DEMO_MARKETING.social.prompt}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Platform</label>
                      <div className="border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-[#FAFAFA] dark:bg-[#17171C]">
                        {DEMO_MARKETING.social.platform}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Tone</label>
                      <div className="border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-[#FAFAFA] dark:bg-[#17171C]">
                        {DEMO_MARKETING.social.tone}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {active === "broadcast" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Target Audience</label>
                    <div className="border border-[#FF6B35] bg-[#FFF8F5] dark:bg-[#1E1A16] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white">
                      {DEMO_MARKETING.broadcast.audience}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Channel</label>
                    <div className="border border-[#FF6B35] bg-[#FFF8F5] dark:bg-[#1E1A16] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white">
                      {DEMO_MARKETING.broadcast.channel}
                    </div>
                  </div>
                </>
              )}
              {active === "video" && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Topic</label>
                    <div className="border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-4 py-3 text-sm text-[#111827] dark:text-white bg-[#FAFAFA] dark:bg-[#17171C]">
                      {DEMO_MARKETING.video.topic}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider block mb-1.5">Duration</label>
                    <div className="flex gap-2">
                      {["30s", "60s", "90s", "3min"].map((d) => (
                        <div
                          key={d}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold text-center border ${
                            d === DEMO_MARKETING.video.duration
                              ? "border-[#FF6B35] bg-[#FFF8F5] dark:bg-[#1E1A16] text-[#FF6B35]"
                              : "border-[#E5E7EB] dark:border-[#2A2A32] text-[#6B7280] dark:text-[#9CA3AF]"
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                style={{ background: "var(--vp-color)" }}
              >
                Regenerate
              </button>
            </div>

            {/* Right: output */}
            <div className="p-5 flex flex-col">
              <p className="text-[11px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wider mb-3">Generated Output</p>
              <div className="flex-1 bg-[#F9FAFB] dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl p-4 overflow-y-auto min-h-[200px]">
                <pre className="text-sm text-[#374151] dark:text-[#D1D5DB] whitespace-pre-wrap leading-relaxed font-sans">
                  {active === "social"    ? DEMO_MARKETING.social.result
                   : active === "broadcast" ? DEMO_MARKETING.broadcast.result
                   : DEMO_MARKETING.video.result}
                </pre>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copy(
                    active === "social" ? DEMO_MARKETING.social.result
                    : active === "broadcast" ? DEMO_MARKETING.broadcast.result
                    : DEMO_MARKETING.video.result,
                    active
                  )}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    copied === active
                      ? "bg-[#ECFDF5] dark:bg-[#052E16]/40 text-[#059669] dark:text-[#34D399]"
                      : "border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {copied === active ? "Copied!" : "Copy"}
                </button>
                {active === "broadcast" && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vp-color)" }}
                  >
                    Send Broadcast
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
