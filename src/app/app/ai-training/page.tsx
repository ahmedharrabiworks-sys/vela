"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

type ServiceRow  = KnowledgeBase["services"][number];
type FaqRow      = KnowledgeBase["faqs"][number];
type Tab         = "Services" | "FAQs" | "Business Info" | "Extra";
type ImportState = "idle" | "importing" | "review" | "error" | "instagram";

const EMPTY_SERVICE: ServiceRow = { name: "", price: "", duration: "", description: "" };
const EMPTY_FAQ: FaqRow         = { q: "", a: "" };
const TABS: Tab[]               = ["Services", "FAQs", "Business Info", "Extra"];

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

export function computeCompleteness(kb: KnowledgeBase): number {
  const checks = [
    kb.services.some((s) => s.name.trim()),
    kb.faqs.some((f) => f.q.trim()),
    !!kb.business.hours.trim(),
    !!kb.business.address.trim(),
    !!kb.business.bookingPolicy.trim(),
    !!kb.extra.trim(),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#FF6B35" : "#DC2626";
  const label = pct >= 80 ? "Well trained" : pct >= 50 ? "Getting there" : "Needs info";
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
        <p className="text-xs font-bold text-[#374151]">AI Score</p>
        <p className="text-[11px] text-[#9CA3AF]">{label}</p>
      </div>
    </div>
  );
}

const CELL = "w-full text-sm bg-transparent px-2.5 py-2 text-[#111111] placeholder-[#D1D5DB] focus:outline-none focus:bg-[#FFF8F5] rounded-lg transition-colors";

export default function AITrainingPage() {
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

  // Always-current ref for auto-save
  const kbRef           = useRef(kb);
  kbRef.current         = kb;
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/ai-training")
      .then((r) => r.json())
      .then((data: KnowledgeBase) => { setKb({ ...DEFAULT_KB, ...data }); setLoading(false); })
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
      showToast("Saved ✓");
    }, 700);
  }, [save, showToast]);

  const updateKb = (patch: Partial<KnowledgeBase>) =>
    setKb((prev) => ({ ...prev, ...patch }));

  const updateBusiness = (patch: Partial<KnowledgeBase["business"]>) =>
    setKb((prev) => ({ ...prev, business: { ...prev.business, ...patch } }));

  const addService    = () => updateKb({ services: [...kb.services, { ...EMPTY_SERVICE }] });
  const removeService = (i: number) => {
    const next = { ...kbRef.current, services: kbRef.current.services.filter((_, idx) => idx !== i) };
    setKb(next);
    save(next).then(() => showToast("Saved ✓"));
  };
  const updateService = (i: number, patch: Partial<ServiceRow>) =>
    setKb((prev) => ({ ...prev, services: prev.services.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  const addFaq    = () => updateKb({ faqs: [...kb.faqs, { ...EMPTY_FAQ }] });
  const removeFaq = (i: number) => {
    const next = { ...kbRef.current, faqs: kbRef.current.faqs.filter((_, idx) => idx !== i) };
    setKb(next);
    save(next).then(() => showToast("Saved ✓"));
  };
  const updateFaq = (i: number, patch: Partial<FaqRow>) =>
    setKb((prev) => ({ ...prev, faqs: prev.faqs.map((f, idx) => idx === i ? { ...f, ...patch } : f) }));

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
    save(next).then(() => showToast("Saved ✓"));
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
      if (!res.ok || data.error) { setImportError(data.error ?? "Import failed."); setImportState("error"); return; }
      if (data.kb) { setImportedKb(data.kb); setImportState("review"); }
    } catch {
      setImportError("Connection error — please try again.");
      setImportState("error");
    }
  };

  const acceptImport = async () => {
    if (!importedKb) return;
    const merged: KnowledgeBase = {
      services: importedKb.services.length > 0 ? importedKb.services : kb.services,
      faqs:     importedKb.faqs.length > 0     ? importedKb.faqs     : kb.faqs,
      business: {
        hours:         importedKb.business.hours         || kb.business.hours,
        address:       importedKb.business.address       || kb.business.address,
        bookingPolicy: importedKb.business.bookingPolicy || kb.business.bookingPolicy,
        tone:          importedKb.business.tone          || kb.business.tone,
      },
      extra: importedKb.extra || kb.extra,
    };
    setKb(merged);
    await save(merged);
    showToast("Imported & Saved ✓");
    setImportState("idle");
    setImportedKb(null);
    setImportInput("");
    setActiveTab("Services");
  };

  const pct = computeCompleteness(kb);

  // Spinner SVG for import button
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

  // Shared tab badges
  const tabBadge: Record<Tab, number> = {
    Services:      kb.services.filter((s) => s.name.trim()).length,
    FAQs:          kb.faqs.filter((f) => f.q.trim()).length,
    "Business Info": [kb.business.hours, kb.business.address, kb.business.bookingPolicy].filter(Boolean).length,
    Extra:         kb.extra.trim() ? 1 : 0,
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Train Your AI</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">The more you tell your AI, the better it serves customers.</p>
        </div>
        <ProgressRing pct={pct} />
      </div>

      {/* ── Magic Import hero ── */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && importState !== "importing" && handleImport()}
            placeholder="Paste your website — Vela learns everything ✨"
            className="w-full text-sm rounded-xl px-4 py-3.5 pr-[7.5rem] border border-[#E5E7EB] bg-white text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
          />
          <button
            onClick={handleImport}
            disabled={!importInput.trim() || importState === "importing"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
          >
            {importState === "importing" ? <><SpinnerIcon /> Analyzing</> : "Import"}
          </button>
        </div>

        {/* Hidden file input — triggered from multiple places */}
        <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={uploadStatus === "uploading"} />

        <p className="text-xs text-center text-[#9CA3AF] mt-2.5">
          or{" "}
          <button type="button" onClick={() => { setActiveTab("Extra"); fileRef.current?.click(); }}
            className="text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">
            upload a price list
          </button>
          {" · or "}
          <button type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("vela-start-interview"))}
            className="text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">
            answer 5 quick questions
          </button>
        </p>

        {/* Import feedback */}
        {importState === "instagram" && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#7C3AED" strokeWidth="1.2"/><path d="M7 4v3.5L9 9" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <p className="text-xs text-purple-700 flex-1">Instagram import is coming soon — paste your website URL or upload a price list PDF instead.</p>
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

        {/* Import review panel */}
        {importState === "review" && importedKb && (
          <div className="mt-4 border border-[#FF6B35]/30 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-[#F3F4F6] flex items-center justify-between">
              <p className="text-xs font-bold text-[#111111]">Extracted from your website — review before saving</p>
              <button onClick={() => { setImportState("idle"); setImportedKb(null); }} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="px-4 py-3 space-y-3 max-h-56 overflow-y-auto">
              {importedKb.services.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Services ({importedKb.services.length})</p>
                  <div className="space-y-1">
                    {importedKb.services.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                        <span className="font-semibold text-[#374151]">{s.name}{s.duration ? ` (${s.duration})` : ""}</span>
                        {s.price && <span className="text-[#FF6B35] font-bold">{s.price}</span>}
                      </div>
                    ))}
                    {importedKb.services.length > 5 && <p className="text-[11px] text-[#9CA3AF] pl-1">+{importedKb.services.length - 5} more</p>}
                  </div>
                </div>
              )}
              {importedKb.faqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">FAQs ({importedKb.faqs.length})</p>
                  <div className="space-y-1">
                    {importedKb.faqs.slice(0, 3).map((f, i) => (
                      <div key={i} className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 font-semibold text-[#374151]">{f.q}</div>
                    ))}
                    {importedKb.faqs.length > 3 && <p className="text-[11px] text-[#9CA3AF] pl-1">+{importedKb.faqs.length - 3} more</p>}
                  </div>
                </div>
              )}
              {(importedKb.business.hours || importedKb.business.address) && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Business Info</p>
                  <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 space-y-0.5">
                    {importedKb.business.hours && <p><span className="text-[#9CA3AF]">Hours:</span> {importedKb.business.hours}</p>}
                    {importedKb.business.address && <p><span className="text-[#9CA3AF]">Address:</span> {importedKb.business.address}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[#F3F4F6] flex gap-2">
              <button onClick={acceptImport} disabled={saving}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {saving ? "Saving…" : "Looks good — Save"}
              </button>
              <button onClick={() => { setImportState("idle"); setImportedKb(null); }}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                Discard
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
              {tab}
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
                {["Service", "Price", "Duration", "Description", ""].map((h, i) => (
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
                      placeholder="Service name" className={CELL} />
                    <input value={svc.price} onChange={(e) => updateService(i, { price: e.target.value })} onBlur={triggerAutoSave}
                      placeholder="Price" className={CELL} />
                    <input value={svc.duration} onChange={(e) => updateService(i, { duration: e.target.value })} onBlur={triggerAutoSave}
                      placeholder="45 min" className={CELL} />
                    <input value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} onBlur={triggerAutoSave}
                      placeholder="Short description" className={CELL} />
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
                        placeholder="Service name" className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                      <button onClick={() => removeService(i)} className="p-2 text-[#D1D5DB] hover:text-[#DC2626] rounded-lg shrink-0">
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input value={svc.price} onChange={(e) => updateService(i, { price: e.target.value })} onBlur={triggerAutoSave}
                        placeholder="Price" className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                      <input value={svc.duration} onChange={(e) => updateService(i, { duration: e.target.value })} onBlur={triggerAutoSave}
                        placeholder="45 min" className="w-24 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                    </div>
                    <input value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} onBlur={triggerAutoSave}
                      placeholder="Short description" className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                  </div>
                </div>
              ))}
            </div>

            {kb.services.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-[#9CA3AF]">
                No services yet
              </div>
            )}

            <button onClick={addService}
              className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-[#FFF8F5] transition-colors border-t border-dashed border-[#F3F4F6]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Add service
            </button>
          </div>
        )}

        {/* FAQS */}
        {activeTab === "FAQs" && (
          <div>
            <div className="divide-y divide-[#F9FAFB]">
              {kb.faqs.map((faq, i) => (
                <div key={i} className="group px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-1.5">
                      <input value={faq.q} onChange={(e) => updateFaq(i, { q: e.target.value })} onBlur={triggerAutoSave}
                        placeholder="Customer question…"
                        className="w-full text-sm px-0 py-1 text-[#111111] placeholder-[#9CA3AF] focus:outline-none bg-transparent border-b border-transparent focus:border-[#FF6B35] font-medium transition-colors" />
                      <input value={faq.a} onChange={(e) => updateFaq(i, { a: e.target.value })} onBlur={triggerAutoSave}
                        placeholder="Your AI will say…"
                        className="w-full text-sm px-0 py-1 text-[#6B7280] placeholder-[#9CA3AF] focus:outline-none bg-transparent border-b border-transparent focus:border-[#FF6B35] transition-colors" />
                    </div>
                    <button onClick={() => removeFaq(i)}
                      className="mt-1 p-1.5 text-[#D1D5DB] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-all rounded-lg shrink-0">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
              {kb.faqs.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-[#9CA3AF]">
                  No FAQs yet — add common questions your customers ask
                </div>
              )}
            </div>
            <button onClick={addFaq}
              className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-[#FFF8F5] transition-colors border-t border-dashed border-[#F3F4F6]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Add FAQ
            </button>
          </div>
        )}

        {/* BUSINESS INFO */}
        {activeTab === "Business Info" && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-medium text-[#6B7280]">Working Hours</label>
                <input value={kb.business.hours} onChange={(e) => updateBusiness({ hours: e.target.value })} onBlur={triggerAutoSave}
                  placeholder="Mon–Fri 9am–6pm, Sat 10am–4pm"
                  className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B7280]">Address / Location</label>
                <input value={kb.business.address} onChange={(e) => updateBusiness({ address: e.target.value })} onBlur={triggerAutoSave}
                  placeholder="Shop 5, Al Wasl Road, Dubai"
                  className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280]">Booking Policy</label>
              <textarea value={kb.business.bookingPolicy} onChange={(e) => updateBusiness({ bookingPolicy: e.target.value })} onBlur={triggerAutoSave}
                rows={3} placeholder="24-hour cancellation required. Deposits non-refundable. Walk-ins welcome subject to availability."
                className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B7280] mb-3 block">AI Tone</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "professional", label: "Professional", desc: "Formal and business-like" },
                  { value: "friendly",     label: "Friendly",     desc: "Warm and conversational" },
                  { value: "luxury",       label: "Luxury",       desc: "Elegant and exclusive" },
                ] as const).map((tone) => (
                  <button key={tone.value}
                    onClick={() => {
                      const next = { ...kbRef.current, business: { ...kbRef.current.business, tone: tone.value } };
                      setKb(next);
                      save(next).then(() => showToast("Saved ✓"));
                    }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      kb.business.tone === tone.value
                        ? "border-[#FF6B35] bg-[#FFF5F0]"
                        : "border-[#E5E7EB] hover:border-[#FF6B35]/40 hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <p className={`text-xs font-bold capitalize ${kb.business.tone === tone.value ? "text-[#FF6B35]" : "text-[#374151]"}`}>{tone.label}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5 leading-snug">{tone.desc}</p>
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
              <label className="text-xs font-medium text-[#6B7280]">Additional Knowledge</label>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5 mb-2">Policies, promotions, team info, brand voice — anything else your AI should know.</p>
              <textarea value={kb.extra} onChange={(e) => updateKb({ extra: e.target.value })} onBlur={triggerAutoSave}
                rows={7} placeholder="e.g. 'We use only vegan products.' or 'Senior discount: 15% off on Tuesdays.'"
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all resize-none" />
            </div>

            {/* Upload section */}
            <div className="border border-dashed border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#374151]">Upload document</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">PDF or image — we&apos;ll extract the text for review.</p>
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploadStatus === "uploading"}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors disabled:opacity-50">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5v6M3.5 4L6 1.5 8.5 4M1.5 9v1a.75.75 0 00.75.75h7.5A.75.75 0 0010.5 10V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {uploadStatus === "uploading" ? "Extracting…" : "Choose File"}
                </button>
              </div>

              {uploadStatus === "error" && (
                <p className="mt-3 text-xs text-red-500">Extraction failed — try a different file or paste the text manually.</p>
              )}

              {uploadStatus === "done" && extractedText && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#374151]">Extracted text — review before adding:</p>
                    <button onClick={() => { setExtractedText(""); setUploadStatus("idle"); }} className="text-[10px] text-[#9CA3AF] hover:text-[#6B7280]">Discard</button>
                  </div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 max-h-44 overflow-y-auto">
                    <pre className="text-xs text-[#374151] whitespace-pre-wrap font-sans">{extractedText}</pre>
                  </div>
                  <button onClick={appendExtracted}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                    Add to Knowledge Base
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
    </div>
  );
}
