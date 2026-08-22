"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { setBottomSheetOpen } from "@/lib/useBottomSheetState";
import { useI18n } from "@/lib/i18n";
import ChannelAiConfigFields from "@/components/ui/ChannelAiConfigFields";

/* ── Toast ── */
function Toast({ msg, type = "success", onDone }: { msg: string; type?: "success" | "error" | "info"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const iconColor = type === "error" ? "#DC2626" : type === "info" ? "#6B7280" : "#FF6B35";
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#1A0A00] text-white text-sm font-medium shadow-2xl max-w-sm text-center" style={{ bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {type === "error"
          ? <path d="M2 2l10 10M12 2L2 12" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round"/>
          : <path d="M2 7l3 3 7-7" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
      {msg}
    </div>
  );
}

/* ── Modal shell ── */
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#E5E7EB] shadow-2xl max-h-[92vh] overflow-y-auto"
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
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${current >= i ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
            {current > i ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (i + 1)}
          </div>
          {i < total - 1 && <div className={`h-px w-8 transition-colors ${current > i ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Instagram modal ── */
function InstagramModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<0 | 1>(0);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  const PERMISSIONS = [
    { label: "Read Instagram DMs", desc: "So Vela AI can see and respond to incoming messages" },
    { label: "Manage messages",    desc: "So Vela AI can send replies on your behalf" },
    { label: "Read page info",     desc: "To link your Instagram Business account to your Facebook Page" },
  ];

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect Instagram</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Step {step + 1} of 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <Steps total={2} current={step} />

        {step === 0 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Permissions required</p>
            <p className="text-xs text-[#6B7280] mb-4">Vela needs the following access to automate your Instagram DMs:</p>
            <div className="space-y-3 mb-5">
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
            <p className="text-[11px] text-[#9CA3AF] mb-4">You need an Instagram Business account connected to a Facebook Page.</p>
            <button onClick={() => setStep(1)} className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90" style={{ background: "#111111" }}>
              Continue to Meta Authorization
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Authorize with Meta</p>
            <p className="text-xs text-[#6B7280] mb-5">Click below to securely authorize Vela via Meta&apos;s OAuth flow.</p>
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] mb-5">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Redirect destination</p>
              <p className="text-[11px] text-[#6B7280] font-mono break-all">{appUrl || "your-app-url"}/api/auth/instagram/callback</p>
            </div>
            <a
              href="/api/auth/instagram"
              className="flex items-center justify-center w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 mb-3"
              style={{ background: "#1877F2" }}
            >
              Open Meta Authorization
            </a>
            <button onClick={() => setStep(0)} className="w-full py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF]">
              Back
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── WhatsApp modal (Embedded Signup v4) ── */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any;
  }
}

function WhatsAppModal({ onClose, onConnect }: { onClose: () => void; onConnect: (phone: string, displayName?: string) => void }) {
  const [status, setStatus]             = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]         = useState("");
  const [connectedPhone, setConnectedPhone] = useState("");
  const [connectedName, setConnectedName]   = useState("");

  // Load Facebook JS SDK once (idempotent — guarded by element ID check)
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) {
      // SDK already present — init if FB object exists
      if (window.FB) {
        window.FB.init({
          appId:   process.env.NEXT_PUBLIC_META_APP_ID ?? "",
          version: "v22.0",
          cookie:  true,
          xfbml:   false,
        });
      }
      return;
    }
    const script    = document.createElement("script");
    script.id       = "facebook-jssdk";
    script.src      = "https://connect.facebook.net/en_US/sdk.js";
    script.async    = true;
    script.onload   = () => {
      window.FB?.init({
        appId:   process.env.NEXT_PUBLIC_META_APP_ID ?? "",
        version: "v22.0",
        cookie:  true,
        xfbml:   false,
      });
    };
    document.body.appendChild(script);
  }, []);

  const handleConnect = () => {
    if (!window.FB) {
      setErrorMsg("Facebook SDK not loaded yet. Please wait a moment and try again.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.FB.login(async (response: any) => {
      if (response.status !== "connected" || !response.authResponse?.code) {
        // User cancelled or denied — quietly return to idle
        setStatus("idle");
        return;
      }

      const code            = response.authResponse.code as string;
      const waba_id         = response.authResponse.session_info?.waba_id as string | undefined;
      const phone_number_id = response.authResponse.session_info?.phone_number_id as string | undefined;

      if (!waba_id || !phone_number_id) {
        setErrorMsg("Could not retrieve WhatsApp Business account info. Please try again.");
        setStatus("error");
        return;
      }

      try {
        const res = await fetch("/api/auth/whatsapp/callback", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ code, waba_id, phone_number_id }),
        });
        const data = await res.json() as {
          ok?: boolean;
          phoneNumber?: string;
          displayName?: string;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          setErrorMsg(data.error ?? "Connection failed. Please try again.");
          setStatus("error");
          return;
        }

        setConnectedPhone(data.phoneNumber ?? "");
        setConnectedName(data.displayName ?? "");
        setStatus("success");
      } catch {
        setErrorMsg("Network error. Please check your connection and try again.");
        setStatus("error");
      }
    },
    {
      config_id:                      process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID ?? "",
      response_type:                  "code",
      override_default_response_type: true,
      extras:                         { sessionInfoVersion: 2 },
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect WhatsApp Business</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Connect via Meta Business</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.1)", border: "2px solid rgba(37,211,102,0.25)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l4 4 10-10" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4 className="font-bold text-[#111111] mb-1">WhatsApp Business Connected!</h4>
            {connectedPhone && <p className="text-sm font-semibold text-[#374151] mb-1">{connectedPhone}</p>}
            {connectedName  && <p className="text-xs text-[#6B7280] mb-1">{connectedName}</p>}
            <p className="text-xs text-[#9CA3AF] mb-6">Vela AI will now reply to your WhatsApp messages automatically.</p>
            <button
              onClick={() => onConnect(connectedPhone, connectedName)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ background: "var(--vp-color)" }}
            >
              Done
            </button>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(220,38,38,0.1)", border: "2px solid rgba(220,38,38,0.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h4 className="font-bold text-[#111111] mb-2">Connection Failed</h4>
            <p className="text-xs text-[#6B7280] mb-5 max-w-xs leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => { setStatus("idle"); setErrorMsg(""); }}
              className="w-full py-3 rounded-xl text-sm font-bold border border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF] mb-2"
            >
              Try Again
            </button>
            <button onClick={onClose} className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Dismiss</button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {[
                { label: "Secure authorization",  desc: "Connect your WhatsApp Business account via Meta's secure OAuth flow" },
                { label: "No manual setup",        desc: "Vela automatically subscribes to your account's messages" },
                { label: "Instant activation",     desc: "Replies go live immediately after connecting" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                  <div className="w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#25D366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#111111]">{item.label}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-5">You need a WhatsApp Business account with a verified phone number.</p>
            <button
              onClick={handleConnect}
              disabled={status === "loading"}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#25D366" }}
            >
              {status === "loading" ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Connecting…
                </>
              ) : (
                "Connect with Meta"
              )}
            </button>
            <button onClick={onClose} className="w-full mt-2 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF]">
              Cancel
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Channel settings modal (real per-channel config, not the connect
   wizard and not the external-embed instructions) ──
   FIX 3: "Manage" previously reopened the connect wizard (Instagram/
   WhatsApp) or revealed the external-embed-code section (Website) --
   neither is actual channel settings. This surfaces the real, already-
   computed state for that specific channel: connection identity, real
   stats, and for Website the one real toggle that exists
   (embedAssistant) -- moved here from the card body, not duplicated.
   Disconnect lives here too instead of only as a separate card button. */
function ChannelSettingsModal({
  channel, identity, stats, onClose, onDisconnect, disconnecting,
  websiteExtra, aiConfig,
}: {
  channel: "instagram" | "whatsapp" | "website";
  identity: string;
  stats: { label: string; value: string }[];
  onClose: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  websiteExtra?: {
    siteUrl: string | null;
    embedAssistant: boolean;
    savingAssistant: boolean;
    onToggleAssistant: () => void;
  };
  // FIX 2 (round F): real per-channel AI-behavior config -- reuses the exact
  // tone/language vocabulary from Settings -> AI Configuration, scoped to
  // just this channel via tenant_config.channel_ai_config.
  aiConfig?: {
    loading: boolean;
    tone: string;
    language: string;
    saving: boolean;
    saved: boolean;
    onToneChange: (v: string) => void;
    onLanguageChange: (v: string) => void;
    onSave: () => void;
  };
}) {
  const TITLES: Record<typeof channel, string> = {
    instagram: "Instagram Settings",
    whatsapp: "WhatsApp Settings",
    website: "Website Chat Settings",
  };
  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">{TITLES[channel]}</h3>
            <p className="text-xs text-[#6B7280] mt-0.5 font-mono">{identity}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
              <p className="text-lg font-bold text-[#111111]">{s.value}</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {aiConfig && (
          <div className="mb-5">
            <ChannelAiConfigFields {...aiConfig} />
          </div>
        )}

        {websiteExtra && (
          <div className="space-y-3 mb-5">
            {websiteExtra.siteUrl && (
              <a href={websiteExtra.siteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] text-xs font-semibold text-[#374151] hover:border-[#FF6B35]/40 transition-colors">
                View your site
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 8l5-5M3.5 3h4.5v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
              <p className="text-xs font-semibold text-[#374151]">AI assistant on this site</p>
              <button
                onClick={websiteExtra.onToggleAssistant}
                disabled={websiteExtra.savingAssistant}
                aria-label="Toggle AI assistant on this site"
                className={`w-9 h-5 rounded-full transition-all duration-200 relative shrink-0 disabled:opacity-50 ${websiteExtra.embedAssistant ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${websiteExtra.embedAssistant ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB]">Close</button>
          {onDisconnect && (
            <button onClick={onDisconnect} disabled={disconnecting}
              className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors">
              {disconnecting ? "…" : "Disconnect"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Upgrade modal ── */
function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--vela-gradient-tint)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111111] mb-2">Upgrade to connect more channels</h3>
        <p className="text-sm text-[#6B7280] mb-6">Connect all 3 channels (WhatsApp, Instagram, and Website) on the Pro plan.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB]">Cancel</button>
          <Link
            href="/pricing"
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90"
            style={{ background: "var(--vela-gradient)" }}
            onClick={() => { track("upgrade_clicked", { source: "channels" }); onClose(); }}
          >
            Upgrade to Pro →
          </Link>
        </div>
      </div>
    </Modal>
  );
}

// FIX 5 (round N) / relocated FIX 2 (round O): the disconnect confirmation
// modal (single-site vs multi-site plan wording) now lives in Website
// Builder's site list, where the real per-site disconnect action is
// triggered from -- see src/app/app/website/page.tsx's SiteDisconnectModal.

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
type ChannelStatus = {
  instagram: { connected: boolean; username: string; conversations: number; leads: number };
  whatsapp:  { connected: boolean; phone: string; displayName?: string; conversations: number; bookings: number };
};

// FIX 2 (round O): simplified back to a tenant-wide aggregate (see loadStatus).
// Per-site connect/disconnect/reconnect/embed-toggle management lives in
// Website Builder's own site list now, not here.
type WebsiteState = {
  published: boolean;
  siteUrl: string | null;
  visits: number;
  conversations: number;
  leads: number;
};

function ChannelsPageContent() {
  const { t }                 = useI18n();
  const { isStarter, config } = usePlan();
  const searchParams          = useSearchParams();

  const [channels, setChannels]     = useState<ChannelStatus>({
    instagram: { connected: false, username: "", conversations: 0, leads: 0 },
    whatsapp:  { connected: false, phone: "", conversations: 0, bookings: 0 },
  });
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [website, setWebsite]       = useState<WebsiteState>({ published: false, siteUrl: null, visits: 0, conversations: 0, leads: 0 });
  const [showEmbed, setShowEmbed]   = useState(false);
  const embedSectionRef             = useRef<HTMLDivElement>(null);
  const [modal, setModal]           = useState<"instagram" | "whatsapp" | "upgrade" | "instagram-settings" | "whatsapp-settings" | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null);
  const [copied, setCopied]         = useState(false);
  const [tenantId, setTenantId]     = useState("YOUR_TENANT_ID");
  const [loading, setLoading]       = useState(true);
  const [disconnecting, setDisconnecting] = useState<"instagram" | "whatsapp" | null>(null);

  // FIX 2 (round F): per-channel AI-behavior config, lazily fetched when
  // the instagram/whatsapp "Manage" modal opens.
  const [aiCfgLoading, setAiCfgLoading]   = useState(false);
  const [aiCfgSaving, setAiCfgSaving]     = useState(false);
  const [aiCfgSaved, setAiCfgSaved]       = useState(false);
  const [aiCfgTone, setAiCfgTone]         = useState("professional");
  const [aiCfgLanguage, setAiCfgLanguage] = useState("Auto-detect");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = getSupabase() as any;
      const { data: { user } } = await s.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: tenant } = await s
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!tenant) { setLoading(false); return; }
      setTenantId(tenant.id as string);

      const { data: cfg } = await s
        .from("tenant_config")
        .select("instagram_connected, instagram_username, whatsapp_connected, whatsapp_phone, website_visit_count")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (cfg) {
        const igConnected = !!cfg.instagram_connected;
        const waConnected = !!cfg.whatsapp_connected;

        // Real per-channel stats -- same query pattern already used for the
        // Website channel's "chat conversations" count below (conversations
        // scoped by channel). Only queried when actually connected, matching
        // the rule that a stat pair only ever shows once real data exists.
        const [igConvRes, igLeadRes, waConvRes, waBookedRes] = await Promise.all([
          igConnected
            ? s.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("channel", "instagram")
            : Promise.resolve({ count: 0 }),
          igConnected
            ? s.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("channel", "instagram")
            : Promise.resolve({ count: 0 }),
          waConnected
            ? s.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("channel", "whatsapp")
            : Promise.resolve({ count: 0 }),
          waConnected
            ? s.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("channel", "whatsapp").eq("status", "booked")
            : Promise.resolve({ count: 0 }),
        ]);

        setChannels({
          instagram: {
            connected: igConnected, username: cfg.instagram_username ?? "",
            conversations: igConvRes.count ?? 0, leads: igLeadRes.count ?? 0,
          },
          whatsapp: {
            connected: waConnected, phone: cfg.whatsapp_phone ?? "",
            conversations: waConvRes.count ?? 0, bookings: waBookedRes.count ?? 0,
          },
        });
      }

      // Website channel: tied to Website Builder, not a manual connect flow.
      // FIX 2 (round O): real per-site connect/disconnect/reconnect now
      // lives in Website Builder's own site list (each site has its own
      // is_published row on the websites table -- this was already
      // site-scoped at the DB level, never tenant-scoped). This card is
      // back to a simple aggregate: "Connected" whenever ANY of the
      // tenant's sites is currently live, "Not connected" only when none
      // are. siteUrl is only ever shown when exactly one site is live (an
      // unambiguous single link) -- with 2+ live sites, "which one" is a
      // Website Builder question, not a Channels-page one.
      const { data: siteRows } = await s
        .from("websites")
        .select("slug, is_published")
        .eq("tenant_id", tenant.id);

      const publishedSites = ((siteRows ?? []) as { slug: string | null; is_published: boolean }[]).filter((r) => r.is_published);
      const isLive = publishedSites.length > 0;
      // CRITICAL FIX: "Chat conversions %" was conversations / website_visit_count
      // -- but website_visit_count only tracks pageviews on the Vela-built
      // site itself, not chat activity from an externally embedded widget,
      // so it routinely undercounts relative to real conversations
      // (confirmed live: 2 visits vs 4 real conversations = a nonsensical
      // 200%). Real conversion is now leads produced from website chat
      // (the same FK-traced, always <= conversations count already fixed
      // for Analytics' Channel Breakdown) over website conversations --
      // both reliable, both always keep the ratio <= 100%. Both counts are
      // already tenant-wide aggregates across every site's conversations,
      // not scoped to a single site.
      const [{ count: websiteConvCount }, { data: websiteConvRows }] = await Promise.all([
        s.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("channel", "website"),
        s.from("conversations").select("lead_id").eq("tenant_id", tenant.id).eq("channel", "website"),
      ]);
      const websiteLeadCount = new Set(
        ((websiteConvRows ?? []) as { lead_id: string | null }[]).map((r) => r.lead_id).filter((id): id is string => !!id)
      ).size;

      setWebsite({
        published: isLive,
        siteUrl: publishedSites.length === 1 ? `${appUrl}/site/${publishedSites[0].slug || tenant.id}` : null,
        visits: (cfg?.website_visit_count as number) ?? 0,
        conversations: websiteConvCount ?? 0,
        leads: websiteLeadCount,
      });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Signal VelaAssistant bubble to hide on mobile when a modal is open.
  useEffect(() => {
    setBottomSheetOpen(modal !== null);
    return () => setBottomSheetOpen(false);
  }, [modal]);

  // FIX 2 (round F): load this channel's real AI-behavior config whenever
  // its settings modal opens.
  useEffect(() => {
    const ch = modal === "instagram-settings" ? "instagram" : modal === "whatsapp-settings" ? "whatsapp" : null;
    if (!ch) return;
    setAiCfgLoading(true);
    setAiCfgSaved(false);
    fetch(`/api/channels/ai-config?channel=${ch}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tone?: string; language?: string } | null) => {
        setAiCfgTone(data?.tone ?? "professional");
        setAiCfgLanguage(data?.language ?? "Auto-detect");
      })
      .catch(() => {})
      .finally(() => setAiCfgLoading(false));
  }, [modal]);

  const saveChannelAiConfig = async (ch: "instagram" | "whatsapp") => {
    setAiCfgSaving(true);
    try {
      const res = await fetch("/api/channels/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: ch, tone: aiCfgTone, language: aiCfgLanguage }),
      });
      if (!res.ok) throw new Error("save failed");
      setAiCfgSaved(true);
      setTimeout(() => setAiCfgSaved(false), 2000);
    } catch {
      setToast({ msg: "Could not save AI settings. Please try again.", type: "error" });
    }
    setAiCfgSaving(false);
  };

  // Handle OAuth callback params from URL
  useEffect(() => {
    const ig = searchParams.get("instagram");
    const username = searchParams.get("username");
    if (ig === "connected") {
      setChannels((prev) => ({ ...prev, instagram: { ...prev.instagram, connected: true, username: username ?? "" } }));
      setToast({ msg: `Instagram connected${username ? ` as @${username}` : ""}`, type: "success" });
      window.history.replaceState({}, "", "/app/channels");
    } else if (ig === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      setToast({ msg: `Instagram connection failed: ${reason.replace(/_/g, " ")}`, type: "error" });
      window.history.replaceState({}, "", "/app/channels");
    } else if (ig === "not_configured") {
      setToast({ msg: "Meta App ID not configured yet. Add META_APP_ID to .env.local", type: "info" });
      window.history.replaceState({}, "", "/app/channels");
    }
  }, [searchParams]);

  const embedCode = `<script src="${appUrl}/api/embed/${tenantId}" async></script>`;

  const connectedSocialCount = (channels.instagram.connected ? 1 : 0) + (channels.whatsapp.connected ? 1 : 0);
  const canConnectMore = !isStarter || connectedSocialCount < config.channels;

  const handleConnectClick = (ch: "instagram" | "whatsapp") => {
    if (!canConnectMore) {
      setModal("upgrade");
      track("upgrade_clicked", { source: "channels_limit" });
    } else {
      setModal(ch);
    }
  };

  const connectWhatsApp = (phone: string, displayName?: string) => {
    setChannels((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, connected: true, phone, displayName } }));
    setModal(null);
    setToast({ msg: "WhatsApp Business connected", type: "success" });
    track("channel_connected", { channel: "whatsapp" });
  };

  const disconnect = async (ch: "instagram" | "whatsapp") => {
    setDisconnecting(ch);
    try {
      await fetch("/api/channels/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: ch }),
      });
      setChannels((prev) => ({
        ...prev,
        [ch]: ch === "instagram"
          ? { ...prev.instagram, connected: false, username: "", conversations: 0, leads: 0 }
          : { ...prev.whatsapp, connected: false, phone: "", conversations: 0, bookings: 0 },
      }));
      setToast({ msg: `${ch === "instagram" ? "Instagram" : "WhatsApp"} disconnected`, type: "info" });
    } catch {
      setToast({ msg: "Failed to disconnect. Please try again.", type: "error" });
    }
    setDisconnecting(null);
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setToast({ msg: "Embed code copied to clipboard", type: "success" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // FIX 2 (round O): real connect/disconnect/reconnect + the AI-assistant-
  // embed toggle now live per-site in Website Builder's own site list (each
  // site has its own is_published + embed_ai_assistant columns -- this was
  // already site-scoped at the DB level). This page only ever shows the
  // tenant-wide aggregate (see loadStatus above and the Website card below).

  // FIX 7 (round D): real brand glyphs on a solid colored square, larger
  // (48px) container -- same icon source as /demo/channels (already the
  // approved reference, confirmed identical path data) and the landing
  // page fix from the previous round, instead of the small outlined
  // gradient-stroke icons this page had.
  const CHANNELS = [
    {
      key: "instagram" as const,
      name: t("channels.instagram.name"),
      desc: "Respond to DMs and comments automatically via your AI agent",
      connectedDesc: channels.instagram.username ? `@${channels.instagram.username}` : "Connected",
      iconBg: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#833AB4]",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
    },
    {
      key: "whatsapp" as const,
      name: t("channels.whatsapp.name"),
      desc: "Handle WhatsApp messages 24/7 and book appointments automatically",
      connectedDesc: channels.whatsapp.displayName
        ? `${channels.whatsapp.displayName}${channels.whatsapp.phone ? ` · ${channels.whatsapp.phone}` : ""}`
        : channels.whatsapp.phone || "Connected",
      iconBg: "bg-[#25D366]",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
  ];

  // FIX 4: real connected-channel list + banner, computed from actual state
  // -- never hardcoded. "All connected" only when every channel Vela
  // supports (Instagram, WhatsApp, Website) is genuinely connected; a
  // partial connection (e.g. 1 of 3) simply doesn't show the banner rather
  // than showing a misleading "All N connected" for a subset.
  const connectedChannelNames = [
    channels.instagram.connected ? "Instagram" : null,
    channels.whatsapp.connected ? "WhatsApp" : null,
    website.published ? "your website" : null,
  ].filter((n): n is string => n !== null);
  const allChannelsConnected = connectedChannelNames.length === 3;

  const unconnectedChannels: { key: "instagram" | "whatsapp"; label: string }[] = [
    ...(!channels.instagram.connected ? [{ key: "instagram" as const, label: t("channels.instagram.name") }] : []),
    ...(!channels.whatsapp.connected  ? [{ key: "whatsapp"  as const, label: t("channels.whatsapp.name")  }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {modal === "instagram" && <InstagramModal onClose={() => setModal(null)} />}
      {modal === "whatsapp"  && <WhatsAppModal  onClose={() => setModal(null)} onConnect={connectWhatsApp} />}
      {modal === "upgrade"   && <UpgradeModal   onClose={() => setModal(null)} />}
      {modal === "instagram-settings" && (
        <ChannelSettingsModal
          channel="instagram"
          identity={channels.instagram.username ? `@${channels.instagram.username}` : "Connected"}
          stats={[
            { label: "Conversations", value: String(channels.instagram.conversations) },
            { label: "Leads", value: String(channels.instagram.leads) },
          ]}
          onClose={() => setModal(null)}
          onDisconnect={() => { setModal(null); disconnect("instagram"); }}
          disconnecting={disconnecting === "instagram"}
          aiConfig={{
            loading: aiCfgLoading, tone: aiCfgTone, language: aiCfgLanguage,
            saving: aiCfgSaving, saved: aiCfgSaved,
            onToneChange: setAiCfgTone, onLanguageChange: setAiCfgLanguage,
            onSave: () => saveChannelAiConfig("instagram"),
          }}
        />
      )}
      {modal === "whatsapp-settings" && (
        <ChannelSettingsModal
          channel="whatsapp"
          identity={channels.whatsapp.displayName ? `${channels.whatsapp.displayName} · ${channels.whatsapp.phone}` : channels.whatsapp.phone}
          stats={[
            { label: "Conversations", value: String(channels.whatsapp.conversations) },
            { label: "Bookings", value: String(channels.whatsapp.bookings) },
          ]}
          onClose={() => setModal(null)}
          onDisconnect={() => { setModal(null); disconnect("whatsapp"); }}
          disconnecting={disconnecting === "whatsapp"}
          aiConfig={{
            loading: aiCfgLoading, tone: aiCfgTone, language: aiCfgLanguage,
            saving: aiCfgSaving, saved: aiCfgSaved,
            onToneChange: setAiCfgTone, onLanguageChange: setAiCfgLanguage,
            onSave: () => saveChannelAiConfig("whatsapp"),
          }}
        />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">{t("channels.title")}</h1>
          <p className="text-sm text-[#6B7280] mt-1">{t("channels.subtitle")}</p>
        </div>
        {unconnectedChannels.length > 0 && (
          <div className="relative">
            <button onClick={() => setShowConnectMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--vela-gradient)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Connect Channel
            </button>
            {showConnectMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowConnectMenu(false)} />
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32] rounded-xl shadow-xl py-1 w-44">
                  {unconnectedChannels.map((c) => (
                    <button key={c.key} onClick={() => { setShowConnectMenu(false); handleConnectClick(c.key); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#374151] dark:text-[#E5E7EB] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1E24] transition-colors">
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Real success banner -- only when every channel is actually connected */}
      {allChannelsConnected && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/50 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-400">
            All 3 channels connected. Your AI agent is live across {connectedChannelNames.join(", ")}.
          </p>
        </div>
      )}

      {/* Plan indicator */}
      {isStarter && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#FF6B35]/30 bg-[#FFF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v11M1.5 7h11" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#111111]">Starter Plan: {connectedSocialCount}/{config.channels} social channel{config.channels > 1 ? "s" : ""}</p>
              <p className="text-[11px] text-[#6B7280]">Upgrade to Pro to connect all 3 channels</p>
            </div>
          </div>
          <Link href="/auth/signup" onClick={() => track("upgrade_clicked", { source: "channels_banner" })}
            className="text-xs font-bold px-3.5 py-2 rounded-lg text-white whitespace-nowrap hover:opacity-90"
            style={{ background: "var(--vela-gradient)" }}>
            Upgrade
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {/* Social channels */}
        {CHANNELS.map((ch) => {
          const isConnected = ch.key === "instagram" ? channels.instagram.connected : channels.whatsapp.connected;
          const isLocked = isStarter && !isConnected && connectedSocialCount >= config.channels;
          const isDisc = disconnecting === ch.key;
          // Real stat pairs -- only ever shown once the channel is
          // connected (never fabricated for a disconnected channel).
          const stats = ch.key === "instagram"
            ? [{ label: "Conversations", value: channels.instagram.conversations }, { label: "Leads", value: channels.instagram.leads }]
            : [{ label: "Conversations", value: channels.whatsapp.conversations }, { label: "Bookings", value: channels.whatsapp.bookings }];

          return (
            <div key={ch.key}
              className={`p-5 rounded-xl bg-white dark:bg-[#17171C] border transition-colors ${isLocked ? "border-[#E5E7EB] dark:border-[#2A2A32] opacity-70" : "border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#D1D5DB] dark:hover:border-[#3A3A44]"}`}
            >
              {loading ? (
                <div className="flex items-center gap-4 w-full animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] rounded w-28" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-40" />
                  </div>
                  <div className="h-8 w-20 bg-[#F3F4F6] rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className={`w-12 h-12 rounded-xl ${ch.iconBg} flex items-center justify-center shrink-0`}>
                      {ch.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-[#111111] dark:text-white">{ch.name}</p>
                        {isLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                              <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1.1"/>
                            </svg>
                            Pro only
                          </span>
                        ) : isConnected ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-[#052E16]/40 text-[#059669] dark:text-[#34D399]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                            {t("channels.connected")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                            {t("channels.notConnected")}
                          </span>
                        )}
                      </div>
                      {isConnected && <p className="text-xs font-mono text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">{ch.connectedDesc}</p>}
                      <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 leading-relaxed">{ch.desc}</p>
                    </div>
                    {/* Actions -- stacked vertically to match the reference,
                        not side by side. */}
                    {isConnected ? (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => setModal(ch.key === "instagram" ? "instagram-settings" : "whatsapp-settings")}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors whitespace-nowrap"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => disconnect(ch.key)}
                          disabled={isDisc}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#FCA5A5] dark:border-red-900/50 text-[#DC2626] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          {isDisc ? "…" : t("common.disconnect")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnectClick(ch.key)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg border shrink-0 transition-all ${
                          isLocked
                            ? "border-[#E5E7EB] dark:border-[#2A2A32] text-[#9CA3AF] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                            : "border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                        }`}
                      >
                        {isLocked ? "Upgrade" : t("common.connect")}
                      </button>
                    )}
                  </div>

                  {/* Real stat pairs -- connected channels only. */}
                  {isConnected && (
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex-wrap">
                      {stats.map((s) => (
                        <div key={s.label}>
                          <p className="text-base font-bold text-[#111111] dark:text-white leading-none">{s.value.toLocaleString()}</p>
                          <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Website channel — tied to Website Builder, fully optional */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#17171C] border border-[#E5E7EB] dark:border-[#2A2A32]">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-[#6366F1] flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-bold text-[#111111] dark:text-white">{t("channels.website.name")}</p>
                {website.published ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-[#052E16]/40 text-[#059669] dark:text-[#34D399]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    {t("channels.connected")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                    {t("channels.notConnected")}
                  </span>
                )}
              </div>
              {/* FIX 7 (round D): copy updated to match the reference exactly. */}
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1.5 leading-relaxed">
                Chat widget on your website. Live AI conversations with visitors
              </p>
            </div>
            {/* FIX 2 (round O): back to a plain Connect / Connected card,
                same shape as Instagram/WhatsApp above -- real per-site
                connect/disconnect/reconnect + the AI-assistant-embed toggle
                now live in Website Builder's own site list (each site
                manages its own connection independently). "Manage" always
                goes to Website Builder itself, where "which site" is
                actually resolved -- this card never assumes a single site. */}
            {website.published ? (
              <Link
                href="/app/website"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#D1D5DB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors whitespace-nowrap text-center shrink-0"
              >
                Manage
              </Link>
            ) : (
              <Link
                href="/app/website"
                className="text-xs font-bold px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#2A2A32] text-[#374151] dark:text-[#E5E7EB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all shrink-0"
              >
                Connect
              </Link>
            )}
          </div>

          {website.published && (
            <div className="mt-4 space-y-3">
              {/* Real stat pair, same style as the social channels above.
                  CRITICAL FIX: "Chat conversions %" used to be conversations
                  / website_visit_count, which under-counts real visits from
                  an externally embedded widget and produced nonsensical
                  numbers over 100% -- confirmed live (2 visits vs 4 real
                  conversations). Now leads / conversations, both reliably
                  traced via the real conversations.lead_id FK, so the ratio
                  can never exceed 100%. "Chat conversations" count removed
                  -- redundant with the conversion % right next to it. Both
                  counts are tenant-wide aggregates across every connected
                  site, per FIX 2 (round O). */}
              <div className="flex items-center gap-6 pt-4 border-t border-[#F3F4F6] dark:border-[#2A2A32] flex-wrap">
                <div>
                  <p className="text-base font-bold text-[#111111] dark:text-white leading-none">{website.visits.toLocaleString()}</p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">Website visitors</p>
                </div>
                <div>
                  <p className="text-base font-bold text-[#111111] dark:text-white leading-none">
                    {website.conversations > 0 ? `${Math.round((website.leads / website.conversations) * 1000) / 10}%` : "0%"}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">Chat conversions</p>
                </div>
              </div>
              {/* siteUrl is only ever set when exactly one site is live --
                  with 2+ connected sites, "which one" is a Website Builder
                  question (each has its own row + its own live URL there). */}
              {website.siteUrl && (
                <a
                  href={website.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] hover:text-[#FF6B35] transition-colors"
                >
                  View your site
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 8l5-5M3.5 3h4.5v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )}
            </div>
          )}

          {/* Connect an existing external website — separate, optional, collapsed by default.
              Also the real target of the "Manage" button above. */}
          <div ref={embedSectionRef} className="mt-4 pt-4 border-t border-[#F3F4F6]">
            <button
              onClick={() => setShowEmbed((v) => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <p className="text-xs font-semibold text-[#111111]">Have your own website?</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Paste one line of code to add the same AI assistant to any existing site.</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 ml-3 transition-transform ${showEmbed ? "rotate-180" : ""}`}>
                <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showEmbed && (
              <div className="mt-4">
                <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                  If your website was built somewhere other than Vela, such as Wix, Squarespace, Shopify, or WordPress, you can still add the same AI assistant to it. Most website builders have a section in their settings called something like Custom Code, Embed, or Tracking Code where a snippet like this one can be pasted. If someone else built or manages your website, you can simply forward this code to them. It usually takes about 2 minutes to add, and no coding experience is needed.
                </p>

                <div className="space-y-3 mb-4">
                  {[
                    { n: 1, text: "Copy the code below" },
                    { n: 2, text: "Paste it into your website's custom code or embed section, or send it to whoever manages your site" },
                    { n: 3, text: "Your AI assistant appears as a chat bubble in the bottom right corner of your site" },
                  ].map((s) => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] text-[11px] font-bold flex items-center justify-center shrink-0">{s.n}</span>
                      <p className="text-xs text-[#374151] leading-relaxed pt-0.5">{s.text}</p>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={null}>
      <ChannelsPageContent />
    </Suspense>
  );
}
