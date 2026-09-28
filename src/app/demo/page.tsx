"use client";

import { useState } from "react";
import DashboardPageUI, { type Range } from "@/components/dashboard/pages/DashboardPageUI";
import { DEMO_DASHBOARD_V2 } from "@/lib/demo-data";

export default function DemoDashboard() {
  const [range, setRange] = useState<Range>("30d");

  return (
    <DashboardPageUI
      data={{ ...DEMO_DASHBOARD_V2, range }}
      loading={false}
      error={false}
      range={range}
      onRangeChange={setRange}
      onRetry={() => {}}
      onExport={() => {}}
      businessName={DEMO_DASHBOARD_V2.businessName}
      showOnboardingBanner={false}
      onDismissOnboarding={() => {}}
      showKbBanner={false}
      kbScore={100}
      onDismissKbBanner={() => {}}
      basePath="/demo"
    />
  );
}
