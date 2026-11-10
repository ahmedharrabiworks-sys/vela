"use client";
import Link from "next/link";

import { useState, useEffect, useRef, useCallback } from "react";
import { mergeImportedKnowledge, parseKnowledgeBase, type KnowledgeBase } from "@/lib/knowledge-base";
import { useI18n } from "@/lib/i18n";
import { summarizeWeek } from "@/components/dashboard/WeeklyHoursEditor";
import ServicesSheet from "@/components/dashboard/ServicesSheet";
import { displayPrice, normalizePrice, type BusinessCurrency } from "@/lib/business-currency";

type ServiceRow  = KnowledgeBase["services"][number];
type ImportState = "idle" | "importing" | "review" | "error" | "instagram";

const EMPTY_SERVICE: ServiceRow = { name: "", price: "", duration: "", description: "" };

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

// Real per-section completeness -- exposed individually (not just the
// aggregate percentage) so the checklist below can show a checkmark only
// for a section that genuinely has real saved data, never all-checked.
function computeChecklist(kb: KnowledgeBase): { key: string; labelKey: string; done: boolean }[] {
  return [
    { key: "services", labelKey: "agentUi.train.checkServices", done: kb.services.some((s) => s.name.trim()) },
    { key: "hours",    labelKey: "agentUi.train.checkHours",    done: !!kb.business.schedule?.some((day) => day.length > 0) },
    { key: "address",  labelKey: "agentUi.train.checkAddress",  done: !!kb.business.address.trim() },
    { key: "policy",   labelKey: "agentUi.train.checkPolicy",   done: !!kb.business.bookingPolicy.trim() },
    { key: "extra",    labelKey: "agentUi.train.checkExtra",    done: !!kb.extra.trim() },
  ];
}

function computeCompleteness(kb: KnowledgeBase): number {
  const checks = computeChecklist(kb);
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
}

function ProgressRing({ pct, scoreLabel, statusLabel }: { pct: number; scoreLabel: string; statusLabel: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#FF6B35" : "#DC2626";
  const trackColor = "#F3F4F6";
  return (
    <div className="flex items-center gap-2.5">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
        <circle cx="26" cy="26" r={r} fill="none" stroke={trackColor} strokeWidth="3.5"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 0.7s ease, stroke 0.3s" }}
        />
        <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <div>
        <p className="text-xs font-bold text-[#374151] ">{scoreLabel}</p>
        <p className="text-[11px] text-[#9CA3AF]">{statusLabel}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${done ? "text-[#374151] " : "text-[#D1D5DB] "}`}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0">
        <circle cx="6.5" cy="6.5" r="6" stroke={done ? "#16A34A" : "currentColor"} strokeWidth="1.2" fill={done ? "#16A34A" : "none"}/>
        {done && <path d="M4 6.5l1.8 1.8L9.5 4.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
      {label}
    </span>
  );
}


export default function AITrainingPage() {
  const { t, locale } = useI18n();
  const [kb, setKb]             = useState<KnowledgeBase>(DEFAULT_KB);
  const [loading, setLoading]   = useState(true);
  // Saving never hangs: every request has a timeout, and a failure says so.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt]     = useState<number | null>(null);
  // Prices are stored "80 QAR" and shown in the page language ("80 ر.ق" in Arabic).
  const [currency, setCurrency]   = useState<BusinessCurrency>("QAR");
  const [, setTick]               = useState(0);
  const [toast, setToast]       = useState("");

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [extractedText, setExtractedText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Round M6 FIX 6(b): customer-requested services not yet trained --
  // real queue from pending_service_requests, owner can dismiss or
  // confirm/add (with a real price + duration) directly from here.
  type PendingRequest = { id: string; serviceName: string; createdAt: string; leadName: string | null; leadPhone: string | null };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addPrice, setAddPrice] = useState("");
  const [addDuration, setAddDuration] = useState("");
  const [pendingBusy, setPendingBusy] = useState(false);
  // Round M7 FIX 3(b): confirmed via a real Supabase query that the server
  // write itself lands correctly, but the added service could still end up
  // permanently missing from what the owner sees -- the mount-time KB fetch
  // below (a separate, independent fetch, no ordering guarantee against
  // this flow's own update) can resolve AFTER a service is added and
  // silently overwrite it with what was on file before the add. Set
  // whenever kb changes via a real save/append so that late-resolving
  // fetch can detect it's now stale and skip applying itself.
  const kbMutatedRef = useRef(false);

  useEffect(() => {
    fetch("/api/pending-services")
      .then((r) => r.json())
      .then((data: { requests?: PendingRequest[] }) => setPendingRequests(data.requests ?? []))
      .catch(() => { /* honest empty state on failure -- never fake data */ });
  }, []);

  const dismissRequest = async (id: string) => {
    setPendingBusy(true);
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch("/api/pending-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "dismiss" }),
      });
    } finally {
      setPendingBusy(false);
    }
  };

  const confirmAddRequest = async (id: string) => {
    const price = addPrice.trim();
    const duration = addDuration.trim();
    if (!price || !duration) return;
    setPendingBusy(true);
    try {
      const res = await fetch("/api/pending-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "add", price, duration }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; service?: ServiceRow; error?: string };
      if (res.ok && data.service) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== id));
        setAddingId(null);
        setAddPrice("");
        setAddDuration("");
        // Round M7 FIX 3(b): append the server's own confirmed service
        // object LOCALLY instead of re-fetching the whole KB -- a refetch
        // here raced against the page's own mount-time KB fetch (below) and
        // could be silently overwritten if that one resolved later. Marking
        // kbMutatedRef also protects against that specific race directly.
        kbMutatedRef.current = true;
        setKb((prev) => ({ ...prev, services: [...prev.services, data.service as ServiceRow] }));
        showToast(t("aiTraining.saved"));
      } else {
        showToast(data.error || "Couldn't add that service. Please try again.");
      }
    } finally {
      setPendingBusy(false);
    }
  };

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
      .then((data: unknown) => {
        let loaded = parseKnowledgeBase(data);
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
        // Round M7 FIX 3(b): this fetch was already in flight before the
        // Requested Services panel could possibly be interacted with, but a
        // slow/contended network round-trip has no ordering guarantee
        // against that flow's own (faster) local append -- if a real kb
        // mutation already landed while this was still pending, applying
        // this now-stale snapshot would silently discard it.
        const cur = (data as { currency?: BusinessCurrency } | null)?.currency;
        if (cur) setCurrency(cur);
        if (!kbMutatedRef.current) setKb(loaded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // Train your AI edits Services only; business info lives in the Knowledge
  // Base. Every save starts from the latest saved copy, so it can never undo
  // an edit made there, and every save ends: a timeout, and errors are shown
  // (the old buttons could sit on "Saving..." forever if a request stalled,
  // and showed "Saved" even when the server said no).
  const persist = useCallback(async (change: (latest: KnowledgeBase) => KnowledgeBase, keepLocalServices = true): Promise<boolean> => {
    setSaveState("saving");
    kbMutatedRef.current = true;
    try {
      const latestRes = await fetch("/api/ai-training", { signal: AbortSignal.timeout(15000) });
      if (!latestRes.ok) throw new Error("load");
      const next = change(parseKnowledgeBase(await latestRes.json()));
      const res = await fetch("/api/ai-training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next), signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error("save");
      setKb((prev) => (keepLocalServices ? { ...next, services: prev.services } : next));
      setSaveState("saved");
      setSavedAt(Date.now());
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }, []);

  const saveServices = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = null;
    const services = kbRef.current.services;
    return persist((latest) => ({ ...latest, services }));
  }, [persist]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void saveServices(); }, 2000);
  }, [saveServices]);

  // "Saved · just now" stays honest as time passes.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // The assistant ("5 quick questions") or another tab may change business info.
  useEffect(() => {
    const refresh = () => {
      fetch("/api/ai-training").then((r) => (r.ok ? r.json() : null)).then((data: unknown) => {
        if (!data) return;
        const latest = parseKnowledgeBase(data);
        setKb((prev) => ({ ...latest, services: autoSaveTimer.current ? prev.services : latest.services }));
      }).catch(() => {});
    };
    window.addEventListener("vela-kb-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("vela-kb-changed", refresh); window.removeEventListener("focus", refresh); };
  }, []);

  const updateKb = (patch: Partial<KnowledgeBase>) =>
    setKb((prev) => ({ ...prev, ...patch }));


  const addService    = () => updateKb({ services: [...kb.services, { ...EMPTY_SERVICE }] });
  const removeService = (i: number) => {
    const services = kbRef.current.services.filter((_, idx) => idx !== i);
    setKb((prev) => ({ ...prev, services }));
    void persist((latest) => ({ ...latest, services }));
  };
  const duplicateService = (i: number) => {
    const services = [...kbRef.current.services.slice(0, i + 1), { ...kbRef.current.services[i] }, ...kbRef.current.services.slice(i + 1)];
    setKb((prev) => ({ ...prev, services }));
    void persist((latest) => ({ ...latest, services }));
  };
  // "40" becomes "40 QAR" (or "40 ر.ق") as soon as the owner leaves the cell.
  const priceBlur = (i: number) => {
    const raw = kbRef.current.services[i]?.price ?? "";
    if (raw.trim()) updateService(i, { price: normalizePrice(raw, currency) });
    triggerAutoSave();
  };
  const updateService = (i: number, patch: Partial<ServiceRow>) =>
    setKb((prev) => ({ ...prev, services: prev.services.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));

  // FIX 7 (round M): real root cause of "image paste -> extract services ->
  // save" never landing -- an uploaded IMAGE was always vision-extracted
  // correctly server-side, but the result only ever became a free-text blob
  // appended to "extra" (appendExtracted below), never real structured
  // kb.services entries. The upload route now returns the same structured
  // KnowledgeBase shape the proven text/URL import path already returns
  // (see /api/ai-training/import) -- routed into that SAME review flow
  // (importedKb/importState/acceptImport) instead of a separate, weaker
  // text-only path. PDFs keep the existing raw-text extraction (that route
  // branch is unchanged) since PDF price lists are often less reliably
  // structurable and this fix is scoped to the specifically reported image
  // case.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.toLowerCase().startsWith("image/");
    setUploadStatus("uploading");
    setExtractedText("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/ai-training/upload", { method: "POST", body: form });
      const data = await res.json() as { text?: string; kb?: KnowledgeBase; error?: string };
      if (isImage) {
        if (data.kb) {
          setUploadStatus("idle");
          setImportedKb(data.kb);
          setImportState("review");
        } else {
          setUploadStatus("error");
        }
      } else if (data.text) {
        setExtractedText(data.text);
        setUploadStatus("done");
      } else {
        setUploadStatus("error");
      }
    } catch { setUploadStatus("error"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const appendExtracted = () => {
    const text = extractedText;
    setExtractedText("");
    setUploadStatus("idle");
    // Price list text goes into the Knowledge Base notes.
    persist((latest) => ({ ...latest, extra: latest.extra + (latest.extra.trim() ? "\n\n---\n\n" : "") + text }), false).then((ok) => { if (ok) showToast(t("aiTraining.saved")); });
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
    // Same no-loss merge as the Knowledge Base tab: existing services stay.
    const incoming = { ...parseKnowledgeBase(importedKb), faqs: [], extra: importedExtra };
    if (!(await persist((latest) => mergeImportedKnowledge(latest, incoming), false))) return;
    showToast(t("aiTraining.savedImported"));
    setImportState("idle");
    setImportedKb(null);
    setImportInput("");
  };

  const pct = computeCompleteness(kb);
  const checklist = computeChecklist(kb);
  const statusLabel = pct >= 80 ? t("aiTraining.wellTrained") : pct >= 50 ? t("aiTraining.gettingThere") : t("aiTraining.needsInfo");

  const SpinnerIcon = () => (
    <svg className="animate-spin" width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1v1.5M5.5 8.5V10M1 5.5h1.5M8.5 5.5H10M2.2 2.2l1.06 1.06M7.74 7.74l1.06 1.06M2.2 8.8l1.06-1.06M7.74 3.26l1.06-1.06" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 pb-20 animate-pulse">
        <div className="h-14 bg-[#F3F4F6] rounded-xl" />
        <div className="h-16 bg-[#F3F4F6] rounded-xl" />
        <div className="h-12 bg-[#F3F4F6] rounded-xl" />
        <div className="h-64 bg-[#F3F4F6] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111] ">{t("aiTraining.title")}</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{t("aiTraining.subtitle")}</p>
        </div>
        <SaveStatus state={saveState} savedAt={savedAt} t={t} onRetry={() => { void saveServices(); }} />
      </div>

      {/* AI Score and import, one compact bar */}
      <div className="mb-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
          <div className="flex items-center gap-4 flex-wrap lg:w-[48%] shrink-0">
            <ProgressRing pct={pct} scoreLabel={t("aiTraining.aiScore")} statusLabel={statusLabel} />
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
              {checklist.map((c) => <ChecklistItem key={c.key} label={t(c.labelKey)} done={c.done} />)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && importState !== "importing" && handleImport()}
                placeholder={t("aiTraining.importPlaceholder")}
                className="w-full text-sm !rounded-lg ps-3.5 pe-[7rem] h-11 border border-[#E5E7EB] bg-white text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
              />
              <button
                onClick={handleImport}
                disabled={!importInput.trim() || importState === "importing"}
                className="absolute end-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3.5 h-9 rounded-md text-xs font-bold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}
              >
                {importState === "importing" ? <><SpinnerIcon /> {t("aiTraining.analyzing")}</> : t("aiTraining.importBtn")}
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} disabled={uploadStatus === "uploading"} />
            <p className="text-xs text-[#9CA3AF] mt-1.5">
              {t("aiTraining.or")}{" "}
              <button type="button" onClick={() => fileRef.current?.click()} className="min-h-[32px] text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">{t("aiTraining.uploadPriceList")}</button>
              {" · " + t("aiTraining.or") + " "}
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("vela-start-interview"))} className="min-h-[32px] text-[#6B7280] hover:text-[#FF6B35] underline underline-offset-2 transition-colors">{t("aiTraining.answerQuestions")}</button>
            </p>
          </div>
        </div>

        {importState === "instagram" && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#7C3AED" strokeWidth="1.2"/><path d="M7 4v3.5L9 9" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <p className="text-xs text-purple-700 flex-1">{t("aiTraining.instagramSoon")}</p>
            <button onClick={() => { setImportState("idle"); setImportInput(""); }} className="text-purple-300 hover:text-purple-500 ">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}

        {importState === "error" && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="6" stroke="#DC2626" strokeWidth="1.2"/><path d="M7 4.5v3M7 9.5v.5" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <p className="text-xs text-red-700 flex-1">{importError}</p>
            <button onClick={() => setImportState("idle")} className="text-red-300 hover:text-red-500 ">
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
                        {s.price && <span dir="auto" className="text-[#FF6B35] font-bold">{displayPrice(normalizePrice(s.price, currency), locale)}</span>}
                      </div>
                    ))}
                    {importedKb.services.length > 5 && <p className="text-[11px] text-[#9CA3AF] ps-1">+{importedKb.services.length - 5}{t("aiTraining.moreCount")}</p>}
                  </div>
                </div>
              )}
              {(importedKb.faqs.length > 0 || importedKb.extra) && (
                <div>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">{t("aiTraining.reviewExtraInfo")}</p>
                  {importedKb.faqs.length > 0 && (
                    <div className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-[#374151]">
                      {t("agentUi.train.faqsToExtra").replace("{n}", String(importedKb.faqs.length))}
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
              <button onClick={acceptImport} disabled={saveState === "saving"}
                className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}>
                {saveState === "saving" ? t("common.saving") : t("aiTraining.saveBtn")}
              </button>
              <button onClick={() => { setImportState("idle"); setImportedKb(null); }}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                {t("aiTraining.discardBtn")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Requested services, real customer requests for services not yet
          trained (Round M6 FIX 6b). Own the price prompt: name comes
          straight from the customer's own request, price is the one real
          field the AI doesn't have. ── */}
      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-amber-100 ">
            <p className="text-sm font-bold text-[#111111] ">{t("aiTraining.requestedServices.title")}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{t("aiTraining.requestedServices.subtitle")}</p>
          </div>
          <div className="divide-y divide-amber-100 ">
            {pendingRequests.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111111] truncate">{r.serviceName}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {r.leadName || t("dashboard.unknown")}{r.leadPhone ? ` · ${r.leadPhone}` : ""}
                    </p>
                  </div>
                  {addingId !== r.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => dismissRequest(r.id)} disabled={pendingBusy}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50">
                        {t("aiTraining.requestedServices.dismiss")}
                      </button>
                      <button onClick={() => { setAddingId(r.id); setAddPrice(""); setAddDuration(""); }} disabled={pendingBusy}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ background: "var(--vela-gradient)" }}>
                        {t("aiTraining.requestedServices.addAsService")}
                      </button>
                    </div>
                  )}
                </div>
                {addingId === r.id && (
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <input value={addPrice} onChange={(e) => setAddPrice(e.target.value)}
                      placeholder={t("aiTraining.services.pricePlaceholder")} autoFocus
                      className="flex-1 min-w-[90px] text-sm border border-[#E5E7EB] bg-white rounded-lg px-3 py-1.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                    <input value={addDuration} onChange={(e) => setAddDuration(e.target.value)}
                      placeholder={t("aiTraining.services.durationPlaceholder")}
                      className="flex-1 min-w-[90px] text-sm border border-[#E5E7EB] bg-white rounded-lg px-3 py-1.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]" />
                    <button onClick={() => confirmAddRequest(r.id)} disabled={pendingBusy || !addPrice.trim() || !addDuration.trim()}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                      style={{ background: "var(--vela-gradient)" }}>
                      {t("aiTraining.requestedServices.confirm")}
                    </button>
                    <button onClick={() => setAddingId(null)} disabled={pendingBusy}
                      className="text-xs font-semibold px-2 py-1.5 text-[#9CA3AF] hover:text-[#6B7280] transition-colors shrink-0">
                      {t("common.cancel")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price list files land in the Knowledge Base notes, after review. */}
      {uploadStatus !== "idle" && (
        <div className="bg-white rounded-xl mt-4">
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
                <p className="mt-3 text-xs text-red-500 ">{t("aiTraining.extra.extractionFailed")}</p>
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

      {/* ── Services first: the one thing edited here ── */}
      <h2 className="text-sm font-bold text-[#111111] mb-2">{t("aiTraining.tabs.services")}</h2>
      <ServicesSheet
        services={kb.services}
        locale={locale}
        t={t}
        onEdit={updateService}
        onBlur={triggerAutoSave}
        onPriceBlur={priceBlur}
        onAdd={addService}
        onDuplicate={duplicateService}
        onDelete={removeService}
      />

      {/* Business info lives in the Knowledge Base: a collapsed summary with Edit links. */}
      <BusinessInfoCard kb={kb} locale={locale} t={t} />

      {/* Auto-save toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#111111] text-white text-xs font-semibold rounded-full shadow-xl flex items-center gap-2 pointer-events-none" style={{ bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {toast}
        </div>
      )}

    </div>
  );
}

/** Autosave status instead of Save buttons: "Saved · just now" or "Couldn't save · Retry". */
function SaveStatus({ state, savedAt, t, onRetry }: { state: "idle" | "saving" | "saved" | "error"; savedAt: number | null; t: (key: string) => string; onRetry: () => void }) {
  if (state === "idle") return <p className="text-xs text-[#9CA3AF] shrink-0 pt-1">{t("agentUi.train.autosaveOn")}</p>;
  if (state === "saving") return <p data-testid="save-status" className="text-xs text-[#6B7280] shrink-0 pt-1">{t("common.saving")}</p>;
  if (state === "error") {
    return (
      <p data-testid="save-status" role="alert" className="text-xs text-red-600 shrink-0 pt-1">
        {t("agentUi.train.saveFailed")} · <button type="button" onClick={onRetry} className="font-semibold underline min-h-[44px] sm:min-h-0">{t("agentUi.train.retry")}</button>
      </p>
    );
  }
  const mins = savedAt ? Math.floor((Date.now() - savedAt) / 60_000) : 0;
  const when = mins < 1 ? t("agentUi.train.justNow") : t("agentUi.train.minutesAgo").replace("{n}", String(mins));
  return <p data-testid="save-status" className="text-xs text-[#6B7280] shrink-0 pt-1">{t("agentUi.train.savedAt").replace("{when}", when)}</p>;
}

const INFO_OPEN_KEY = "vela_train_info_open";

/** Hours, address, policy, tone and notes are edited in the Knowledge Base only. */
function BusinessInfoCard({ kb, locale, t }: { kb: KnowledgeBase; locale: string; t: (key: string) => string }) {
  const KB = "/app/ai-agent/knowledge-base";
  const firstLines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 2).join(" · ");
  const toneKey: Record<string, string> = { professional: "aiTraining.businessInfo.toneProfessional", friendly: "aiTraining.businessInfo.toneFriendly", luxury: "aiTraining.businessInfo.toneLuxury" };
  const chips = [
    { key: "hours", label: t("aiTraining.businessInfo.hours"), value: kb.business.schedule?.some((d) => d.length > 0) ? summarizeWeek(kb.business.schedule, locale, t("appointmentsV2.day.to"), t("agentUi.kb.closedDay")) : "" },
    { key: "address", label: t("aiTraining.businessInfo.address"), value: kb.business.address.trim() },
    { key: "policy", label: t("aiTraining.businessInfo.bookingPolicy"), value: kb.business.bookingPolicy.trim() },
    { key: "tone", label: t("aiTraining.businessInfo.tone"), value: kb.business.tone && toneKey[kb.business.tone] ? t(toneKey[kb.business.tone]) : "" },
    { key: "notes", label: t("agentUi.train.extraKnowledge"), value: firstLines(kb.extra) },
  ];
  // Collapsed by default; the choice is remembered on this device.
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(INFO_OPEN_KEY) === "1"); } catch { /* private mode */ } }, []);
  const toggle = () => setOpen((v) => { try { localStorage.setItem(INFO_OPEN_KEY, v ? "0" : "1"); } catch { /* private mode */ } return !v; });
  const short: Record<string, string> = { hours: "agentUi.train.checkHours", address: "agentUi.train.checkAddress", policy: "agentUi.train.checkPolicy", tone: "agentUi.train.chipTone", notes: "agentUi.train.checkExtra" };
  return (
    <section data-testid="business-info-card" data-open={open ? "true" : "false"} className="bg-white border border-[#E5E7EB] rounded-xl mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <h2 className="text-sm font-bold text-[#111111]">{t("agentUi.train.businessInfo")}</h2>
        <ul className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0" aria-label={t("agentUi.train.businessInfo")}>
          {chips.map((c) => (
            <li key={c.key} data-testid={`info-chip-${c.key}`} data-done={c.value ? "true" : "false"} className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium ${c.value ? "bg-green-50 text-green-700" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">{c.value ? <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />}</svg>
              {t(short[c.key])}
            </li>
          ))}
        </ul>
        <button type="button" data-testid="info-toggle" aria-expanded={open} onClick={toggle} className="text-xs font-semibold text-[#C2410C] hover:underline min-h-[44px] sm:min-h-[32px] ms-auto">
          {t(open ? "agentUi.train.hideDetails" : "agentUi.train.showDetails")}
        </button>
      </div>
      {open && (
      <div className="px-4 pb-3 border-t border-[#F3F4F6]">
      <p className="text-xs text-[#9CA3AF] pt-2.5">{t("agentUi.train.businessInfoHint")}</p>
      <ul className="divide-y divide-[#F3F4F6]">
        {chips.map((c) => (
          <li key={c.key}>
            <Link href={`${KB}#kb-${c.key}`} data-testid={`info-${c.key}`} className="group flex items-start justify-between gap-3 min-h-[44px] py-2.5 hover:bg-[#FAFAFA] -mx-2 px-2 rounded-lg transition-colors">
              <span className="min-w-0 text-sm leading-relaxed">
                <span className="block text-xs font-medium text-[#6B7280]">{c.label}</span>
                {c.value
                  ? <span dir="auto" className="block text-[#111111] [overflow-wrap:anywhere] line-clamp-2">{c.value}</span>
                  : <span className="block text-[#9CA3AF]">{t("agentUi.train.notAdded")}</span>}
              </span>
              <span className="text-xs font-semibold text-[#C2410C] shrink-0 self-center group-hover:underline">{t(c.value ? "agentUi.train.edit" : "agentUi.train.add")}</span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
      )}
    </section>
  );
}
