"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatPhoneForDisplay } from "@/lib/phone-validate";
import BusinessNumberModal from "@/components/dashboard/BusinessNumberModal";

// Clients see three things: is it working, their number, this week. The
// phone plumbing (bridge number, carrier codes, Vapi sync) is the Vela
// team's job and only reaches team members, checked on the server.

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
  minutes: { used: number; limit: number | null };
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

const TONE: Record<Kind, { dot: string; text: string; bg: string }> = {
  live: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200" },
  setup: { dot: "bg-amber-400", text: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
  paused: { dot: "bg-amber-400", text: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
  issue: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function PhonePage() {
  const { t } = useI18n();
  const [info, setInfo] = useState<PhoneInfo | null>(null);
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/ai-agent/phone").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/channels/phone-status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setInfo(a as PhoneInfo | null);
    setStatus(b as PhoneStatus | null);
  }, []);
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  if (loading) {
    return <div className="max-w-3xl mx-auto space-y-4 animate-pulse"><div className="h-8 w-40 bg-[#F3F4F6] rounded-lg" /><div className="h-28 bg-[#F3F4F6] rounded-2xl" /><div className="h-24 bg-[#F3F4F6] rounded-2xl" /></div>;
  }

  const kind = statusKind(info, status);
  const tone = TONE[kind];
  const contact = (
    <div className="flex flex-wrap gap-2 mt-3">
      {SUPPORT_WHATSAPP && (
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp" className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#FF6B35]">{t("agentUi.phone.client.whatsapp")}</a>
      )}
      <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Phone setup")}`} data-testid="contact-email" className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-white border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#FF6B35]">{t("agentUi.phone.client.email")}</a>
    </div>
  );
  const limit = status?.minutes.limit ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#111111] mb-1">{t("aiAgent.phone.pageTitle")}</h1>
        <p className="text-sm text-[#6B7280]">{t("agentUi.phone.client.subtitle")}</p>
      </div>

      {/* Status, from real checks */}
      <section data-testid="phone-status" data-kind={kind} className={`rounded-2xl border p-4 sm:p-5 ${tone.bg}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.dot}`} />
          <h2 className={`text-base font-bold ${tone.text}`}>{t(`agentUi.phone.client.status.${kind}`)}</h2>
        </div>
        <p className="text-sm text-[#374151] mt-1.5 leading-relaxed">{t(`agentUi.phone.client.status.${kind}Desc`)}</p>
        {(kind === "setup" || kind === "issue") && contact}
        {kind === "paused" && (
          <Link href="/pricing" className="btn-primary inline-flex h-11 px-5 text-sm mt-3">{t("sidebar.changePlan")}</Link>
        )}
      </section>

      {/* Their number, the one customers already call */}
      <section data-testid="business-number-card" className="glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6B7280]">{t("agentUi.phone.businessTitle")}</p>
          {info?.businessPhone
            ? <p dir="ltr" data-testid="business-number" className="text-xl font-bold text-[#111111] tabular-nums text-start mt-0.5">{formatPhoneForDisplay(info.businessPhone)}</p>
            : <p className="text-sm text-[#9CA3AF] mt-1">{t("agentUi.phone.client.noNumber")}</p>}
        </div>
        <button type="button" data-testid="change-business-number" onClick={() => setChanging(true)} className="inline-flex items-center justify-center h-11 px-4 rounded-xl border border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] hover:border-[#FF6B35] hover:text-[#C2410C] transition-colors">
          {t(info?.businessPhone ? "agentUi.phone.client.change" : "agentUi.phone.client.add")}
        </button>
      </section>

      {/* This week, real counts */}
      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium text-[#6B7280]">{t("agentUi.phone.client.callsWeek")}</p>
          <p data-testid="calls-week" className="text-2xl font-bold text-[#111111] tabular-nums mt-1">{status?.callsThisWeek ?? 0}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-medium text-[#6B7280]">{t("agentUi.phone.client.minutesMonth")}</p>
          <p data-testid="minutes-used" className="text-2xl font-bold text-[#111111] tabular-nums mt-1">
            <span dir="ltr">{Math.round(status?.minutes.used ?? 0)}{limit !== null && <span className="text-sm font-medium text-[#9CA3AF]"> / {limit}</span>}</span>
          </p>
          {limit === null && status && !status.voicePlan && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{t("agentUi.phone.client.notInPlan")}</p>}
        </div>
      </section>

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
