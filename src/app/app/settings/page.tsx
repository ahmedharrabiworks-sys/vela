"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { getProfile, saveProfile } from "@/lib/business-profile";
import { usePlan } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { useColorTheme } from "@/lib/theme";
import Link from "next/link";

type Section = "business" | "ai" | "notifications" | "billing" | "appearance";

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

/* ── Spinner ── */
function Spinner() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2M2.6 2.6l1.4 1.4M9 9l1.4 1.4M2.6 10.4l1.4-1.4M9 4l1.4-1.4"
        stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className="relative shrink-0 transition-colors focus:outline-none"
      style={{ width: 40, height: 22 }}
    >
      <div className={`w-full h-full rounded-full transition-colors ${checked ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />
      <span
        className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 21 : 3 }}
      />
    </button>
  );
}

const NOTIF_DEFAULTS = {
  newLead:      true,
  booking:      true,
  handoff:      true,
  dailySummary: false,
  whatsapp:     true,
};
type NotifState = typeof NOTIF_DEFAULTS;

/* ══════════════════════════════════════════
   MAIN SETTINGS PAGE
══════════════════════════════════════════ */
export default function SettingsPage() {
  const [section, setSection]   = useState<Section>("business");
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState("");

  const [userId, setUserId]       = useState("");
  const [userEmail, setUserEmail] = useState("");

  /* Business fields */
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry]         = useState("");
  const [phone, setPhone]               = useState("");
  const [city, setCity]                 = useState("");
  const [website, setWebsite]           = useState("");
  const [services, setServices]         = useState("");
  const [businessDirty, setBusinessDirty] = useState(false);

  /* AI fields */
  const [tone, setTone]                             = useState("professional");
  const [language, setLanguage]                     = useState("English");
  const [aiDelay, setAiDelay]                       = useState("instant");
  const [customInstructions, setCustomInstructions] = useState("");
  const [aiDirty, setAiDirty]                       = useState(false);

  /* Notification toggles */
  const [notifState, setNotifState] = useState<NotifState>(NOTIF_DEFAULTS);
  const [notifDirty, setNotifDirty] = useState(false);

  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);

  /* Per-section saving / saved */
  const [savingSection, setSavingSection] = useState<Section | null>(null);
  const [savedSection, setSavedSection]   = useState<Section | null>(null);

  const { isPro }                     = usePlan();
  const { t }                         = useI18n();
  const { colorTheme, setColorTheme } = useColorTheme();

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

      if (typeof window !== "undefined") {
        const aiCfg = localStorage.getItem("vela_ai_config");
        if (aiCfg) {
          try {
            const cfg = JSON.parse(aiCfg);
            if (cfg.tone) setTone(cfg.tone);
            if (cfg.language) setLanguage(cfg.language);
            if (cfg.aiDelay) setAiDelay(cfg.aiDelay);
            if (cfg.customInstructions) setCustomInstructions(cfg.customInstructions);
          } catch { /* ignore */ }
        }
        const notifCfg = localStorage.getItem("vela_notif_settings");
        if (notifCfg) {
          try { setNotifState((prev) => ({ ...prev, ...(JSON.parse(notifCfg) as Partial<NotifState>) })); } catch { /* ignore */ }
        }
        if (localStorage.getItem("vela_white_label") === "true") setWhiteLabelEnabled(true);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markSaved(s: Section) {
    setSavingSection(null);
    setSavedSection(s);
    setTimeout(() => setSavedSection((cur) => (cur === s ? null : cur)), 2500);
  }

  const handleSaveBusiness = async () => {
    setSavingSection("business");
    saveProfile({ businessName, businessType: industry, phone, city });
    try {
      if (userId) {
        const supabase = getSupabase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("tenants")
          .upsert({ owner_id: userId, business_name: businessName, industry, city, phone, website, plan: getProfile()?.plan ?? "starter" }, { onConflict: "owner_id" });
        setToast(t("settings.billing.toastSaved"));
      }
    } catch {
      setToast(t("settings.billing.toastSavedLocally"));
    }
    setBusinessDirty(false);
    markSaved("business");
  };

  const handleSaveAI = async () => {
    setSavingSection("ai");
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
    setAiDirty(false);
    setToast(t("settings.aiConfig.toastSaved"));
    markSaved("ai");
  };

  const handleSaveNotifs = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vela_notif_settings", JSON.stringify(notifState));
    }
    setNotifDirty(false);
    setToast("Notification preferences saved");
    setSavedSection("notifications");
    setTimeout(() => setSavedSection((cur) => (cur === "notifications" ? null : cur)), 2500);
  };

  const toggleNotif = (key: keyof NotifState) => {
    setNotifState((prev) => ({ ...prev, [key]: !prev[key] }));
    setNotifDirty(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
        <div className="h-8 bg-[#F3F4F6] rounded-xl w-32" />
        <div className="flex gap-5">
          <div className="w-44 shrink-0 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-[#F3F4F6] rounded-xl" />)}
          </div>
          <div className="flex-1 h-80 bg-[#F3F4F6] rounded-2xl" />
        </div>
      </div>
    );
  }

  const isSaving = (s: Section) => savingSection === s;
  const isSaved  = (s: Section) => savedSection === s;

  /* Field change helpers — mark section dirty */
  const biz = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setter(e.target.value); setBusinessDirty(true); };
  const ai = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setter(e.target.value); setAiDirty(true); };

  /* Save footer shared component */
  function SaveFooter({ dirty, saving, saved, onSave, label }: {
    dirty: boolean; saving: boolean; saved: boolean; onSave: () => void; label: string;
  }) {
    return (
      <div className="pt-4 border-t border-[#F3F4F6] flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          style={{ background: "var(--vela-gradient)" }}
        >
          {saving && <Spinner />}
          {saving ? t("common.saving") : label}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("common.saved")}
          </span>
        )}
        {!dirty && !saved && (
          <span className="text-xs text-[#9CA3AF]">No unsaved changes</span>
        )}
      </div>
    );
  }

  const NAV_ITEMS: { id: Section; labelKey: string; icon: React.ReactNode }[] = [
    {
      id: "business",
      labelKey: "settings.tabs.businessInfo",
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="5" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "ai",
      labelKey: "settings.tabs.aiConfig",
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5L2.5 4v5L7 11.5 11.5 9V4L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <circle cx="7" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
      ),
    },
    {
      id: "notifications",
      labelKey: "settings.tabs.notifications",
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5A4 4 0 003 5.5V9l-1 1h10l-1-1V5.5A4 4 0 007 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          <path d="M5.5 10a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      ),
    },
    {
      id: "billing",
      labelKey: "settings.tabs.billing",
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M1.5 6.5h11" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 8.5h1.5M7.5 8.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      id: "appearance",
      labelKey: "settings.tabs.appearance",
      icon: (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 10c1.5-2 4-2 6 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          <circle cx="5" cy="5.5" r="0.8" fill="currentColor"/>
          <circle cx="9" cy="5.5" r="0.8" fill="currentColor"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}

      <div>
        <h1 className="text-xl font-bold text-[#111111]">{t("settings.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{t("settings.subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* ── Left nav ── */}
        <nav className="w-full md:w-44 shrink-0 flex flex-row md:flex-col gap-0.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors w-full text-left shrink-0 ${
                section === item.id
                  ? "bg-[#FFF5F0] text-[#FF6B35]"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6]"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        {/* ── Content card ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5">

          {/* ── Business Info ── */}
          {section === "business" && (
            <>
              <div>
                <h2 className="font-semibold text-[#111111]">{t("settings.businessInfo.title")}</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Used by the AI agent and marketing tools.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.name")}</label>
                  <input type="text" value={businessName} onChange={biz(setBusinessName)}
                    placeholder="Your business name"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.industry")}</label>
                  <input type="text" value={industry} onChange={biz(setIndustry)}
                    placeholder="e.g. Medical Clinic, Gym, Restaurant"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.phone")}</label>
                  <input type="text" value={phone} onChange={biz(setPhone)}
                    placeholder="+971 50 000 0000"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.email")}</label>
                  <input type="email" value={userEmail} readOnly
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#6B7280] bg-[#FAFAFA] cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.city")}</label>
                  <input type="text" value={city} onChange={biz(setCity)}
                    placeholder="Dubai, UAE"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.website")}</label>
                  <input type="text" value={website} onChange={biz(setWebsite)}
                    placeholder="yourbusiness.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.businessInfo.services")}</label>
                <textarea rows={3} value={services} onChange={biz(setServices)}
                  placeholder="List your services, e.g. Consultation, Cleaning, Premium Package"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
              </div>
              <SaveFooter
                dirty={businessDirty}
                saving={isSaving("business")}
                saved={isSaved("business")}
                onSave={handleSaveBusiness}
                label="Save Changes"
              />
            </>
          )}

          {/* ── AI Configuration ── */}
          {section === "ai" && (
            <>
              <div>
                <h2 className="font-semibold text-[#111111]">{t("settings.aiConfig.title")}</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Controls how your AI agent communicates with customers.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-3">{t("settings.aiConfig.tone")}</label>
                <div className="flex flex-wrap gap-2">
                  {["professional", "friendly", "formal", "casual"].map((v) => (
                    <button key={v} onClick={() => { setTone(v); setAiDirty(true); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tone === v ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                      style={tone === v ? { background: "var(--vela-gradient)" } : {}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-3">{t("settings.aiConfig.language")}</label>
                <div className="flex flex-wrap gap-2">
                  {["English", "Arabic", "Auto-detect"].map((v) => (
                    <button key={v} onClick={() => { setLanguage(v); setAiDirty(true); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${language === v ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                      style={language === v ? { background: "var(--vela-gradient)" } : {}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-3">{t("settings.aiConfig.timing")}</label>
                <div className="flex flex-wrap gap-2">
                  {["instant", "1-2 min", "5 min"].map((v) => (
                    <button key={v} onClick={() => { setAiDelay(v); setAiDirty(true); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${aiDelay === v ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                      style={aiDelay === v ? { background: "var(--vela-gradient)" } : {}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280] block mb-1.5">{t("settings.aiConfig.instructions")}</label>
                <textarea rows={5} value={customInstructions} onChange={ai(setCustomInstructions)}
                  placeholder="e.g. Always mention our free parking. Never discuss competitor pricing. Offer 10% discount to first-time customers."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
              </div>
              <SaveFooter
                dirty={aiDirty}
                saving={isSaving("ai")}
                saved={isSaved("ai")}
                onSave={handleSaveAI}
                label={t("settings.aiConfig.save")}
              />
            </>
          )}

          {/* ── Notifications ── */}
          {section === "notifications" && (
            <>
              <div>
                <h2 className="font-semibold text-[#111111]">{t("settings.notifications.title")}</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Choose which events trigger a notification.</p>
              </div>
              <div className="space-y-3">
                {([
                  { key: "newLead"      as const, labelKey: "settings.notifications.items.newLead",     subKey: "settings.notifications.items.newLeadSub"     },
                  { key: "booking"      as const, labelKey: "settings.notifications.items.booking",      subKey: "settings.notifications.items.bookingSub"      },
                  { key: "handoff"      as const, labelKey: "settings.notifications.items.handoff",      subKey: "settings.notifications.items.handoffSub"      },
                  { key: "dailySummary" as const, labelKey: "settings.notifications.items.dailySummary", subKey: "settings.notifications.items.dailySummarySub" },
                  { key: "whatsapp"     as const, labelKey: "settings.notifications.items.whatsapp",     subKey: "settings.notifications.items.whatsappSub"     },
                ]).map((notif) => (
                  <div key={notif.key} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB]">
                    <div>
                      <p className="font-medium text-[#111111] text-sm">{t(notif.labelKey)}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{t(notif.subKey)}</p>
                    </div>
                    <Toggle checked={notifState[notif.key]} onChange={() => toggleNotif(notif.key)} />
                  </div>
                ))}
              </div>
              <SaveFooter
                dirty={notifDirty}
                saving={false}
                saved={isSaved("notifications")}
                onSave={handleSaveNotifs}
                label={t("settings.notifications.save")}
              />
            </>
          )}

          {/* ── Billing ── */}
          {section === "billing" && (
            <>
              <div>
                <h2 className="font-semibold text-[#111111]">{t("settings.billing.title")}</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Manage your plan and payment details.</p>
              </div>
              <div className="p-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111111] capitalize">{getProfile()?.plan ?? "Starter"} Plan</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{t("settings.billing.renews")}</p>
                  </div>
                  <span className="text-2xl font-extrabold text-[#FF6B35]">
                    {getProfile()?.plan === "premium" ? "$299" : getProfile()?.plan === "pro" ? "$159" : "$79"}
                    <span className="text-sm font-medium text-[#6B7280]">/mo</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/pricing"
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vela-gradient)" }}
                  >
                    {t("settings.billing.upgradePlan")}
                  </Link>
                  <button
                    disabled
                    title="Billing portal coming soon"
                    className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#D1D5DB] cursor-not-allowed"
                  >
                    {t("settings.billing.manageBilling")}
                  </button>
                </div>
              </div>

              {/* White-label toggle */}
              <div className={`rounded-xl border p-5 ${isPro ? "border-[#E5E7EB] bg-white" : "border-[#E5E7EB] bg-[#FAFAFA]"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isPro ? "var(--vela-gradient-tint)" : "#F3F4F6" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.5L2 4.5v3.5c0 3.1 2.1 6 5 6.8 1 .3 2 0 3-1 1.9-1.7 2-3.3 2-5.8V4.5L8 1.5z"
                          stroke={isPro ? "#FF6B35" : "#9CA3AF"} strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isPro ? "text-[#111111]" : "text-[#9CA3AF]"}`}>{t("settings.billing.whiteLabel")}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">{t("settings.billing.whiteLabelDesc")}</p>
                    </div>
                  </div>
                  {isPro ? (
                    <Toggle
                      checked={whiteLabelEnabled}
                      onChange={() => {
                        const next = !whiteLabelEnabled;
                        setWhiteLabelEnabled(next);
                        localStorage.setItem("vela_white_label", String(next));
                        setToast(next ? t("settings.billing.toastHidden") : t("settings.billing.toastRestored"));
                      }}
                    />
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] shrink-0">Pro+</span>
                  )}
                </div>
                {!isPro && (
                  <p className="text-xs text-[#9CA3AF] mt-3">{t("settings.billing.plansNote")}</p>
                )}
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#6B7280]">{t("settings.billing.paymentMethod")}</p>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E7EB]">
                  <div className="w-10 h-7 bg-[#111111] rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                  <span className="text-sm text-[#6B7280]">{t("settings.billing.noCard")}</span>
                </div>
                <button
                  disabled
                  title="Payment method management coming soon"
                  className="text-xs font-medium text-[#D1D5DB] cursor-not-allowed"
                >
                  {t("settings.billing.addPayment")}
                </button>
              </div>
            </>
          )}

          {/* ── Appearance ── */}
          {section === "appearance" && (
            <>
              <div>
                <h2 className="font-semibold text-[#111111]">Appearance</h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Choose an accent colour for your dashboard. Changes apply immediately.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  { id: "classic" as const, name: "Classic", desc: "Orange & rose",  color: "#FF6B35", accent: "#FF3366" },
                  { id: "ocean"   as const, name: "Ocean",   desc: "Blue & sky",     color: "#3B82F6", accent: "#60A5FA" },
                  { id: "sunset"  as const, name: "Sunset",  desc: "Warm amber",     color: "#FB8C42", accent: "#FBA94C" },
                ]).map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setColorTheme(th.id)}
                    className={`relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                      colorTheme === th.id ? "shadow-sm" : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                    }`}
                    style={{ borderColor: colorTheme === th.id ? th.color : undefined }}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-7 h-7 rounded-full" style={{ background: th.color }} />
                      <span className="w-7 h-7 rounded-full" style={{ background: th.accent }} />
                      <span className="w-7 h-7 rounded-full bg-white border border-[#E5E7EB]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{th.name}</p>
                      <p className="text-xs text-[#6B7280]">{th.desc}</p>
                    </div>
                    {colorTheme === th.id && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: th.color }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
