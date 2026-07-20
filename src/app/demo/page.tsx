"use client";

import DashboardPageUI from "@/components/dashboard/pages/DashboardPageUI";
import { DEMO_KPIS, DEMO_CONVS, DEMO_APPTS, DEMO_PROFILE } from "@/lib/demo-data";

export default function DemoDashboard() {
  return (
    <DashboardPageUI
      loading={false}
      firstName={DEMO_PROFILE.name.split(" ")[1] ?? "Ahmed"}
      bName={DEMO_PROFILE.business}
      kpis={DEMO_KPIS}
      convs={DEMO_CONVS}
      appts={DEMO_APPTS}
      basePath="/demo"
    />
  );
}
