"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  EMPTY_KB, applySuggestion, knowledgeChecklist, parseKnowledgeBase,
  type KbService, type KnowledgeBase, type SuggestedFact,
} from "@/lib/knowledge-base";
import { Chips, PageHead, SaveButton, Section, areaCls, fieldCls, labelCls, quietBtnCls } from "@/components/dashboard/AgentUI";

type Suggestion = SuggestedFact & { id: string; source: "conversation" | "call" | "assistant" };
type PendingRequest = { id: string; serviceName: string; leadName: string | null; leadPhone: string | null };
type AnalysisResult = { label: string; ok: boolean; message: string };

// FAQs from older imports are shown and kept as notes.
function foldFaqs(kb: KnowledgeBase): KnowledgeBase {
  if (kb.faqs.length === 0) return kb;
  const lines = kb.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
  return { ...kb, faqs: [], extra: kb.extra.trim() ? `${kb.extra.trim()}\n\n${lines}` : lines };
}

export default function KnowledgeBaseEditor() {
  const { t } = useI18n();
  const [kb, setKb] = useState<KnowledgeBase>(EMPTY_KB);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addPrice, setAddPrice] = useState("");
  const [addDuration, setAddDuration] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [website, setWebsite] = useState("");
  const [social, setSocial] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ai-training");
    if (res.ok) setKb(foldFaqs(parseKnowledgeBase(await res.json())));
  }, []);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
    fetch("/api/knowledge-suggestions").then((r) => r.json())
      .then((d: { suggestions?: Suggestion[] }) => setSuggestions(d.suggestions ?? [])).catch(() => {});
    fetch("/api/pending-services").then((r) => r.json())
      .then((d: { requests?: PendingRequest[] }) => setRequests(d.requests ?? [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (next: (prev: KnowledgeBase) => KnowledgeBase) => {
    setKb(next);
    setDirty(true);
    setSaved(false);
  };
  const editBusiness = (patch: Partial<KnowledgeBase["business"]>) =>
    edit((p) => ({ ...p, business: { ...p.business, ...patch } }));

  const persist = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      // Services are edited in Train your AI: always send the latest saved list,
      // so a save here can never undo a change made there.
      const latest = await fetch("/api/ai-training");
      const services = latest.ok ? parseKnowledgeBase(await latest.json()).services : kb.services;
      const clean = { ...kb, services: services.filter((s) => s.name.trim()) };
      const res = await fetch("/api/ai-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      });
      if (!res.ok) throw new Error("save");
      setKb(clean);
      setDirty(false);
      setSaved(true);
      return true;
    } catch {
      setError(t("agentUi.common.saveError"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const decide = async (s: Suggestion, action: "approve" | "reject") => {
    setBusyId(s.id);
    try {
      const res = await fetch("/api/knowledge-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, action }),
      });
      if (!res.ok) throw new Error("decide");
      setSuggestions((p) => p.filter((x) => x.id !== s.id));
      // Already saved on the server; unsaved edits in the form stay as they are.
      if (action === "approve") setKb((p) => applySuggestion(p, s));
    } catch {
      setError(t("agentUi.common.saveError"));
    }
    setBusyId(null);
  };

  const dismissRequest = async (id: string) => {
    setRequests((p) => p.filter((r) => r.id !== id));
    await fetch("/api/pending-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "dismiss" }),
    }).catch(() => {});
  };

  const addRequest = async (id: string) => {
    if (!addPrice.trim() || !addDuration.trim()) return;
    setBusyId(id);
    const res = await fetch("/api/pending-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "add", price: addPrice.trim(), duration: addDuration.trim() }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { service?: KbService } | undefined;
    if (res?.ok && data?.service) {
      const service = data.service;
      setRequests((p) => p.filter((r) => r.id !== id));
      setAddingId(null);
      setKb((p) => ({ ...p, services: [...p.services, service] }));
    } else {
      setError(t("agentUi.common.saveError"));
    }
    setBusyId(null);
  };

  const canAnalyze = !!file || !!website.trim() || !!social.trim();

  const analyze = async () => {
    if (!canAnalyze) return;
    // The merge happens on the server, so typed edits have to land first.
    if (dirty && !(await persist())) return;
    setAnalyzing(true);
    const out: AnalysisResult[] = [];
    const merge = (incoming: Partial<KnowledgeBase>) =>
      fetch("/api/ai-training?merge=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...EMPTY_KB, ...incoming }),
      }).then((r) => r.ok).catch(() => false);

    if (file) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/ai-training/upload", { method: "POST", body: fd });
        const data = await res.json() as { text?: string; kb?: KnowledgeBase; error?: string };
        const incoming = data.kb ?? (data.text ? { extra: data.text } : null);
        if (res.ok && incoming) {
          const ok = await merge(incoming);
          out.push({ label: file.name, ok, message: t(ok ? "agentUi.kb.resultAdded" : "agentUi.kb.resultSaveFailed") });
        } else {
          out.push({ label: file.name, ok: false, message: data.error ?? t("agentUi.kb.resultFileFailed") });
        }
      } catch {
        out.push({ label: file.name, ok: false, message: t("agentUi.kb.resultFileFailed") });
      }
    }

    for (const url of [website.trim(), social.trim()].filter(Boolean)) {
      try {
        const res = await fetch("/api/ai-training/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: url }),
        });
        const data = await res.json() as { kb?: KnowledgeBase; instagram?: boolean; error?: string };
        if (data.instagram) {
          out.push({ label: url, ok: false, message: t("agentUi.kb.resultSocial") });
        } else if (res.ok && data.kb) {
          const ok = await merge(data.kb);
          out.push({ label: url, ok, message: t(ok ? "agentUi.kb.resultAdded" : "agentUi.kb.resultSaveFailed") });
        } else {
          out.push({ label: url, ok: false, message: data.error ?? t("agentUi.kb.resultLinkFailed") });
        }
      } catch {
        out.push({ label: url, ok: false, message: t("agentUi.kb.resultLinkFailed") });
      }
    }

    await load().catch(() => {});
    setDirty(false);
    setResults(out);
    setFile(null);
    setWebsite("");
    setSocial("");
    if (fileRef.current) fileRef.current.value = "";
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  const checklist = knowledgeChecklist(kb);
  const onThisPage = [checklist.hours, checklist.address, checklist.policy, checklist.extra];
  const filled = onThisPage.filter(Boolean).length;
  const sourceLabel = { conversation: t("agentUi.kb.sourceConversation"), call: t("agentUi.kb.sourceCall"), assistant: t("agentUi.kb.sourceAssistant") };

  return (
    <div className="max-w-5xl mx-auto pb-16 2xl:pb-0">
      <PageHead
        title={t("agentUi.kb.title")}
        subtitle={t("agentUi.kb.subtitle")}
        aside={<p className="hidden sm:block text-xs text-[#9CA3AF] whitespace-nowrap">{t("agentUi.kb.progress").replace("{n}", String(filled)).replace("{total}", String(onThisPage.length))}</p>}
      />

      <div className="space-y-4">
        {suggestions.length > 0 && (
          <Section title={t("agentUi.kb.suggested")} hint={t("agentUi.kb.suggestedHint")}>
            <ul className="divide-y divide-[#F3F4F6]">
              {suggestions.map((s) => (
                <li key={s.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="min-w-0">
                    <p dir="auto" className="text-sm text-[#111111] leading-relaxed text-start">{s.fact}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{sourceLabel[s.source]}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" disabled={busyId === s.id} onClick={() => decide(s, "approve")} className="btn-primary h-9 px-4 text-sm disabled:opacity-60">{t("agentUi.kb.approve")}</button>
                    <button type="button" disabled={busyId === s.id} onClick={() => decide(s, "reject")} className={`${quietBtnCls} !h-9`}>{t("agentUi.kb.reject")}</button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {requests.length > 0 && (
          <Section title={t("aiTraining.requestedServices.title")} hint={t("aiTraining.requestedServices.subtitle")}>
            <ul className="divide-y divide-[#F3F4F6]">
              {requests.map((r) => (
                <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-[#111111] truncate">{r.serviceName}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">{r.leadName || t("dashboard.unknown")}{r.leadPhone ? <span dir="ltr"> · {r.leadPhone}</span> : null}</p>
                    </div>
                    {addingId !== r.id && (
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => { setAddingId(r.id); setAddPrice(""); setAddDuration(""); }} className="btn-primary h-9 px-4 text-sm">{t("aiTraining.requestedServices.addAsService")}</button>
                        <button type="button" onClick={() => dismissRequest(r.id)} className={`${quietBtnCls} !h-9`}>{t("aiTraining.requestedServices.dismiss")}</button>
                      </div>
                    )}
                  </div>
                  {addingId === r.id && (
                    <div className="grid grid-cols-2 sm:flex gap-2 mt-3">
                      <input value={addPrice} onChange={(e) => setAddPrice(e.target.value)} aria-label={t("agentUi.kb.price")} placeholder={t("agentUi.kb.price")} className={fieldCls} autoFocus />
                      <input value={addDuration} onChange={(e) => setAddDuration(e.target.value)} aria-label={t("agentUi.kb.duration")} placeholder={t("agentUi.kb.duration")} className={fieldCls} />
                      <button type="button" disabled={busyId === r.id || !addPrice.trim() || !addDuration.trim()} onClick={() => addRequest(r.id)} className="btn-primary h-10 px-4 text-sm disabled:opacity-60">{t("aiTraining.requestedServices.confirm")}</button>
                      <button type="button" onClick={() => setAddingId(null)} className={quietBtnCls}>{t("common.cancel")}</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Section title={t("agentUi.kb.details")}>
              <div className="space-y-3">
                <div>
                  <label htmlFor="kb-hours" className={labelCls}>{t("agentUi.kb.hours")}</label>
                  <input id="kb-hours" value={kb.business.hours} onChange={(e) => editBusiness({ hours: e.target.value })} placeholder={t("agentUi.kb.hoursPlaceholder")} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="kb-address" className={labelCls}>{t("agentUi.kb.address")}</label>
                  <input id="kb-address" value={kb.business.address} onChange={(e) => editBusiness({ address: e.target.value })} placeholder={t("agentUi.kb.addressPlaceholder")} className={fieldCls} />
                </div>
                <div>
                  <label htmlFor="kb-policy" className={labelCls}>{t("agentUi.kb.policy")}</label>
                  <textarea id="kb-policy" rows={2} value={kb.business.bookingPolicy} onChange={(e) => editBusiness({ bookingPolicy: e.target.value })} placeholder={t("agentUi.kb.policyPlaceholder")} className={areaCls} />
                </div>
                <div>
                  <p className={labelCls}>{t("agentUi.kb.tone")}</p>
                  <Chips
                    label={t("agentUi.kb.tone")}
                    value={kb.business.tone}
                    onChange={(tone) => editBusiness({ tone })}
                    options={[
                      { value: "professional", label: t("agentUi.kb.toneProfessional") },
                      { value: "friendly", label: t("agentUi.kb.toneFriendly") },
                      { value: "luxury", label: t("agentUi.kb.toneLuxury") },
                    ]}
                  />
                </div>
              </div>
            </Section>

          <Section title={t("agentUi.kb.additional")} hint={t("agentUi.kb.additionalHint")}>
            <div className="space-y-3">
              <div>
                <p className={labelCls}>{t("agentUi.kb.file")}</p>
                <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" aria-label={t("agentUi.kb.file")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className={`${quietBtnCls} shrink-0`}>{t("agentUi.kb.chooseFile")}</button>
                  <span className="text-xs text-[#9CA3AF] truncate">{file ? file.name : t("agentUi.kb.noFile")}</span>
                </div>
              </div>
              <div>
                <label htmlFor="kb-website" className={labelCls}>{t("agentUi.kb.website")}</label>
                <input id="kb-website" dir="ltr" type="url" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={`${fieldCls} text-start`} />
              </div>
              <div>
                <label htmlFor="kb-social" className={labelCls}>{t("agentUi.kb.social")}</label>
                <input id="kb-social" dir="ltr" type="url" inputMode="url" value={social} onChange={(e) => setSocial(e.target.value)} placeholder="https://" className={`${fieldCls} text-start`} />
              </div>
              <button type="button" onClick={analyze} disabled={!canAnalyze || analyzing} className={`${quietBtnCls} w-full`}>
                {analyzing ? t("agentUi.kb.analyzing") : t("agentUi.kb.analyze")}
              </button>
              {results.length > 0 && (
                <ul className="space-y-1.5">
                  {results.map((r, i) => (
                    <li key={i} className={`text-xs leading-relaxed [overflow-wrap:anywhere] ${r.ok ? "text-[#374151]" : "text-red-600"}`}>
                      <span dir="auto">{r.label}</span>: {r.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

        <Section title={t("agentUi.kb.notes")} hint={t("agentUi.kb.notesHint")}>
          <textarea aria-label={t("agentUi.kb.notes")} rows={11} value={kb.extra} onChange={(e) => edit((p) => ({ ...p, extra: e.target.value }))} placeholder={t("agentUi.kb.notesPlaceholder")} className={areaCls} />
        </Section>
      </div>

      <SaveButton
        saving={saving}
        dirty={dirty}
        justSaved={saved}
        error={error}
        onSave={persist}
        label={t("agentUi.common.save")}
        savingLabel={t("agentUi.common.saving")}
        savedLabel={t("agentUi.common.saved")}
      />
    </div>
  );
}
