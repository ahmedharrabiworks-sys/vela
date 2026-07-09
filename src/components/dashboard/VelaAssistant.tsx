"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/business-profile";
import { useI18n } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data-URL previews shown in the bubble
  isError?: boolean;
  retryText?: string;
};

type AttachedImage = { preview: string; base64: string; mimeType: string };

const QUICK_ACTION_KEYS = [
  { labelKey: "velaAssistant.quickActions.todayAppointments", messageKey: "velaAssistant.quickMessages.todayAppointments" },
  { labelKey: "velaAssistant.quickActions.recentLeads",       messageKey: "velaAssistant.quickMessages.recentLeads" },
  { labelKey: "velaAssistant.quickActions.needsAttention",    messageKey: "velaAssistant.quickMessages.needsAttention" },
  { labelKey: "velaAssistant.quickActions.writeReply",        messageKey: "velaAssistant.quickMessages.writeReply" },
  { labelKey: "velaAssistant.quickActions.trainMe",           messageKey: "velaAssistant.quickMessages.trainMe", isInterview: true },
] as const;

function extractSaveKbToken(text: string): { json: string; stripped: string } | null {
  const start = text.indexOf("[save_kb:");
  if (start === -1) return null;
  const jsonStart = start + "[save_kb:".length;
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
  if (jsonEnd === -1 || text[jsonEnd] !== "]") return null;
  return {
    json: text.slice(jsonStart, jsonEnd),
    stripped: (text.slice(0, start) + text.slice(jsonEnd + 1)).replace(/\n{3,}/g, "\n\n").trim(),
  };
}

function VAvatar({ size = 24, mt = false }: { size?: number; mt?: boolean }) {
  const icon = Math.round(size * 0.52);
  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center${mt ? " mt-0.5" : ""}`}
      style={{ width: size, height: size, background: "var(--vela-gradient)" }}
    >
      <svg width={icon} height={icon} viewBox="0 0 14 14" fill="none">
        <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export function VelaAssistant() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [firstName, setFirstName] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTACH   = 4;
  const MAX_IMG_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const remaining = MAX_ATTACH - attachedImages.length;
    files.slice(0, remaining).forEach((file) => {
      if (!file.type.startsWith("image/") || file.size > MAX_IMG_SIZE) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        setAttachedImages((prev) => [...prev, { preview: dataUrl, base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const QUICK_ACTIONS = QUICK_ACTION_KEYS.map((qa) => ({
    label: t(qa.labelKey),
    message: t(qa.messageKey),
    isInterview: "isInterview" in qa ? qa.isInterview : false,
  }));

  useEffect(() => {
    const profile = getProfile();
    if (profile?.ownerName) setFirstName(profile.ownerName.split(" ")[0]);
  }, []);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const hi = firstName ? `${t("velaAssistant.greeting")} ${firstName}! ` : `${t("velaAssistant.greeting")}! `;
      setMessages([{
        role: "assistant",
        content: `${hi}${t("velaAssistant.greetingMessage")}`,
      }]);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages.length, firstName, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Keep sendRef current so the event listener doesn't need to re-register on every render
  const sendRef = useRef<typeof send | null>(null);

  // Event listener for "answer 5 quick questions" from the training page
  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setInterviewMode(true);
      setMessages([]);
      setTimeout(() => {
        sendRef.current?.(t("velaAssistant.quickMessages.trainMe"), true);
      }, 500);
    };
    window.addEventListener("vela-start-interview", handler);
    return () => window.removeEventListener("vela-start-interview", handler);
  }, []);

  const send = useCallback(async (text: string, startInterview = false) => {
    if ((!text.trim() && attachedImages.length === 0) || loading) return;
    const isInterview = startInterview || interviewMode;
    if (startInterview) setInterviewMode(true);

    const imagesToSend = attachedImages.map(({ base64, mimeType }) => ({ data: base64, mimeType }));
    const imagePreviews = attachedImages.map((img) => img.preview);
    setAttachedImages([]);
    setMessages((prev) => [...prev, {
      role: "user",
      content: text,
      images: imagePreviews.length > 0 ? imagePreviews : undefined,
    }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
          interviewMode: isInterview,
          locale,
          images: imagesToSend.length > 0 ? imagesToSend : undefined,
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };

      if (!res.ok) {
        const errText =
          data.error === "Unauthorized"
            ? t("velaAssistant.errorUnauthorized")
            : data.error === "Tenant not found"
            ? t("velaAssistant.errorTenantNotFound")
            : data.error === "AI not configured"
            ? t("velaAssistant.errorNotConfigured")
            : t("velaAssistant.errorGeneric");
        setMessages((prev) => [...prev, { role: "assistant", content: errText, isError: true, retryText: text }]);
        setLoading(false);
        return;
      }

      let reply = data.reply ?? t("velaAssistant.errorNoResponse");

      // Handle [navigate:/path] token
      const navMatch = reply.match(/\[navigate:([^\]]+)\]/);
      if (navMatch) {
        reply = reply.replace(/\[navigate:[^\]]+\]/g, "").trim();
        setTimeout(() => { router.push(navMatch[1]); setOpen(false); }, 800);
      }

      // Handle [save_kb:{...}] token
      const kbToken = extractSaveKbToken(reply);
      if (kbToken) {
        reply = kbToken.stripped;
        try {
          const kbData = JSON.parse(kbToken.json);
          await fetch("/api/ai-training?merge=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kbData),
          });
          setInterviewMode(false);
          reply = (reply ? reply + "\n\n" : "") + t("velaAssistant.kbUpdated");
        } catch {
          reply = (reply ? reply + "\n\n" : "") + t("velaAssistant.kbSaveFailed");
          setInterviewMode(false);
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: t("velaAssistant.errorConnection"),
        isError: true,
        retryText: text,
      }]);
    }
    setLoading(false);
  }, [loading, messages, router, interviewMode, attachedImages, locale, t]);

  // Update ref whenever send changes (useCallback deps may change)
  useEffect(() => { sendRef.current = send; }, [send]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 end-6 z-[140] w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ background: "var(--vela-gradient)" }}
        aria-label="Open Vela AI Assistant"
      >
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ background: "var(--vp-color)" }} />
        )}
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="relative z-10">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M8 10h8M8 14h5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-[141] bg-black/40 sm:hidden" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="fixed z-[142] inset-0 sm:inset-auto sm:end-6 sm:bottom-[88px] sm:w-96 bg-white sm:rounded-2xl shadow-2xl flex flex-col border border-[#E5E7EB] overflow-hidden"
            style={{ maxHeight: "calc(100vh - 120px)", minHeight: "400px" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 shrink-0"
              style={{ background: "var(--vela-gradient)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">{t("velaAssistant.title")}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{t("velaAssistant.subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-[11px] text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {t("velaAssistant.clearChat")}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick actions — shown before first user message */}
            {messages.filter((m) => m.role === "user").length === 0 && (
              <div className="px-3 py-2.5 border-b border-[#F3F4F6] shrink-0 bg-[#FAFAFA]">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2 font-semibold px-0.5">{t("velaAssistant.quickQuestionsLabel")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => {
                        if (qa.isInterview) {
                          send("I want to train my AI — please start the interview now.", true);
                        } else {
                          send(qa.message);
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                        qa.isInterview
                          ? "border-[#FF6B35] text-[#FF6B35] bg-[#FFF5F0] hover:bg-[#FF6B35] hover:text-white font-semibold"
                          : "border-[#E5E7EB] text-[#374151] bg-white hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      }`}
                    >{qa.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <VAvatar size={24} mt />}
                  <div className={`flex flex-col max-w-[82%]${msg.role === "assistant" ? " ml-2" : ""}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-br-sm"
                          : msg.isError
                          ? "bg-red-50 text-[#991B1B] rounded-bl-sm border border-red-100"
                          : "bg-[#F3F4F6] text-[#111111] rounded-bl-sm"
                      }`}
                      style={msg.role === "user" ? { background: "var(--vela-gradient)" } : {}}
                    >
                      {msg.content && msg.content.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                      {msg.images && msg.images.length > 0 && (
                        <div className={`flex gap-1.5 flex-wrap${msg.content ? " mt-2" : ""}`}>
                          {msg.images.map((src, imgIdx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={imgIdx}
                              src={src}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover border border-white/30"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.isError && msg.retryText && (
                      <button
                        onClick={() => send(msg.retryText!)}
                        className="mt-1.5 text-[11px] font-semibold text-[#FF6B35] hover:text-[#FF3366] flex items-center gap-1 transition-colors self-start"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6a4 4 0 014-4 4 4 0 013.46 2M10 2v3H7M10 6a4 4 0 01-4 4 4 4 0 01-3.46-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t("velaAssistant.retryButton")}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start items-end gap-2">
                  <VAvatar size={24} />
                  <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pt-3 border-t border-[#F3F4F6] shrink-0 bg-white" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Thumbnail preview strip */}
              {attachedImages.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                  {attachedImages.map((img, i) => (
                    <div key={i} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-[#E5E7EB]"
                      />
                      <button
                        onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#374151] text-white flex items-center justify-center hover:bg-[#111111] transition-colors"
                        aria-label="Remove image"
                      >
                        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-1.5">
                {/* Paperclip / attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || attachedImages.length >= MAX_ATTACH}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 disabled:opacity-40 shrink-0 transition-all"
                  aria-label="Attach image"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 7.5l-5.5 5.5a4 4 0 01-5.657-5.657l6-6a2.5 2.5 0 013.536 3.536L5.88 10.88a1 1 0 01-1.414-1.414L10.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("velaAssistant.inputPlaceholder")}
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none text-sm border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors disabled:opacity-60"
                  style={{ minHeight: "40px", maxHeight: "100px" }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={(!input.trim() && attachedImages.length === 0) || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0 hover:opacity-90 transition-opacity"
                  style={{ background: "var(--vp-color)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M12.5 1.5L1.5 7.5l4 2m7-8l-7 8m0 0v3l2.5-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-1.5 text-center">
                {t("velaAssistant.keyboardHint")} <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[9px]">Enter</kbd> {t("velaAssistant.keyboardSend")}<kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[9px]">Shift+Enter</kbd> {t("velaAssistant.keyboardNewline")}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
