"use client";

import { useState } from "react";
import DashboardPageUI, { type DashboardPayload, type Range } from "@/components/dashboard/pages/DashboardPageUI";
import { DEMO_DASHBOARD_V2 } from "@/lib/demo-data";

// Zero-state fixture -- brand-new tenant, no channel connected yet, no
// data ever (hasAnyDataEver: false), every KPI 0 with no trend pill (prior
// period is also 0 -- computeTrendPill's real "no pill when prior=0" rule
// applies here too, this isn't a special-cased empty-state override).
const ZERO_STATE: DashboardPayload = {
  businessName: "New Business",
  range: "30d",
  kpis: {
    conversations: { value: 0, previous: 0, trend: null },
    appointments: { value: 0, previous: 0, trend: null },
    aiResolutionRate: { value: null, previous: null, trend: null },
    newCustomers: { value: 0, previous: 0, trend: null },
  },
  series: {
    conversations: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      return { bucket: key, label: key, value: 0 };
    }),
    appointments: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      return { bucket: key, label: key, value: 0 };
    }),
  },
  channels: [],
  connectedChannels: { whatsapp: false, instagram: false, phone: false },
  hasAnyDataEver: false,
  plan: "starter",
  usage: {
    messages: { used: 0, limit: 500 },
    voiceMinutes: { used: 0, limit: 0 },
  },
};

// A connected-but-quiet tenant: channels exist, some history exists, but
// the CURRENT period has zero activity and the previous period ALSO has
// real (non-zero) history -- a genuine "0% change" case, distinct from
// "no pill" (prior=0). Exercises computeTrendPill's `pct: 0`... actually a
// real 0-vs-nonzero-previous case, which IS a real pill (a real decline to
// zero), not a suppressed one -- included specifically to prove the two
// "zero-looking" states render differently and correctly.
const QUIET_PERIOD: DashboardPayload = {
  ...DEMO_DASHBOARD_V2,
  businessName: "Quiet Period Co",
  kpis: {
    conversations: { value: 0, previous: 42, trend: { direction: "down", pct: -100 } },
    appointments: { value: 0, previous: 12, trend: { direction: "down", pct: -100 } },
    aiResolutionRate: { value: null, previous: 88, trend: null },
    newCustomers: { value: 0, previous: 6, trend: { direction: "down", pct: -100 } },
  },
  series: {
    conversations: DEMO_DASHBOARD_V2.series.conversations.map((p) => ({ ...p, value: 0 })),
    appointments: DEMO_DASHBOARD_V2.series.appointments.map((p) => ({ ...p, value: 0 })),
  },
  hasAnyDataEver: true,
};

const VARIANTS: Record<string, DashboardPayload> = {
  populated: DEMO_DASHBOARD_V2,
  zero: ZERO_STATE,
  quiet: QUIET_PERIOD,
};

export default function DashboardPreviewClient() {
  const [variant, setVariant] = useState<keyof typeof VARIANTS>("populated");
  const [range, setRange] = useState<Range>("30d");
  const data = { ...VARIANTS[variant], range };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0D] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto mb-6 flex items-center gap-2">
        {(Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]).map((v) => (
          <button key={v} onClick={() => setVariant(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${variant === v ? "bg-[#FF6B35] text-white border-[#FF6B35]" : "border-[#E5E7EB] text-[#374151] dark:text-[#D1D5DB] dark:border-white/10"}`}>
            {v}
          </button>
        ))}
        <span className="text-xs text-[#9CA3AF] ml-2">dev-only preview, never deployed in production</span>
      </div>
      <DashboardPageUI
        data={data}
        loading={false}
        error={false}
        range={range}
        onRangeChange={setRange}
        onRetry={() => {}}
        onExport={() => {}}
        businessName={data.businessName}
        showOnboardingBanner={variant === "zero"}
        onDismissOnboarding={() => {}}
        showKbBanner={false}
        kbScore={variant === "zero" ? 0 : 100}
        onDismissKbBanner={() => {}}
      />
    </div>
  );
}
