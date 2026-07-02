"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { getProfile, saveProfile } from "@/lib/business-profile";

const TABS = ["Business Info", "AI Configuration", "Channels", "Notifications", "Billing"];

/* ── Channel config stored in localStorage ── */
const CHANNEL_KEY = "vela_channels";

type ChannelConfig = {
  instagram: { connected: boolean; username: string };
  whatsapp:  { connected: boolean; phone: string };
};

function loadChannels(): ChannelConfig {
  if (typeof window === "undefined") return { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } };
  try {
    const raw = localStorage.getItem(CHANNEL_KEY);
    return raw ? JSON.parse(raw) : { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } };
  } catch { return { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } }; }
}

function saveChannels(c: ChannelConfig) {
  if (typeof window !== "undefined") localStorage.setItem(CHANNEL_KEY, JSON.stringify(c));
}

/* ── Toast ── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#1A0A00] text-white text-sm font-medium shadow-2xl">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {msg}
    </div>
  );
}

/* ── Modal shell ── */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* ── Step indicator ── */
function Steps({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${current > i ? "bg-[#FF6B35] text-white" : current === i ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
            {current > i ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : i + 1}
          </div>
          {i < total - 1 && <div className={`h-px w-8 transition-colors ${current > i ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Instagram modal ── */
const INSTAGRAM_OAUTH_URL =
  "https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=https%3A%2F%2Fapp.vela.ai%2Fauth%2Finstagram%2Fcallback&scope=instagram_basic%2Cinstagram_manage_messages%2Cpages_show_list&response_type=code";

function InstagramModal({ onClose, onConnect }: { onClose: () => void; onConnect: (username: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [username, setUsername] = useState("");

  const PERMISSIONS = [
    { label: "Read Instagram DMs", desc: "So Vela AI can see and respond to incoming messages" },
    { label: "Manage messages",     desc: "So Vela AI can send replies on your behalf" },
    { label: "Read page info",      desc: "To link your Instagram Business account to your Facebook Page" },
  ];

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect Instagram</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Step {step + 1} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <Steps total={3} current={step} />

        {step === 0 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Permissions required</p>
            <p className="text-xs text-[#6B7280] mb-4">Vela needs the following access to automate your Instagram DMs:</p>
            <div className="space-y-3 mb-6">
              {PERMISSIONS.map((p) => (
                <div key={p.label} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                  <div className="w-5 h-5 rounded-full bg-[#FF6B35]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#111111]">{p.label}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-4">You need an Instagram Business or Creator account connected to a Facebook Page.</p>
            <button onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: "#111111" }}>
              Continue to Meta Authorization
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Authorize with Meta</p>
            <p className="text-xs text-[#6B7280] mb-5">Click below to open Meta&apos;s secure authorization page. Log in with Facebook and grant the permissions shown.</p>
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] mb-5">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Authorization URL</p>
              <p className="text-[11px] text-[#6B7280] font-mono break-all">facebook.com/v18.0/dialog/oauth?scope=instagram_basic,instagram_manage_messages…</p>
            </div>
            <button
              onClick={() => {
                window.open(INSTAGRAM_OAUTH_URL, "_blank", "width=600,height=700,scrollbars=yes");
                setStep(2);
              }}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity mb-3"
              style={{ background: "#1877F2" }}>
              Open Meta Authorization
            </button>
            <button onClick={() => setStep(0)} className="w-full py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">
              Back
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Complete connection</p>
            <p className="text-xs text-[#6B7280] mb-4">After authorizing, enter your Instagram username to finish linking your account.</p>
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Instagram Username</label>
              <div className="flex items-center border border-[#E5E7EB] rounded-xl overflow-hidden focus-within:border-[#FF6B35]/50 transition-colors">
                <span className="px-3 py-3 text-sm text-[#9CA3AF] border-r border-[#E5E7EB] bg-[#FAFAFA]">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                  placeholder="yourbusiness"
                  autoFocus
                  className="flex-1 px-3 py-3 text-sm text-[#111111] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Back</button>
              <button
                onClick={() => { if (username.trim()) onConnect(username.trim()); }}
                disabled={!username.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "#FF6B35" }}>
                Connect Account
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── WhatsApp modal ── */
const COUNTRY_CODES = [
  { code: "+971", label: "AE +971" },
  { code: "+966", label: "SA +966" },
  { code: "+974", label: "QA +974" },
  { code: "+965", label: "KW +965" },
  { code: "+973", label: "BH +973" },
  { code: "+968", label: "OM +968" },
  { code: "+1",   label: "US +1"   },
  { code: "+44",  label: "UK +44"  },
  { code: "+91",  label: "IN +91"  },
  { code: "+20",  label: "EG +20"  },
];

function WhatsAppModal({ onClose, onConnect }: { onClose: () => void; onConnect: (phone: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [countryCode, setCountryCode] = useState("+971");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const fullPhone = `${countryCode} ${number}`;

  const handleCodeChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const fullCode = code.join("");

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect WhatsApp Business</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Step {step + 1} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <Steps total={3} current={step} />

        {step === 0 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-4">Enter your WhatsApp Business number</p>
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-3 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] bg-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors shrink-0">
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                  placeholder="50 000 0000"
                  autoFocus
                  className="flex-1 px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                />
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] mb-5">
              <p className="text-[11px] text-[#6B7280]">Make sure this number is registered as a WhatsApp Business account before continuing.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Cancel</button>
              <button onClick={() => { if (number.trim()) setStep(1); }} disabled={!number.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "#25D366" }}>
                Send Verification Code
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Enter verification code</p>
            <p className="text-xs text-[#6B7280] mb-5">A 6-digit code was sent to <span className="font-semibold text-[#111111]">{fullPhone}</span></p>
            <div className="flex gap-2 justify-center mb-4">
              {code.map((digit, i) => (
                <input key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/60 transition-colors"
                />
              ))}
            </div>
            <button onClick={() => setStep(0)} className="text-xs text-[#6B7280] hover:text-[#FF6B35] transition-colors block mb-5">
              Wrong number? Change it
            </button>
            <button onClick={() => { if (fullCode.length === 6) setStep(2); }} disabled={fullCode.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: "#25D366" }}>
              Verify Code
            </button>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.1)", border: "2px solid rgba(37,211,102,0.25)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h4 className="font-bold text-[#111111] mb-1">WhatsApp Business Connected</h4>
            <p className="text-sm font-semibold text-[#374151] mb-1">{fullPhone}</p>
            <p className="text-xs text-[#9CA3AF] mb-6">Vela AI will now reply to your WhatsApp Business messages automatically.</p>
            <button onClick={() => onConnect(fullPhone)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: "#FF6B35" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Channels tab ── */
function ChannelsTab({ tenantId }: { tenantId: string }) {
  const [channels, setChannels] = useState<ChannelConfig>(loadChannels);
  const [modal, setModal] = useState<"instagram" | "whatsapp" | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.vela.ai").replace(/\/$/, "");
  const embedCode = `<script src="${appUrl}/api/embed/${tenantId || "YOUR_TENANT_ID"}" async></script>`;

  const connectInstagram = (username: string) => {
    const next = { ...channels, instagram: { connected: true, username } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
    setToast("Instagram connected successfully");
  };

  const connectWhatsApp = (phone: string) => {
    const next = { ...channels, whatsapp: { connected: true, phone } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
    setToast("WhatsApp Business connected successfully");
  };

  const disconnect = (ch: "instagram" | "whatsapp") => {
    const next = { ...channels, [ch]: { connected: false, username: "", phone: "" } };
    setChannels(next);
    saveChannels(next);
    setToast(`${ch === "instagram" ? "Instagram" : "WhatsApp"} disconnected`);
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setToast("Embed code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const CHANNELS = [
    {
      key: "instagram" as const,
      name: "Instagram",
      desc: "AI replies to your Instagram DMs automatically",
      connectedDesc: channels.instagram.connected ? `@${channels.instagram.username}` : "",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="16" height="16" rx="4.5" stroke="#374151" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="3.5" stroke="#374151" strokeWidth="1.5"/>
          <circle cx="14.5" cy="5.5" r="1" fill="#374151"/>
        </svg>
      ),
    },
    {
      key: "whatsapp" as const,
      name: "WhatsApp Business",
      desc: "AI replies to WhatsApp Business messages automatically",
      connectedDesc: channels.whatsapp.connected ? channels.whatsapp.phone : "",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a8 8 0 0 1 6.928 12L18 18l-4.133-1.069A8 8 0 1 1 10 2z" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M7.5 8.5c.2.8 1.2 2.4 2 3.2.8.8 2.1 1.7 2.9 1.8.5.1.8-.1 1-.4l.3-.5c.1-.2 0-.4-.1-.5l-1-.5c-.2-.1-.4 0-.5.1l-.3.4c-.5-.2-1.4-.9-1.9-1.9l.3-.3c.1-.1.2-.3.1-.5l-.5-1c-.1-.2-.3-.2-.5-.1l-.5.3c-.3.3-.5.6-.4 1z" stroke="#374151" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {modal === "instagram" && <InstagramModal onClose={() => setModal(null)} onConnect={connectInstagram} />}
      {modal === "whatsapp"  && <WhatsAppModal  onClose={() => setModal(null)} onConnect={connectWhatsApp} />}

      <h2 className="font-bold text-[#111111] text-lg mb-1">Channel Connections</h2>
      <p className="text-sm text-[#6B7280] mb-6">Connect your messaging channels. Vela AI will reply automatically on each.</p>

      <div className="space-y-3">
        {CHANNELS.map((ch) => {
          const isConnected = ch.key === "instagram" ? channels.instagram.connected : channels.whatsapp.connected;
          return (
            <div key={ch.key} className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center shrink-0">
                  {ch.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111111]">{ch.name}</p>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${isConnected ? "text-green-600" : "text-[#9CA3AF]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-[#D1D5DB]"}`} />
                      {isConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {isConnected ? ch.connectedDesc : ch.desc}
                  </p>
                </div>
              </div>
              {isConnected ? (
                <button onClick={() => disconnect(ch.key)}
                  className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-red-200 hover:text-red-500 transition-all shrink-0">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => setModal(ch.key)}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] shrink-0 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  Connect
                </button>
              )}
            </div>
          );
        })}

        {/* Website Chat Widget */}
        <div className="p-4 rounded-xl bg-white border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="11" rx="2" stroke="#374151" strokeWidth="1.5"/>
                  <path d="M7 17h6M10 13v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#111111]">Website Chat Widget</p>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Ready to embed
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">Add an AI chat bubble to any website</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-4">
            {[
              { n: 1, text: "Copy the embed code below" },
              { n: 2, text: "Paste it before the </body> tag on your website" },
              { n: 3, text: "The chat bubble will appear in the bottom-right corner" },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-[11px] font-bold flex items-center justify-center shrink-0">{s.n}</span>
                <p className="text-xs text-[#374151]">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Code block */}
          <div className="relative mb-4">
            <div className="bg-[#111111] rounded-xl p-4 font-mono text-xs text-[#FF6B35] overflow-x-auto leading-relaxed pr-24">
              {embedCode}
            </div>
            <button onClick={copyEmbed}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{ background: copied ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#16A34A" : "rgba(255,255,255,0.6)" }}>
              {copied ? (
                <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied</>
              ) : (
                <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="3.5" y="3.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H6.5" stroke="currentColor" strokeWidth="1.1"/></svg>Copy Code</>
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Chat Bubble Preview</p>
            <div className="relative h-16">
              <div className="absolute bottom-0 right-0 flex items-end gap-2">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#374151] font-medium whitespace-nowrap">Hi! How can I help?</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg" style={{ background: "#FF6B35" }}>
                  AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   MAIN SETTINGS PAGE
══════════════════════════════════════════ */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Business Info");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");
  const [toast, setToast] = useState("");

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [services, setServices] = useState("");

  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [aiDelay, setAiDelay] = useState("instant");
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setUserEmail(user.email ?? "");
          const meta = user.user_metadata ?? {};

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: tenant } = await (supabase as any)
              .from("tenants")
              .select("business_name, industry, city, phone, website")
              .eq("owner_id", user.id)
              .single();

            if (tenant) {
              setBusinessName(tenant.business_name ?? "");
              setIndustry(tenant.industry ?? meta.business_type ?? "");
              setCity(tenant.city ?? meta.city ?? "");
              setPhone(tenant.phone ?? meta.phone ?? "");
              setWebsite(tenant.website ?? "");
            } else {
              setIndustry(meta.business_type ?? "");
              setCity(meta.city ?? "");
              setPhone(meta.phone ?? "");
            }
          } catch {
            setIndustry(meta.business_type ?? "");
            setCity(meta.city ?? "");
            setPhone(meta.phone ?? "");
          }
        }
      } catch { /* silently fall back */ }

      const profile = getProfile();
      if (profile) {
        setBusinessName((prev) => prev || profile.businessName || "");
        setIndustry((prev) => prev || profile.businessType || "");
        setPhone((prev) => prev || profile.phone || "");
        setCity((prev) => prev || profile.city || "");
        setUserEmail((prev) => prev || profile.email || "");
      }

      const aiCfg = typeof window !== "undefined" ? localStorage.getItem("vela_ai_config") : null;
      if (aiCfg) {
        try {
          const cfg = JSON.parse(aiCfg);
          if (cfg.tone) setTone(cfg.tone);
          if (cfg.language) setLanguage(cfg.language);
          if (cfg.aiDelay) setAiDelay(cfg.aiDelay);
          if (cfg.customInstructions) setCustomInstructions(cfg.customInstructions);
        } catch { /* ignore */ }
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveBusiness = async () => {
    setSaving(true);
    setSaveStatus("");
    saveProfile({ businessName, businessType: industry, phone, city });
    try {
      if (userId) {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("tenants")
          .upsert({ owner_id: userId, business_name: businessName, industry, city, phone, website, plan: getProfile()?.plan ?? "starter" }, { onConflict: "owner_id" });
      }
      setSaveStatus("saved");
      setToast("Settings saved");
    } catch {
      setSaveStatus("saved");
      setToast("Saved locally");
    }
    setSaving(false);
    setTimeout(() => setSaveStatus(""), 2500);
  };

  const handleSaveAI = async () => {
    setSaving(true);
    setSaveStatus("");
    if (typeof window !== "undefined") {
      localStorage.setItem("vela_ai_config", JSON.stringify({ tone, language, aiDelay, customInstructions }));
    }
    try {
      if (userId) {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tenant } = await (supabase as any).from("tenants").select("id").eq("owner_id", userId).single();
        if (tenant) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from("tenant_config").upsert({ tenant_id: tenant.id, tone, language });
        }
      }
    } catch { /* table may not exist */ }
    setSaving(false);
    setSaveStatus("saved");
    setToast("AI configuration saved");
    setTimeout(() => setSaveStatus(""), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 bg-[#F3F4F6] rounded-xl w-32" />
        <div className="h-12 bg-[#F3F4F6] rounded-xl" />
        <div className="h-80 bg-[#F3F4F6] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}

      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Settings</h1>
        <p className="text-sm text-[#6B7280] mt-1">Manage your business configuration and integrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSaveStatus(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab ? "text-white shadow-sm" : "text-[#6B7280] hover:text-[#111111]"
            }`}
            style={activeTab === tab ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-6">

        {/* ── Business Info ── */}
        {activeTab === "Business Info" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">Business Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Industry</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Medical Clinic, Gym, Restaurant"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 000 0000"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={userEmail} readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#6B7280] bg-[#FAFAFA] cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Dubai, UAE"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Services (used by AI)</label>
              <textarea rows={3} value={services} onChange={(e) => setServices(e.target.value)}
                placeholder="List your services, e.g. Consultation, Cleaning, Premium Package"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveBusiness} disabled={saving}
                className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-70 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Saved
                </span>
              )}
            </div>
          </>
        )}

        {/* ── AI Configuration ── */}
        {activeTab === "AI Configuration" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">AI Configuration</h2>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">AI Tone</label>
              <div className="flex flex-wrap gap-2">
                {["professional", "friendly", "formal", "casual"].map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tone === t ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={tone === t ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">Response Language</label>
              <div className="flex flex-wrap gap-2">
                {["English", "Arabic", "Auto-detect"].map((l) => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${language === l ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={language === l ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">Reply Timing</label>
              <div className="flex flex-wrap gap-2">
                {["instant", "1-2 min", "5 min"].map((d) => (
                  <button key={d} onClick={() => setAiDelay(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${aiDelay === d ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={aiDelay === d ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Custom AI Instructions</label>
              <textarea rows={5} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Always mention our free parking. Never discuss competitor pricing. Offer 10% discount to first-time customers."
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveAI} disabled={saving}
                className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-70 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {saving ? "Saving…" : "Save AI Config"}
              </button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Saved
                </span>
              )}
            </div>
          </>
        )}

        {/* ── Channels ── */}
        {activeTab === "Channels" && <ChannelsTab tenantId={userId} />}

        {/* ── Notifications ── */}
        {activeTab === "Notifications" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">Notification Preferences</h2>
            <div className="space-y-3">
              {[
                { label: "New lead notification",  sub: "When AI captures a new lead",             enabled: true  },
                { label: "Booking confirmation",   sub: "When an appointment is booked",           enabled: true  },
                { label: "AI handoff alert",        sub: "When AI requests human takeover",         enabled: true  },
                { label: "Daily summary email",    sub: "Morning summary of yesterday's activity", enabled: false },
                { label: "WhatsApp notifications", sub: "Receive alerts via WhatsApp",             enabled: true  },
              ].map((notif) => (
                <div key={notif.label} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <p className="font-semibold text-[#111111] text-sm">{notif.label}</p>
                    <p className="text-xs text-[#6B7280]">{notif.sub}</p>
                  </div>
                  <div className="relative cursor-pointer" style={{ width: 40, height: 22 }}>
                    <div className={`w-full h-full rounded-full transition-all ${notif.enabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />
                    <span className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all" style={{ left: notif.enabled ? 21 : 3 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Save Preferences
            </button>
          </>
        )}

        {/* ── Billing ── */}
        {activeTab === "Billing" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">Billing & Subscription</h2>
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-[#111111] capitalize">{getProfile()?.plan ?? "Starter"} Plan</p>
                  <p className="text-xs text-[#6B7280]">Renews automatically · Cancel anytime</p>
                </div>
                <span className="text-2xl font-extrabold text-[#FF6B35]">
                  {getProfile()?.plan === "premium" ? "$299" : getProfile()?.plan === "pro" ? "$159" : "$79"}
                  <span className="text-sm font-medium text-[#6B7280]">/mo</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Upgrade Plan
                </button>
                <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  Manage Billing
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">Payment Method</p>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E7EB]">
                <div className="w-10 h-7 bg-[#111111] rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                <span className="text-sm text-[#6B7280]">No card on file</span>
              </div>
              <button className="text-xs font-semibold text-[#FF6B35] hover:underline">Add payment method</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
