"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { getProfile, saveProfile } from "@/lib/business-profile";
import { usePlan } from "@/lib/plans";
import { useI18n } from "@/lib/i18n";
import { useColorTheme } from "@/lib/theme";

const TABS = ["Business Info", "AI Configuration", "Notifications", "Billing", "Appearance"] as const;
const TAB_KEYS: Record<string, string> = {
  "Business Info":     "settings.tabs.businessInfo",
  "AI Configuration":  "settings.tabs.aiConfig",
  "Notifications":     "settings.tabs.notifications",
  "Billing":           "settings.tabs.billing",
  "Appearance":        "settings.tabs.appearance",
};

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

  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);

  const { isPro } = usePlan();
  const { t } = useI18n();
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

      const wl = typeof window !== "undefined" ? localStorage.getItem("vela_white_label") : null;
      if (wl === "true") setWhiteLabelEnabled(true);

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
      setToast(t("settings.billing.toastSaved"));
    } catch {
      setSaveStatus("saved");
      setToast(t("settings.billing.toastSavedLocally"));
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
    setToast(t("settings.aiConfig.toastSaved"));
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
        <h1 className="text-2xl font-bold text-[#111111]">{t("settings.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSaveStatus(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab ? "text-white shadow-sm" : "text-[#6B7280] hover:text-[#111111]"
            }`}
            style={activeTab === tab ? { background: "var(--vela-gradient)" } : {}}>
            {t(TAB_KEYS[tab])}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-6">

        {/* ── Business Info ── */}
        {activeTab === "Business Info" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">{t("settings.businessInfo.title")}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.name")}</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.industry")}</label>
                <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Medical Clinic, Gym, Restaurant"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.phone")}</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 000 0000"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.email")}</label>
                <input type="email" value={userEmail} readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#6B7280] bg-[#FAFAFA] cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.city")}</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Dubai, UAE"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.website")}</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="yourbusiness.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.businessInfo.services")}</label>
              <textarea rows={3} value={services} onChange={(e) => setServices(e.target.value)}
                placeholder="List your services, e.g. Consultation, Cleaning, Premium Package"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveBusiness} disabled={saving}
                className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-70 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}>
                {saving ? t("common.saving") : t("common.save")}
              </button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t("common.saved")}
                </span>
              )}
            </div>
          </>
        )}

        {/* ── AI Configuration ── */}
        {activeTab === "AI Configuration" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">{t("settings.aiConfig.title")}</h2>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">{t("settings.aiConfig.tone")}</label>
              <div className="flex flex-wrap gap-2">
                {["professional", "friendly", "formal", "casual"].map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${tone === t ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={tone === t ? { background: "var(--vela-gradient)" } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">{t("settings.aiConfig.language")}</label>
              <div className="flex flex-wrap gap-2">
                {["English", "Arabic", "Auto-detect"].map((l) => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${language === l ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={language === l ? { background: "var(--vela-gradient)" } : {}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-3">{t("settings.aiConfig.timing")}</label>
              <div className="flex flex-wrap gap-2">
                {["instant", "1-2 min", "5 min"].map((d) => (
                  <button key={d} onClick={() => setAiDelay(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${aiDelay === d ? "text-white" : "bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:border-[#FF6B35]/40"}`}
                    style={aiDelay === d ? { background: "var(--vela-gradient)" } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">{t("settings.aiConfig.instructions")}</label>
              <textarea rows={5} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Always mention our free parking. Never discuss competitor pricing. Offer 10% discount to first-time customers."
                className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-xl text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/40 transition-colors resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleSaveAI} disabled={saving}
                className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-70 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}>
                {saving ? t("common.saving") : t("settings.aiConfig.save")}
              </button>
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t("common.saved")}
                </span>
              )}
            </div>
          </>
        )}

        {/* ── Notifications ── */}
        {activeTab === "Notifications" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">{t("settings.notifications.title")}</h2>
            <div className="space-y-3">
              {([
                { labelKey: "settings.notifications.items.newLead",      subKey: "settings.notifications.items.newLeadSub",      enabled: true  },
                { labelKey: "settings.notifications.items.booking",       subKey: "settings.notifications.items.bookingSub",       enabled: true  },
                { labelKey: "settings.notifications.items.handoff",       subKey: "settings.notifications.items.handoffSub",       enabled: true  },
                { labelKey: "settings.notifications.items.dailySummary",  subKey: "settings.notifications.items.dailySummarySub",  enabled: false },
                { labelKey: "settings.notifications.items.whatsapp",      subKey: "settings.notifications.items.whatsappSub",      enabled: true  },
              ] as const).map((notif) => (
                <div key={notif.labelKey} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <p className="font-semibold text-[#111111] text-sm">{t(notif.labelKey)}</p>
                    <p className="text-xs text-[#6B7280]">{t(notif.subKey)}</p>
                  </div>
                  <div className="relative cursor-pointer" style={{ width: 40, height: 22 }}>
                    <div className={`w-full h-full rounded-full transition-all ${notif.enabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />
                    <span className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all" style={{ left: notif.enabled ? 21 : 3 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="text-sm font-bold px-6 py-2.5 rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
              {t("settings.notifications.save")}
            </button>
          </>
        )}

        {/* ── Appearance ── */}
        {activeTab === "Appearance" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">Appearance</h2>
            <p className="text-sm text-[#6B7280]">Choose an accent colour for your dashboard and homepage.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {([
                { id: "classic" as const, name: "Classic",  desc: "Orange & rose",  color: "#FF6B35", accent: "#FF3366" },
                { id: "ocean"   as const, name: "Ocean",    desc: "Blue & sky",     color: "#3B82F6", accent: "#60A5FA" },
                { id: "sunset"  as const, name: "Sunset",   desc: "Warm amber",     color: "#FB8C42", accent: "#FBA94C" },
              ]).map((th) => (
                <button
                  key={th.id}
                  onClick={() => setColorTheme(th.id)}
                  className={`relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    colorTheme === th.id
                      ? "border-[#FF6B35] shadow-sm"
                      : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                  }`}
                  style={colorTheme === th.id ? { borderColor: th.color } : {}}
                >
                  {/* Colour swatch */}
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

        {/* ── Billing ── */}
        {activeTab === "Billing" && (
          <>
            <h2 className="font-bold text-[#111111] text-lg">{t("settings.billing.title")}</h2>
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-[#111111] capitalize">{getProfile()?.plan ?? "Starter"} Plan</p>
                  <p className="text-xs text-[#6B7280]">{t("settings.billing.renews")}</p>
                </div>
                <span className="text-2xl font-extrabold text-[#FF6B35]">
                  {getProfile()?.plan === "premium" ? "$299" : getProfile()?.plan === "pro" ? "$159" : "$79"}
                  <span className="text-sm font-medium text-[#6B7280]">/mo</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--vela-gradient)" }}>
                  {t("settings.billing.upgradePlan")}
                </button>
                <button className="text-xs font-semibold px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all">
                  {t("settings.billing.manageBilling")}
                </button>
              </div>
            </div>

            {/* White-label toggle — Pro/Premium only */}
            <div className={`relative rounded-xl border p-5 transition-all ${isPro ? "border-[#E5E7EB] bg-white" : "border-[#E5E7EB] bg-[#FAFAFA]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isPro ? "var(--vela-gradient-tint)" : "#F3F4F6" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5L2 4.5v3.5c0 3.1 2.1 6 5 6.8 1 .3 2 0 3-1 1.9-1.7 2-3.3 2-5.8V4.5L8 1.5z" stroke={isPro ? "#FF6B35" : "#9CA3AF"} strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isPro ? "text-[#111111]" : "text-[#9CA3AF]"}`}>{t("settings.billing.whiteLabel")}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{t("settings.billing.whiteLabelDesc")}</p>
                  </div>
                </div>
                {isPro ? (
                  <button
                    onClick={() => {
                      const next = !whiteLabelEnabled;
                      setWhiteLabelEnabled(next);
                      localStorage.setItem("vela_white_label", String(next));
                      setToast(next ? t("settings.billing.toastHidden") : t("settings.billing.toastRestored"));
                    }}
                    className="relative shrink-0 transition-colors"
                    style={{ width: 40, height: 22 }}
                    aria-label="Toggle white label"
                  >
                    <div className={`w-full h-full rounded-full transition-all ${whiteLabelEnabled ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />
                    <span className="absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all" style={{ left: whiteLabelEnabled ? 21 : 3 }} />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35] shrink-0">Pro+</span>
                )}
              </div>
              {!isPro && (
                <p className="text-xs text-[#9CA3AF] mt-3">{t("settings.billing.plansNote")}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest">{t("settings.billing.paymentMethod")}</p>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E5E7EB]">
                <div className="w-10 h-7 bg-[#111111] rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                <span className="text-sm text-[#6B7280]">{t("settings.billing.noCard")}</span>
              </div>
              <button className="text-xs font-semibold text-[#FF6B35] hover:underline">{t("settings.billing.addPayment")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
