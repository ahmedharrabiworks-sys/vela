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

/* ── Modal shell ── */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-[#f0e8e0] w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* ── Instagram connect modal ── */
function InstagramModal({ onClose, onConnect }: { onClose: () => void; onConnect: (username: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#1A0A00]">Connect Instagram</h3>
            <p className="text-xs text-[#888888] mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}
                style={step >= s ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                {s < step ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : s}
              </div>
              {s < 2 && <div className={`flex-1 h-px w-8 transition-colors ${step > s ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-[#374151] leading-relaxed mb-6">
              Connect your Instagram Business account via Meta to let Vela AI reply to your Instagram DMs automatically.
            </p>
            <div className="p-4 bg-[#FFF5F0] rounded-xl border border-[#FFD5C2] mb-6">
              <p className="text-xs text-[#888888]">Make sure you have an Instagram Business or Creator account connected to a Facebook Page before continuing.</p>
            </div>
            <button
              onClick={() => { window.open("https://www.facebook.com/login", "_blank"); setStep(2); }}
              className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Connect with Meta
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-[#374151] mb-4">Enter your Instagram username to complete the connection:</p>
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Instagram Username</label>
              <div className="flex items-center border border-[#E5E7EB] rounded-xl overflow-hidden focus-within:border-[#FF6B35]/50 transition-colors">
                <span className="px-3 py-3 text-sm text-[#9CA3AF] border-r border-[#E5E7EB] bg-[#FAFAFA]">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                  placeholder="yourbusiness"
                  className="flex-1 px-3 py-3 text-sm text-[#111111] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#888888] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Cancel</button>
              <button
                onClick={() => { if (username.trim()) onConnect(username.trim()); }}
                disabled={!username.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Complete Connection
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── WhatsApp connect modal ── */
function WhatsAppModal({ onClose, onConnect }: { onClose: () => void; onConnect: (phone: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleCodeChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const fullCode = code.join("");

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#1A0A00]">Connect WhatsApp</h3>
            <p className="text-xs text-[#888888] mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}
                style={step >= s ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                {s < step ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : s}
              </div>
              {s < 3 && <div className={`flex-1 h-px w-6 transition-colors ${step > s ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <p className="text-sm text-[#374151] mb-4">Enter your WhatsApp Business phone number with country code:</p>
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                autoFocus
                className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#888888] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">Cancel</button>
              <button
                onClick={() => { if (phone.trim()) setStep(2); }}
                disabled={!phone.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Send Verification Code
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-[#374151] mb-1">Enter the 6-digit code we sent to:</p>
            <p className="text-sm font-semibold text-[#1A0A00] mb-5">{phone}</p>
            <div className="flex gap-2 justify-center mb-5">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/60 transition-colors"
                />
              ))}
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-[#888888] hover:text-[#FF6B35] transition-colors block mb-4">
              Change phone number
            </button>
            <button
              onClick={() => { if (fullCode.length === 6) setStep(3); }}
              disabled={fullCode.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Verify Code
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.12)", border: "2px solid rgba(37,211,102,0.3)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h4 className="font-bold text-[#1A0A00] mb-1">WhatsApp Connected</h4>
              <p className="text-sm text-[#888888] mb-1">{phone}</p>
              <p className="text-xs text-[#9CA3AF] mb-6">Vela AI will now reply to your WhatsApp Business messages automatically.</p>
              <button
                onClick={() => onConnect(phone)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Done
              </button>
            </div>
          </>
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

  const embedCode = `<script src="https://widget.vela.ai/embed.js" data-id="${tenantId || "YOUR_ID"}"></script>`;

  const connectInstagram = (username: string) => {
    const next = { ...channels, instagram: { connected: true, username } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
  };

  const connectWhatsApp = (phone: string) => {
    const next = { ...channels, whatsapp: { connected: true, phone } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
  };

  const disconnect = (ch: "instagram" | "whatsapp") => {
    const next = { ...channels, [ch]: { connected: false, username: "", phone: "" } };
    setChannels(next);
    saveChannels(next);
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {modal === "instagram" && <InstagramModal onClose={() => setModal(null)} onConnect={connectInstagram} />}
      {modal === "whatsapp"  && <WhatsAppModal  onClose={() => setModal(null)} onConnect={connectWhatsApp} />}

      <h2 className="font-bold text-[#1A0A00] text-lg mb-5">Channel Connections</h2>

      <div className="space-y-4">
        {/* Instagram */}
        <div className="p-5 rounded-xl border border-[#f0e8e0]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#405DE6,#833AB4,#C13584,#E1306C,#FD1D1D)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="white" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#1A0A00] text-sm">Instagram</p>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold ${channels.instagram.connected ? "text-green-600" : "text-[#9CA3AF]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${channels.instagram.connected ? "bg-green-500" : "bg-[#D1D5DB]"}`} />
                    {channels.instagram.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                {channels.instagram.connected ? (
                  <p className="text-xs text-[#888888] mt-0.5">@{channels.instagram.username}</p>
                ) : (
                  <p className="text-xs text-[#888888] mt-0.5">AI replies to Instagram DMs automatically</p>
                )}
              </div>
            </div>
            {channels.instagram.connected ? (
              <button onClick={() => disconnect("instagram")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#f0e8e0] text-[#888888] hover:border-red-200 hover:text-red-500 transition-all shrink-0">
                Disconnect
              </button>
            ) : (
              <button onClick={() => setModal("instagram")}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white shrink-0 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Connect Instagram
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="p-5 rounded-xl border border-[#f0e8e0]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                  <path d="M11.998 2C6.478 2 2 6.478 2 11.998c0 1.767.459 3.43 1.265 4.876L2 22l5.274-1.38A9.944 9.944 0 0011.998 22C17.52 22 22 17.522 22 11.998S17.52 2 11.998 2z" fillRule="evenodd" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#1A0A00] text-sm">WhatsApp Business</p>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold ${channels.whatsapp.connected ? "text-green-600" : "text-[#9CA3AF]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${channels.whatsapp.connected ? "bg-green-500" : "bg-[#D1D5DB]"}`} />
                    {channels.whatsapp.connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                {channels.whatsapp.connected ? (
                  <p className="text-xs text-[#888888] mt-0.5">{channels.whatsapp.phone}</p>
                ) : (
                  <p className="text-xs text-[#888888] mt-0.5">AI replies to WhatsApp messages automatically</p>
                )}
              </div>
            </div>
            {channels.whatsapp.connected ? (
              <button onClick={() => disconnect("whatsapp")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#f0e8e0] text-[#888888] hover:border-red-200 hover:text-red-500 transition-all shrink-0">
                Disconnect
              </button>
            ) : (
              <button onClick={() => setModal("whatsapp")}
                className="text-xs font-bold px-4 py-2 rounded-lg text-white shrink-0 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Connect WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Website chat widget */}
        <div className="p-5 rounded-xl border border-[#f0e8e0]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FF6B35]/10 border border-[#FF6B35]/20">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="15" height="11" rx="2" stroke="#FF6B35" strokeWidth="1.4"/>
                <path d="M6 16.5h6M9 12.5v4" stroke="#FF6B35" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#1A0A00] text-sm">Website Chat Widget</p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Ready to embed
                </span>
              </div>
              <p className="text-xs text-[#888888] mt-0.5">Add an AI chat bubble to any website</p>
            </div>
          </div>

          <p className="text-xs text-[#888888] mb-2">Paste this snippet before the <code className="bg-[#F3F4F6] px-1 py-0.5 rounded text-[#374151]">&lt;/body&gt;</code> tag on your website:</p>
          <div className="relative mb-3">
            <div className="bg-[#1A0A00] rounded-xl p-4 font-mono text-xs text-[#FF6B35] overflow-x-auto leading-relaxed">
              {embedCode}
            </div>
            <button
              onClick={copyEmbed}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{ background: copied ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.08)", color: copied ? "#16A34A" : "rgba(255,255,255,0.6)" }}>
              {copied ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="3.5" y="3.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H6.5" stroke="currentColor" strokeWidth="1.1"/></svg>
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Chat bubble preview */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Preview</p>
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

/* ══════════════════════════════════════════════════
   MAIN SETTINGS PAGE
══════════════════════════════════════════════════ */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Business Info");

  /* Loading / saving state */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saved" | "error">("");

  /* Identity */
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  /* Business Info fields */
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [services, setServices] = useState("");

  /* AI Config */
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [aiDelay, setAiDelay] = useState("instant");
  const [customInstructions, setCustomInstructions] = useState("");

  /* Load on mount — Supabase first, localStorage fallback */
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

          /* Try tenants table */
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: tenant } = await (supabase as any)
              .from("tenants")
              .select("business_name, plan")
              .eq("owner_id", user.id)
              .single();

            if (tenant) {
              setBusinessName(tenant.business_name ?? "");
            }
          } catch { /* table may not exist */ }

          /* Fill remaining from user metadata */
          if (!businessName) setBusinessName(meta.business_name ?? "");
          setIndustry(meta.business_type ?? "");
          setCity(meta.city ?? "");
          setPhone(meta.phone ?? "");
        }
      } catch { /* silently fall back */ }

      /* Merge with localStorage profile */
      const profile = getProfile();
      if (profile) {
        if (!businessName) setBusinessName((prev) => prev || profile.businessName || "");
        setIndustry((prev) => prev || profile.businessType || "");
        setPhone((prev) => prev || profile.phone || "");
        setCity((prev) => prev || profile.city || "");
        setUserEmail((prev) => prev || profile.email || "");
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveBusiness = async () => {
    setSaving(true);
    setSaveStatus("");

    /* Always update localStorage */
    saveProfile({ businessName, businessType: industry, phone, city });

    /* Try to upsert to tenants table */
    try {
      if (userId) {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("tenants")
          .upsert({ owner_id: userId, business_name: businessName, plan: getProfile()?.plan ?? "starter" }, { onConflict: "owner_id" });
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved"); // still saved locally
    }

    setSaving(false);
    setTimeout(() => setSaveStatus(""), 2500);
  };

  const handleSaveAI = async () => {
    setSaving(true);
    setSaveStatus("");

    /* Save to localStorage */
    if (typeof window !== "undefined") {
      localStorage.setItem("vela_ai_config", JSON.stringify({ tone, language, aiDelay, customInstructions }));
    }

    /* Try to upsert tenant_config */
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
    setTimeout(() => setSaveStatus(""), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 bg-[#f0e8e0] rounded-xl w-32" />
        <div className="h-12 bg-[#f0e8e0] rounded-xl" />
        <div className="h-80 bg-[#f0e8e0] rounded-2xl" />
      </div>
    );
  }

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
            onClick={() => { setActiveTab(tab); setSaveStatus(""); }}
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

        {/* ── Business Info ── */}
        {activeTab === "Business Info" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Business Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Industry</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Medical Clinic"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#CCC] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 000 0000"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#CCC] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={userEmail} readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#888888] bg-[#FAFAFA] cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Dubai, UAE"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#CCC] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#CCC] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Services (used by AI)</label>
              <textarea rows={3} value={services} onChange={(e) => setServices(e.target.value)}
                placeholder="List your services here, e.g. Dental cleaning, Consultation, Teeth whitening"
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#CCC] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveBusiness} disabled={saving}
                className="btn-primary text-sm px-6 py-2.5 disabled:opacity-70">
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
            <h2 className="font-bold text-[#1A0A00] text-lg">AI Configuration</h2>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">AI Tone</label>
              <div className="flex flex-wrap gap-2">
                {["professional", "friendly", "formal", "casual"].map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tone === t ? "text-white shadow-sm" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"}`}
                    style={tone === t ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">Response Language</label>
              <div className="flex flex-wrap gap-2">
                {["English", "Arabic", "Auto-detect"].map((l) => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${language === l ? "text-white" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"}`}
                    style={language === l ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-3">Reply Timing</label>
              <div className="flex flex-wrap gap-2">
                {["instant", "1-2 min", "5 min"].map((d) => (
                  <button key={d} onClick={() => setAiDelay(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${aiDelay === d ? "text-white" : "bg-[#FFF5F0] text-[#888888] border border-[#f0e8e0]"}`}
                    style={aiDelay === d ? { background: "linear-gradient(135deg,#FF6B35,#FF3366)" } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-1.5">Custom AI Instructions</label>
              <textarea rows={5} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Always mention our free parking. Never discuss competitor pricing. Offer a 10% discount to first-time callers."
                className="w-full px-3.5 py-2.5 text-sm border border-[#f0e8e0] rounded-xl text-[#1A0A00] placeholder:text-[#888888] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSaveAI} disabled={saving} className="btn-primary text-sm px-6 py-2.5 disabled:opacity-70">
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
            <h2 className="font-bold text-[#1A0A00] text-lg">Notification Preferences</h2>
            <div className="space-y-3">
              {[
                { label: "New lead notification",  sub: "When AI captures a new lead",              enabled: true  },
                { label: "Booking confirmation",   sub: "When an appointment is booked",            enabled: true  },
                { label: "AI handoff alert",        sub: "When AI requests human takeover",          enabled: true  },
                { label: "Daily summary email",    sub: "Morning summary of yesterday's activity",  enabled: false },
                { label: "WhatsApp notifications", sub: "Receive alerts via WhatsApp",              enabled: true  },
              ].map((notif) => (
                <div key={notif.label} className="flex items-center justify-between p-4 rounded-xl border border-[#f0e8e0]">
                  <div>
                    <p className="font-semibold text-[#1A0A00] text-sm">{notif.label}</p>
                    <p className="text-xs text-[#888888]">{notif.sub}</p>
                  </div>
                  <div className="relative cursor-pointer" style={{ width: 40, height: 22 }}>
                    <div className={`w-full h-full rounded-full transition-all ${notif.enabled ? "bg-[#FF6B35]" : "bg-[#f0e8e0]"}`} />
                    <span className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all"
                      style={{ left: notif.enabled ? 21 : 3 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary text-sm px-6 py-2.5">Save Preferences</button>
          </>
        )}

        {/* ── Billing ── */}
        {activeTab === "Billing" && (
          <>
            <h2 className="font-bold text-[#1A0A00] text-lg">Billing & Subscription</h2>

            <div className="p-5 rounded-xl border-2 border-[#FF6B35]/30 bg-gradient-to-br from-[#FF6B35]/5 to-[#FF3366]/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-[#1A0A00] capitalize">{getProfile()?.plan ?? "Starter"} Plan</p>
                  <p className="text-xs text-[#888888]">Renews automatically · Cancel anytime</p>
                </div>
                <span className="text-2xl font-extrabold text-[#FF6B35]">
                  {getProfile()?.plan === "premium" ? "$299" : getProfile()?.plan === "pro" ? "$159" : "$79"}
                  <span className="text-sm font-medium text-[#888888]">/mo</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Upgrade Plan
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
                <span className="text-sm text-[#1A0A00]">No card on file</span>
              </div>
              <button className="text-xs font-semibold text-[#FF6B35] hover:underline">Add payment method</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
