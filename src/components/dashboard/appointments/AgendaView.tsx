"use client";

import { useState } from "react";
import { ChannelBadge, Icons, StatusPill, dangerBtn, dayHeading, fmtTime, quietBtn, type Appt, type Translate } from "./shared";

export type RowAction = "confirm" | "reschedule" | "cancel" | "open";

interface RowProps {
  appt: Appt;
  locale: string;
  t: Translate;
  busy: boolean;
  onAction: (a: Appt, action: RowAction) => void;
}

function Actions({ appt, t, busy, onAction, phone }: Omit<RowProps, "locale"> & { phone: boolean }) {
  const active = appt.status === "pending" || appt.status === "confirmed";
  const size = phone ? "h-11 flex-1 min-w-0 px-1" : "h-8 w-8 xl:w-auto xl:px-2.5";
  const text = phone ? "" : "hidden xl:inline";
  return (
    <div className={`relative z-[1] flex items-center gap-1.5 ${phone ? "w-full" : "justify-end"}`}>
      {appt.status === "pending" && (
        <button type="button" disabled={busy} onClick={() => onAction(appt, "confirm")} title={t("appointmentsV2.actions.confirm")} aria-label={t("appointmentsV2.actions.confirm")} className={`${quietBtn} ${size} !text-green-700`}>
          {Icons.check}<span className={text}>{t("appointmentsV2.actions.confirm")}</span>
        </button>
      )}
      {active && (
        <>
          <button type="button" disabled={busy} onClick={() => onAction(appt, "reschedule")} title={t("appointmentsV2.actions.reschedule")} aria-label={t("appointmentsV2.actions.reschedule")} className={`${quietBtn} ${size}`}>
            {Icons.clock}<span className={text}>{t("appointmentsV2.actions.reschedule")}</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onAction(appt, "cancel")} title={t("appointmentsV2.actions.cancel")} aria-label={t("appointmentsV2.actions.cancel")} className={`${dangerBtn} ${size}`}>
            {Icons.close}<span className={text}>{t("appointmentsV2.actions.cancel")}</span>
          </button>
        </>
      )}
      {appt.phone && (
        <a href={`tel:${appt.phone.replace(/[^\d+]/g, "")}`} title={t("appointmentsV2.actions.call")} aria-label={t("appointmentsV2.actions.call")} className={`${quietBtn} ${size}`}>
          {Icons.phone}<span className={text}>{t("appointmentsV2.actions.call")}</span>
        </a>
      )}
    </div>
  );
}

function Row({ appt, locale, t, busy, onAction }: RowProps) {
  const muted = appt.status === "cancelled";
  const name = appt.name || t("appointmentsV2.noName");
  const open = (
    <button type="button" onClick={() => onAction(appt, "open")} dir="auto" className="block max-w-full truncate text-sm font-semibold text-[#111111] text-start after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[#FF6B35]/40">
      {name}
    </button>
  );
  const phoneText = appt.phone ? <span dir="ltr">{appt.phone}</span> : t("appointmentsV2.noPhone");
  return (
    <li data-testid="agenda-row" className={`relative transition-colors hover:bg-white/50 ${muted ? "opacity-60" : ""}`}>
      <div className="hidden md:grid grid-cols-[76px_minmax(0,1.3fr)_minmax(0,1fr)_28px_108px_152px] xl:grid-cols-[76px_minmax(0,1.3fr)_minmax(0,1fr)_28px_108px_360px] items-center gap-3 px-5 py-3">
        <p dir="ltr" className="text-sm font-semibold text-[#111111] tabular-nums text-start whitespace-nowrap">{fmtTime(appt.time, locale)}</p>
        <div className="min-w-0">
          {open}
          <p className="text-xs text-[#6B7280] truncate">{phoneText}</p>
        </div>
        <div className="min-w-0">
          <p dir="auto" className="text-sm text-[#374151] truncate text-start">{appt.service}</p>
          {appt.rescheduled && <p className="text-[11px] text-[#9CA3AF]">{t("appointmentsV2.rescheduled")}</p>}
        </div>
        <ChannelBadge channel={appt.channel} t={t} />
        <div><StatusPill status={appt.status} t={t} /></div>
        <Actions appt={appt} t={t} busy={busy} onAction={onAction} phone={false} />
      </div>
      <div className="md:hidden p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p dir="ltr" className="text-base font-bold text-[#111111] tabular-nums">{fmtTime(appt.time, locale)}</p>
          <div className="flex items-center gap-2">
            <ChannelBadge channel={appt.channel} t={t} size={24} />
            <StatusPill status={appt.status} t={t} />
          </div>
        </div>
        <div className="min-w-0">
          {open}
          <p className="text-xs text-[#6B7280] mt-0.5 truncate">{phoneText}</p>
          <p dir="auto" className="text-sm text-[#374151] mt-1 text-start">{appt.service}{appt.rescheduled ? <span className="text-[11px] text-[#9CA3AF]"> · {t("appointmentsV2.rescheduled")}</span> : null}</p>
        </div>
        <Actions appt={appt} t={t} busy={busy} onAction={onAction} phone />
      </div>
    </li>
  );
}

function DayGroup({ date, rows, today, heading, ...rest }: Omit<RowProps, "appt"> & { date: string; rows: Appt[]; today: string; heading: string }) {
  return (
    <section className="glass rounded-2xl overflow-hidden" aria-label={heading}>
      <header className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-3 border-b border-black/[0.06]">
        <h2 className={`text-sm font-bold ${date === today ? "text-[#C2410C]" : "text-[#111111]"}`}>{heading}</h2>
        <span className="text-xs text-[#9CA3AF] tabular-nums">{rows.length}</span>
      </header>
      <ul className="divide-y divide-black/[0.06]">
        {rows.map((a) => <Row key={a.id} appt={a} {...rest} />)}
      </ul>
    </section>
  );
}

function groupByDay(rows: Appt[]): Array<[string, Appt[]]> {
  const map = new Map<string, Appt[]>();
  for (const a of rows) map.set(a.date, [...(map.get(a.date) ?? []), a]);
  return Array.from(map.entries());
}

export default function AgendaView({ upcoming, past, pastOpenByDefault, today, locale, t, busyId, onAction }: {
  upcoming: Appt[];
  past: Appt[];
  pastOpenByDefault: boolean;
  today: string;
  locale: string;
  t: Translate;
  busyId: string | null;
  onAction: (a: Appt, action: RowAction) => void;
}) {
  const [pastToggled, setPastToggled] = useState(false);
  const pastOpen = pastOpenByDefault !== pastToggled;
  const group = ([date, rows]: [string, Appt[]]) => (
    <DayGroup key={date} date={date} rows={rows} today={today} heading={dayHeading(date, today, locale, t)} locale={locale} t={t} busy={false} onAction={(a, action) => { if (busyId !== a.id) onAction(a, action); }} />
  );
  const pastDays = groupByDay([...past].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : b.date.localeCompare(a.date))));
  return (
    <div className="space-y-4">
      {groupByDay([...upcoming].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))).map(group)}
      {past.length > 0 && (
        <div className="space-y-4">
          <button type="button" onClick={() => setPastToggled((v) => !v)} aria-expanded={pastOpen} className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-[#6B7280] hover:text-[#111111] transition-colors">
            <span className={`transition-transform rtl:rotate-180 ${pastOpen ? "!rotate-90" : ""}`}>{Icons.chevron}</span>
            {t("appointmentsV2.past")}
            <span className="text-xs font-normal text-[#9CA3AF] tabular-nums">{past.length}</span>
          </button>
          {pastOpen && pastDays.map(group)}
        </div>
      )}
    </div>
  );
}
