"use client";

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";
import { COUNTRIES, countryFlag, type Country } from "@/lib/countries";

const GULF_ISO2 = ["AE", "SA", "QA", "KW", "BH", "OM"];
const GULF_COUNTRIES = COUNTRIES.filter((c) => GULF_ISO2.includes(c.iso2));
const OTHER_COUNTRIES = COUNTRIES.filter((c) => !GULF_ISO2.includes(c.iso2));

/* ── Toast ── */
function Toast({ msg, type = "success", onDone }: { msg: string; type?: "success" | "error" | "info"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const iconColor = type === "error" ? "#DC2626" : type === "info" ? "#6B7280" : "#FF6B35";
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#1A0A00] text-white text-sm font-medium shadow-2xl max-w-sm text-center">
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

/* ── WhatsApp country picker ── */
function CountryPicker({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () => COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query)),
    [query]
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => { setOpen(!open); setQuery(""); }}
        className="flex items-center gap-1.5 px-3 py-3 border border-[#E5E7EB] rounded-xl bg-white text-sm focus:outline-none focus:border-[#FF6B35]/50 whitespace-nowrap min-w-[90px]">
        <span className="text-base leading-none">{countryFlag(value.iso2)}</span>
        <span className="text-[#374151] text-xs font-mono">{value.dial}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-64 rounded-xl overflow-hidden border border-[#E5E7EB] shadow-xl bg-white">
          <div className="p-2 border-b border-[#F3F4F6]">
            <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {query ? (
              filtered.length === 0 ? (
                <div className="px-4 py-4 text-sm text-[#9CA3AF] text-center">No results</div>
              ) : (
                filtered.map((c) => (
                  <button key={c.iso2 + c.dial} type="button"
                    onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#FFF5F0] transition-colors ${value.iso2 === c.iso2 ? "text-[#FF6B35] font-semibold" : "text-[#374151]"}`}>
                    <span className="text-base leading-none w-6 text-center">{countryFlag(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[#9CA3AF] text-xs font-mono">{c.dial}</span>
                  </button>
                ))
              )
            ) : (
              <>
                <div className="px-4 pt-2.5 pb-1">
                  <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">Gulf Countries</span>
                </div>
                {GULF_COUNTRIES.map((c) => (
                  <button key={c.iso2} type="button"
                    onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#FFF5F0] transition-colors ${value.iso2 === c.iso2 ? "text-[#FF6B35] font-semibold" : "text-[#374151]"}`}>
                    <span className="text-base leading-none w-6 text-center">{countryFlag(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[#9CA3AF] text-xs font-mono">{c.dial}</span>
                  </button>
                ))}
                <div className="h-px bg-[#F3F4F6] mx-4 my-1.5" />
                <div className="px-4 pb-1">
                  <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">All Countries</span>
                </div>
                {OTHER_COUNTRIES.map((c) => (
                  <button key={c.iso2} type="button"
                    onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[#FFF5F0] transition-colors ${value.iso2 === c.iso2 ? "text-[#FF6B35] font-semibold" : "text-[#374151]"}`}>
                    <span className="text-base leading-none w-6 text-center">{countryFlag(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[#9CA3AF] text-xs font-mono">{c.dial}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── WhatsApp modal ── */
function WhatsAppModal({ onClose, onConnect }: { onClose: () => void; onConnect: (phone: string) => void }) {
  const UAE = COUNTRIES.find((c) => c.iso2 === "AE")!;
  const [step, setStep]               = useState<0 | 1 | 2>(0);
  const [country, setCountry]         = useState<Country>(UAE);
  const [number, setNumber]           = useState("");
  const [code, setCode]               = useState(["", "", "", "", "", ""]);
  const [sending, setSending]         = useState(false);
  const [verifying, setVerifying]     = useState(false);
  const [sendMsg, setSendMsg]         = useState<{ text: string; isError: boolean } | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const fullPhone = `${country.dial}${number.replace(/\s/g, "")}`;
  const fullCode = code.join("");

  // Auto-detect country from browser locale
  useEffect(() => {
    try {
      const lang = navigator.language; // e.g. "ar-AE"
      const parts = lang.split("-");
      if (parts.length >= 2) {
        const iso2 = parts[parts.length - 1].toUpperCase();
        const found = COUNTRIES.find((c) => c.iso2 === iso2);
        if (found) setCountry(found);
      }
    } catch { /* ignore */ }
  }, []);

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

  const handleSendCode = async () => {
    if (!number.trim()) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/whatsapp/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json() as { success: boolean; notConfigured?: boolean; message?: string };
      if (data.notConfigured) {
        setSendMsg({ text: "Demo mode: Twilio not configured yet. Enter any 6-digit code to continue.", isError: false });
      } else if (!data.success) {
        setSendMsg({ text: data.message ?? "Failed to send code", isError: true });
        setSending(false);
        return;
      } else {
        setSendMsg({ text: `Verification code sent to ${fullPhone}`, isError: false });
      }
      setStep(1);
    } catch {
      setSendMsg({ text: "Network error. Please try again.", isError: true });
    }
    setSending(false);
  };

  const handleVerify = async () => {
    if (fullCode.length !== 6) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/whatsapp/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code: fullCode }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (!data.success) {
        setVerifyError(data.message ?? "Invalid code. Please try again.");
        setVerifying(false);
        return;
      }
      setStep(2);
    } catch {
      setVerifyError("Network error. Please try again.");
    }
    setVerifying(false);
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#111111]">Connect WhatsApp Business</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Step {step + 1} of 3</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <Steps total={3} current={step} />

        {step === 0 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-4">Enter your WhatsApp Business number</p>
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <CountryPicker value={country} onChange={setCountry} />
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^0-9\s]/g, ""))}
                  placeholder="50 000 0000"
                  autoFocus
                  className="flex-1 px-4 py-3 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/50"
                />
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-1.5">Number: {fullPhone || "—"}</p>
            </div>
            {sendMsg && (
              <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${sendMsg.isError ? "bg-red-50 text-red-600" : "bg-[#F0FFF4] text-green-700"}`}>
                {sendMsg.text}
              </p>
            )}
            <div className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] mb-5">
              <p className="text-[11px] text-[#6B7280]">Make sure this number is active on WhatsApp Business before continuing.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#9CA3AF]">Cancel</button>
              <button
                onClick={handleSendCode}
                disabled={!number.trim() || sending}
                className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
                style={{ background: "#25D366" }}
              >
                {sending ? "Sending…" : "Send Verification Code"}
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[#111111] mb-1">Enter verification code</p>
            {sendMsg && !sendMsg.isError && (
              <p className="text-xs text-[#6B7280] mb-4">
                {sendMsg.text}
              </p>
            )}
            <p className="text-xs text-[#6B7280] mb-5">
              Code sent to <span className="font-semibold text-[#111111]">{fullPhone}</span>
            </p>
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
                  className="w-11 h-12 text-center text-lg font-bold border border-[#E5E7EB] rounded-xl text-[#111111] focus:outline-none focus:border-[#FF6B35]/60"
                />
              ))}
            </div>
            {verifyError && <p className="text-xs text-red-600 text-center mb-3">{verifyError}</p>}
            <button onClick={() => { setStep(0); setCode(["","","","","",""]); setSendMsg(null); }} className="text-xs text-[#6B7280] hover:text-[#FF6B35] transition-colors block mb-5">
              Wrong number? Change it
            </button>
            <button
              onClick={handleVerify}
              disabled={fullCode.length !== 6 || verifying}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
              style={{ background: "#25D366" }}
            >
              {verifying ? "Verifying…" : "Verify Code"}
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
            <h4 className="font-bold text-[#111111] mb-1">WhatsApp Business Connected!</h4>
            <p className="text-sm font-semibold text-[#374151] mb-1">{fullPhone}</p>
            <p className="text-xs text-[#9CA3AF] mb-6">Vela AI will now reply to your WhatsApp messages automatically.</p>
            <button
              onClick={() => onConnect(fullPhone)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ background: "#FF6B35" }}
            >
              Done
            </button>
          </div>
        )}
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
          style={{ background: "linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,51,102,0.08))" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111111] mb-2">Upgrade to connect more channels</h3>
        <p className="text-sm text-[#6B7280] mb-6">Connect all 3 channels — WhatsApp, Instagram, and Website — on the Pro plan.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB]">Cancel</button>
          <Link
            href="/auth/signup"
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white text-center hover:opacity-90"
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
   MAIN PAGE
══════════════════════════════════════ */
type ChannelStatus = {
  instagram: { connected: boolean; username: string };
  whatsapp:  { connected: boolean; phone: string };
};

function ChannelsPageContent() {
  const { t }                 = useI18n();
  const { isStarter, config } = usePlan();
  const searchParams          = useSearchParams();

  const [channels, setChannels]     = useState<ChannelStatus>({ instagram: { connected: false, username: "" }, whatsapp: { connected: false, phone: "" } });
  const [modal, setModal]           = useState<"instagram" | "whatsapp" | "upgrade" | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type?: "success" | "error" | "info" } | null>(null);
  const [copied, setCopied]         = useState(false);
  const [tenantId, setTenantId]     = useState("YOUR_TENANT_ID");
  const [loading, setLoading]       = useState(true);
  const [disconnecting, setDisconnecting] = useState<"instagram" | "whatsapp" | null>(null);

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
        .select("instagram_connected, instagram_username, whatsapp_connected, whatsapp_phone")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (cfg) {
        setChannels({
          instagram: { connected: !!cfg.instagram_connected, username: cfg.instagram_username ?? "" },
          whatsapp:  { connected: !!cfg.whatsapp_connected,  phone: cfg.whatsapp_phone ?? "" },
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Handle OAuth callback params from URL
  useEffect(() => {
    const ig = searchParams.get("instagram");
    const username = searchParams.get("username");
    if (ig === "connected") {
      setChannels((prev) => ({ ...prev, instagram: { connected: true, username: username ?? "" } }));
      setToast({ msg: `Instagram connected${username ? ` as @${username}` : ""}`, type: "success" });
      // Clear params from URL without navigation
      window.history.replaceState({}, "", "/app/channels");
    } else if (ig === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      setToast({ msg: `Instagram connection failed: ${reason.replace(/_/g, " ")}`, type: "error" });
      window.history.replaceState({}, "", "/app/channels");
    } else if (ig === "not_configured") {
      setToast({ msg: "Meta App ID not configured yet — add META_APP_ID to .env.local", type: "info" });
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

  const connectWhatsApp = (phone: string) => {
    setChannels((prev) => ({ ...prev, whatsapp: { connected: true, phone } }));
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
        [ch]: { connected: false, username: "", phone: "" },
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

  const CHANNELS = [
    {
      key: "instagram" as const,
      name: t("channels.instagram.name"),
      desc: "Auto-reply to DMs while you focus on your business",
      connectedDesc: channels.instagram.username ? `@${channels.instagram.username}` : "Connected",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FCAF45"/>
              <stop offset="40%" stopColor="#E1306C"/>
              <stop offset="100%" stopColor="#833AB4"/>
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="16" height="16" rx="4.5" stroke="url(#ig-g)" strokeWidth="1.6"/>
          <circle cx="10" cy="10" r="3.5" stroke="url(#ig-g)" strokeWidth="1.6"/>
          <circle cx="14.5" cy="5.5" r="1.1" fill="url(#ig-g)"/>
        </svg>
      ),
    },
    {
      key: "whatsapp" as const,
      name: t("channels.whatsapp.name"),
      desc: "Let Vela handle WhatsApp enquiries around the clock",
      connectedDesc: channels.whatsapp.phone || "Connected",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2a8 8 0 0 1 6.928 12L18 18l-4.133-1.069A8 8 0 1 1 10 2z" stroke="#25D366" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M7.5 8.5c.2.8 1.2 2.4 2 3.2.8.8 2.1 1.7 2.9 1.8.5.1.8-.1 1-.4l.3-.5c.1-.2 0-.4-.1-.5l-1-.5c-.2-.1-.4 0-.5.1l-.3.4c-.5-.2-1.4-.9-1.9-1.9l.3-.3c.1-.1.2-.3.1-.5l-.5-1c-.1-.2-.3-.2-.5-.1l-.5.3c-.3.3-.5.6-.4 1z" stroke="#25D366" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      {modal === "instagram" && <InstagramModal onClose={() => setModal(null)} />}
      {modal === "whatsapp"  && <WhatsAppModal  onClose={() => setModal(null)} onConnect={connectWhatsApp} />}
      {modal === "upgrade"   && <UpgradeModal   onClose={() => setModal(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-[#111111]">{t("channels.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{t("channels.subtitle")}</p>
      </div>

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
              <p className="text-xs font-bold text-[#111111]">Starter Plan — {connectedSocialCount}/{config.channels} social channel{config.channels > 1 ? "s" : ""}</p>
              <p className="text-[11px] text-[#6B7280]">Upgrade to Pro to connect all 3 channels</p>
            </div>
          </div>
          <Link href="/auth/signup" onClick={() => track("upgrade_clicked", { source: "channels_banner" })}
            className="text-xs font-bold px-3.5 py-2 rounded-lg text-white whitespace-nowrap hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
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

          return (
            <div key={ch.key}
              className={`flex items-center justify-between p-4 rounded-xl bg-white border transition-colors ${isLocked ? "border-[#E5E7EB] opacity-70" : "border-[#E5E7EB] hover:border-[#D1D5DB]"}`}
            >
              {loading ? (
                <div className="flex items-center gap-4 w-full animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 bg-[#F3F4F6] rounded w-28" />
                    <div className="h-2 bg-[#F3F4F6] rounded w-40" />
                  </div>
                  <div className="h-8 w-20 bg-[#F3F4F6] rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center shrink-0">
                      {ch.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#111111]">{ch.name}</p>
                        {isLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#9CA3AF]">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <rect x="2" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                              <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1.1"/>
                            </svg>
                            Pro only
                          </span>
                        ) : (
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
                      disabled={isDisc}
                      className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-red-200 hover:text-red-500 transition-all shrink-0 disabled:opacity-50"
                    >
                      {isDisc ? "…" : t("common.disconnect")}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnectClick(ch.key)}
                      className={`text-xs font-bold px-4 py-2 rounded-lg border shrink-0 transition-all ${
                        isLocked
                          ? "border-[#E5E7EB] text-[#9CA3AF] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                          : "border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      }`}
                    >
                      {isLocked ? "Upgrade" : t("common.connect")}
                    </button>
                  )}
                </>
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
                  <circle cx="10" cy="10" r="7.5" stroke="#3B82F6" strokeWidth="1.5"/>
                  <path d="M10 2.5c-2 2.5-2 12.5 0 15M2.5 10h15M3.5 6.5h13M3.5 13.5h13" stroke="#3B82F6" strokeWidth="1.3" strokeLinecap="round"/>
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
                <p className="text-xs text-[#6B7280] mt-0.5">Paste one line of code — a chat bubble appears on your site instantly</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { n: 1, text: "Copy the embed code below" },
              { n: 2, text: "Paste it before the </body> tag on your website" },
              { n: 3, text: "The chat bubble appears in the bottom-right corner" },
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

          {/* Preview */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Chat Bubble Preview</p>
            <div className="relative h-16">
              <div className="absolute bottom-0 right-0 flex items-end gap-2">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#374151] font-medium whitespace-nowrap">Hi! How can I help?</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3L7 11L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
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
