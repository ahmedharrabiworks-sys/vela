"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { KnowledgeBase } from "@/app/api/ai-training/route";
import { useI18n } from "@/lib/i18n";

type ServiceRow  = KnowledgeBase["services"][number];
type Tab         = "Services" | "Business Info" | "Extra";
type ImportState = "idle" | "importing" | "review" | "error" | "instagram";

const EMPTY_SERVICE: ServiceRow = { name: "", price: "", duration: "", description: "" };
const TABS: Tab[]               = ["Services", "Business Info", "Extra"];

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

export function computeCompleteness(kb: KnowledgeBase): number {
  const checks = [
    kb.services.some((s) => s.name.trim()),
    !!kb.business.hours.trim(),
    !!kb.business.address.trim(),
    !!kb.business.bookingPolicy.trim(),
    !!kb.extra.trim(),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function ProgressRing({ pct, scoreLabel, statusLabel }: { pct: number; scoreLabel: string; statusLabel: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#FF6B35" : "#DC2626";
  return (
    <div className="flex items-center gap-2.5">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#F3F4F6" strokeWidth="3.5"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 0.7s ease, stroke 0.3s" }}
        />
        <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <div>
        <p className="text-xs font-bold text-[#374151]">{scoreLabel}</p>
        <p className="text-[11px] text-[#9CA3AF]">{statusLabel}</p>
      </div>
    </div>
  );
}

const CELL = "w-full text-sm bg-transparent px-2.5 py-2 text-[#111111] placeholder-[#D1D5DB] focus:outline-none focus:bg-[#FFF8F5] rounded-lg transition-colors";

export default function AITrainingPage() {
  const { t } = useI18n();
  const [kb, setKb]             = useState<KnowledgeBase>(DEFAULT_KB);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Services");

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [extractedText, setExtractedText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [importInput, setImportInput]   = useState("");
  const [importState, setImportState]   = useState<ImportState>("idle");
  const [importedKb, setImportedKb]     = useState<KnowledgeBase | null>(null);
  const [importError, setImportError]   = useState("");

  const kbRef         = useRef(kb);
  kbRef.current       = kb;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/ai-training")
      .then((r) => r.json())
      .then((data: KnowledgeBase) => {
        let loaded = { ...DEFAULT_KB, ...data };
        if (loaded.faqs && loaded.faqs.length > 0) {
          const faqLines = loaded.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
          const sep = loaded.extra.trim() ? "\n\n---\n\n" : "";
          loaded = { ...loaded, extra: loaded.extra + sep + faqLines, faqs: [] };
          fetch("/api/ai-training", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loaded),
          });
        }
        setKb(loaded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const save = useCallback(async (data: KnowledgeBase) => {
    setSaving(true);
    try {
      await fetch("/api/ai-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await save(kbRef.current);
      showToast(t("aiTraining.saved"));
    }, 700);
  }, [save, showToast, t]);

  const updateKb = (patch: Partial<KnowledgeBase>) =>
    setKb((prev) => ({ ...prev, ...patch }));

  const updateBusiness = (patch: Partial<KnowledgeBase["business"]>) =>
    setKb((prev) => ({ ...prev, business: { ...prev.business, ...patch } }));

  const addService    = () => updateKb({ services: [...kb.services, { ...EMPTY_SERVICE }] });
  const removeService = (i: number) => {
    const next = { ...kbRef.current, services: kbRef.current.services.filter((_, idx) => idx !== i) };
    setKb(next);
    save(next).then(() => showToast(t("aiTraining.saved")));
  };
  const updateService = (i: number, patch: Partial<ServiceRow>) =>
    setKb((prev) => ({ ...prev, services: prev.services.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("uploading");
    setExtractedText("");
    setActiveTab("Extra");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/ai-training/upload", { method: "POST", body: form });
      const data = await res.json() as { text?: string; error?: string };
      if (data.text) { setExtractedText(data.text); setUploadStatus("done"); }
      else setUploadStatus("error");
    } catch { setUploadStatus("error"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const appendExtracted = () => {
    const sep = kbRef.current.extra.trim() ? "\n\n---\n\n" : "";
    const next = { ...kbRef.current, extra: kbRef.current.extra + sep + extractedText };
    setKb(next);
    setExtractedText("");
    setUploadStatus("idle");
    save(next).then(() => showToast(t("aiTraining.saved")));
  };

  const handleImport = async () => {
    const raw = importInput.trim();
    if (!raw) return;
    setImportState("importing");
    setImportError("");
    try {
      const res = await fetch("/api/ai-training/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: raw }),
      });
      const data = await res.json() as { kb?: KnowledgeBase; instagram?: boolean; error?: string };
      if (data.instagram) { setImportState("instagram"); return; }
      if (!res.ok || data.error) { setImportError(data.error ?? t("aiTraining.importFailed")); setImportState("error"); return; }
      if (data.kb) { setImportedKb(data.kb); setImportState("review"); }
    } catch {
      setImportError(t("aiTraining.connectionError"));
      setImportState("error");
    }
  };

  const acceptImport = async () => {
    if (!importedKb) return;
    let importedExtra = importedKb.extra ?? "";
    if (importedKb.faqs && importedKb.faqs.length > 0) {
      const faqLines = importedKb.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
      const sep = importedExtra.trim() ? "\n\n---\n\n" : "";
      importedExtra = importedExtra + sep + faqLines;
    }
    const merged: KnowledgeBase = {
      services: importedKb.services.length > 0 ? importedKb.services : kb.services,
      faqs: [],
      business: {
        hours:         importedKb.business.hours         || kb.business.hours,
        address:       importedKb.business.address       || kb.business.address,
        bookingPolicy: importedKb.business.bookingPolicy || kb.business.bookingPolicy,
        tone:          importedKb.business.tone          || kb.business.tone,
      },
      extra: importedExtra || kb.extra,
    };
    setKb(merged);
    await save(merged);
    showToast(t("aiTraining.savedImported"));
    setImportState("idle");
    setImportedKb(null);
    setImportInput("");
    setActiveTab("Services");
  };

  const pct = computeCompleteness(kb);
  const statusLabel = pct >= 80 ? t("aiTraining.wellTrained") : pct >= 50 ? t("aiTraining.gettingThere") : t("aiTraining.needsInfo");

  const TAB_KEYS: Record<Tab, string> = {
    "Services":      "aiTraining.tabs.services",
    "Business Info": "aiTraining.tabs.businessInfo",
    "Extra":         "aiTraining.tabs.extra",
  };

  const SpinnerIcon = () => (
    <svg className="animate-spin" width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1v1.5M5.5 8.5V10M1 5.5h1.5M8.5 5.5H10M2.2 2.2l1.06 1.06M7.74 7.74l1.06 1.06M2.2 8.8l1.06-1.06M7.74 3.26l1.06-1.06" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 3h10M5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M10.5 3l-.75 7a.9.9 0 01-.9.8H4.15a.9.9 0 01-.9-.8L2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-20 animate-pulse">
        <div className="h-14 bg-[#F3F4F6] rounded-xl" />
        <div className="h-16 bg-[#F3F4F6] rounded-xl" />
        <div className="h-12 bg-[#F3F4F6] rounded-xl" />
        <div className="h-64 bg-[#F3F4F6] rounded-xl" />
      </div>
    );
  }

  const tabBadge: Record<Tab, number> = {
    Services:        kb.services.filter((s) => s.name.trim()).length,
    "Business Info": [kb.business.hours, kb.business.address, kb.business.bookingPolicy].filter(Boolean).length,
    Extra:           kb.extra.trim() ? 1 : 0,
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">{t("aiTraining.title")}</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{t("aiTraining.subtitle")}</p>
        </div>
        <ProgressRing pct={pct} scoreLabel={t("aiTraining.aiScore")} statusLabel={statusLabel} />
      </div>

      {/* ── Magic Import hero ── */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && importState !== "importing" && handleImport()}
            placeholder={t("aiTraining.importPlaceholder")}
            className="w-full text-sm rounded-xl px-4 py-3.5 pr-[7.5rem] border border-[#E5E7EB] bg-white text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
          />
          <button
            onClick={handleImport}
            disabled={!importInput.trim() || importState === "importing"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: "var(--vela-gradient)" }}
          >
            {importState === "importing" ? <><SpinnerIcon /> {t("aiTraining.analyzing")}</> : t("aiTraining.importBtn")}
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={uploadStatus === "uploading"} />

        <p className="text-xs text-center text-[#9CA3AF] mt-2.5">
          {t("aiTraining.or")}{" "}
          <button type="button" onClick={() => { setActiveTab("Extra"); fileRef.current?.click(); }}
            className="text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">
            {t("aiTraining.uploadPriceList")}
          </button>
          {" · " + t("aiTraining.or") + " "}
          <button type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vela-start-interview"))}
            className="text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">
            {t("aiTraining.answerQuestions")}
          </button>
        </p>

        {importState === "instagram" && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#7C3AED" strokeWidth="1.2"/><path d="M7 4v3.5L9 9" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <p className="text-xs text-purple-700 flex-1">{t("aiTraining.instagramSoon")}</p>
            <button onClick={() => { setImportState("idle"); setImportInput(""); }} className="text-purple-300 hover:text-purple-500">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}

        {importState === "error" && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.2"/><path d="M7 4.5v3M7 9.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <p className="text-xs text-red-700 flex-1">{importError}</p>
            <button onClick={() => setImportState("idle")} className="text-red-300 hover:text-red-500">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}

        {importState === "review" && importedKb && (
          <div className="mt-4 border border-[#FF6B35]/30 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
              <p className="text-xs font-bold text-[#111111]">{t("aiTraining.reviewTitle")}</p>
              <button onClick={() => { setImportState("idle"); setImportedKb(null); }} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-56 overflow-y-auto">
              {importedKb.services.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{t("aiTraining.reviewServices")} ({importedKb.services.length})</p>
                  <div className="space-y-1">
                    {importedKb.services.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                        <span className="font-semibold text-[#374151]">{s.name}{s.duration ? ` (${s.duration})` : ""}</span>
                        {s.price && <span className="text-[#FF6B35] font-bold">{s.price}</span>}
                      </div>
                    ))}
                    {importedKb.services.length > 5 && <p className="text-[11px] text-[#9CA3AF] pl-1">+{importedKb.services.length - 5}{t("aiTraining.moreCount")}</p>}
                  </div>
                </div>
              )}
              {(importedKb.faqs.length > 0 || importedKb.extra) && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{t("aiTraining.reviewExtraInfo")}</p>
                  {importedKb.faqs.length > 0 && (
                    <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-[#374151]">
                      {importedKb.faqs.length} Q&amp;A pair{importedKb.faqs.length > 1 ? "s" : ""} → will be added to Extra
                    </div>
                  )}
                </div>
              )}
              {(importedKb.business.hours || importedKb.business.address) && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{t("aiTraining.reviewBusinessInfo")}</p>
                  <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-0.5">
                    {importedKb.business.hours && <p><span className="text-[#9CA3AF]">{t("aiTraining.reviewHours")}</span> {importedKb.business.hours}</p>}
                    {importedKb.business.address && <p><span className="text-[#9CA3AF]">{t("aiTraining.reviewAddress")}</span> {importedKb.business.address}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[#F3F4F6] flex gap-2">
              <button onClick={acceptImport} disabled={saving}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}>
                {saving ? t("common.saving") : t("aiTraining.saveBtn")}
              </button>
              <button onClick={() => { setImportState("idle"); setImportedKb(null); }}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                {t("aiTraining.discardBtn")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Segment tabs ── */}
      <div className="flex gap-0.5 bg-[#F3F4F6] rounded-xl p-1 mb-1 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map((tab) => {
          const badge = tabBadge[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab ? "bg-white text-[#111111] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              {t(TAB_KEYS[tab])}
              {badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                  activeTab === tab ? "bg-[#FF6B35]/10 text-[#FF6B35]" : "bg-[#E5E7EB] text-[#9CA3AF]"
                }`}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content panel ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">

        {/* SERVICES */}
        {activeTab === "Services" && (
          <div>
            {kb.services.length > 0 && (
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_90px_1fr_36px] px-2 py-2.5 border-b border-[#F3F4F6] bg-[#FAFAFA]">
                {[t("aiTraining.services.colService"), t("aiTraining.services.colPrice"), t("aiTraining.services.colDuration"), t("aiTraining.services.colDescription"), ""].map((h, i) => (
                  <span key={i} className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-2.5">{h}</span>
                ))}
              </div>
            )}

            <div className="divide-y divide-[#F9FAFB]">
              {kb.services.map((svc, i) => (
                <div key={i} className="group hover:bg-[#FAFAFA] transition-colors">
                  {/* Desktop row */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_100px_90px_1fr_36px] items-center px-2 py-1">
                    <input value={svc.name} onChange={(e) => updateService(i, { name: e.target.value })} onBlur={triggerAutoSave}
                      placeholder={t("aiTraining.services.namePlaceholder")} className={CELL} />
                    <input value={svc.price} onChange={(e) => updateService(i, { price: e.target.value })} onBlur={triggerAutoSave}
                      placeholder={t("aiTraining.services.pricePlaceholder")} className={CELL} />
                    <input value={svc.duration} onChange={(e) => updateService(i, { duration: e.target.value })} onBlur={triggerAutoSave}
                      placeholder={t("aiTraining.services.durationPlaceholder")} className={CELL} />
                    <input value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} onBlur={triggerAutoSave}
                      placeholder={t("aiTraining.services.descPlaceholder")} className={CELL} />
                    <div className="flex justify-center">
                      <button onClick={() => removeService(i)}
                        className="p-1.5 text-[#D1D5DB] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-all rounded-lg">
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {/* Mobile card */}
                  <div className="sm:hidden px-4 py-3 space-y-2">
                    <div className="flex gap-2">
                      <input value={svc.name} onChange={(e) => updateService(i, { name: e.target.value })} onBlur={triggerAutoSave}
                        placeholder={t("aiTraining.services.namePlaceholder")} className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                      <button onClick={() => removeService(i)} className="p-2 text-[#D1D5DB] hover:text-[#DC2626] rounded-lg shrink-0">
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input value={svc.price} onChange={(e) => updateService(i, { price: e.target.value })} onBlur={triggerAutoSave}
                        placeholder={t("aiTraining.services.pricePlaceholder")} className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                      <input value={svc.duration} onChange={(e) => updateService(i, { duration: e.target.value })} onBlur={triggerAutoSave}
                        placeholder={t("aiTraining.services.durationPlaceholder")} className="w-24 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                    <input value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} onBlur={triggerAutoSave}
                      placeholder={t("aiTraining.services.descPlaceholder")} className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>
              ))}
            </div>

            {kb.services.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-[#9CA3AF]">
                {t("aiTraining.services.empty")}
              </div>
            )}

            <button onClick={addService}
              className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-[#FFF8F5] transition-colors border-t border-dashed border-[#F3F4F6]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {t("aiTraining.services.addService")}
            </button>
          </div>
        )}

        {/* BUSINESS INFO */}
        {activeTab === "Business Info" && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-medium text-[#6B7280]">{t("aiTraining.businessInfo.hours")}</label>
                <input value={kb.business.hours} onChange={(e) => updateBusiness({ hours: e.target.value })} onBlur={triggerAutoSave}
                  placeholder={t("aiTraining.businessInfo.hoursPlaceholder")}
                  className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280]">{t("aiTraining.businessInfo.address")}</label>
                <input value={kb.business.address} onChange={(e) => updateBusiness({ address: e.target.value })} onBlur={triggerAutoSave}
                  placeholder={t("aiTraining.businessInfo.addressPlaceholder")}
                  className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280]">{t("aiTraining.businessInfo.bookingPolicy")}</label>
              <textarea value={kb.business.bookingPolicy} onChange={(e) => updateBusiness({ bookingPolicy: e.target.value })} onBlur={triggerAutoSave}
                rows={3} placeholder={t("aiTraining.businessInfo.bookingPolicyPlaceholder")}
                className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-3 block">{t("aiTraining.businessInfo.tone")}</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "professional", labelKey: "aiTraining.businessInfo.toneProfessional", descKey: "aiTraining.businessInfo.toneProfessionalDesc" },
                  { value: "friendly",     labelKey: "aiTraining.businessInfo.toneFriendly",     descKey: "aiTraining.businessInfo.toneFriendlyDesc" },
                  { value: "luxury",       labelKey: "aiTraining.businessInfo.toneLuxury",       descKey: "aiTraining.businessInfo.toneLuxuryDesc" },
                ] as const).map((tone) => (
                  <button key={tone.value}
                    onClick={() => {
                      const next = { ...kbRef.current, business: { ...kbRef.current.business, tone: tone.value } };
                      setKb(next);
                      save(next).then(() => showToast(t("aiTraining.saved")));
                    }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      kb.business.tone === tone.value
                        ? "border-[#FF6B35] bg-[#FFF5F0]"
                        : "border-[#E5E7EB] hover:border-[#FF6B35]/40 hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <p className={`text-xs font-bold capitalize ${kb.business.tone === tone.value ? "text-[#FF6B35]" : "text-[#374151]"}`}>{t(tone.labelKey)}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-snug">{t(tone.descKey)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXTRA */}
        {activeTab === "Extra" && (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-[#6B7280]">{t("aiTraining.extra.label")}</label>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5 mb-2">{t("aiTraining.extra.hint")}</p>
              <textarea value={kb.extra} onChange={(e) => updateKb({ extra: e.target.value })} onBlur={triggerAutoSave}
                rows={7} placeholder={t("aiTraining.extra.textareaPlaceholder")}
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all resize-none" />
            </div>

            {/* Upload section */}
            <div className="border border-dashed border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#374151]">{t("aiTraining.extra.uploadTitle")}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{t("aiTraining.extra.uploadHint")}</p>
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploadStatus === "uploading"}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors disabled:opacity-50">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5v6M3.5 4L6 1.5 8.5 4M1.5 9v1a.75.75 0 00.75.75h7.5A.75.75 0 0010.5 10V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {uploadStatus === "uploading" ? t("aiTraining.extra.extracting") : t("aiTraining.extra.chooseFile")}
                </button>
              </div>

              {uploadStatus === "error" && (
                <p className="mt-3 text-xs text-red-500">{t("aiTraining.extra.extractionFailed")}</p>
              )}

              {uploadStatus === "done" && extractedText && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#374151]">{t("aiTraining.extra.reviewExtracted")}</p>
                    <button onClick={() => { setExtractedText(""); setUploadStatus("idle"); }} className="text-[10px] text-[#9CA3AF] hover:text-[#6B7280]">{t("aiTraining.extra.discard")}</button>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 max-h-44 overflow-y-auto">
                    <pre className="text-xs text-[#374151] whitespace-pre-wrap font-sans">{extractedText}</pre>
                  </div>
                  <button onClick={appendExtracted}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--vela-gradient)" }}>
                    {t("aiTraining.extra.addToKB")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto-save toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#111111] text-white text-xs font-semibold rounded-full shadow-xl flex items-center gap-2 pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {toast}
        </div>
      )}

      {saving && (
        <div className="fixed bottom-6 right-6 z-50 w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
