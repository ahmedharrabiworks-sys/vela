"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";

interface PhoneAgentKb {
  services: Array<{ name: string; price: string; duration: string; description: string }>;
  business: { hours: string; address: string; bookingPolicy: string };
  extra: string;
}

const EMPTY_PHONE_KB: PhoneAgentKb = {
  services: [],
  business: { hours: "", address: "", bookingPolicy: "" },
  extra: "",
};

// FIX 4 (bug list): moved out of Settings into its own top-level Phone Agent
// tab, matching the intended Training | Phone Number | Knowledge Base |
// Settings structure -- pure move, the state/fetch/save logic below is
// unchanged from what previously lived in settings/page.tsx.
export default function KnowledgeBasePage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);

  // Phone Agent's own knowledge base -- separate from the Training interview's KB,
  // saved independently via its own endpoint (see /api/ai-agent/phone-knowledge).
  const [phoneKb, setPhoneKb]           = useState<PhoneAgentKb>(EMPTY_PHONE_KB);
  const [phoneKbSaving, setPhoneKbSaving] = useState(false);
  const [phoneKbSaved, setPhoneKbSaved]   = useState(false);
  const [phoneKbError, setPhoneKbError]   = useState<string | null>(null);

  const bg          = isDark ? "var(--dm-bg)" : "#F8F9FF";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const inputBg     = isDark ? "var(--dm-bg)" : "#F9FAFB";
  const inputText   = isDark ? "var(--dm-text)" : "#374151";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/phone-knowledge");
        if (res.ok) {
          const data = await res.json() as PhoneAgentKb;
          setPhoneKb({ ...EMPTY_PHONE_KB, ...data, business: { ...EMPTY_PHONE_KB.business, ...(data.business ?? {}) } });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const setPhoneBiz = <K extends keyof PhoneAgentKb["business"]>(key: K, val: string) =>
    setPhoneKb((prev) => ({ ...prev, business: { ...prev.business, [key]: val } }));

  const setPhoneService = (idx: number, field: "name" | "price", val: string) =>
    setPhoneKb((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));

  const addPhoneService = () =>
    setPhoneKb((prev) => ({ ...prev, services: [...prev.services, { name: "", price: "", duration: "", description: "" }] }));

  const removePhoneService = (idx: number) =>
    setPhoneKb((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== idx) }));

  const savePhoneKb = async () => {
    setPhoneKbSaving(true);
    setPhoneKbError(null);
    try {
      const res = await fetch("/api/ai-agent/phone-knowledge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...phoneKb, services: phoneKb.services.filter((s) => s.name.trim()) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setPhoneKbError(data.error ?? "Save failed. Please try again");
        setPhoneKbSaving(false);
        return;
      }
      setPhoneKbSaved(true);
      setTimeout(() => setPhoneKbSaved(false), 2500);
    } catch {
      setPhoneKbError("Network error. Please check your connection");
    }
    setPhoneKbSaving(false);
  };

  const inputClass = "w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all";
  const inputStyle = { background: inputBg, borderColor: border, color: inputText };

  if (loading) {
    return (
      <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-center" style={{ minHeight: 240 }}>
          <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>{t("aiAgent.tabs.knowledgeBase")}</h1>
          <p className="text-sm" style={{ color: textMuted }}>
            What your real Phone Agent knows when answering customer calls.
          </p>
        </div>

        {/* Phone Agent Knowledge Base, full-width, editable directly, separate from
            the Training interview's knowledge panel. Automatically merged with the
            Training/Magic Import knowledge base wherever the real Phone Agent or the
            internal Assistant build their context -- see src/lib/knowledge-base.ts. */}
        <div className="rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
          <p className="text-xs mb-4" style={{ color: textMuted }}>
            Separate from the Training interview: edit it here directly. Automatically combined with anything learned via Training or file/link analysis.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Hours</label>
              <input
                type="text"
                value={phoneKb.business.hours}
                onChange={(e) => setPhoneBiz("hours", e.target.value)}
                placeholder="Mon to Sat 9:00 to 17:00"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Address</label>
              <input
                type="text"
                value={phoneKb.business.address}
                onChange={(e) => setPhoneBiz("address", e.target.value)}
                placeholder="Where you're located"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Booking Policy</label>
              <input
                type="text"
                value={phoneKb.business.bookingPolicy}
                onChange={(e) => setPhoneBiz("bookingPolicy", e.target.value)}
                placeholder="How customers book"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: textMuted }}>Services</label>
              <button
                type="button"
                onClick={addPhoneService}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: "#FF6B35" }}
              >
                + Add service
              </button>
            </div>
            {phoneKb.services.length === 0 ? (
              <p className="text-[11px]" style={{ color: textMuted }}>No services added yet.</p>
            ) : (
              <div className="space-y-2">
                {phoneKb.services.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => setPhoneService(i, "name", e.target.value)}
                      placeholder="Service name"
                      className={`${inputClass} flex-1`}
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={s.price}
                      onChange={(e) => setPhoneService(i, "price", e.target.value)}
                      placeholder="Price"
                      className={inputClass}
                      style={{ ...inputStyle, maxWidth: 120 }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoneService(i)}
                      aria-label="Remove service"
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isDark ? "var(--dm-card2)" : "#F3F4F6", color: textMuted }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: textMuted }}>Extra notes</label>
            <textarea
              value={phoneKb.extra}
              onChange={(e) => setPhoneKb((prev) => ({ ...prev, extra: e.target.value }))}
              placeholder="Anything else the Phone Agent should know…"
              rows={3}
              className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 transition-all"
              style={{ background: inputBg, borderColor: border, color: inputText }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            {phoneKbSaved && (
              <span className="text-sm text-green-500 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
            {phoneKbError && <span className="text-xs text-red-400 leading-snug">{phoneKbError}</span>}
            <button
              onClick={savePhoneKb}
              disabled={phoneKbSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
            >
              {phoneKbSaving ? t("common.saving") : "Save Phone Agent Knowledge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
