"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatPhoneForDisplay } from "@/lib/phone-validate";
import BusinessNumberModal from "@/components/dashboard/BusinessNumberModal";
import ChannelIcon from "@/components/ui/ChannelIcon";
import { callStatus, fmtDuration, fmtTimeAgo, type CallRecord, type CallStatus } from "@/components/dashboard/CallTranscript";

// One featured card in the Channels phone card style, then this week's calls
// and the latest calls. Clients never see phone plumbing; the Vela team's
// setup tools stay in the admin section, sent by the server to team members only.

interface PhoneInfo {
  businessPhone: string | null;
  isAdmin: boolean;
  phoneNumber?: string | null;
  phoneNumberId?: string | null;
  assistantId?: string | null;
}
interface PhoneStatus {
  status: "live" | "issue" | "needs_setup";
  reason: "plan" | "webhook" | "number_missing" | "service" | null;
  voicePlan: boolean;
  callsThisWeek: number;
  week?: Array<{ date: string; calls: number }>;
  today?: string;
  minutes: { used: number; limit: number | null };
  lastCallAt: string | null;
}
type Kind = "live" | "setup" | "issue" | "paused";

const SUPPORT_EMAIL = "velaOsSupport@gmail.com";
const SUPPORT_WHATSAPP = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");

function statusKind(info: PhoneInfo | null, s: PhoneStatus | null): Kind {
  if (!s) return "setup";
  if (!s.voicePlan || s.reason === "plan") return "paused";
  if (!info?.businessPhone) return "setup";
  if (s.status === "live") return "live";
  if (s.status === "issue" && s.reason === "service") return "issue";
  return "setup";
}

const PILL: Record<Kind, { box: string; dot: string }> = {
  live: { box: "bg-green-50 text-green-700", dot: "bg-green-500" },
  setup: { box: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  paused: { box: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  issue: { box: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

// Booked / Answered / Hung up first; the rest are rarer and stay quiet.
const OUTCOME: Record<CallStatus, string> = {
  booked: "bg-green-50 text-green-700",
  completed: "bg-[#FFF5F0] text-[#C2410C]",
  hungUp: "bg-[#F3F4F6] text-[#6B7280]",
  noAnswer: "bg-[#F3F4F6] text-[#6B7280]",
  voicemail: "bg-[#F3F4F6] text-[#6B7280]",
  failed: "bg-red-50 text-red-700",
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5 leading-tight">{label}</p>
      {children}
    </div>
  );
}

function fmtDay(date: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale === "en" ? "en-GB" : locale, { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00.000Z`));
}

export default function PhonePage() {
  const { t, locale } = useI18n();
  const [info, setInfo] = useState<PhoneInfo | null>(null);
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      fetch("/api/ai-agent/phone").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/channels/phone-status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/ai-agent/calls").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setInfo(a as PhoneInfo | null);
    setStatus(b as PhoneStatus | null);
    setCalls((((c as { calls?: CallRecord[] } | null)?.calls) ?? []).filter((x) => x.call_type === "live").slice(0, 5));
  }, []);
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  if (loading) {
    return <div className="max-w-5xl mx-auto space-y-4 animate-pulse"><div className="h-8 w-40 bg-[#F3F4F6] rounded-lg" /><div className="glass rounded-2xl h-[280px]" /><div className="grid lg:grid-cols-2 gap-4"><div className="glass rounded-2xl h-56" /><div className="glass rounded-2xl h-56" /></div></div>;
  }

  const kind = statusKind(info, status);
  const pill = PILL[kind];
  const limit = status?.minutes.limit ?? null;
  const used = Math.round(status?.minutes.used ?? 0);
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 100 ? "#DC2626" : pct >= 80 ? "#F59E0B" : "#FF6B35";
  const week = status?.week ?? [];
  const peak = Math.max(1, ...week.map((d) => d.calls));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-[#111111]">{t("aiAgent.phone.pageTitle")}</h1>

      {/* Featured card */}
      <section data-testid="phone-card" data-kind={kind} className="glass glass-warm rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--vela-gradient)" }}>
            <ChannelIcon channel="phone" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#111111]">{t("channels.phoneAgent.name")}</h2>
              <span data-testid="phone-status" className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill.box}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} aria-hidden="true" />
                {t(`agentUi.phone.pill.${kind}`)}
              </span>
            </div>
            {kind !== "live" && <p data-testid="phone-status-line" className="text-sm text-[#6B7280] mt-1 leading-relaxed">{t(`agentUi.phone.client.status.${kind}Desc`)}</p>}
            {(kind === "setup" || kind === "issue") && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {SUPPORT_WHATSAPP && <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp" className="inline-flex items-center justify-center h-11 sm:h-9 px-3.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:border-[#FF6B35]">{t("agentUi.phone.client.whatsapp")}</a>}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Phone setup")}`} data-testid="contact-email" className="inline-flex items-center justify-center h-11 sm:h-9 px-3.5 rounded-lg bg-white border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:border-[#FF6B35]">{t("agentUi.phone.client.email")}</a>
              </div>
            )}
            {kind === "paused" && <Link href="/pricing" className="btn-primary inline-flex h-11 sm:h-9 px-4 text-xs mt-2.5">{t("sidebar.changePlan")}</Link>}
          </div>
        </div>

        <div id="business-number" className="mt-6 scroll-mt-20">
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">{t("channelsV2.customersCall")}</p>
          {info?.businessPhone ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p data-testid="business-number" dir="ltr" className="text-[26px] sm:text-[32px] font-bold text-[#111111] leading-tight tabular-nums text-start">{formatPhoneForDisplay(info.businessPhone)}</p>
              <button type="button" data-testid="change-business-number" onClick={() => setChanging(true)} className="min-h-[44px] sm:min-h-0 text-sm font-semibold text-[#C2410C] hover:underline">{t("agentUi.phone.client.change")}</button>
            </div>
          ) : (
            <button type="button" data-testid="change-business-number" onClick={() => setChanging(true)} className="inline-flex items-center min-h-[44px] text-base font-semibold text-[#C2410C] hover:underline">{t("agentUi.phone.client.addTitle")}</button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-black/[0.06]">
          <Stat label={t("channelsV2.callsThisWeek")}>
            <p data-testid="calls-week" className="text-[20px] sm:text-[22px] font-bold text-[#111111] leading-none tabular-nums">{(status?.callsThisWeek ?? 0).toLocaleString("en-US")}</p>
          </Stat>
          <Stat label={t("channelsV2.minutesUsed")}>
            <p data-testid="minutes-used" dir="ltr" className="text-[20px] sm:text-[22px] font-bold text-[#111111] leading-none tabular-nums text-start">
              {used.toLocaleString("en-US")}
              {limit !== null && <span className="text-xs sm:text-sm font-medium text-[#9CA3AF]"> / {limit.toLocaleString("en-US")}</span>}
            </p>
            {limit !== null && limit > 0 && <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden mt-2"><div data-testid="minutes-bar" className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} /></div>}
            {status && !status.voicePlan && <p className="text-[11px] text-[#9CA3AF] mt-1">{t("agentUi.phone.client.notInPlan")}</p>}
          </Stat>
          <Stat label={t("channelsV2.lastCall")}>
            <p data-testid="last-call" className="text-sm font-semibold text-[#111111] pt-0.5">{status?.lastCallAt ? fmtTimeAgo(status.lastCallAt, locale) : t("channelsV2.noCalls")}</p>
          </Stat>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* This week, one bar per day, from the business's first day of the week */}
        <section data-testid="week-chart" className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-[#111111] mb-4">{t("channelsV2.callsThisWeek")}</h2>
          {week.length === 7 ? (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-36" role="img" aria-label={week.map((d) => `${fmtDay(d.date, locale, { weekday: "long" })}: ${d.calls}`).join(", ")}>
              {week.map((d) => {
                const today = d.date === status?.today;
                return (
                  <div key={d.date} data-testid="week-bar" data-date={d.date} data-calls={d.calls} className="flex flex-col items-center justify-end h-full gap-1">
                    <span className={`text-[11px] tabular-nums ${d.calls ? "text-[#374151] font-semibold" : "text-[#C9CDD3]"}`}>{d.calls}</span>
                    <div className="w-full max-w-[28px] rounded-md" style={{ height: `${Math.max(4, (d.calls / peak) * 88)}px`, background: d.calls ? (today ? "var(--vela-gradient)" : "rgba(255,107,53,0.45)") : "#F3F4F6" }} />
                    <span className={`text-[11px] ${today ? "font-bold text-[#C2410C]" : "text-[#6B7280]"}`}>{fmtDay(d.date, locale, { weekday: "short" })}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-[#9CA3AF]">{t("channelsV2.noCalls")}</p>}
        </section>

        {/* The latest calls, each opening its conversation */}
        <section data-testid="recent-calls" className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-sm font-bold text-[#111111]">{t("agentUi.phone.card.recentTitle")}</h2>
            <Link href="/app/conversations" data-testid="view-all-calls" className="inline-flex items-center min-h-[44px] sm:min-h-0 text-xs font-semibold text-[#C2410C] hover:underline">{t("agentUi.phone.card.viewAll")}</Link>
          </div>
          {calls.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] py-6 text-center">{t("channelsV2.noCalls")}</p>
          ) : (
            <ul className="-mx-2">
              {calls.map((c) => {
                const st = callStatus(c.outcome, c.duration_seconds);
                const lang = (c.language ?? "").toLowerCase().startsWith("ar") ? "AR" : (c.language ? "EN" : null);
                return (
                  <li key={c.id}>
                    <Link href={`/app/conversations?open=call:${encodeURIComponent(c.id)}`} data-testid="recent-call-row" className="flex items-center gap-3 min-h-[52px] px-2 py-2 rounded-lg hover:bg-white/60 transition-colors">
                      <span className="flex-1 min-w-0">
                        <span dir="ltr" className="block text-sm font-semibold text-[#111111] truncate text-start tabular-nums">{c.caller_number ? formatPhoneForDisplay(c.caller_number) : t("agentUi.phone.card.hiddenNumber")}</span>
                        <span className="block text-[11px] text-[#9CA3AF]">{fmtTimeAgo(c.created_at, locale)}</span>
                      </span>
                      {lang && <span data-testid="call-lang" className="text-[10px] font-bold text-[#6B7280] border border-[#E5E7EB] rounded px-1.5 py-0.5">{lang}</span>}
                      <span dir="ltr" className="text-xs text-[#6B7280] tabular-nums w-12 text-end">{fmtDuration(c.duration_seconds)}</span>
                      {st && <span data-testid="call-outcome" className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${OUTCOME[st]}`}>{t(`agentUi.phone.outcome.${st}`)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {info?.isAdmin && <AdminSetup info={info} t={t} onChanged={load} />}

      {changing && (
        <BusinessNumberModal current={info?.businessPhone ?? null} t={t} onClose={() => setChanging(false)} onSaved={(n) => { setChanging(false); setInfo((i) => (i ? { ...i, businessPhone: n } : i)); load(); }} />
      )}
    </div>
  );
}

/** Vela team only (the server sends these fields to team members alone). */
function AdminSetup({ info, t, onChanged }: { info: PhoneInfo; t: (key: string) => string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const bridge = info.phoneNumber ?? null;
  const copy = async (v: string) => { try { await navigator.clipboard.writeText(v); setCopied(v); setTimeout(() => setCopied(null), 2000); } catch { /* ignore */ } };
  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-agent/phone", { method: "POST", signal: AbortSignal.timeout(60000) });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) setError(body.error ?? t("aiAgent.phone.syncFailed"));
      else await onChanged();
    } catch { setError(t("aiAgent.phone.syncFailed")); }
    setBusy(false);
  };
  const target = bridge ? `00${bridge.replace(/\D/g, "")}` : "";
  const codes = bridge ? [
    { key: "all", code: `**21*${target}#` },
    { key: "noAnswer", code: `**61*${target}**20#` },
    { key: "busy", code: `**67*${target}#` },
    { key: "off", code: "##002#" },
  ] : [];
  return (
    <details data-testid="admin-setup" className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white/70 p-4 sm:p-5 group">
      <summary className="cursor-pointer select-none text-sm font-semibold text-[#374151] min-h-[32px] flex items-center">{t("agentUi.phone.admin.title")}</summary>
      <div className="mt-3 space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-[#6B7280]">{t("agentUi.phone.admin.bridge")}</p>
            <p dir="ltr" data-testid="admin-bridge" className="font-mono font-semibold text-[#111111] text-start">{bridge ?? t("agentUi.phone.admin.noBridge")}</p>
          </div>
          <div className="flex gap-2">
            {bridge && <button type="button" onClick={() => copy(bridge)} className="h-11 md:h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs font-semibold">{copied === bridge ? t("agentUi.phone.fwd.copied") : t("agentUi.phone.fwd.copy")}</button>}
            <button type="button" onClick={sync} disabled={busy} className="h-11 md:h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs font-semibold disabled:opacity-60">{busy ? t("aiAgent.phone.provisioning") : bridge ? t("aiAgent.phone.resyncBtn") : t("aiAgent.phone.getBtn")}</button>
          </div>
        </div>
        {error && <p role="alert" className="text-xs text-red-600 break-words">{error}</p>}
        {bridge && info.businessPhone && (
          <div data-testid="forwarding-card">
            <p className="text-xs font-semibold text-[#374151] mb-1">{t("agentUi.phone.fwd.title")}</p>
            <p className="text-xs text-[#6B7280] mb-2">{t("agentUi.phone.fwd.step1").replace("{number}", `⁦${formatPhoneForDisplay(info.businessPhone)}⁩`)}</p>
            <ul className="divide-y divide-black/[0.06]">
              {codes.map((c) => (
                <li key={c.key} data-testid={`fwd-${c.key}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-[#6B7280]">{t(`agentUi.phone.fwd.${c.key}`)}</p>
                    <p dir="ltr" className="font-mono text-sm font-semibold text-start [overflow-wrap:anywhere]">{c.code}</p>
                  </div>
                  <button type="button" onClick={() => copy(c.code)} className="h-11 md:h-9 px-3 rounded-lg border border-[#E5E7EB] text-xs font-semibold">{copied === c.code ? t("agentUi.phone.fwd.copied") : t("agentUi.phone.fwd.copy")}</button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#9CA3AF] mt-2">{t("agentUi.phone.fwd.note")}</p>
          </div>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
          <dt className="text-[#6B7280]">{t("agentUi.phone.assistantId")}</dt><dd dir="ltr" className="font-mono truncate text-start">{info.assistantId ?? "none"}</dd>
          <dt className="text-[#6B7280]">{t("agentUi.phone.numberId")}</dt><dd dir="ltr" className="font-mono truncate text-start">{info.phoneNumberId ?? "none"}</dd>
        </dl>
      </div>
    </details>
  );
}
