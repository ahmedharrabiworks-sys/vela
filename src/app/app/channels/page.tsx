"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";

const CHANNEL_KEY = "vela_channels";

type ChannelConfig = {
  instagram: { connected: boolean; username: string };
  whatsapp:  { connected: boolean; phone: string };
};

function loadChannels(): ChannelConfig {
  if (typeof window === "undefined")
    return { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } };
  try {
    const raw = localStorage.getItem(CHANNEL_KEY);
    return raw
      ? (JSON.parse(raw) as ChannelConfig)
      : { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } };
  } catch {
    return { instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } };
  }
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
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l3 3 7-7" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {msg}
    </div>
  );
}

/* ── Modal shell ── */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md shadow-2xl"
      >
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
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              current >= i ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}
          >
            {current > i ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-colors ${current > i ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Instagram modal ── */
const INSTAGRAM_OAUTH_URL =
  "https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=https%3A%2F%2Fapp.vela.ai%2Fauth%2Finstagram%2Fcallback&scope=instagram_basic%2Cinstagram_manage_messages%2Cpages_show_list&response_type=code";

function InstagramModal({
  onClose,
  onConnect,
}: {
  onClose: () => void;
  onConnect: (username: string) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [username, setUsername] = useState("");
  const { t } = useI18n();

  const PERMISSIONS = [
    { label: "Read Instagram DMs", desc: "So Vela AI can see and respond to incoming messages" },
    { label: "Manage messages", desc: "So Vela AI can send replies on your behalf" },
    { label: "Read page info", desc: "To link your Instagram Business account to your Facebook Page" },
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
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
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#111111]">{p.label}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-4">You need an Instagram Business or Creator account connected to a Facebook Page.</p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ background: "#111111" }}
            >
              Continue to Meta Authorization
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Authorize with Meta</p>
            <p className="text-xs text-[#6B7280] mb-5">Click below to open Meta&apos;s secure authorization page.</p>
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
              style={{ background: "#1877F2" }}
            >
              Open Meta Authorization
            </button>
            <button onClick={() => setStep(0)} className="w-full py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">
              {t("common.back")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Complete connection</p>
            <p className="text-xs text-[#6B7280] mb-4">After authorizing, enter your Instagram username to finish.</p>
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
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">
                {t("common.back")}
              </button>
              <button
                onClick={() => { if (username.trim()) onConnect(username.trim()); }}
                disabled={!username.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "#FF6B35" }}
              >
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

function WhatsAppModal({
  onClose,
  onConnect,
}: {
  onClose: () => void;
  onConnect: (phone: string) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [countryCode, setCountryCode] = useState("+971");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { t } = useI18n();

  const fullPhone = `${countryCode} ${number}`;
  const fullCode = code.join("");

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

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect WhatsApp Business</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Step {step + 1} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <Steps total={3} current={step} />

        {step === 0 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-4">Enter your WhatsApp Business number</p>
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-3 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] bg-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors shrink-0"
                >
                  {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
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
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => { if (number.trim()) setStep(1); }}
                disabled={!number.trim()}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "#25D366" }}
              >
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
            <button onClick={() => setStep(0)} className="text-xs text-[#6B7280] hover:text-[#FF6B35] transition-colors block mb-5">
              Wrong number? Change it
            </button>
            <button
              onClick={() => { if (fullCode.length === 6) setStep(2); }}
              disabled={fullCode.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: "#25D366" }}
            >
              Verify Code
            </button>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.1)", border: "2px solid rgba(37,211,102,0.25)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l4 4 10-10" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4 className="font-bold text-[#111111] mb-1">WhatsApp Business Connected</h4>
            <p className="text-sm font-semibold text-[#374151] mb-1">{fullPhone}</p>
            <p className="text-xs text-[#9CA3AF] mb-6">Vela AI will now reply to your WhatsApp Business messages automatically.</p>
            <button
              onClick={() => onConnect(fullPhone)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: "#FF6B35" }}
            >
              {t("common.done")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Upgrade modal ── */
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,51,102,0.08))" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111111] mb-2">{t("channels.upgradeTitle")}</h3>
        <p className="text-sm text-[#6B7280] mb-6">{t("channels.upgradeDesc")}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF] transition-colors">
            {t("common.cancel")}
          </button>
          <Link
            href="/auth/signup"
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            onClick={() => { track("upgrade_clicked", { source: "channels" }); onClose(); }}
          >
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════
   MAIN CHANNELS PAGE
══════════════════════════════════════ */
export default function ChannelsPage() {
  const { t } = useI18n();
  const { isStarter, config } = usePlan();
  const [channels, setChannels] = useState<ChannelConfig>(loadChannels);
  const [modal, setModal] = useState<"instagram" | "whatsapp" | "upgrade" | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.vela.ai").replace(/\/$/, "");
  const [tenantId, setTenantId] = useState("YOUR_TENANT_ID");

  useEffect(() => {
    import("@/lib/supabase").then(({ getSupabase }) => {
      const s = getSupabase();
      s.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s as any).from("tenants").select("id").eq("owner_id", user.id).single()
          .then(({ data }: { data: { id: string } | null }) => {
            if (data?.id) setTenantId(data.id);
          });
      });
    });
  }, []);

  const embedCode = `<script src="${appUrl}/api/embed/${tenantId}" async></script>`;

  const connectedSocialCount =
    (channels.instagram.connected ? 1 : 0) + (channels.whatsapp.connected ? 1 : 0);

  const canConnectMore = !isStarter || connectedSocialCount < config.channels;

  const handleConnectClick = (ch: "instagram" | "whatsapp") => {
    if (!canConnectMore) {
      setModal("upgrade");
      track("upgrade_clicked", { source: "channels_limit" });
    } else {
      setModal(ch);
    }
  };

  const connectInstagram = (username: string) => {
    const next = { ...channels, instagram: { connected: true, username } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
    setToast("Instagram connected successfully");
    track("channel_connected", { channel: "instagram" });
  };

  const connectWhatsApp = (phone: string) => {
    const next = { ...channels, whatsapp: { connected: true, phone } };
    setChannels(next);
    saveChannels(next);
    setModal(null);
    setToast("WhatsApp Business connected successfully");
    track("channel_connected", { channel: "whatsapp" });
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
      name: t("channels.instagram.name"),
      desc: t("channels.instagram.desc"),
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
      name: t("channels.whatsapp.name"),
      desc: t("channels.whatsapp.desc"),
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
    <div className="max-w-3xl mx-auto space-y-5 pb-20">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {modal === "instagram" && <InstagramModal onClose={() => setModal(null)} onConnect={connectInstagram} />}
      {modal === "whatsapp"  && <WhatsAppModal  onClose={() => setModal(null)} onConnect={connectWhatsApp} />}
      {modal === "upgrade"   && <UpgradeModal   onClose={() => setModal(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-[#111111]">{t("channels.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{t("channels.subtitle")}</p>
      </div>

      {/* Plan indicator for Starter */}
      {isStarter && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#FF6B35]/30 bg-[#FFF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v11M1.5 7h11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Starter Plan — {connectedSocialCount}/{config.channels} social channel{config.channels > 1 ? "s" : ""}</p>
              <p className="text-[11px] text-[#6B7280]">Upgrade to Pro to connect all 3 channels</p>
            </div>
          </div>
          <Link
            href="/auth/signup"
            onClick={() => track("upgrade_clicked", { source: "channels_banner" })}
            className="text-xs font-bold px-3.5 py-2 rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            Upgrade
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {/* Social channels */}
        {CHANNELS.map((ch) => {
          const isConnected = ch.key === "instagram" ? channels.instagram.connected : channels.whatsapp.connected;
          const isLocked = isStarter && !isConnected && connectedSocialCount >= config.channels;

          return (
            <div
              key={ch.key}
              className={`flex items-center justify-between p-4 rounded-xl bg-white border transition-colors ${
                isLocked ? "border-[#E5E7EB] opacity-70" : "border-[#E5E7EB] hover:border-[#D1D5DB]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center shrink-0">
                  {ch.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111111]">{ch.name}</p>
                    {isLocked && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                          <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1.1"/>
                        </svg>
                        Pro only
                      </span>
                    )}
                    {!isLocked && (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${isConnected ? "text-green-600" : "text-[#9CA3AF]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-[#D1D5DB]"}`} />
                        {isConnected ? t("channels.connected") : t("channels.notConnected")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {isConnected ? ch.connectedDesc : ch.desc}
                  </p>
                </div>
              </div>
              {isConnected ? (
                <button
                  onClick={() => disconnect(ch.key)}
                  className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-red-200 hover:text-red-500 transition-all shrink-0"
                >
                  {t("common.disconnect")}
                </button>
              ) : (
                <button
                  onClick={() => handleConnectClick(ch.key)}
                  className={`text-xs font-bold px-4 py-2 rounded-lg border shrink-0 transition-all ${
                    isLocked
                      ? "border-[#E5E7EB] text-[#9CA3AF] cursor-pointer hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      : "border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {isLocked ? "Upgrade" : t("common.connect")}
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
                  <p className="text-sm font-semibold text-[#111111]">{t("channels.website.name")}</p>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {t("channels.readyToEmbed")}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">{t("channels.website.desc")}</p>
              </div>
            </div>
          </div>

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

          <div className="relative mb-4">
            <div className="bg-[#111111] rounded-xl p-4 font-mono text-xs text-[#FF6B35] overflow-x-auto leading-relaxed pr-24">
              {embedCode}
            </div>
            <button
              onClick={copyEmbed}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: copied ? "rgba(22,163,74,0.15)" : "rgba(255,255,255,0.08)",
                color: copied ? "#16A34A" : "rgba(255,255,255,0.6)",
              }}
            >
              {copied ? (
                <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{t("common.copied")}</>
              ) : (
                <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="3.5" y="3.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M3.5 3.5V2.5a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H6.5" stroke="currentColor" strokeWidth="1.1"/></svg>{t("common.copy")} Code</>
              )}
            </button>
          </div>

          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Chat Bubble Preview</p>
            <div className="relative h-16">
              <div className="absolute bottom-0 right-0 flex items-end gap-2">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#374151] font-medium whitespace-nowrap">Hi! How can I help?</p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg"
                  style={{ background: "#FF6B35" }}
                >
                  AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
