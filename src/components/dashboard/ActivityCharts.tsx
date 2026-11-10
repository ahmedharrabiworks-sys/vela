"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// The one chart and ring style, shared by the Dashboard and AI Agent Overview.

export interface ChartPoint { label: string; tick: string; value: number }

/** Dates as YYYY-MM-DD; weekday=true shows Mon, Tue for a one-week chart. */
export function toDayPoints(rows: Array<{ date: string; value: number }>, locale: string, weekday = false): ChartPoint[] {
  const loc = locale === "ar" ? "ar-u-nu-latn" : locale;
  const tick = new Intl.DateTimeFormat(loc, weekday ? { weekday: "short", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat(loc, { month: "short", day: "numeric", timeZone: "UTC" });
  return rows.map((r) => {
    const d = new Date(`${r.date}T12:00:00Z`);
    const ok = !Number.isNaN(d.getTime());
    return { label: ok ? full.format(d) : r.date, tick: ok ? tick.format(d) : r.date, value: r.value };
  });
}

const CHART_HEIGHT = 128;
const PAD_X = 6, PAD_TOP = 10, PAD_BOTTOM = 22;

export function ActivityChart({ points, unit, emptyText }: { points: ChartPoint[]; unit: string; emptyText?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 1);
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseY = CHART_HEIGHT - PAD_BOTTOM;
  const xy = points.map((p, i) => ({
    x: PAD_X + (i / Math.max(n - 1, 1)) * (width - PAD_X * 2),
    y: PAD_TOP + (1 - p.value / max) * plotH,
  }));
  const hasData = points.some((p) => p.value > 0);

  let line = xy.length ? `M ${xy[0].x} ${xy[0].y}` : "";
  for (let i = 1; i < xy.length; i++) {
    const mid = (xy[i - 1].x + xy[i].x) / 2;
    line += ` C ${mid} ${xy[i - 1].y}, ${mid} ${xy[i].y}, ${xy[i].x} ${xy[i].y}`;
  }
  const area = xy.length ? `${line} L ${xy[xy.length - 1].x} ${baseY} L ${xy[0].x} ${baseY} Z` : "";

  const maxTicks = width < 420 ? 4 : 6;
  const tickEvery = Math.max(1, Math.ceil((n - 1) / (maxTicks - 1)));
  const showTick = (i: number) => i === n - 1 || (i % tickEvery === 0 && n - 1 - i >= tickEvery / 2);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - PAD_X) / (rect.width - PAD_X * 2)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const hp = hover !== null ? xy[hover] : null;

  return (
    <div ref={wrapRef} dir="ltr" className="relative">
      <svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={unit}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD_X} x2={width - PAD_X} y1={baseY} y2={baseY} stroke="#EEF0F3" strokeWidth="1" />
        {hasData ? (
          <>
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke="#FF6B35" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            {hp ? (
              <>
                <line x1={hp.x} x2={hp.x} y1={PAD_TOP} y2={baseY} stroke="#FF6B35" strokeOpacity="0.25" strokeWidth="1" />
                <circle cx={hp.x} cy={hp.y} r="3.5" fill="#FF6B35" stroke="#FFFFFF" strokeWidth="1.5" />
              </>
            ) : xy.length > 0 && (
              <circle cx={xy[n - 1].x} cy={xy[n - 1].y} r="3" fill="#FF6B35" stroke="#FFFFFF" strokeWidth="1.5" />
            )}
          </>
        ) : (
          <line x1={PAD_X} x2={width - PAD_X} y1={baseY - plotH / 2} y2={baseY - plotH / 2} stroke="#FF6B35" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="3 5" />
        )}
        {points.map((p, i) => showTick(i) && (
          <text key={i} x={xy[i].x} y={CHART_HEIGHT - 5} fontSize="10.5" fill="#9CA3AF" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{p.tick}</text>
        ))}
      </svg>
      {!hasData && emptyText && (
        <p className="absolute inset-x-0 text-center text-xs text-[#9CA3AF]" style={{ top: PAD_TOP + plotH / 2 - 26 }}>{emptyText}</p>
      )}
      {hover !== null && hp && hasData && (
        <div
          className="absolute z-10 pointer-events-none rounded-lg bg-[#111111] px-2.5 py-1.5 text-[11px] text-white whitespace-nowrap shadow-lg"
          style={{ left: Math.min(Math.max(hp.x, 44), width - 44), top: Math.max(hp.y - 46, 0), transform: "translateX(-50%)" }}
        >
          <span className="text-[#D1D5DB]">{points[hover].label}</span> <span className="font-semibold">{points[hover].value}</span>
        </div>
      )}
    </div>
  );
}

/** Real totals under the chart; nothing shows when there is no data. */
export function ChartSummary({ points, labels }: { points: ChartPoint[]; labels: { total: string; peak: string; average: string } }) {
  const total = points.reduce((s, p) => s + p.value, 0);
  if (total === 0) return null;
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
  const cells = [
    { label: labels.total, value: total.toLocaleString("en-US") },
    { label: labels.peak, value: peak.label },
    { label: labels.average, value: (total / points.length).toFixed(1) },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-black/[0.06]">
      {cells.map((c) => (
        <div key={c.label} className="min-w-0">
          <p className="text-[11px] text-[#9CA3AF] truncate">{c.label}</p>
          <p className="text-sm font-semibold text-[#111111] tabular-nums truncate">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, right, fill = false, children }: { title: string; subtitle?: string; right?: ReactNode; fill?: boolean; children: ReactNode }) {
  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 ${fill ? "h-full flex flex-col" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111111]">{title}</p>
          {subtitle && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {fill ? <div className="flex-1 flex flex-col justify-end">{children}</div> : children}
    </div>
  );
}

export function SeriesToggle<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-[#F3F4F6] p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={o.value === value}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${o.value === value ? "bg-white text-[#111111] shadow-sm" : "text-[#6B7280] hover:text-[#111111]"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GlowRing({ value, emptyText, label }: { value: number | null; emptyText: string; label: string }) {
  const R = 50, C = 2 * Math.PI * R;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const gradientId = useId().replace(/:/g, "");
  // Sweeps in the first time the ring is on screen.
  const ringRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDrawn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ringRef} className="relative mx-auto" style={{ width: 128, height: 128 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF9466" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={R} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        {value !== null && pct > 0 && (
          <circle
            cx="64" cy="64" r={R} fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={drawn ? C * (1 - pct / 100) : C} transform="rotate(-90 64 64)"
            style={{ filter: "drop-shadow(0 0 7px rgba(255,107,53,0.45))", transition: "stroke-dashoffset .6s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        {value === null ? (
          <p className="text-xs text-[#9CA3AF] leading-snug">{emptyText}</p>
        ) : (
          <>
            <p dir="ltr" className="text-[26px] font-semibold text-[#111111] leading-none tabular-nums">{pct}%</p>
            <p className="text-[10px] text-[#9CA3AF] mt-1 leading-tight">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

export interface UsageRow { label: string; used: number; limit: number | null }

/** limit null = unlimited, 0 = not on this plan. */
export function RingCard({ title, value, ringLabel, emptyText, rows, usageTitle, unlimitedLabel, notIncludedLabel, fill = false, legend }: {
  title: string;
  value: number | null;
  ringLabel: string;
  emptyText: string;
  rows: UsageRow[];
  usageTitle: string;
  unlimitedLabel: string;
  notIncludedLabel: string;
  fill?: boolean;
  legend?: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 flex flex-col ${fill ? "h-full" : ""}`}>
      <p className="text-sm font-semibold text-[#111111] mb-3">{title}</p>
      <GlowRing value={value} emptyText={emptyText} label={ringLabel} />
      {legend && value !== null && (
        <div data-testid="ring-legend" className="flex items-center justify-center gap-4 mt-3">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} aria-hidden="true" />
              {l.label} <span className="font-semibold text-[#111111] tabular-nums">{l.value}</span>
            </span>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-black/[0.06] space-y-3">
          <p className="text-[11px] font-medium text-[#6B7280]">{usageTitle}</p>
          {rows.map((r) => {
            const pct = r.limit ? Math.min(100, Math.round((r.used / r.limit) * 100)) : 0;
            const color = pct >= 100 ? "#DC2626" : pct >= 80 ? "#F59E0B" : "#FF6B35";
            return (
              <div key={r.label}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs text-[#374151]">{r.label}</span>
                  <span dir={r.limit ? "ltr" : undefined} className="text-[11px] text-[#6B7280] tabular-nums">
                    {r.limit === null ? unlimitedLabel : r.limit === 0 ? notIncludedLabel : `${r.used.toLocaleString("en-US")} / ${r.limit.toLocaleString("en-US")}`}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#F3F4F6] overflow-hidden">
                  {r.limit ? <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
