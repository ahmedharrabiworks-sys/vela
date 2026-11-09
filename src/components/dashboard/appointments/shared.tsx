"use client";

import type { ReactNode } from "react";
import ChannelIcon, { channelIconBg } from "@/components/ui/ChannelIcon";
import type { OpeningHours } from "@/lib/opening-hours";

export type ApptStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
export type ApptChannel = "phone" | "website" | "whatsapp" | "instagram" | "manual";

export interface Appt {
  id: string;
  name: string;
  phone: string;
  phoneUnconfirmed: boolean;
  service: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: ApptStatus;
  channel: ApptChannel;
  notes: string | null;
  conversationId: string | null;
  rescheduled: boolean;
  callId: string | null;
  callSummary: string | null;
}

export interface ApptPayload {
  now: { date: string; time: string };
  hours: OpeningHours | null;
  services: string[];
  phoneLinked: boolean;
  viewKey: string;
  appointments: Appt[];
}

export type Translate = (key: string) => string;

// Dates are plain YYYY-MM-DD strings in the business's own time, so calendar
// maths stays independent of the viewer's browser timezone.
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function weekStartOf(date: string): string {
  return addDays(date, -new Date(`${date}T12:00:00.000Z`).getUTCDay());
}

export const intlLocale = (locale: string) => (locale === "ar" ? "ar-u-nu-latn" : locale === "en" ? "en-GB" : locale);

export function fmtDay(date: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00.000Z`))
    .replace(",", "");
}

export function fmtTime(time: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale === "en" ? "en-US" : locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    .format(new Date(`2026-01-01T${time}:00.000Z`));
}

export function dayHeading(date: string, today: string, locale: string, t: Translate): string {
  if (date === today) return t("appointmentsV2.today");
  if (date === addDays(today, 1)) return t("appointmentsV2.tomorrow");
  return fmtDay(date, locale, { weekday: "short", day: "numeric", month: "short" });
}

const STATUS_TONE: Record<ApptStatus, { pill: string; dot: string }> = {
  confirmed: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  pending: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  cancelled: { pill: "bg-red-50 text-red-600", dot: "bg-red-400" },
  completed: { pill: "bg-[#F3F4F6] text-[#374151]", dot: "bg-[#6B7280]" },
  no_show: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

export function StatusPill({ status, t }: { status: ApptStatus; t: Translate }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${tone.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} aria-hidden="true" />
      {t(`appointmentsV2.status.${status}`)}
    </span>
  );
}

export function ChannelBadge({ channel, t, size = 26 }: { channel: ApptChannel; t: Translate; size?: number }) {
  const label = t(`appointmentsV2.channels.${channel}`);
  return (
    <span title={label} role="img" aria-label={label} className={`inline-flex items-center justify-center rounded-lg shrink-0 ${channel === "manual" ? "bg-[#E5E7EB]" : channelIconBg(channel)}`} style={{ width: size, height: size }}>
      {channel === "manual" ? (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 11.5l.6-2.6 6-6a1.2 1.2 0 011.7 0l.3.3a1.2 1.2 0 010 1.7l-6 6-2.6.6z" stroke="#4B5563" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      ) : (
        <ChannelIcon channel={channel} size={size * 0.56} />
      )}
    </span>
  );
}

export const quietBtn = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-[#374151] hover:border-[#FF6B35] hover:text-[#C2410C] transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40";
export const dangerBtn = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300";
export const inputCls = "w-full h-11 !rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15 transition-colors";
export const labelCls = "block text-xs font-medium text-[#6B7280] mb-1.5";

function Svg({ children, size = 13 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
export const Icons = {
  check: <Svg><path d="M2.5 7.5l3 3 6-6.5" /></Svg>,
  clock: <Svg><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.5" /></Svg>,
  close: <Svg><path d="M3 3l8 8M11 3l-8 8" /></Svg>,
  phone: <Svg><path d="M3.3 5.4c.93 1.87 2.43 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V11.3c0 .4-.27.7-.67.7C4.4 12 2 6.6 2 2.7c0-.4.27-.7.67-.7H5.3c.4 0 .7.27.7.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L3.3 5.4z" /></Svg>,
  chevron: <Svg size={12}><path d="M5 2.5L9.5 7 5 11.5" /></Svg>,
  download: <Svg size={15}><path d="M7 1.5v7M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V10" /></Svg>,
  plus: <Svg><path d="M7 2v10M2 7h10" /></Svg>,
  filter: <Svg size={15}><path d="M2 3.5h10M4 7h6M6 10.5h2" /></Svg>,
};
