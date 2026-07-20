"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import DashboardPageUI from "@/components/dashboard/pages/DashboardPageUI";

type Conv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
type Appt = { id: string; time: string; name: string; service: string; status: string };
type KPI  = { label: string; value: string; change?: number };

function timeAgo(ts: string | null, t: (key: string) => string) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return t("dashboard.timeNow");
  if (diff < 3600) return `${Math.floor(diff / 60)}${t("dashboard.timeMinutes")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t("dashboard.timeHours")}`;
  return `${Math.floor(diff / 86400)}${t("dashboard.timeDays")}`;
}


export default function DashboardPage() {
  const { t } = useI18n();
  const [firstName, setFirstName]   = useState("");
  const [bName, setBName]           = useState("");
  const [kpis, setKpis]             = useState<KPI[]>([]);
  const [convs, setConvs]           = useState<Conv[]>([]);
  const [appts, setAppts]           = useState<Appt[]>([]);
  const [loading, setLoading]       = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [kbScore, setKbScore]       = useState(100); // default high → no flash before load
  const [kbBannerDismissed, setKbBannerDismissed] = useState(false);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem("vela_onboarding_banner_dismissed") === "true");
    setKbBannerDismissed(localStorage.getItem("vela_training_banner_dismissed") === "true");
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabase() as any;
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: tenant } = await db
      .from("tenants")
      .select("id, business_name, owner_name")
      .eq("owner_id", user.id)
      .single();

    if (!tenant) { setLoading(false); return; }

    const name = (user.user_metadata?.full_name as string | undefined) || "";
    setFirstName(name.split(" ")[0] || "");
    setBName(tenant.business_name || "");

    const tenantId = tenant.id as string;

    // Load data in parallel
    const [leadsRes, apptRes, convRes, configRes] = await Promise.all([
      db.from("leads").select("id, status").eq("tenant_id", tenantId),
      db.from("appointments")
        .select("id, service_name, datetime, status, leads(name)")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .gte("datetime", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("datetime", new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
        .order("datetime", { ascending: true })
        .limit(5),
      db.from("conversations")
        .select("id, customer_name, channel, last_message_at")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false })
        .limit(5),
      db.from("tenant_config")
        .select("instagram_connected, whatsapp_connected, knowledge_base")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    // KPIs
    const leads = (leadsRes.data ?? []) as Array<{ id: string; status: string }>;
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const apptCount = (apptRes.data ?? []).length;

    // Fetch week-over-week stats in background
    fetch("/api/stats")
      .then((r) => r.json())
      .then((stats: { newLeadsChange?: number; appointmentsChange?: number; conversationsChange?: number }) => {
        setKpis([
          { label: "kpiTotalLeads",        value: String(totalLeads),  change: stats.newLeadsChange },
          { label: "kpiNewLeads",          value: String(newLeads),    change: stats.newLeadsChange },
          { label: "kpiAppointmentsToday", value: String(apptCount),   change: stats.appointmentsChange },
        ]);
      })
      .catch(() => null);

    setKpis([
      { label: "kpiTotalLeads",        value: String(totalLeads) },
      { label: "kpiNewLeads",          value: String(newLeads)   },
      { label: "kpiAppointmentsToday", value: String(apptCount) },
    ]);

    // Conversations
    const rawConvs = (convRes.data ?? []) as Array<{
      id: string; customer_name: string | null; channel: string; last_message_at: string | null;
    }>;

    const enriched = await Promise.all(
      rawConvs.map(async (c) => {
        const { data: msgs } = await db
          .from("messages")
          .select("role, content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const last = (msgs ?? [])[0] as { role: string; content: string } | undefined;
        return {
          id: c.id,
          customer_name: c.customer_name,
          channel: c.channel,
          preview: last?.content?.slice(0, 55) ?? "",
          time: timeAgo(c.last_message_at, t),
          isNew: last?.role === "user",
        };
      })
    );
    setConvs(enriched);

    // Appointments
    type ApptRaw = { id: string; service_name: string | null; datetime: string; status: string; leads?: { name: string | null } | null };
    const rawAppts = (apptRes.data ?? []) as ApptRaw[];
    setAppts(
      rawAppts.map((a) => ({
        id: a.id,
        time: new Date(a.datetime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        name: a.leads?.name ?? t("dashboard.unknown"),
        service: a.service_name ?? t("dashboard.defaultService"),
        status: a.status,
      }))
    );

    // Onboarding + KB score
    const cfg = configRes.data as { instagram_connected?: boolean; whatsapp_connected?: boolean; knowledge_base?: string } | null;
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
      score = 0; // no knowledge base at all
    }
    setKbScore(score);

    setLoading(false);
  }

  const showBanner    = !onboardingDone && !bannerDismissed;
  const showKbBanner  = !loading && kbScore < 30 && !kbBannerDismissed && onboardingDone;

  const dismissBanner = () => {
    localStorage.setItem("vela_onboarding_banner_dismissed", "true");
    setBannerDismissed(true);
  };

  const dismissKbBanner = () => {
    localStorage.setItem("vela_training_banner_dismissed", "true");
    setKbBannerDismissed(true);
  };

  return (
    <DashboardPageUI
      loading={loading}
      firstName={firstName}
      bName={bName}
      kpis={kpis}
      convs={convs}
      appts={appts}
      showBanner={showBanner}
      onDismissBanner={dismissBanner}
      showKbBanner={showKbBanner}
      kbScore={kbScore}
      onDismissKbBanner={dismissKbBanner}
    />
  );
}
