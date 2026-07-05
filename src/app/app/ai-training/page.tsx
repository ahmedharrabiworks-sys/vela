"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

type ServiceRow = KnowledgeBase["services"][number];
type FaqRow     = KnowledgeBase["faqs"][number];

const EMPTY_SERVICE: ServiceRow = { name: "", price: "", duration: "", description: "" };
const EMPTY_FAQ: FaqRow         = { q: "", a: "" };

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

function computeCompleteness(kb: KnowledgeBase): number {
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

function CompletenessBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#16A34A" : pct >= 50 ? "#FF6B35" : "#DC2626";
  const label = pct >= 80 ? "Great — your AI is well-trained!" : pct >= 50 ? "Getting there…" : "Your AI needs more info";
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-[#111111]">AI Knowledge Score</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{label}</p>
        </div>
        <span className="text-3xl font-extrabold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-[#9CA3AF]">
        <span className={pct >= 17 ? "text-[#16A34A] font-semibold" : ""}>✓ Services</span>
        <span className={pct >= 33 ? "text-[#16A34A] font-semibold" : ""}>✓ FAQs</span>
        <span className={pct >= 50 ? "text-[#16A34A] font-semibold" : ""}>✓ Hours</span>
        <span className={pct >= 67 ? "text-[#16A34A] font-semibold" : ""}>✓ Address</span>
        <span className={pct >= 83 ? "text-[#16A34A] font-semibold" : ""}>✓ Policy</span>
        <span className={pct === 100 ? "text-[#16A34A] font-semibold" : ""}>✓ Extra</span>
      </div>
    </div>
  );
}

export default function AITrainingPage() {
  const [kb, setKb] = useState<KnowledgeBase>(DEFAULT_KB);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [extractedText, setExtractedText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ai-training")
      .then((r) => r.json())
      .then((data: KnowledgeBase) => { setKb({ ...DEFAULT_KB, ...data }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = useCallback(async (data: KnowledgeBase) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/ai-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateKb = (patch: Partial<KnowledgeBase>) => {
    setKb((prev) => ({ ...prev, ...patch }));
  };

  const updateBusiness = (patch: Partial<KnowledgeBase["business"]>) => {
    setKb((prev) => ({ ...prev, business: { ...prev.business, ...patch } }));
  };

  // Services
  const addService = () => updateKb({ services: [...kb.services, { ...EMPTY_SERVICE }] });
  const removeService = (i: number) => updateKb({ services: kb.services.filter((_, idx) => idx !== i) });
  const updateService = (i: number, patch: Partial<ServiceRow>) => {
    const next = kb.services.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    updateKb({ services: next });
  };

  // FAQs
  const addFaq = () => updateKb({ faqs: [...kb.faqs, { ...EMPTY_FAQ }] });
  const removeFaq = (i: number) => updateKb({ faqs: kb.faqs.filter((_, idx) => idx !== i) });
  const updateFaq = (i: number, patch: Partial<FaqRow>) => {
    const next = kb.faqs.map((f, idx) => idx === i ? { ...f, ...patch } : f);
    updateKb({ faqs: next });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("uploading");
    setExtractedText("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/ai-training/upload", { method: "POST", body: form });
      const data = await res.json() as { text?: string; error?: string };
      if (data.text) {
        setExtractedText(data.text);
        setUploadStatus("done");
      } else {
        setUploadStatus("error");
      }
    } catch {
      setUploadStatus("error");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const appendExtracted = () => {
    const sep = kb.extra.trim() ? "\n\n---\n\n" : "";
    updateKb({ extra: kb.extra + sep + extractedText });
    setExtractedText("");
    setUploadStatus("idle");
  };

  const pct = computeCompleteness(kb);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-20 animate-pulse">
        {[0,1,2,3].map((i) => <div key={i} className="h-40 bg-[#F3F4F6] rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Train Your AI</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">The more you tell your AI, the better it serves your customers.</p>
        </div>
        <button
          onClick={() => save(kb)}
          disabled={saving}
          className="shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {/* Completeness meter */}
      <CompletenessBar pct={pct} />

      {/* Section 1: Services & Prices */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#111111]">Services &amp; Prices</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Your AI will quote these prices and answer service questions.</p>
          </div>
          <button
            onClick={addService}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FFF5F0] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Service
          </button>
        </div>

        {kb.services.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[#9CA3AF]">No services yet — click "Add Service" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {kb.services.map((svc, i) => (
              <div key={i} className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                <div className="md:col-span-1">
                  <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Service Name *</label>
                  <input
                    type="text"
                    value={svc.name}
                    onChange={(e) => updateService(i, { name: e.target.value })}
                    placeholder="e.g. Haircut"
                    className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Price</label>
                  <input
                    type="text"
                    value={svc.price}
                    onChange={(e) => updateService(i, { price: e.target.value })}
                    placeholder="e.g. 150 AED"
                    className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Duration</label>
                  <input
                    type="text"
                    value={svc.duration}
                    onChange={(e) => updateService(i, { duration: e.target.value })}
                    placeholder="e.g. 45 min"
                    className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Description</label>
                    <input
                      type="text"
                      value={svc.description}
                      onChange={(e) => updateService(i, { description: e.target.value })}
                      placeholder="Short description"
                      className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                    />
                  </div>
                  <button
                    onClick={() => removeService(i)}
                    className="mb-0.5 p-2 text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.833 7.5a1 1 0 01-.995.9H4.328a1 1 0 01-.995-.9L2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: FAQs */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#111111]">FAQs</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Teach your AI how to answer common customer questions.</p>
          </div>
          <button
            onClick={addFaq}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-[#FF6B35] border border-[#FF6B35]/30 hover:bg-[#FFF5F0] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add FAQ
          </button>
        </div>

        {kb.faqs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[#9CA3AF]">No FAQs yet — add questions your customers frequently ask.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6]">
            {kb.faqs.map((faq, i) => (
              <div key={i} className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Question</label>
                  <input
                    type="text"
                    value={faq.q}
                    onChange={(e) => updateFaq(i, { q: e.target.value })}
                    placeholder="e.g. Do you offer home visits?"
                    className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Answer</label>
                    <input
                      type="text"
                      value={faq.a}
                      onChange={(e) => updateFaq(i, { a: e.target.value })}
                      placeholder="Your AI will say this exactly"
                      className="mt-1 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                    />
                  </div>
                  <button
                    onClick={() => removeFaq(i)}
                    className="mb-0.5 p-2 text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.833 7.5a1 1 0 01-.995.9H4.328a1 1 0 01-.995-.9L2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Business Info */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <p className="text-sm font-bold text-[#111111]">Business Info</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Your AI uses these to answer scheduling and policy questions.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#374151]">Working Hours</label>
              <input
                type="text"
                value={kb.business.hours}
                onChange={(e) => updateBusiness({ hours: e.target.value })}
                placeholder="e.g. Mon–Fri 9am–6pm, Sat 10am–4pm"
                className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151]">Address / Location</label>
              <input
                type="text"
                value={kb.business.address}
                onChange={(e) => updateBusiness({ address: e.target.value })}
                placeholder="e.g. Shop 5, Al Wasl Road, Dubai"
                className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#374151]">Booking Policy</label>
            <textarea
              value={kb.business.bookingPolicy}
              onChange={(e) => updateBusiness({ bookingPolicy: e.target.value })}
              rows={3}
              placeholder="e.g. 24-hour cancellation required. Deposits non-refundable. Walk-ins welcome subject to availability."
              className="mt-1.5 w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#374151]">AI Tone</label>
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {(["professional", "friendly", "luxury"] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => updateBusiness({ tone })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all capitalize ${
                    kb.business.tone === tone
                      ? "bg-[#FF6B35] text-white border-[#FF6B35]"
                      : "border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              {kb.business.tone === "professional" && "Formal, clear, and business-like."}
              {kb.business.tone === "friendly"     && "Warm, approachable, and conversational."}
              {kb.business.tone === "luxury"        && "Elegant, exclusive, and premium feel."}
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: Extra Knowledge */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <p className="text-sm font-bold text-[#111111]">Extra Knowledge</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Paste anything else your AI should know: policies, promotions, team info, brand voice.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <textarea
            value={kb.extra}
            onChange={(e) => updateKb({ extra: e.target.value })}
            rows={6}
            placeholder="Paste any extra context here — e.g. 'We use only vegan products.' or 'Senior discount: 15% off on Tuesdays.'"
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
          />

          {/* File upload */}
          <div className="border border-dashed border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#374151]">Upload document</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">PDF or image — we&apos;ll extract the text for review.</p>
              </div>
              <label className="shrink-0 cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5v7M4 5l3-3.5L10 5M2 10.5v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {uploadStatus === "uploading" ? "Extracting…" : "Choose File"}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadStatus === "uploading"}
                />
              </label>
            </div>

            {uploadStatus === "error" && (
              <p className="mt-3 text-xs text-red-500 font-medium">
                Extraction failed — try a different file or paste the text manually.
              </p>
            )}

            {uploadStatus === "done" && extractedText && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#374151]">Extracted text — review before adding:</p>
                  <button onClick={() => { setExtractedText(""); setUploadStatus("idle"); }} className="text-[10px] text-[#9CA3AF] hover:text-[#6B7280]">Discard</button>
                </div>
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-[#374151] whitespace-pre-wrap font-sans">{extractedText}</pre>
                </div>
                <button
                  onClick={appendExtracted}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
                >
                  Add to Knowledge Base
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end">
        <button
          onClick={() => save(kb)}
          disabled={saving}
          className="px-8 py-3 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}
