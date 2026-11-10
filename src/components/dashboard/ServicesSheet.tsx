"use client";

import { useEffect, useRef, useState } from "react";
import type { KnowledgeBase } from "@/lib/knowledge-base";
import { displayPrice } from "@/lib/business-currency";

type Service = KnowledgeBase["services"][number];

// A clean sheet: borderless cells that look like text until focused, numbers
// aligned to the end, one line per service, a row menu, and an add row.
const CELL = "w-full min-w-0 bg-transparent rounded-md px-2 h-9 text-sm text-[#111111] placeholder-[#B6BCC6] outline-none hover:bg-black/[0.025] focus:bg-white focus:ring-2 focus:ring-[#FF6B35]/25 transition-colors";
const COLS = "sm:grid sm:grid-cols-[minmax(0,1.1fr)_112px_96px_minmax(0,1.6fr)_40px] sm:items-center sm:gap-1";

function RowMenu({ t, onEdit, onDuplicate, onDelete }: { t: (k: string) => string; onEdit: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const item = "w-full text-start px-3 min-h-[40px] text-sm hover:bg-[#F9FAFB] transition-colors";
  return (
    <div ref={root} className="relative flex justify-end">
      <button type="button" data-testid="service-menu" aria-label={t("agentUi.train.rowMenu")} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-black/[0.04] sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 aria-expanded:opacity-100 transition-opacity">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><circle cx="3" cy="7" r="1.3" /><circle cx="7" cy="7" r="1.3" /><circle cx="11" cy="7" r="1.3" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute z-30 top-full mt-1 end-0 w-40 rounded-lg border border-black/[0.08] bg-white shadow-lg py-1">
          <button type="button" role="menuitem" className={`${item} text-[#374151]`} onClick={() => { setOpen(false); onEdit(); }}>{t("agentUi.train.edit")}</button>
          <button type="button" role="menuitem" data-testid="service-duplicate" className={`${item} text-[#374151]`} onClick={() => { setOpen(false); onDuplicate(); }}>{t("agentUi.train.duplicate")}</button>
          <button type="button" role="menuitem" data-testid="service-delete" className={`${item} text-red-600`} onClick={() => { setOpen(false); onDelete(); }}>{t("agentUi.train.delete")}</button>
        </div>
      )}
    </div>
  );
}

export default function ServicesSheet({ services, locale, t, onEdit, onBlur, onPriceBlur, onAdd, onDuplicate, onDelete }: {
  services: Service[];
  locale: string;
  t: (k: string) => string;
  onEdit: (i: number, patch: Partial<Service>) => void;
  onBlur: () => void;
  onPriceBlur: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const focusRow = (i: number) => setTimeout(() => sheet.current?.querySelectorAll<HTMLInputElement>("[data-service-name]")[i]?.focus(), 30);
  const add = () => { onAdd(); focusRow(services.length); };

  return (
    <div ref={sheet} data-testid="services-sheet" className="bg-white border border-[#E5E7EB] rounded-xl">
      <div className={`hidden ${COLS} px-3 h-9 border-b border-[#F3F4F6] text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider`}>
        <span className="px-2">{t("aiTraining.services.colService")}</span>
        <span className="px-2 text-end">{t("aiTraining.services.colPrice")}</span>
        <span className="px-2 text-end">{t("aiTraining.services.colDuration")}</span>
        <span className="px-2">{t("aiTraining.services.colDescription")}</span>
        <span />
      </div>
      {services.length === 0 && <p className="px-5 py-6 text-center text-sm text-[#9CA3AF]">{t("aiTraining.services.empty")}</p>}
      <ul className="divide-y divide-[#F3F4F6]">
        {services.map((s, i) => (
          <li key={i} data-testid="service-row" className={`group px-3 py-2 sm:py-0.5 ${COLS} grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-1 gap-y-0.5 hover:bg-[#FCFCFD]`}>
            <input data-service-name aria-label={t("aiTraining.services.colService")} value={s.name} onChange={(e) => onEdit(i, { name: e.target.value })} onBlur={onBlur}
              placeholder={t("aiTraining.services.namePlaceholder")} className={`${CELL} font-medium col-span-2 sm:col-span-1`} />
              <input dir="auto" aria-label={t("aiTraining.services.colPrice")} value={displayPrice(s.price, locale)} onChange={(e) => onEdit(i, { price: e.target.value })} onBlur={() => onPriceBlur(i)}
                placeholder={t("aiTraining.services.pricePlaceholder")} className={`${CELL} sm:text-end tabular-nums col-start-1 row-start-2 sm:row-auto sm:col-auto`} />
              <input dir="auto" aria-label={t("aiTraining.services.colDuration")} value={s.duration} onChange={(e) => onEdit(i, { duration: e.target.value })} onBlur={onBlur}
                placeholder={t("aiTraining.services.durationPlaceholder")} className={`${CELL} sm:text-end tabular-nums col-start-2 row-start-2 sm:row-auto sm:col-auto`} />
              <input dir="auto" aria-label={t("aiTraining.services.colDescription")} title={s.description || undefined} value={s.description} onChange={(e) => onEdit(i, { description: e.target.value })} onBlur={onBlur}
                placeholder={t("agentUi.train.addDescription")} className={`${CELL} truncate text-[#4B5563] col-span-2 row-start-3 sm:row-auto sm:col-auto sm:col-span-1`} />
            <div className="col-start-3 row-start-1 sm:col-auto sm:row-auto">
              <RowMenu t={t} onEdit={() => focusRow(i)} onDuplicate={() => onDuplicate(i)} onDelete={() => onDelete(i)} />
            </div>
          </li>
        ))}
      </ul>
      <button type="button" data-testid="add-service" onClick={add}
        className="w-full flex items-center gap-2 px-5 min-h-[44px] text-sm font-medium text-[#C2410C] hover:bg-[#FFF8F5] transition-colors border-t border-[#F3F4F6] rounded-b-xl">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        {t("aiTraining.services.addService")}
      </button>
    </div>
  );
}
