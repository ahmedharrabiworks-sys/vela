"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────
type AttachedImage = { preview: string; base64: string; mimeType: string };
type ContactInfo   = { phone: string; email: string; address: string; hours: string };
type DnsRecord     = { type: string; name: string; value: string };

type VersionRecord = {
  id:         string;
  label:      string;
  created_at: string;
  type:       "generate" | "publish";
  html:       string;
};

type WebsiteProject = { id: string; name: string | null; slug: string | null; is_published: boolean; published_url?: string | null };

// Chat messages include both AI/user text, inline version cards, and session separators
type Msg = {
  role:        "ai" | "user" | "version";
  content:     string;
  isBuilding?: boolean;
  isError?:    boolean;
  isSeparator?: boolean;    // "New website" divider in the chat feed
  images?:     string[];
  // for role === "version"
  version?:    VersionRecord;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_ATTACH   = 4;
const MAX_IMG_SIZE = 5 * 1024 * 1024;

const INDUSTRY_SUGGESTIONS: Record<string, string[]> = {
  "Gym & Fitness":     ["Build a bold fitness website with membership plans", "Add a free trial offer section", "Show class schedule and trainers"],
  "Beauty & Wellness": ["Build a luxury salon website with service menu", "Make it elegant, rose-gold tones", "Add a before/after gallery section"],
  "Restaurant":        ["Build a warm restaurant site with menu", "Add a table reservation section", "Show signature dishes and ambiance"],
  "Medical Clinic":    ["Build a clean dental clinic website in Dubai Marina", "Show our specialties and team", "Add online appointment booking"],
  "Real Estate":       ["Build a premium property agency website", "Show featured listings with photos", "Add a free valuation CTA"],
  "Coffee Shop":       ["Build a cozy coffee shop website", "Show our drinks menu and story", "Make it warm and inviting"],
  "Education":         ["Build a modern education website", "Show our courses and success stories", "Highlight student outcomes"],
  "Hotel":             ["Build a luxury hotel website", "Show room types and amenities", "Add direct booking button"],
  "Law Firm":          ["Build an authoritative law firm website", "Show practice areas and team", "Add free consultation CTA"],
  "E-Commerce":        ["Build a product showcase site", "Show bestselling items with prices", "Add customer reviews section"],
};

const DEFAULT_SUGGESTIONS = [
  "Build a dental clinic website in Dubai Marina",
  "Build a gym website with membership plans",
  "Build a luxury hair salon website with service menu",
];

const PLAN_WEBSITE_LIMITS: Record<string, number> = { starter: 1, pro: 2, premium: 3 };

const LANGUAGE_OPTIONS = ["English", "Arabic", "French", "Spanish", "German", "Italian", "Portuguese", "Russian"];

const INITIAL_MSG = (btype: string | null, lang?: string): Msg => ({
  role: "ai",
  content: lang
    ? (btype && INDUSTRY_SUGGESTIONS[btype]
      ? `Great! I'll build your ${btype} website in ${lang}. What's your business name and location?`
      : `Great! I'll build your website in ${lang}. Tell me about your business — name, what you do, and your city.`)
    : "Hi! First, what language should your website be in?",
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function stripImages(m: Msg): { role: string; content: string; isError?: boolean } {
  return { role: m.role, content: m.content, isError: m.isError };
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }
}

// ── Publish Panel ─────────────────────────────────────────────────────────────
function PublishPanel({
  isPublished, publishedUrl, visitCount,
  siteName, setSiteName, siteSlug, setSiteSlug,
  slugError, setSlugError, settingsError, setSettingsError,
  savingSettings, setSavingSettings, websiteId,
  customDomain, setCustomDomain, domainStatus, setDomainStatus,
  domainRecords, setDomainRecords, domainConfigured, setDomainConfigured,
  domainInput, setDomainInput, domainError, setDomainError,
  connectingDomain, setConnectingDomain, checkingDomain, setCheckingDomain,
  removingDomain, setRemovingDomain,
  draftDiffers, publishing, onPublish, onClose,
}: {
  isPublished: boolean; publishedUrl: string; visitCount: number;
  siteName: string; setSiteName: (v: string) => void;
  siteSlug: string; setSiteSlug: (v: string) => void;
  slugError: string; setSlugError: (v: string) => void;
  settingsError: string; setSettingsError: (v: string) => void;
  savingSettings: boolean; setSavingSettings: (v: boolean) => void;
  websiteId: string | null;
  customDomain: string | null; setCustomDomain: (v: string | null) => void;
  domainStatus: "pending" | "verified" | null; setDomainStatus: (v: "pending" | "verified" | null) => void;
  domainRecords: DnsRecord[]; setDomainRecords: (v: DnsRecord[]) => void;
  domainConfigured: boolean; setDomainConfigured: (v: boolean) => void;
  domainInput: string; setDomainInput: (v: string) => void;
  domainError: string; setDomainError: (v: string) => void;
  connectingDomain: boolean; setConnectingDomain: (v: boolean) => void;
  checkingDomain: boolean; setCheckingDomain: (v: boolean) => void;
  removingDomain: boolean; setRemovingDomain: (v: boolean) => void;
  draftDiffers: boolean; publishing: boolean;
  onPublish: () => void; onClose: () => void;
  setPublishedUrl: (v: string) => void;
}) {
  // step 1=details, 2=security check, 3=live/published view
  const [step, setStep] = useState<1 | 2 | 3>(() => (isPublished ? 3 : 1));
  const [checkState, setCheckState] = useState<"idle" | "running" | "done">("idle");
  const [urlCopied, setUrlCopied] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [showDomain, setShowDomain] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // When step 2 is entered, run the fake security check animation
  useEffect(() => {
    if (step !== 2) return;
    setCheckState("running");
    const t = setTimeout(() => setCheckState("done"), 1600);
    return () => clearTimeout(t);
  }, [step]);

  // Advance to step 3 once publish completes (isPublished flips to true)
  const prevPublishedRef = useRef(isPublished);
  useEffect(() => {
    if (!prevPublishedRef.current && isPublished) setStep(3);
    prevPublishedRef.current = isPublished;
  }, [isPublished]);

  const handleSaveSettings = async () => {
    if (!websiteId) return;
    setSlugError(""); setSettingsError(""); setSavingSettings(true);
    try {
      const res  = await fetch("/api/website/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, name: siteName, slug: siteSlug }),
      });
      const data = await res.json() as { slug?: string; error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Failed to save.";
        if (msg.toLowerCase().includes("slug")) setSlugError(msg);
        else setSettingsError(msg);
      } else {
        if (data.slug) {
          setSiteSlug(data.slug);
          if (isPublished) setPublishedUrl(`/site/${data.slug}`);
        }
      }
    } catch { setSettingsError("Connection error."); }
    finally { setSavingSettings(false); }
  };

  const handleConnectDomain = async () => {
    setDomainError(""); setConnectingDomain(true);
    try {
      const res  = await fetch("/api/website/domain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json() as { error?: string; domain?: string; status?: "pending" | "verified"; records?: DnsRecord[] };
      if (!res.ok) {
        if (res.status === 503) { setDomainConfigured(false); return; }
        setDomainError(data.error ?? "Failed to connect domain.");
      } else {
        setCustomDomain(data.domain ?? domainInput.trim());
        setDomainStatus(data.status ?? "pending");
        setDomainRecords(data.records ?? []);
      }
    } catch { setDomainError("Connection error — please try again."); }
    finally { setConnectingDomain(false); }
  };

  const handleCheckDomain = async () => {
    setDomainError(""); setCheckingDomain(true);
    try {
      const res  = await fetch("/api/website/domain");
      const data = await res.json() as { error?: string; status?: "pending" | "verified" | null; records?: DnsRecord[] };
      if (!res.ok) {
        if (res.status === 503) { setDomainConfigured(false); return; }
        setDomainError(data.error ?? "Could not check status.");
      } else {
        if (data.status) setDomainStatus(data.status);
        if (Array.isArray(data.records)) setDomainRecords(data.records);
      }
    } catch { setDomainError("Connection error — please try again."); }
    finally { setCheckingDomain(false); }
  };

  const handleRemoveDomain = async () => {
    if (!confirm(`Remove ${customDomain ?? "this domain"}?`)) return;
    setRemovingDomain(true);
    try {
      const res = await fetch("/api/website/domain", { method: "DELETE" });
      if (res.ok) { setCustomDomain(null); setDomainStatus(null); setDomainRecords([]); setDomainInput(""); }
    } catch { /* ignore */ }
    finally { setRemovingDomain(false); }
  };

  const handleCopyRecord = async (value: string) => {
    await copyText(value); setCopiedRecord(value);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  // Domain section — shared between step 1 and step 3 settings
  // Defined as a render helper (not a React component) so React never unmounts/remounts it on re-render.
  const renderDomainSection = () => (
    <div className="space-y-3">
      <button onClick={() => setShowDomain((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#374151] hover:text-[#FF6B35] transition-colors w-full text-left">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {customDomain && domainStatus === "verified" ? `Custom domain: ${customDomain}` : "Add custom domain"}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`ml-auto transition-transform ${showDomain ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {showDomain && (
        !domainConfigured ? (
          <p className="text-[11px] text-[#9CA3AF]">Custom domains not configured — contact your administrator.</p>
        ) : customDomain ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2 h-2 rounded-full shrink-0 ${domainStatus === "verified" ? "bg-green-400" : "bg-yellow-400"}`} />
              <span className="text-xs font-semibold text-[#111111]">{customDomain}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${domainStatus === "verified" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                {domainStatus === "verified" ? "Connected" : "Pending"}
              </span>
            </div>
            {domainStatus !== "verified" && domainRecords.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>{["Type", "Name", "Value", ""].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-[#374151] whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {domainRecords.map((r, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-2 font-mono text-[#374151] whitespace-nowrap">{r.type}</td>
                        <td className="px-3 py-2 font-mono text-[#6B7280] whitespace-nowrap max-w-[90px] truncate">{r.name}</td>
                        <td className="px-3 py-2 font-mono text-[#6B7280] whitespace-nowrap max-w-[120px] truncate">{r.value}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => handleCopyRecord(r.value)} className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80">
                            {copiedRecord === r.value ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {domainError && <p className="text-[11px] text-red-500">{domainError}</p>}
            <div className="flex items-center gap-2">
              {domainStatus !== "verified" && (
                <button onClick={handleCheckDomain} disabled={checkingDomain}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors">
                  {checkingDomain ? "Checking…" : "Check Status"}
                </button>
              )}
              <button onClick={handleRemoveDomain} disabled={removingDomain}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors">
                {removingDomain ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-stretch gap-2">
              <input value={domainInput} onChange={(e) => { setDomainInput(e.target.value); setDomainError(""); }}
                placeholder="www.yourbusiness.com"
                className="flex-1 text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
                onKeyDown={(e) => { if (e.key === "Enter") handleConnectDomain(); }}
              />
              <button onClick={handleConnectDomain} disabled={connectingDomain || !domainInput.trim()}
                className="text-[11px] font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                style={{ background: "var(--vp-color)" }}>
                {connectingDomain ? "Connecting…" : "Connect"}
              </button>
            </div>
            {domainError && <p className="text-[11px] text-red-500">{domainError}</p>}
          </div>
        )
      )}
    </div>
  );

  // Site details form — render helper (not a React component) to avoid re-mount on every keystroke.
  const renderSiteDetailsForm = () => (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-[#374151] uppercase tracking-wide">Site Name</label>
        <input value={siteName} onChange={(e) => setSiteName(e.target.value)}
          placeholder="My Business"
          className="w-full text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-[#374151] uppercase tracking-wide">URL Slug</label>
        <div className="flex items-stretch border border-[#E5E7EB] rounded-lg overflow-hidden focus-within:border-[#FF6B35]">
          <span className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-2.5 flex items-center border-r border-[#E5E7EB] whitespace-nowrap shrink-0">/site/</span>
          <input value={siteSlug}
            onChange={(e) => { setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugError(""); }}
            placeholder="my-business"
            className="flex-1 text-sm px-3 py-2 focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
          />
        </div>
        {slugError && <p className="text-[11px] text-red-500">{slugError}</p>}
      </div>
      <div className="flex items-center gap-2 bg-[#F9FAFB] rounded-lg px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        <span className="text-[11px] text-[#6B7280]"><strong className="text-[#374151]">Public</strong> — anyone with the URL can view</span>
      </div>
      {settingsError && <p className="text-[11px] text-red-500">{settingsError}</p>}
      <button onClick={handleSaveSettings} disabled={savingSettings || !websiteId}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors">
        {savingSettings ? "Saving…" : "Save"}
      </button>
    </div>
  );

  return (
    <div className="absolute top-full right-0 mt-2 w-[360px] bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 overflow-hidden
      md:w-[360px]
      max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:rounded-b-none max-md:rounded-t-2xl max-md:mt-0">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? "bg-green-400" : "bg-[#9CA3AF]"}`} />
          <span className="text-sm font-bold text-[#111111]">{isPublished ? "Published" : "Publish your site"}</span>
          {visitCount > 0 && (
            <span className="text-[10px] font-medium text-[#9CA3AF] ml-1">{visitCount.toLocaleString()} visitor{visitCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors text-sm font-bold">×</button>
      </div>

      {/* Step indicator (pre-publish flow only) */}
      {!isPublished && (
        <div className="flex items-center px-5 pt-3 pb-1 gap-0">
          {([1, 2, 3] as const).map((s, idx) => (
            <div key={s} className="flex items-center">
              {idx > 0 && <div className={`w-6 h-px mx-1 ${step >= s ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
              <div className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > s ? "bg-[#FF6B35] text-white" : step === s ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                  {step > s ? <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : s}
                </div>
                <span className={`text-[10px] font-semibold ${step >= s ? "text-[#374151]" : "text-[#9CA3AF]"}`}>
                  {s === 1 ? "Details" : s === 2 ? "Check" : "Go Live"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 space-y-4 max-h-[78vh] overflow-y-auto">

        {/* ── STEP 1: Site Details ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {renderSiteDetailsForm()}
            {renderDomainSection()}
            <div className="border-t border-[#F3F4F6] pt-3">
              <button onClick={() => setStep(2)}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--vp-color)" }}>
                Continue →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Security Check ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold text-[#374151]">Quick security check</p>
            <div className="space-y-3">
              {["Validating site content", "Checking for broken elements", "Reviewing performance"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {checkState === "done" ? (
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin shrink-0" />
                  )}
                  <span className={`text-xs ${checkState === "done" ? "text-[#374151]" : "text-[#9CA3AF]"}`}>{item}</span>
                </div>
              ))}
            </div>
            {checkState === "done" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-[11px] font-semibold text-green-700">All checks passed — looking good!</span>
                </div>
                <button
                  onClick={onPublish}
                  disabled={publishing}
                  className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: "var(--vp-color)" }}>
                  {publishing ? (isPublished ? "Updating…" : "Publishing…") : isPublished ? "Update Site" : "Publish Now"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Live view (post-publish) ────────────────────────────── */}
        {step === 3 && (
          <>
            {/* Live URL */}
            {publishedUrl && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Your Site</p>
                <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2">
                  <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-mono text-[#374151] truncate flex-1 hover:text-[#FF6B35] transition-colors">
                    {origin}{publishedUrl}
                  </a>
                  <button onClick={async () => { await copyText(`${origin}${publishedUrl}`); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }}
                    className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80 shrink-0">
                    {urlCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Visitor count */}
            {visitCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <span>{visitCount.toLocaleString()} visitor{visitCount !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Update Site — always visible */}
            <div className="space-y-1.5">
              <button
                onClick={onPublish}
                disabled={publishing}
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "var(--vp-color)" }}>
                {publishing ? "Updating…" : draftDiffers ? "Push Updates Live" : "Update Site"}
              </button>
              {!draftDiffers && (
                <p className="text-center text-[10px] text-[#9CA3AF]">Site is up to date — republish anytime</p>
              )}
            </div>

            {/* Settings accordion */}
            <div className="border-t border-[#F3F4F6] pt-3 space-y-3">
              <button onClick={() => setShowSettings((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#374151] hover:text-[#FF6B35] transition-colors w-full text-left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Site Settings
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`ml-auto transition-transform ${showSettings ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showSettings && (
                <div className="space-y-4">
                  {renderSiteDetailsForm()}
                  {renderDomainSection()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline version card rendered in the chat feed ─────────────────────────────
function VersionCard({
  version, isFirst, onPreview, onRestore, restoring, previewing,
}: {
  version: VersionRecord; isFirst: boolean;
  onPreview: (v: VersionRecord) => void;
  onRestore: (v: VersionRecord) => void;
  restoring: boolean; previewing: boolean;
}) {
  return (
    <div className="ml-8 mr-2 bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${version.type === "publish" ? "bg-green-100" : "bg-[#F3F4F6]"}`}>
        {version.type === "publish" ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3 9 21 9"/></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[11px] font-semibold text-[#111111] truncate">{version.label}</p>
          {version.type === "publish" && <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full shrink-0">Published</span>}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(version.created_at)}</p>
      </div>
      {isFirst ? (
        <span className="text-[10px] font-medium text-[#9CA3AF] shrink-0 mt-0.5">Current</span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onPreview(version)} disabled={previewing}
            className="text-[10px] font-semibold text-[#6B7280] hover:text-[#111111] disabled:opacity-40 transition-colors">
            Preview
          </button>
          <button onClick={() => onRestore(version)} disabled={restoring}
            className="text-[10px] font-semibold text-[#FF6B35] hover:opacity-80 disabled:opacity-40">
            {restoring ? "…" : "Restore"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const { t } = useI18n();
  const btype       = typeof window !== "undefined" ? localStorage.getItem("vela_business_type") : null;
  const suggestions = (btype && INDUSTRY_SUGGESTIONS[btype]) ? INDUSTRY_SUGGESTIONS[btype] : DEFAULT_SUGGESTIONS;

  // ── Language (persisted, question #1) ───────────────────────────────────────
  const [siteLanguage, setSiteLanguage] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("vela_site_language") ?? "";
    return "";
  });

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [msgs, setMsgs]               = useState<Msg[]>(() => {
    const lang = typeof window !== "undefined" ? (localStorage.getItem("vela_site_language") || undefined) : undefined;
    return [INITIAL_MSG(btype, lang)];
  });
  const [input, setInput]             = useState("");
  const [html, setHtml]               = useState("");
  const [device, setDevice]           = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode]       = useState<"preview" | "code">("preview");
  const [building, setBuilding]       = useState(false);
  const [built, setBuilt]             = useState(false);
  const [codeCopied, setCodeCopied]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"chat" | "preview">("chat");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [contactInfo, setContactInfo]       = useState<ContactInfo>({ phone: "", email: "", address: "", hours: "" });

  // ── Publish state ────────────────────────────────────────────────────────────
  const [publishedUrl, setPublishedUrl]     = useState("");
  const [publishing, setPublishing]         = useState(false);
  const [isPublished, setIsPublished]       = useState(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [draftDiffers, setDraftDiffers]     = useState(false);
  const [visitCount, setVisitCount]         = useState(0);

  // ── Website metadata ─────────────────────────────────────────────────────────
  const [websiteId, setWebsiteId]       = useState<string | null>(null);
  const [siteName, setSiteName]         = useState("");
  const [siteSlug, setSiteSlug]         = useState("");
  const [slugError, setSlugError]       = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError]   = useState("");

  // ── Projects sidebar ─────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<WebsiteProject[]>([]);

  // ── Version history ──────────────────────────────────────────────────────────
  const [versions, setVersions]             = useState<VersionRecord[]>([]);
  const [previewVersionHtml, setPreviewVersionHtml] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion]     = useState<string | null>(null);
  const [previewingVersion, setPreviewingVersion]   = useState<string | null>(null);

  // ── Plan limits ──────────────────────────────────────────────────────────────
  const [websiteLimit, setWebsiteLimit] = useState(1);
  const [websiteCount, setWebsiteCount] = useState(0);

  // ── Domain state ─────────────────────────────────────────────────────────────
  const [domainInput, setDomainInput]       = useState("");
  const [customDomain, setCustomDomain]     = useState<string | null>(null);
  const [domainStatus, setDomainStatus]     = useState<"pending" | "verified" | null>(null);
  const [domainRecords, setDomainRecords]   = useState<DnsRecord[]>([]);
  const [domainConfigured, setDomainConfigured] = useState(true);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain]     = useState(false);
  const [removingDomain, setRemovingDomain]     = useState(false);
  const [domainError, setDomainError]           = useState("");

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlRef      = useRef<string>("");
  const websiteIdRef = useRef<string | null>(null);
  const publishBtnRef = useRef<HTMLDivElement>(null);

  // ── Mount: load persisted state ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/website/state");
        const data = await res.json() as {
          websiteId?:    string | null;
          html?:         string | null;
          slug?:         string | null;
          name?:         string | null;
          isPublished?:  boolean;
          publishedUrl?: string | null;
          projects?:     WebsiteProject[];
          chat?:         Msg[] | null;
          intake?:       ContactInfo | null;
          versions?:     VersionRecord[];
          customDomain?: string | null;
          domainStatus?: "pending" | "verified" | null;
          domainRecords?: DnsRecord[] | null;
          visitCount?:   number;
          plan?:         string;
        };

        if (data.websiteId) {
          setWebsiteId(data.websiteId);
          websiteIdRef.current = data.websiteId;
          setWebsiteCount(1);
        }
        if (data.html) {
          setHtml(data.html);
          htmlRef.current = data.html;
          setBuilt(true);
          setActiveTab("preview");
        }
        if (data.slug)        setSiteSlug(data.slug);
        if (data.name)        setSiteName(data.name);
        if (data.isPublished) setIsPublished(true);
        if (data.publishedUrl) setPublishedUrl(data.publishedUrl);
        if (data.visitCount)   setVisitCount(data.visitCount);
        if (data.plan) setWebsiteLimit(PLAN_WEBSITE_LIMITS[data.plan] ?? 1);

        // Restore chat (filter out stubs, inject persisted version cards)
        if (Array.isArray(data.chat) && data.chat.length > 1) {
          const cleanChat = (data.chat as Msg[]).filter(m => !m.isBuilding);
          setMsgs(cleanChat);
        }
        if (data.intake) {
          setContactInfo(data.intake);
          // Restore language from DB intake if localStorage was cleared (e.g. new browser/session)
          const savedLang = (data.intake as Record<string, string>)?.language;
          if (savedLang && !siteLanguage) {
            setSiteLanguage(savedLang);
            if (typeof window !== "undefined") localStorage.setItem("vela_site_language", savedLang);
          }
        }
        if (Array.isArray(data.versions)) setVersions(data.versions as VersionRecord[]);
        if (Array.isArray(data.projects)) setProjects(data.projects as WebsiteProject[]);
        if (data.customDomain) { setCustomDomain(data.customDomain); setDomainInput(data.customDomain); }
        if (data.domainStatus)  setDomainStatus(data.domainStatus);
        if (Array.isArray(data.domainRecords)) setDomainRecords(data.domainRecords as DnsRecord[]);

      } catch { /* ignore — show empty state */ }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Auto-refresh when publish panel opens: domain status + live visit count
  useEffect(() => {
    if (!showPublishPanel) return;
    (async () => {
      // 1. Refresh visit count from DB
      try {
        const stateRes = await fetch("/api/website/state");
        if (stateRes.ok) {
          const stateData = await stateRes.json() as { visitCount?: number };
          if (typeof stateData.visitCount === "number") setVisitCount(stateData.visitCount);
        }
      } catch { /* non-critical */ }

      // 2. Refresh domain status (skips if no domain configured or API not set up)
      if (!customDomain || checkingDomain) return;
      setCheckingDomain(true);
      try {
        const res = await fetch("/api/website/domain");
        if (res.status === 503) { setDomainConfigured(false); return; }
        if (res.ok) {
          const data = await res.json() as { status?: "pending" | "verified" | null; domain?: string | null; records?: DnsRecord[] };
          if (data.status !== undefined) setDomainStatus(data.status ?? null);
          if (Array.isArray(data.records)) setDomainRecords(data.records);
          // If the domain was cleared (Vercel 404), clear local state too
          if (data.domain === null) { setCustomDomain(null); setDomainInput(""); }
        }
      } catch { /* non-critical */ }
      finally { setCheckingDomain(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPublishPanel]);

  // ── Language selection (question #1) ─────────────────────────────────────────
  const handleSelectLanguage = useCallback((lang: string) => {
    setSiteLanguage(lang);
    localStorage.setItem("vela_site_language", lang);
    setMsgs([INITIAL_MSG(btype, lang)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btype]);

  // ── Persist chat + intake ─────────────────────────────────────────────────────
  const persistChat = useCallback((finalMsgs: Msg[], intake: ContactInfo) => {
    const chatToSave = finalMsgs
      .filter(m => !m.isBuilding && m.role !== "version" && !m.isSeparator)
      .map(stripImages);
    fetch("/api/website/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat: chatToSave, intake }),
    }).catch(() => {});
  }, []);

  // ── Publish / Update ──────────────────────────────────────────────────────────
  // Opens/closes the publish panel — never triggers publishing directly.
  const handleTogglePanel = useCallback(() => {
    setShowPublishPanel((v) => !v);
  }, []);

  // Does the actual publish API call — called from inside the publish panel.
  const handleDoPublish = useCallback(async () => {
    const currentHtml = htmlRef.current;
    if (!built || publishing || !currentHtml) return;

    setPublishing(true);
    try {
      const res  = await fetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: currentHtml, websiteId: websiteIdRef.current }),
      });
      const data = await res.json() as { url?: string; slug?: string; error?: string };
      if (!res.ok || !data.url) {
        alert(data.error ?? "Publish failed — please try again.");
        return;
      }
      const finalUrl = data.slug ? `/site/${data.slug}` : (data.url ?? "");
      setPublishedUrl(finalUrl);
      setIsPublished(true);
      setDraftDiffers(false);
      if (data.slug) setSiteSlug(data.slug);
      if (websiteIdRef.current) {
        setProjects((prev) => prev.map((p) =>
          p.id === websiteIdRef.current ? { ...p, is_published: true, slug: data.slug ?? p.slug } : p
        ));
      }

      // Append published version card to chat
      const publishVer: VersionRecord = {
        id: crypto.randomUUID(), label: "Published",
        created_at: new Date().toISOString(), type: "publish", html: currentHtml,
      };
      setVersions((prev) => [...prev, publishVer].slice(-20));
      setMsgs((prev) => [...prev, { role: "version" as const, content: "", version: publishVer }]);
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }, [built, publishing]);

  // ── Version preview / restore ─────────────────────────────────────────────────
  const handlePreviewVersion = useCallback((v: VersionRecord) => {
    setPreviewingVersion(v.id);
    setPreviewVersionHtml(v.html);
    setViewMode("preview");
    setActiveTab("preview");
    setTimeout(() => setPreviewingVersion(null), 500);
  }, []);

  const handleRestoreVersion = useCallback(async (v: VersionRecord) => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setRestoringVersion(v.id);
    try {
      const res  = await fetch("/api/website/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wId, versionId: v.id, html: v.html }),
      });
      const data = await res.json() as { html?: string; error?: string };
      if (data.html) {
        setHtml(data.html); htmlRef.current = data.html;
        setPreviewVersionHtml(null); setBuilt(true); setDraftDiffers(true);
        setViewMode("preview"); setActiveTab("preview");
        const restoredMsg: Msg = { role: "ai", content: `Restored "${v.label}". Click "Update Site" to push it live.` };
        setMsgs((prev) => { const m = [...prev, restoredMsg]; persistChat(m, contactInfo); return m; });
      } else {
        alert(data.error ?? "Restore failed.");
      }
    } catch { alert("Connection error."); }
    finally { setRestoringVersion(null); }
  }, [contactInfo, persistChat]);

  // ── New Website ───────────────────────────────────────────────────────────────
  // Clears local state for a fresh start. The previous project stays in DB and
  // remains clickable in the sidebar — nothing is deleted.
  const handleNewWebsite = useCallback(() => {
    if (!confirm("Start a new website? Your current project stays saved in the sidebar.")) return;

    // Clear server-side state (website_chat, website_html, website_intake, draft_html, draft_spec).
    // Without this the next page load rehydrates the old conversation + HTML from the DB,
    // which corrupts the new session's priorChat and triggers revision mode on the old spec.
    fetch("/api/website/reset", { method: "POST" }).catch(() => {});

    setHtml(""); htmlRef.current = "";
    setBuilt(false); setDraftDiffers(false); setPreviewVersionHtml(null);
    setInput(""); setAttachedImages([]);
    setContactInfo({ phone: "", email: "", address: "", hours: "" });
    setActiveTab("chat"); setViewMode("preview"); setShowPublishPanel(false);
    setIsPublished(false); setPublishedUrl(""); setSiteName(""); setSiteSlug("");
    setWebsiteId(null); websiteIdRef.current = null;
    setVersions([]);
    // Clear persisted language so the language picker re-appears for this new project
    setSiteLanguage("");
    if (typeof window !== "undefined") localStorage.removeItem("vela_site_language");
    setMsgs([INITIAL_MSG(btype, undefined)]);
  }, [btype]);

  // ── Switch to an existing project ────────────────────────────────────────────
  const handleSwitchProject = useCallback(async (p: WebsiteProject) => {
    if (p.id === websiteIdRef.current) return;
    setBuilding(false); setBuilt(false); setDraftDiffers(false);
    setHtml(""); htmlRef.current = ""; setPreviewVersionHtml(null);
    setInput(""); setAttachedImages([]);
    setContactInfo({ phone: "", email: "", address: "", hours: "" });
    setVersions([]); setMsgs([INITIAL_MSG(btype, siteLanguage || undefined)]);
    setActiveTab("chat"); setViewMode("preview"); setShowPublishPanel(false);
    setWebsiteId(p.id); websiteIdRef.current = p.id;
    setSiteName(p.name ?? ""); setSiteSlug(p.slug ?? "");
    setIsPublished(p.is_published);
    setPublishedUrl(p.is_published ? (p.published_url ?? (p.slug ? `/site/${p.slug}` : "")) : "");
    try {
      const res = await fetch(`/api/website/state?websiteId=${encodeURIComponent(p.id)}`);
      if (res.ok) {
        const data = await res.json() as { html?: string | null; versions?: VersionRecord[] };
        if (data.html) {
          setHtml(data.html); htmlRef.current = data.html;
          setBuilt(true); setActiveTab("preview");
        }
        if (Array.isArray(data.versions)) setVersions(data.versions as VersionRecord[]);
      }
    } catch { /* ignore */ }
  }, [btype, siteLanguage]);

  // ── File attachment ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.slice(0, MAX_ATTACH - attachedImages.length).forEach((file) => {
      if (!file.type.startsWith("image/") || file.size > MAX_IMG_SIZE) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAttachedImages((prev) =>
          prev.length < MAX_ATTACH
            ? [...prev, { preview: dataUrl, base64: dataUrl.split(",")[1] ?? "", mimeType: file.type }]
            : prev,
        );
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [attachedImages.length]);

  const copyCode = useCallback(async () => {
    if (!html) return;
    await copyText(html);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [html]);

  // ── Generate / Send ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || building) return;
    setInput("");

    const capturedImages = [...attachedImages];
    setAttachedImages([]);

    const userMsg:    Msg = { role: "user", content: text || "Please use the uploaded image(s) on the website.", images: capturedImages.map((i) => i.preview) };
    const loadingMsg: Msg = { role: "ai",  content: built ? "Updating your website…" : "Building your website…", isBuilding: true };

    const msgsWithLoading = [...msgs, userMsg, loadingMsg];
    setMsgs(msgsWithLoading);
    setBuilding(true);

    try {
      // isSeparator messages have content:"" — filter them so OpenAI never receives an empty assistant message
      const chatToSend = [...msgs, userMsg].filter(m => !m.isBuilding && m.role !== "version" && !m.isSeparator).map(stripImages);

      // Build intake payload — always include language so the server can persist it and
      // restore it on the next page load (handles cases where user chose language verbally).
      const intakePayload: Record<string, string> = {};
      if (contactInfo.phone)   intakePayload.phone   = contactInfo.phone;
      if (contactInfo.email)   intakePayload.email   = contactInfo.email;
      if (contactInfo.address) intakePayload.address = contactInfo.address;
      if (contactInfo.hours)   intakePayload.hours   = contactInfo.hours;
      if (siteLanguage)        intakePayload.language = siteLanguage;

      const res = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:         text,
          currentHtml:     built ? html : undefined,
          websiteId:       websiteIdRef.current ?? undefined,
          language:        siteLanguage || "English",
          languageChosen:  !!siteLanguage,
          images:          capturedImages.map((i) => ({ data: i.base64, mimeType: i.mimeType })),
          contactInfo:     (contactInfo.phone || contactInfo.email || contactInfo.address || contactInfo.hours) ? contactInfo : undefined,
          chat:            chatToSend,
          intake:          Object.keys(intakePayload).length ? intakePayload : undefined,
        }),
      });

      const data = await res.json() as {
        html?: string; question?: string; error?: string;
        websiteId?: string; slug?: string; name?: string; isPublished?: boolean;
      };

      // Conversational intake: GPT is asking a follow-up question
      if (res.ok && data.question && !data.html) {
        const finalMsgs: Msg[] = [...msgs, userMsg, { role: "ai", content: data.question }];
        setMsgs(finalMsgs);
        persistChat(finalMsgs, contactInfo);
        setBuilding(false);
        return;
      }

      if (!res.ok || !data.html) {
        const errText =
          data.error === "Unauthorized"      ? "Please sign in to use the website builder." :
          data.error === "AI not configured"  ? "The AI service isn't set up yet — contact support." :
          (data.error ?? "Something went wrong. Please try again.");
        setMsgs([...msgs, userMsg, { role: "ai", content: errText, isError: true }]);
        setBuilding(false);
        return;
      }

      setHtml(data.html);
      htmlRef.current = data.html;

      if (data.websiteId && data.websiteId !== websiteIdRef.current) {
        setWebsiteId(data.websiteId);
        websiteIdRef.current = data.websiteId;
        setWebsiteCount((c) => Math.max(c, 1));
      }
      if (data.slug)  setSiteSlug(data.slug);
      if (data.name)  setSiteName(data.name);
      if (typeof data.isPublished === "boolean") setIsPublished(data.isPublished);

      // Keep projects sidebar in sync
      const wId = data.websiteId;
      if (wId) {
        setProjects((prev) => {
          const entry: WebsiteProject = {
            id: wId,
            name: data.name ?? siteName ?? null,
            slug: data.slug ?? null,
            is_published: data.isPublished ?? false,
            published_url: (data.isPublished && data.slug) ? `/site/${data.slug}` : undefined,
          };
          const idx = prev.findIndex((p) => p.id === wId);
          return idx >= 0 ? prev.map((p, i) => i === idx ? entry : p) : [...prev, entry];
        });
      }

      setBuilt(true);
      setDraftDiffers(true);
      setPreviewVersionHtml(null);
      setViewMode("preview");
      setActiveTab("preview");

      const successMsg = built
        ? "Done! Your website has been updated. Click \"Update Site\" to push it live, or keep refining."
        : "Got it — your website is ready! Check the preview →\n\nYou can say things like \"make the hero darker\", \"add a gallery section\", or upload a photo to refine it.";

      // Append version card for this generation
      const newVer: VersionRecord = {
        id: crypto.randomUUID(),
        label: (text.slice(0, 60) || "Initial version").trim(),
        created_at: new Date().toISOString(), type: "generate", html: data.html,
      };
      setVersions((prev) => [...prev, newVer].slice(-20));

      const finalMsgs: Msg[] = [
        ...msgs, userMsg,
        { role: "ai", content: successMsg },
        { role: "version" as const, content: "", version: newVer },
      ];
      setMsgs(finalMsgs);
      persistChat(finalMsgs, contactInfo);

    } catch {
      setMsgs([...msgs, userMsg, { role: "ai", content: "Connection error. Check your internet and try again.", isError: true }]);
    }
    setBuilding(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, attachedImages, building, built, html, msgs, contactInfo, persistChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const origin      = typeof window !== "undefined" ? window.location.origin : "";
  const previewHtml = previewVersionHtml ?? html;

  // Publish button label
  const publishLabel = publishing
    ? (isPublished ? "Updating…" : "Publishing…")
    : !isPublished
    ? t("website.publish")
    : draftDiffers ? "Update Site" : "Published ↗";

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto animate-pulse">
        <div className="flex items-center justify-between pb-4 shrink-0">
          <div>
            <div className="h-6 w-40 bg-[#E5E7EB] rounded-lg" />
            <div className="h-3 w-64 bg-[#F3F4F6] rounded mt-1.5" />
          </div>
          <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
        </div>
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          <div className="hidden md:block w-[152px] bg-white border border-[#EBEBEB] rounded-xl shrink-0" />
          <div className="w-full md:w-[320px] bg-white border border-[#E5E7EB] rounded-2xl shrink-0" />
          <div className="hidden md:block flex-1 bg-white border border-[#E5E7EB] rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">
            {siteName || t("website.title")}
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{t("website.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {websiteCount > 0 && (
            <span className="hidden md:block text-[10px] text-[#9CA3AF] font-medium">
              {websiteCount}/{websiteLimit} site{websiteLimit !== 1 ? "s" : ""}
            </span>
          )}

          {/* Mobile tab toggle */}
          <div className="flex md:hidden gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {(["chat", "preview"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === tab ? "bg-[#FF6B35] text-white" : "text-[#6B7280]"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* New Website button — visible on mobile only; desktop uses the sidebar */}
          {built && (
            <button onClick={handleNewWebsite}
              className="md:hidden text-xs font-semibold px-3 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#374151] hover:border-[#374151] transition-colors">
              New Website
            </button>
          )}

          {/* Publish button + panel */}
          <div className="relative" ref={publishBtnRef}>
            <button
              onClick={handleTogglePanel}
              disabled={!built || publishing}
              className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "var(--vp-color)" }}>
              {publishLabel}
            </button>

            {showPublishPanel && built && (
              <>
                {/* Mobile backdrop */}
                <div className="fixed inset-0 z-40 md:hidden bg-black/20" onClick={() => setShowPublishPanel(false)} />
                <PublishPanel
                  isPublished={isPublished} publishedUrl={publishedUrl} visitCount={visitCount}
                  siteName={siteName} setSiteName={setSiteName}
                  siteSlug={siteSlug} setSiteSlug={setSiteSlug}
                  slugError={slugError} setSlugError={setSlugError}
                  settingsError={settingsError} setSettingsError={setSettingsError}
                  savingSettings={savingSettings} setSavingSettings={setSavingSettings}
                  websiteId={websiteId}
                  customDomain={customDomain} setCustomDomain={setCustomDomain}
                  domainStatus={domainStatus} setDomainStatus={setDomainStatus}
                  domainRecords={domainRecords} setDomainRecords={setDomainRecords}
                  domainConfigured={domainConfigured} setDomainConfigured={setDomainConfigured}
                  domainInput={domainInput} setDomainInput={setDomainInput}
                  domainError={domainError} setDomainError={setDomainError}
                  connectingDomain={connectingDomain} setConnectingDomain={setConnectingDomain}
                  checkingDomain={checkingDomain} setCheckingDomain={setCheckingDomain}
                  removingDomain={removingDomain} setRemovingDomain={setRemovingDomain}
                  draftDiffers={draftDiffers} publishing={publishing}
                  onPublish={handleDoPublish}
                  onClose={() => setShowPublishPanel(false)}
                  setPublishedUrl={setPublishedUrl}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + chat + preview */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* SIDEBAR: Project list + version history (desktop only) */}
        <div className="hidden md:flex w-[152px] flex-col bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shrink-0">
          {/* Header row */}
          <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1.5 shrink-0">
            <span className="text-[9px] font-bold text-[#BBBBBB] uppercase tracking-widest">Sites</span>
            <button onClick={handleNewWebsite} title="New website"
              className="w-5 h-5 flex items-center justify-center rounded-md text-[#BBBBBB] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors">
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Scrollable project + version list */}
          <div className="flex-1 overflow-y-auto">
            {/* "New Project" placeholder when nothing is saved yet */}
            {!websiteId && (
              <div className="mx-1 mb-0.5 px-2 py-1.5 rounded-lg bg-[#FFF0EC] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#D1D5DB]" />
                <span className="text-[11px] font-semibold text-[#111111] truncate">New Project</span>
              </div>
            )}

            {/* Saved projects */}
            {projects.map((p) => {
              const isActive = p.id === websiteId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchProject(p)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center gap-1.5 transition-colors hover:bg-[#F5F5F5] ${isActive ? "bg-[#FFF0EC]" : ""}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.is_published ? "bg-green-400" : "bg-[#D1D5DB]"}`} />
                  <span className={`text-[11px] truncate leading-tight ${isActive ? "font-semibold text-[#111111]" : "text-[#555]"}`}>
                    {p.name || "Untitled"}
                  </span>
                </button>
              );
            })}

            {/* Version history for the active project */}
            {versions.length > 0 && (
              <>
                <div className="px-2.5 pt-2.5 pb-1 mt-1 border-t border-[#F3F4F6]">
                  <span className="text-[9px] font-bold text-[#BBBBBB] uppercase tracking-widest">History</span>
                </div>
                {versions.slice().reverse().slice(0, 6).map((v, i) => (
                  <div key={v.id} className="px-2.5 py-1.5 border-b border-[#F9FAFB] last:border-0">
                    <p className="text-[10px] text-[#374151] truncate leading-tight">{v.label}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-[#9CA3AF]">{timeAgo(v.created_at)}</span>
                      {i === 0 ? (
                        <span className="text-[9px] text-[#9CA3AF]">Current</span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => handlePreviewVersion(v)} disabled={previewingVersion === v.id}
                            className="text-[9px] font-semibold text-[#6B7280] hover:text-[#111111] disabled:opacity-40">
                            Preview
                          </button>
                          <button onClick={() => handleRestoreVersion(v)} disabled={restoringVersion === v.id}
                            className="text-[9px] font-semibold text-[#FF6B35] hover:opacity-80 disabled:opacity-40">
                            {restoringVersion === v.id ? "…" : "Restore"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* LEFT: Chat */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex w-full md:w-[320px] flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shrink-0`}>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((msg, i) => {
              // Session separator — "New website" divider
              if (msg.isSeparator) {
                return (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[10px] font-semibold text-[#9CA3AF] shrink-0 px-2 py-1 bg-[#F9FAFB] rounded-full border border-[#E5E7EB]">
                      New website
                    </span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>
                );
              }

              // Version cards are shown in the sidebar — skip them in the chat feed
              if (msg.role === "version") return null;

              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                      style={{ background: "var(--vela-gradient)" }}>
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
                      <>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.images.map((src, idx) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={idx} src={src} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/30" />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Language picker — only for fresh (not-yet-built) sessions */}
          {!built && msgs.filter((m) => m.role === "user").length === 0 && !siteLanguage && (
            <div className="px-4 pb-2">
              <p className="text-[10px] text-[#9CA3AF] mb-2">Choose language</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button key={lang} onClick={() => handleSelectLanguage(lang)}
                    className="text-[10px] px-2.5 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors font-medium">
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick-start suggestions — only after language is selected and before first user message */}
          {msgs.filter((m) => m.role === "user").length === 0 && !!siteLanguage && (
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

          {/* Attached image thumbnails */}
          {attachedImages.length > 0 && (
            <div className="px-3 pt-2 flex flex-wrap gap-2">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-[#E5E7EB]" />
                  <button onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#374151] text-white rounded-full flex items-center justify-center text-[9px] font-bold leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 border-t border-[#F3F4F6]">
            <div className="flex items-end gap-2 bg-[#F9FAFB] rounded-xl px-3 py-2.5 border border-[#E5E7EB] focus-within:border-[#FF6B35]/50 transition-colors">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={building || attachedImages.length >= MAX_ATTACH} title="Attach image"
                className="shrink-0 text-[#9CA3AF] hover:text-[#FF6B35] transition-colors disabled:opacity-40 pb-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" multiple className="hidden" onChange={handleFileSelect} />
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={built ? "What would you like to change?" : "Tell me about your business…"}
                rows={1} disabled={building}
                className="flex-1 bg-transparent text-xs text-[#111111] placeholder:text-[#9CA3AF] resize-none focus:outline-none min-h-[20px] max-h-[80px] disabled:opacity-60"
                style={{ lineHeight: "1.5" }}
              />
              <button onClick={handleSend} disabled={(!input.trim() && attachedImages.length === 0) || building}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: "var(--vp-color)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 10.5l9-4.5-9-4.5v3.5l6 1-6 1V10.5z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview / Code */}
        <div className={`${activeTab === "chat" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden min-h-0`}>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? "bg-green-400" : built ? "bg-yellow-400 animate-pulse" : "bg-[#9CA3AF]"}`} />
              <p className="text-xs font-medium text-[#6B7280]">
                {previewVersionHtml ? "Previewing version — not your draft" :
                 isPublished ? "Live" : built ? t("website.livePreview") : t("website.previewEmpty")}
              </p>
              {previewVersionHtml && (
                <button onClick={() => setPreviewVersionHtml(null)}
                  className="text-[10px] text-[#FF6B35] font-semibold hover:opacity-80">
                  Back to draft
                </button>
              )}
            </div>
            {built && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Preview / Code toggle — Settings and History removed */}
                <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                  {(["preview", "code"] as const).map((mode) => (
                    <button key={mode} onClick={() => { setViewMode(mode); if (previewVersionHtml && mode !== "preview") setPreviewVersionHtml(null); }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${viewMode === mode ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                      {mode === "code" ? "</>" : "Preview"}
                    </button>
                  ))}
                </div>
                {viewMode === "preview" && (
                  <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                    {(["desktop", "mobile"] as const).map((d) => (
                      <button key={d} onClick={() => setDevice(d)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all ${device === d ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Browser chrome + content */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F4F6] shrink-0 bg-[#F9FAFB]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-[#E5E7EB] rounded-lg px-3 py-1 text-[11px] text-[#9CA3AF] font-mono truncate">
                  {publishedUrl ? `${origin}${publishedUrl}` : "yoursite.vela.ai"}
                </div>
              </div>
            </div>

            {/* Content area */}
            {building ? (
              <div className="flex-1 overflow-hidden bg-[#F9FAFB] flex flex-col items-center justify-center gap-4 min-h-0">
                <div className="w-10 h-10 rounded-full border-[3px] border-[#FF6B35] border-t-transparent animate-spin" />
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-[#111111]">{t("website.building")}</p>
                  <p className="text-xs text-[#6B7280]">Generating design, real photos, and booking flow…</p>
                </div>
              </div>

            ) : !built ? (
              <div className="flex-1 overflow-hidden bg-[#F9FAFB] flex items-center justify-center min-h-0">
                <div className="text-center space-y-3 max-w-xs p-4">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E5E7EB] flex items-center justify-center mx-auto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="15" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/>
                      <path d="M8 21h8M12 18v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#374151]">Your website preview</p>
                  <p className="text-xs text-[#9CA3AF]">Describe your business in the chat — I&apos;ll build a premium site with real photos in seconds</p>
                </div>
              </div>

            ) : viewMode === "code" ? (
              <div className="flex-1 overflow-hidden min-h-0 relative">
                <button onClick={copyCode}
                  className="absolute top-3 right-3 z-10 text-[10px] px-3 py-1.5 bg-[#374151] text-[#D1D5DB] rounded-lg hover:bg-[#4B5563] transition-colors font-semibold">
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
                <pre className="w-full h-full overflow-auto bg-[#1E1E1E] text-[#D4D4D4] text-[11px] font-mono p-4 leading-relaxed whitespace-pre break-normal">
                  {html}
                </pre>
              </div>

            ) : (
              /* Preview iframe */
              <div className={`flex-1 min-h-0 flex overflow-hidden ${device === "mobile" ? "bg-[#F9FAFB] justify-center items-start" : ""}`}>
                <iframe
                  key={previewHtml}
                  srcDoc={previewHtml}
                  title="Website preview"
                  className={`bg-white ${device === "mobile" ? "max-w-[375px] w-full m-3 rounded-xl border border-[#E5E7EB]" : "w-full h-full"}`}
                  style={device === "mobile" ? { height: "calc(100% - 24px)" } : { height: "100%" }}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
