"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";

type AttachedImage = { preview: string; base64: string; mimeType: string };
type ContactInfo   = { phone: string; email: string; address: string; hours: string };
type Version       = { id: string; label: string; created_at: string };

type Msg = {
  role: "ai" | "user";
  content: string;
  isBuilding?: boolean;
  isError?: boolean;
  images?: string[];
};

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

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function WebsitePage() {
  const { t } = useI18n();
  const btype       = typeof window !== "undefined" ? localStorage.getItem("vela_business_type") : null;
  const suggestions = (btype && INDUSTRY_SUGGESTIONS[btype]) ? INDUSTRY_SUGGESTIONS[btype] : DEFAULT_SUGGESTIONS;

  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "ai",
    content: btype && INDUSTRY_SUGGESTIONS[btype]
      ? `Hi! I see you run a ${btype} business. Tell me your business name and location — I'll build your website in seconds with real photos.\n\nOr pick a suggestion below:`
      : "Hi! Describe your business and I'll build a premium booking website instantly — real photos, professional design, booking buttons included.\n\nOr pick a suggestion below:",
  }]);

  // Core builder state
  const [input, setInput]           = useState("");
  const [html, setHtml]             = useState("");
  const [device, setDevice]         = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode]     = useState<"preview" | "code" | "settings" | "history">("preview");
  const [building, setBuilding]     = useState(false);
  const [built, setBuilt]           = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeTab, setActiveTab]   = useState<"chat" | "preview">("chat");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [contactInfo, setContactInfo]       = useState<ContactInfo>({ phone: "", email: "", address: "", hours: "" });
  const [showContactForm, setShowContactForm] = useState(false);

  // Publish state
  const [publishedUrl, setPublishedUrl]     = useState("");
  const [publishCopied, setPublishCopied]   = useState(false);
  const [publishing, setPublishing]         = useState(false);
  const [isPublished, setIsPublished]       = useState(false);

  // Website / FIX 2-4 state
  const [websiteId, setWebsiteId]           = useState<string | null>(null);
  const [siteName, setSiteName]             = useState("");
  const [siteSlug, setSiteSlug]             = useState("");
  const [siteDomain, setSiteDomain]         = useState("");
  const [slugError, setSlugError]           = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError]   = useState("");

  // FIX 4: version history
  const [versions, setVersions]             = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  // FIX 3: plan limits
  const [websiteLimit, setWebsiteLimit]     = useState(1);
  const [websiteCount, setWebsiteCount]     = useState(0);

  // Refs
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlRef      = useRef<string>("");
  const websiteIdRef = useRef<string | null>(null);

  // ── Load plan info on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = getSupabase() as any;
        const { data: { user } } = await db.auth.getUser();
        if (!user) return;
        const { data: tenant } = await db.from("tenants").select("id, plan").eq("owner_id", user.id).single();
        if (!tenant) return;
        const plan = (tenant.plan as string | undefined) ?? "starter";
        setWebsiteLimit(PLAN_WEBSITE_LIMITS[plan] ?? 1);
        const { count } = await db.from("websites").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
        setWebsiteCount(count ?? 0);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── Load version history when switching to history tab ───────────────────
  useEffect(() => {
    if (viewMode === "history" && websiteId) {
      loadVersions(websiteId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, websiteId]);

  const loadVersions = useCallback(async (wId: string) => {
    setLoadingVersions(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = getSupabase() as any;
      const { data } = await db
        .from("website_versions")
        .select("id, label, created_at")
        .eq("website_id", wId)
        .order("created_at", { ascending: false })
        .limit(20);
      setVersions((data ?? []) as Version[]);
    } catch { /* ignore */ }
    setLoadingVersions(false);
  }, []);

  // ── Publish / Update ──────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    const currentHtml = htmlRef.current;
    if (!built || publishing || !currentHtml) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/website/publish", {
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
      if (data.slug) setSiteSlug(data.slug);
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }, [built, publishing]);

  const copyPublishUrl = useCallback(async () => {
    const full = `${window.location.origin}${publishedUrl}`;
    try { await navigator.clipboard.writeText(full); } catch { /* */ }
    setPublishCopied(true);
    setTimeout(() => setPublishCopied(false), 2000);
  }, [publishedUrl]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const handleSaveSettings = useCallback(async () => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setSlugError("");
    setSettingsError("");
    setSavingSettings(true);
    try {
      const res = await fetch("/api/website/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wId, name: siteName, slug: siteSlug, domain: siteDomain }),
      });
      const data = await res.json() as { slug?: string; error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Failed to save settings.";
        if (msg.toLowerCase().includes("slug")) setSlugError(msg);
        else setSettingsError(msg);
      } else {
        if (data.slug) {
          setSiteSlug(data.slug);
          if (publishedUrl) setPublishedUrl(`/site/${data.slug}`);
        }
      }
    } catch {
      setSettingsError("Connection error.");
    } finally {
      setSavingSettings(false);
    }
  }, [siteName, siteSlug, siteDomain, publishedUrl]);

  // ── Restore a version ─────────────────────────────────────────────────────
  const handleRestoreVersion = useCallback(async (versionId: string) => {
    const wId = websiteIdRef.current;
    if (!wId) return;
    setRestoringVersion(versionId);
    try {
      const res = await fetch("/api/website/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: wId, versionId }),
      });
      const data = await res.json() as { html?: string; error?: string };
      if (data.html) {
        setHtml(data.html);
        htmlRef.current = data.html;
        setBuilt(true);
        setViewMode("preview");
        setActiveTab("preview");
        setMsgs((prev) => [...prev, { role: "ai", content: "Previous version restored to draft. Click \"Update Live Site\" to push it live." }]);
        // Refresh version list
        await loadVersions(wId);
      } else {
        alert(data.error ?? "Restore failed.");
      }
    } catch {
      alert("Connection error.");
    } finally {
      setRestoringVersion(null);
    }
  }, [loadVersions]);

  // ── File attachment ───────────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_ATTACH - attachedImages.length;
    files.slice(0, remaining).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > MAX_IMG_SIZE) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64  = dataUrl.split(",")[1] ?? "";
        setAttachedImages((prev) =>
          prev.length < MAX_ATTACH ? [...prev, { preview: dataUrl, base64, mimeType: file.type }] : prev
        );
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [attachedImages.length]);

  const copyCode = useCallback(async () => {
    if (!html) return;
    try { await navigator.clipboard.writeText(html); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [html]);

  // ── Generate / Send ───────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || building) return;
    setInput("");

    const capturedImages = [...attachedImages];
    setAttachedImages([]);

    const apiHistory = msgs
      .slice(1)
      .filter((m) => !m.isBuilding)
      .map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

    const userMsg:    Msg = { role: "user", content: text || "Please use the uploaded image(s) on the website.", images: capturedImages.map((i) => i.preview) };
    const loadingMsg: Msg = { role: "ai",  content: built ? "Updating your website…" : "Building your website…", isBuilding: true };

    setMsgs([...msgs, userMsg, loadingMsg]);
    setBuilding(true);

    try {
      const res = await fetch("/api/website/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:     text,
          currentHtml: built ? html : undefined,
          websiteId:   websiteIdRef.current ?? undefined,
          history:     apiHistory,
          images:      capturedImages.map((i) => ({ data: i.base64, mimeType: i.mimeType })),
          contactInfo: (contactInfo.phone || contactInfo.email || contactInfo.address || contactInfo.hours) ? contactInfo : undefined,
        }),
      });
      const data = await res.json() as {
        html?: string;
        error?: string;
        websiteId?: string;
        slug?: string;
        name?: string;
        isPublished?: boolean;
      };

      if (!res.ok || !data.html) {
        const errText =
          data.error === "Unauthorized"     ? "Please sign in to use the website builder." :
          data.error === "AI not configured" ? "The AI service isn't set up yet — contact support." :
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

      setBuilt(true);
      setViewMode("preview");
      setActiveTab("preview");

      // Refresh version list when history tab is open
      if (viewMode === "history" && data.websiteId) {
        await loadVersions(data.websiteId);
      }

      const successMsg = built
        ? "Done! Your website has been updated.\n\nClick \"Update Live Site\" to push it to the public URL, or keep refining."
        : "Your website is ready! Check the preview →\n\nTry: \"Make the hero darker\", \"Change accent to green\", \"Add a gallery section\", or upload a photo.";

      setMsgs([...msgs, userMsg, { role: "ai", content: successMsg }]);
    } catch {
      setMsgs([...msgs, userMsg, { role: "ai", content: "Connection error. Check your internet and try again.", isError: true }]);
    }
    setBuilding(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, attachedImages, building, built, html, msgs, contactInfo, viewMode, loadVersions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">{t("website.title")}</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{t("website.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* FIX 3: Plan limit badge */}
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

          {/* Publish / Update button area */}
          {publishedUrl ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-mono text-green-700 truncate max-w-[160px] hover:underline">
                  {origin}{publishedUrl}
                </a>
                <button onClick={copyPublishUrl}
                  className="text-[10px] font-semibold text-green-700 hover:text-green-900 shrink-0">
                  {publishCopied ? "✓" : "Copy"}
                </button>
              </div>
              {/* FIX 4: Update button — only when there's an unPublished draft */}
              {built && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ background: "var(--vp-color)" }}>
                  {publishing ? "Updating…" : "Update Site"}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handlePublish}
              className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              style={{ background: "var(--vp-color)" }}
              disabled={!built || publishing}>
              {publishing ? "Publishing…" : t("website.publish")}
            </button>
          )}
        </div>
      </div>

      {/* Main two-panel layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* LEFT: Chat */}
        <div className={`${activeTab === "preview" ? "hidden" : "flex"} md:flex w-full md:w-[320px] flex-col bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shrink-0`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((msg, i) => (
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
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick-start suggestions */}
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

          {/* Contact info intake */}
          {!built && (
            <div className="px-4 pb-2">
              <button onClick={() => setShowContactForm((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-[#6B7280] hover:text-[#FF6B35] transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/>
                </svg>
                {showContactForm ? "Hide" : "Add"} real contact details
                <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </button>
              {showContactForm && (
                <div className="mt-2 space-y-1.5">
                  {(["phone", "email", "address", "hours"] as const).map((field) => (
                    <input key={field}
                      value={contactInfo[field]}
                      onChange={(e) => setContactInfo((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder={
                        field === "phone"   ? "Phone  e.g. +971 4 000 0000" :
                        field === "email"   ? "Email  e.g. hello@clinic.ae" :
                        field === "address" ? "Address  e.g. Dubai Marina, UAE" :
                                             "Hours  e.g. Mon–Sat 9am–7pm"
                      }
                      className="w-full text-[11px] px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
                    />
                  ))}
                  <p className="text-[9px] text-[#9CA3AF]">Only what you enter will appear on the site — nothing is invented.</p>
                </div>
              )}
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
                disabled={building || attachedImages.length >= MAX_ATTACH}
                title="Attach image"
                className="shrink-0 text-[#9CA3AF] hover:text-[#FF6B35] transition-colors disabled:opacity-40 pb-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" multiple className="hidden" onChange={handleFileSelect} />
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={built ? "What would you like to change?" : "Describe your business…"}
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

        {/* RIGHT: Preview / Code / Settings / History */}
        <div className={`${activeTab === "chat" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden min-h-0`}>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? "bg-green-400" : built ? "bg-yellow-400 animate-pulse" : "bg-[#9CA3AF]"}`} />
              <p className="text-xs font-medium text-[#6B7280]">
                {isPublished ? "Live" : built ? t("website.livePreview") : t("website.previewEmpty")}
              </p>
            </div>
            {built && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* View mode tabs */}
                <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                  {(["preview", "code", "settings", "history"] as const).map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${viewMode === mode ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
                      {mode === "code" ? "</>" : mode === "settings" ? "Settings" : mode === "history" ? "History" : "Preview"}
                    </button>
                  ))}
                </div>
                {/* Device toggle — only in preview mode */}
                {viewMode === "preview" && (
                  <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
                    {(["desktop", "mobile"] as const).map((d) => (
                      <button key={d} onClick={() => setDevice(d)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all capitalize ${device === d ? "bg-[#111111] text-white" : "text-[#6B7280] hover:text-[#111111]"}`}>
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
                  {codeCopied ? "✓ Copied!" : "Copy Code"}
                </button>
                <pre className="w-full h-full overflow-auto bg-[#1E1E1E] text-[#D4D4D4] text-[11px] font-mono p-4 leading-relaxed whitespace-pre break-normal">
                  {html}
                </pre>
              </div>

            ) : viewMode === "settings" ? (
              /* ── FIX 2: Site Settings ── */
              <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
                <h3 className="text-sm font-bold text-[#111111]">Site Settings</h3>

                {/* Site Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151]">Site Name</label>
                  <input value={siteName} onChange={(e) => setSiteName(e.target.value)}
                    placeholder="My Business"
                    className="w-full text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151]">URL Slug</label>
                  <div className="flex items-stretch border border-[#E5E7EB] rounded-lg overflow-hidden focus-within:border-[#FF6B35]">
                    <span className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-3 flex items-center border-r border-[#E5E7EB] whitespace-nowrap shrink-0">/site/</span>
                    <input value={siteSlug}
                      onChange={(e) => { setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugError(""); }}
                      placeholder="my-business"
                      className="flex-1 text-sm px-3 py-2 focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
                    />
                  </div>
                  {slugError && <p className="text-[11px] text-red-500">{slugError}</p>}
                  <p className="text-[11px] text-[#9CA3AF]">Lowercase letters, numbers, and hyphens only (3–50 characters).</p>
                </div>

                {/* Live URL display */}
                {publishedUrl && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-[10px] font-semibold text-green-600 mb-1">Live URL</p>
                    <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono text-green-700 hover:underline break-all">
                      {origin}{publishedUrl}
                    </a>
                  </div>
                )}

                {/* Custom domain */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151]">Custom Domain <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
                  <input value={siteDomain} onChange={(e) => setSiteDomain(e.target.value)}
                    placeholder="www.yourbusiness.com"
                    className="w-full text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg focus:border-[#FF6B35] focus:outline-none bg-white text-[#111111] placeholder:text-[#9CA3AF]"
                  />
                  {siteDomain && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-100">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                      <p className="text-[11px] text-yellow-700">Pending — DNS setup required. Contact support to connect your domain.</p>
                    </div>
                  )}
                </div>

                {settingsError && <p className="text-[11px] text-red-500">{settingsError}</p>}

                <button onClick={handleSaveSettings} disabled={savingSettings || !websiteId}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ background: "var(--vp-color)" }}>
                  {savingSettings ? "Saving…" : "Save Settings"}
                </button>

                {/* FIX 3: Plan limits display */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                  <p className="text-xs font-bold text-[#374151] mb-1">Plan Limits</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (websiteCount / websiteLimit) * 100)}%`, background: "var(--vp-color)" }} />
                    </div>
                    <span className="text-[11px] text-[#6B7280] whitespace-nowrap">{websiteCount}/{websiteLimit} site{websiteLimit !== 1 ? "s" : ""}</span>
                  </div>
                  {websiteCount >= websiteLimit && (
                    <p className="text-[11px] text-[#FF6B35] mt-2">You&apos;re at your plan&apos;s site limit. Upgrade to create additional websites.</p>
                  )}
                </div>
              </div>

            ) : viewMode === "history" ? (
              /* ── FIX 4: Version History ── */
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[#111111]">Version History</h3>
                  {websiteId && (
                    <button onClick={() => loadVersions(websiteId)}
                      className="text-[11px] text-[#FF6B35] font-semibold hover:opacity-80">
                      Refresh
                    </button>
                  )}
                </div>
                {loadingVersions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-semibold text-[#374151] mb-1">No versions yet</p>
                    <p className="text-xs text-[#9CA3AF]">A version is saved each time you generate or publish your site.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v, i) => (
                      <div key={v.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 hover:border-[#FF6B35]/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#111111] truncate">{v.label}</p>
                            <p className="text-[10px] text-[#9CA3AF] mt-0.5">{timeAgo(v.created_at)}</p>
                          </div>
                          {i === 0 ? (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">Current</span>
                          ) : (
                            <button
                              onClick={() => handleRestoreVersion(v.id)}
                              disabled={restoringVersion === v.id}
                              className="text-[11px] font-semibold text-[#FF6B35] hover:opacity-80 disabled:opacity-40 shrink-0">
                              {restoringVersion === v.id ? "Restoring…" : "Restore"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-[#9CA3AF] mt-4 leading-relaxed">
                  Restoring sets a version as your current draft. Click &quot;Update Site&quot; to push it live.
                </p>
              </div>

            ) : (
              /* ── Preview iframe ── */
              <div className={`flex-1 min-h-0 flex overflow-hidden ${device === "mobile" ? "bg-[#F9FAFB] justify-center items-start" : ""}`}>
                <iframe
                  key={html}
                  srcDoc={html}
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
