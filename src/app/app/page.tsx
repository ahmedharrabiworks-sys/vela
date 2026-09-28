"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import DashboardPageUI, { type DashboardPayload, type Range } from "@/components/dashboard/pages/DashboardPageUI";
import { ResumeLastAppRoute } from "@/lib/last-route";

export default function DashboardPage() {
  const [bName, setBName] = useState("");
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [kbScore, setKbScore] = useState(100); // default high -> no flash before load
  const [kbBannerDismissed, setKbBannerDismissed] = useState(false);

  const loadDashboard = useCallback(async (r: Range) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/dashboard?range=${r}`);
      if (!res.ok) { setError(true); setLoading(false); return; }
      const json = await res.json() as DashboardPayload;
      setData(json);
      setBName(json.businessName || "");
    } catch (err) {
      console.error("[dashboard] fetch failed:", err);
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem("vela_onboarding_banner_dismissed") === "true");
    setKbBannerDismissed(localStorage.getItem("vela_training_banner_dismissed") === "true");
    void loadOnboardingAndKb();
    void loadDashboard(range);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadDashboard(range);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function loadOnboardingAndKb() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data: tenant } = await db.from("tenants").select("id").eq("owner_id", user.id).single();
    if (!tenant) return;

    const { data: cfg } = await db
      .from("tenant_config")
      .select("instagram_connected, whatsapp_connected, knowledge_base")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const channelDone = cfg?.instagram_connected || cfg?.whatsapp_connected;
    const ob = JSON.parse(localStorage.getItem("vela_onboarding") || "{}") as Record<string, boolean>;
    const allDone = !!channelDone && !!ob.aiDone && !!ob.websiteDone;
    setOnboardingDone(allDone);

    let score = 100;
    if (cfg?.knowledge_base) {
      try {
        const kb = JSON.parse(cfg.knowledge_base) as {
          services?: Array<{ name: string }>; faqs?: Array<{ q: string }>;
          business?: { hours?: string; address?: string; bookingPolicy?: string }; extra?: string;
        };
        const checks = [
          kb.services?.some((s) => s.name?.trim()),
          kb.faqs?.some((f) => f.q?.trim()),
          !!kb.business?.hours?.trim(),
          !!kb.business?.address?.trim(),
          !!kb.business?.bookingPolicy?.trim(),
          !!kb.extra?.trim(),
        ];
        score = Math.round((checks.filter(Boolean).length / 6) * 100);
      } catch { /* ignore */ }
    } else {
      score = 0;
    }
    setKbScore(score);
  }

  const showBanner = !onboardingDone && !bannerDismissed;
  const showKbBanner = !loading && kbScore < 30 && !kbBannerDismissed && onboardingDone;

  const dismissBanner = () => {
    localStorage.setItem("vela_onboarding_banner_dismissed", "true");
    setBannerDismissed(true);
  };
  const dismissKbBanner = () => {
    localStorage.setItem("vela_training_banner_dismissed", "true");
    setKbBannerDismissed(true);
  };

  const handleExport = () => {
    window.location.href = `/api/dashboard/export?range=${range}`;
  };

  return (
    <>
      <ResumeLastAppRoute />
      <DashboardPageUI
        data={data}
        loading={loading}
        error={error}
        range={range}
        onRangeChange={setRange}
        onRetry={() => loadDashboard(range)}
        onExport={handleExport}
        businessName={bName}
        showOnboardingBanner={showBanner}
        onDismissOnboarding={dismissBanner}
        showKbBanner={showKbBanner}
        kbScore={kbScore}
        onDismissKbBanner={dismissKbBanner}
      />
    </>
  );
}
