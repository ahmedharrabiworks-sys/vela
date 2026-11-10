"use client";

import { useState } from "react";
import { timeOffLabel, type TimeOff } from "@/lib/time-off";
import { Shell } from "./AppointmentDrawer";
import { dangerBtn, fmtTime, inputCls, labelCls, type Translate } from "./shared";

type Affected = { id: string; name: string; service: string; date: string; time: string };

export default function TimeOffDrawer({ list, today, locale, t, onClose, onChanged }: {
  list: TimeOff[];
  today: string;
  locale: string;
  t: Translate;
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [affected, setAffected] = useState<Affected[]>([]);

  const errorText = (code: string) => t(`appointmentsV2.errors.${code === "needs_migration" ? "timeoff_needs_migration" : code}`);
  const label = (o: TimeOff) => timeOffLabel(o, locale === "ar" ? "ar" : "en");

  const add = async () => {
    setBusy(true);
    setError(null);
    setAffected([]);
    try {
      const res = await fetch("/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: from, endDate: to || from, reason, ...(allDay ? {} : { startTime, endTime }) }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string; appointments?: Affected[] };
      if (!res.ok) setError(errorText(body.error ?? "save_failed"));
      else {
        setAffected(body.appointments ?? []);
        setReason("");
        await onChanged();
      }
    } catch {
      setError(errorText("save_failed"));
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/time-off?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) await onChanged();
    else setError(errorText("save_failed"));
    setBusy(false);
  };

  const upcoming = list.filter((o) => o.end_date >= today);

  return (
    <Shell title={t("appointmentsV2.timeOff.title")} onClose={onClose} closeLabel={t("appointmentsV2.actions.close")}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="off-from" className={labelCls}>{t("appointmentsV2.timeOff.from")}</label>
            <input id="off-from" type="date" dir="ltr" min={today} value={from} onChange={(e) => { setFrom(e.target.value); if (!to || to < e.target.value) setTo(e.target.value); }} className={`${inputCls} text-start`} />
          </div>
          <div>
            <label htmlFor="off-to" className={labelCls}>{t("appointmentsV2.timeOff.to")}</label>
            <input id="off-to" type="date" dir="ltr" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} text-start`} />
          </div>
        </div>
        <label className="flex items-center gap-2.5 min-h-[32px] text-sm text-[#374151] cursor-pointer">
          <input id="off-all-day" type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4 accent-[#FF6B35]" />
          {t("appointmentsV2.timeOff.allDay")}
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="off-start" className={labelCls}>{t("appointmentsV2.timeOff.fromTime")}</label>
              <input id="off-start" type="time" dir="ltr" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputCls} text-start`} />
            </div>
            <div>
              <label htmlFor="off-end" className={labelCls}>{t("appointmentsV2.timeOff.toTime")}</label>
              <input id="off-end" type="time" dir="ltr" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputCls} text-start`} />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="off-reason" className={labelCls}>{t("appointmentsV2.timeOff.reason")}</label>
          <input id="off-reason" dir="auto" maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("appointmentsV2.timeOff.reasonPlaceholder")} className={inputCls} />
        </div>
        {error && <p role="alert" className="text-xs text-red-600 leading-relaxed">{error}</p>}
        <button type="button" data-testid="add-time-off" disabled={busy || !from} onClick={add} className="btn-primary w-full h-11 text-sm disabled:opacity-50">{t("appointmentsV2.timeOff.add")}</button>

        {affected.length > 0 && (
          <div data-testid="time-off-affected" className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800">{t("appointmentsV2.timeOff.conflicts").replace("{n}", String(affected.length))}</p>
            {affected.map((a) => <p key={a.id} className="text-xs text-amber-800"><span dir="auto">{a.name}</span> · <span dir="ltr">{a.date} {fmtTime(a.time, locale)}</span></p>)}
          </div>
        )}

        <div className="pt-3 border-t border-black/[0.06]">
          <h3 className="text-sm font-bold text-[#111111] mb-2">{t("appointmentsV2.timeOff.upcoming")}</h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">{t("appointmentsV2.timeOff.none")}</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((o) => (
                <li key={o.id} data-testid="time-off-row" className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[#111111]">{label(o)}</p>
                    {o.reason && <p dir="auto" className="text-xs text-[#6B7280] truncate text-start">{o.reason}</p>}
                  </div>
                  <button type="button" disabled={busy} onClick={() => remove(o.id)} className={`${dangerBtn} h-9 px-3 shrink-0`}>{t("appointmentsV2.timeOff.remove")}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
