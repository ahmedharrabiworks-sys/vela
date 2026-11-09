"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { setBottomSheetOpen } from "@/lib/useBottomSheetState";
import { ChannelBadge, Icons, StatusPill, dangerBtn, fmtDay, fmtTime, inputCls, labelCls, quietBtn, type Appt, type Translate } from "./shared";

export type DrawerMode = "view" | "reschedule" | "cancel";
type Result = string | null;

function Shell({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    setBottomSheetOpen(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); setBottomSheetOpen(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div data-testid="appt-drawer" className="vela-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl md:inset-x-auto md:end-0 md:top-0 md:bottom-0 md:max-h-none md:w-[440px] md:rounded-none bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.06] shrink-0">
          <h2 className="text-base font-bold text-[#111111] truncate">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className="h-10 w-10 -me-2 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40">{Icons.close}</button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorLine({ code, t }: { code: string | null; t: Translate }) {
  if (!code) return null;
  return <p role="alert" className="text-xs text-red-600 leading-relaxed">{t(`appointmentsV2.errors.${code}`)}</p>;
}

function SlotPicker({ minDate, service, excludeId, locale, t, date, setDate, time, setTime }: {
  minDate: string; service: string; excludeId?: string; locale: string; t: Translate;
  date: string; setDate: (v: string) => void; time: string; setTime: (v: string) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; closed: boolean; slots: string[]; failed: boolean }>({ loading: false, closed: false, slots: [], failed: false });
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, failed: false }));
    const q = new URLSearchParams({ date, service });
    if (excludeId) q.set("exclude", excludeId);
    fetch(`/api/appointments/availability?${q}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: { closed: boolean; slots: string[] }) => setState({ loading: false, closed: d.closed, slots: d.slots, failed: false }))
      .catch((e: Error) => { if (e.name !== "AbortError") setState({ loading: false, closed: false, slots: [], failed: true }); });
    return () => controller.abort();
  }, [date, service, excludeId]);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="appt-date" className={labelCls}>{t("appointmentsV2.form.date")}</label>
        <input id="appt-date" type="date" dir="ltr" min={minDate} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className={`${inputCls} text-start`} />
      </div>
      {date && (
        <div>
          <p className={labelCls}>{t("appointmentsV2.form.time")}</p>
          {state.loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-lg bg-[#F3F4F6] animate-pulse" />)}</div>
          ) : state.failed ? (
            <p className="text-xs text-red-600">{t("appointmentsV2.errors.save_failed")}</p>
          ) : state.closed ? (
            <p className="text-sm text-[#6B7280]">{t("appointmentsV2.form.closedDay")}</p>
          ) : state.slots.length === 0 ? (
            <p className="text-sm text-[#6B7280]">{t("appointmentsV2.form.noSlots")}</p>
          ) : (
            <div role="radiogroup" aria-label={t("appointmentsV2.form.time")} className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[208px] overflow-y-auto pe-1">
              {state.slots.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={s === time} onClick={() => setTime(s)} dir="ltr" className={`h-11 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${s === time ? "border-[#FF6B35] bg-[#FFF5F0] text-[#C2410C]" : "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#FF6B35]"}`}>
                  {fmtTime(s, locale)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#9CA3AF] mb-0.5">{label}</p>
      <div className="text-sm text-[#111111]">{children}</div>
    </div>
  );
}

export function AppointmentDrawer({ appt, initialMode, today, nowTime, locale, t, onClose, onAction }: {
  appt: Appt;
  initialMode: DrawerMode;
  today: string;
  nowTime: string;
  locale: string;
  t: Translate;
  onClose: () => void;
  onAction: (a: Appt, action: string, extra?: { date: string; time: string }) => Promise<Result>;
}) {
  const [mode, setMode] = useState<DrawerMode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [removing, setRemoving] = useState(false);

  const run = async (action: string, extra?: { date: string; time: string }) => {
    setBusy(true);
    setError(null);
    const problem = await onAction(appt, action, extra);
    setBusy(false);
    if (problem) setError(problem);
  };

  const active = appt.status === "pending" || appt.status === "confirmed";
  const started = `${appt.date}T${appt.time}` <= `${today}T${nowTime}`;
  const when = `${fmtDay(appt.date, locale, { weekday: "long", day: "numeric", month: "long" })} · `;
  const source = appt.callId || appt.callSummary ? "call" : appt.conversationId ? "chat" : null;

  return (
    <Shell title={appt.name || t("appointmentsV2.noName")} onClose={onClose} closeLabel={t("appointmentsV2.actions.close")}>
      {mode === "reschedule" ? (
        <div className="space-y-4">
          <p className="text-sm text-[#6B7280]">{t("appointmentsV2.drawer.current")}: <span className="font-semibold text-[#111111]">{when}<span dir="ltr">{fmtTime(appt.time, locale)}</span></span></p>
          <SlotPicker minDate={today} service={appt.service} excludeId={appt.id} locale={locale} t={t} date={date} setDate={setDate} time={time} setTime={setTime} />
          <ErrorLine code={error} t={t} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setMode("view"); setError(null); }} className={`${quietBtn} h-11 flex-1 text-sm`}>{t("appointmentsV2.actions.back")}</button>
            <button type="button" disabled={!date || !time || busy} onClick={() => run("reschedule", { date, time })} className="btn-primary h-11 flex-[2] text-sm disabled:opacity-50">{t("appointmentsV2.actions.saveNewTime")}</button>
          </div>
        </div>
      ) : mode === "cancel" ? (
        <div className="space-y-4">
          <p className="text-sm text-[#374151] leading-relaxed">{t("appointmentsV2.drawer.cancelPrompt")}</p>
          <p className="text-sm font-semibold text-[#111111]">{appt.service} · {when}<span dir="ltr">{fmtTime(appt.time, locale)}</span></p>
          <ErrorLine code={error} t={t} />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setMode("view"); setError(null); }} className={`${quietBtn} h-11 flex-1 text-sm`}>{t("appointmentsV2.actions.keep")}</button>
            <button type="button" disabled={busy} onClick={() => run("cancel")} className="h-11 flex-[2] rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">{t("appointmentsV2.actions.confirmCancel")}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={appt.status} t={t} />
            {appt.rescheduled && <span className="text-[11px] text-[#9CA3AF]">{t("appointmentsV2.rescheduled")}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Detail label={t("appointmentsV2.drawer.service")}><span dir="auto">{appt.service}</span></Detail>
            <Detail label={t("appointmentsV2.drawer.channel")}>
              <span className="inline-flex items-center gap-1.5"><ChannelBadge channel={appt.channel} t={t} size={20} />{t(`appointmentsV2.channels.${appt.channel}`)}</span>
            </Detail>
            <div className="col-span-2">
              <Detail label={t("appointmentsV2.drawer.time")}>{when}<span dir="ltr">{fmtTime(appt.time, locale)}</span></Detail>
            </div>
            <div className="col-span-2">
              <Detail label={t("appointmentsV2.drawer.phone")}>
                {appt.phone ? (
                  <a href={`tel:${appt.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="inline-flex items-center gap-2 min-h-[32px] font-semibold text-[#C2410C] hover:underline">{appt.phone}</a>
                ) : t("appointmentsV2.noPhone")}
                {appt.phoneUnconfirmed && <span className="ms-2 text-[11px] text-amber-700">{t("appointmentsV2.drawer.phoneUnconfirmed")}</span>}
              </Detail>
            </div>
          </div>

          {appt.notes && <Detail label={t("appointmentsV2.drawer.notes")}><p dir="auto" className="leading-relaxed whitespace-pre-wrap text-start">{appt.notes}</p></Detail>}

          {source && (
            <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3.5 space-y-2">
              <p className="text-[11px] font-medium text-[#9CA3AF]">{t(source === "call" ? "appointmentsV2.drawer.fromCall" : "appointmentsV2.drawer.fromChat")}</p>
              {source === "call" && appt.callSummary && <p dir="auto" className="text-sm text-[#374151] leading-relaxed text-start">{appt.callSummary}</p>}
              {(appt.callId || appt.conversationId) && (
                <Link href={`/app/conversations?open=${appt.callId ? `call:${appt.callId}` : `conv:${appt.conversationId}`}`} className="inline-flex items-center gap-1 min-h-[32px] text-xs font-semibold text-[#C2410C] hover:underline">
                  {t(appt.callId ? "appointmentsV2.drawer.openCall" : "appointmentsV2.drawer.openChat")}
                  <span className="rtl:rotate-180">{Icons.chevron}</span>
                </Link>
              )}
            </div>
          )}

          <ErrorLine code={error} t={t} />

          <div className="space-y-2 pt-1">
            {appt.status === "pending" && <button type="button" disabled={busy} onClick={() => run("confirm")} className="btn-primary w-full h-11 text-sm disabled:opacity-50">{t("appointmentsV2.actions.confirm")}</button>}
            {active && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("reschedule")} className={`${quietBtn} h-11 text-sm`}>{t("appointmentsV2.actions.reschedule")}</button>
                <button type="button" onClick={() => setMode("cancel")} className={`${dangerBtn} h-11 text-sm`}>{t("appointmentsV2.actions.cancel")}</button>
              </div>
            )}
            {active && started && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => run("complete")} className={`${quietBtn} h-11 text-sm`}>{t("appointmentsV2.actions.complete")}</button>
                <button type="button" disabled={busy} onClick={() => run("no_show")} className={`${quietBtn} h-11 text-sm`}>{t("appointmentsV2.actions.noShow")}</button>
              </div>
            )}
            {!active && <button type="button" disabled={busy} onClick={() => run("reactivate")} className={`${quietBtn} w-full h-11 text-sm`}>{t("appointmentsV2.actions.reactivate")}</button>}
          </div>

          <div className="pt-3 border-t border-black/[0.06]">
            {removing ? (
              <div className="space-y-2">
                <p className="text-xs text-[#6B7280] leading-relaxed">{t("appointmentsV2.drawer.removePrompt")}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRemoving(false)} className={`${quietBtn} h-10 flex-1`}>{t("appointmentsV2.actions.keep")}</button>
                  <button type="button" disabled={busy} onClick={() => run("remove")} className={`${dangerBtn} h-10 flex-1`}>{t("appointmentsV2.actions.confirmRemove")}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setRemoving(true)} className="min-h-[36px] text-xs font-medium text-[#9CA3AF] hover:text-red-600 transition-colors">{t("appointmentsV2.actions.remove")}</button>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

export function NewAppointmentDrawer({ services, today, locale, t, onClose, onCreate }: {
  services: string[];
  today: string;
  locale: string;
  t: Translate;
  onClose: () => void;
  onCreate: (body: { name: string; phone: string; service: string; date: string; time: string; notes: string }) => Promise<Result>;
}) {
  const OTHER = "__other";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [choice, setChoice] = useState(services[0] ?? OTHER);
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = choice === OTHER ? custom.trim() : choice;
  const ready = !!name.trim() && !!service && !!date && !!time && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const problem = await onCreate({ name, phone, service, date, time, notes });
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <Shell title={t("appointmentsV2.newAppointment")} onClose={onClose} closeLabel={t("appointmentsV2.actions.close")}>
      <div className="space-y-4">
        <div>
          <label htmlFor="appt-name" className={labelCls}>{t("appointmentsV2.form.name")}</label>
          <input id="appt-name" dir="auto" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="appt-phone" className={labelCls}>{t("appointmentsV2.form.phone")}</label>
          <input id="appt-phone" type="tel" dir="ltr" maxLength={32} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974" className={`${inputCls} text-start`} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="appt-service" className={labelCls}>{t("appointmentsV2.form.service")}</label>
          {services.length > 0 && (
            <select id="appt-service" value={choice} onChange={(e) => { setChoice(e.target.value); setTime(""); }} className={inputCls}>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value={OTHER}>{t("appointmentsV2.form.otherService")}</option>
            </select>
          )}
          {choice === OTHER && (
            <input id={services.length > 0 ? undefined : "appt-service"} aria-label={t("appointmentsV2.form.service")} dir="auto" maxLength={120} value={custom} onChange={(e) => setCustom(e.target.value)} className={`${inputCls} ${services.length > 0 ? "mt-2" : ""}`} />
          )}
        </div>
        <SlotPicker minDate={today} service={service} locale={locale} t={t} date={date} setDate={setDate} time={time} setTime={setTime} />
        <div>
          <label htmlFor="appt-notes" className={labelCls}>{t("appointmentsV2.form.notes")}</label>
          <textarea id="appt-notes" dir="auto" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} !h-auto py-2.5 resize-y`} />
        </div>
        <ErrorLine code={error} t={t} />
        <button type="button" disabled={!ready} onClick={submit} className="btn-primary w-full h-11 text-sm disabled:opacity-50">{t("appointmentsV2.actions.addAppointment")}</button>
      </div>
    </Shell>
  );
}
