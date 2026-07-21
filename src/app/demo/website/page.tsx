"use client";

import { useState } from "react";
import { DEMO_WEBSITE_CHAT, DEMO_SITE_HTML, type DemoWebMsg } from "@/lib/demo-data";
import { SignupModal } from "@/app/demo/_components/SignupModal";

export default function DemoWebsitePage() {
  const [reply, setReply] = useState("");
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {showModal && <SignupModal onClose={() => setShowModal(false)} />}

      <div className="h-[calc(100vh-56px)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] dark:border-[#2A2A32] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[#111827] dark:text-white">Website Builder</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--vp-color)" }}>
              PUBLISHED
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Site selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#2A2A32] bg-white dark:bg-[#1E1E24]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1.5" width="10" height="7" rx="1" stroke="#9CA3AF" strokeWidth="1.2"/>
                <path d="M4 10.5h4M6 8.5v2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">Ahmed Dental Clinic</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 4l2.5 2.5 2.5-2.5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vp-color)" }}
            >
              Publish
            </button>
          </div>
        </div>

        {/* Split: chat + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: chat panel */}
          <div className="w-[300px] shrink-0 border-r border-[#E5E7EB] dark:border-[#2A2A32] flex flex-col">
            {/* Chat label */}
            <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#2A2A32] shrink-0">
              <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB]">Build with AI</p>
              <p className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">Chat to customize your site</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {DEMO_WEBSITE_CHAT.map((msg: DemoWebMsg, i: number) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "agent" && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0"
                      style={{ background: "var(--vp-color)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="1.8" stroke="white" strokeWidth="1"/>
                        <path d="M1 5h0.8M8.2 5H9M5 1v0.8M5 8.2V9" stroke="white" strokeWidth="0.9" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FF6B35] text-white rounded-br-sm"
                        : "bg-white dark:bg-[#1E1E24] border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-[#E5E7EB] dark:border-[#2A2A32] shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setShowModal(true)}
                  placeholder="Ask Vela to change something…"
                  rows={2}
                  className="flex-1 border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-white bg-[#F9FAFB] dark:bg-[#1E1E24] placeholder:text-[#9CA3AF] focus:outline-none resize-none"
                />
                <button
                  onClick={() => setShowModal(true)}
                  className="p-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                  style={{ background: "var(--vp-color)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M12 7H2M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right: site preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F3F4F6] dark:bg-[#13131A]">
            {/* Preview bar */}
            <div className="px-4 py-2 border-b border-[#E5E7EB] dark:border-[#2A2A32] flex items-center gap-2 bg-white dark:bg-[#1E1E24] shrink-0">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400"/>
                <span className="w-3 h-3 rounded-full bg-yellow-400"/>
                <span className="w-3 h-3 rounded-full bg-green-400"/>
              </div>
              <div className="flex-1 bg-[#F3F4F6] dark:bg-[#17171C] rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] font-mono text-center">
                vela.app/site/ahmed-dental-clinic
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7a5 5 0 1010 0A5 5 0 002 7z" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* iframe */}
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={DEMO_SITE_HTML}
                title="Ahmed Dental Clinic website preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
