"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import DashboardPageUI from "@/components/dashboard/pages/DashboardPageUI";
import { ResumeLastAppRoute } from "@/lib/last-route";
import type { ChangeInfo } from "@/lib/stats";

type Conv = { id: string; customer_name: string | null; channel: string; preview: string; time: string; isNew: boolean };
type Appt = { id: string; time: string; name: string; service: string; status: string };
// FIX 6 (round Q): change is now always a real ChangeInfo (pct and/or
// isNew), never undefined -- see lib/stats.ts's ChangeInfo for why.
type KPI  = { label: string; value: string; change?: ChangeInfo };
// Round M5 FIX 7 (Dashboard redesign): a compact merged feed of real events
// already fetched for the Conversations/Appointments widgets -- no new
// queries, just a derived, timestamp-sorted view of data already in state.
type ActivityItem = { id: string; type: "conversation" | "appointment"; label: string; sub: string; time: string; ts: number };
type LeadPipeline = { new: number; contacted: number; qualified: number; booked: number; client: number };

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
  const [aiResolutionRate, setAiResolutionRate] = useState<number | null>(null);
  // Round M5 FIX 7 (Dashboard redesign): AI Activity panel + Lead Pipeline
  // bar + Recent Activity timeline -- all real, all sourced from data
  // already computed by getDashboardStats/already fetched for other widgets.
  const [needsHumanCount, setNeedsHumanCount] = useState(0);
  const [leadPipeline, setLeadPipeline] = useState<LeadPipeline>({ new: 0, contacted: 0, qualified: 0, booked: 0, client: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

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
      .select("id, business_name")
      .eq("owner_id", user.id)
      .single();

    if (!tenant) { setLoading(false); return; }

    const name = (user.user_metadata?.full_name as string | undefined) || "";
    setFirstName(name.split(" ")[0] || "");
    setBName(tenant.business_name || "");

    const tenantId = tenant.id as string;

    // Load data in parallel — leads are no longer queried directly here;
    // KPI counts (including leadsToday) come from /api/stats below, which
    // is also the source of truth used by Analytics for consistency.
    // Round M2 FIX 10: both queries below previously had no deleted_at
    // filter -- a soft-deleted today's appointment briefly inflated the
    // fast-path KPI (apptCountFast) before /api/stats resolves, and a
    // soft-deleted conversation could still appear in the Recent
    // Conversations widget.
    const [apptRes, convRes, configRes] = await Promise.all([
      db.from("appointments")
        // Round M5 FIX 7: created_at added for the Recent Activity timeline
        // (real "when was this appointment booked" signal) -- purely
        // additive to the projection, does not change the filter/order/
        // limit or any existing behavior of this query.
        .select("id, service_name, datetime, status, created_at, leads(name)")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("datetime", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("datetime", new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
        .order("datetime", { ascending: true })
        .limit(5),
      db.from("conversations")
        .select("id, customer_name, channel, last_message_at")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false })
        .limit(5),
      db.from("tenant_config")
        .select("instagram_connected, whatsapp_connected, knowledge_base")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    // KPIs — real "today" command-center view (leads/appointments/messages/
    // calls today + AI Resolution Rate), sourced from /api/stats (server-side,
    // real queries against leads/appointments/messages/agent_calls/conversations).
    // Round M5 FIX 7: this used to set a hardcoded "0" placeholder for 3 of
    // the 4 KPIs immediately, THEN call setLoading(false) at the end of this
    // function WITHOUT waiting for the /api/stats fetch above (a bare
    // fire-and-forget .then(), never awaited) -- the skeleton disappeared
    // and the real card layout rendered with those stale zeros already in
    // state, then visibly snapped to the real numbers once /api/stats
    // actually resolved a moment later. Same class of premature-render bug
    // already fixed on Analytics (planLoaded) -- fixed here by awaiting
    // /api/stats inline and only ever setting kpis to their real, final
    // values in one atomic update, so the skeleton (loading=true) covers the
    // entire real wait, never a flash of zero.
    const apptCountFast = (apptRes.data ?? []).length;
    let statsResult: {
      leadsToday?: number; appointmentsToday?: number; messagesToday?: number; callsToday?: number;
      aiResolutionRate?: number | null;
      leadsTodayChange?: ChangeInfo; appointmentsTodayChange?: ChangeInfo; messagesTodayChange?: ChangeInfo; callsTodayChange?: ChangeInfo;
      needsHumanCount?: number;
      leadPipeline?: LeadPipeline;
    } | null = null;
    try {
      const statsRes = await fetch("/api/stats");
      statsResult = await statsRes.json();
    } catch (err) {
      console.error("[dashboard] /api/stats fetch failed:", err);
    }
    setKpis([
      { label: "kpiLeadsToday",        value: String(statsResult?.leadsToday ?? 0),        change: statsResult?.leadsTodayChange },
      { label: "kpiAppointmentsToday", value: String(statsResult?.appointmentsToday ?? apptCountFast), change: statsResult?.appointmentsTodayChange },
      { label: "kpiMessagesToday",     value: String(statsResult?.messagesToday ?? 0),      change: statsResult?.messagesTodayChange },
      { label: "kpiCallsToday",        value: String(statsResult?.callsToday ?? 0),         change: statsResult?.callsTodayChange },
    ]);
    setAiResolutionRate(statsResult?.aiResolutionRate ?? null);
    setNeedsHumanCount(statsResult?.needsHumanCount ?? 0);
    setLeadPipeline(statsResult?.leadPipeline ?? { new: 0, contacted: 0, qualified: 0, booked: 0, client: 0 });

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
          .eq("is_test", false)
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
    type ApptRaw = { id: string; service_name: string | null; datetime: string; status: string; created_at?: string; leads?: { name: string | null } | null };
    const rawAppts = (apptRes.data ?? []) as ApptRaw[];
    setAppts(
      rawAppts.map((a) => ({
        id: a.id,
        // FIX 2 (round M): timeZone: "UTC" -- see the matching comment in
        // src/app/app/appointments/page.tsx. datetime is stored as literal
        // wall-clock digits with no real tenant timezone conversion; without
        // this, a viewer's browser timezone silently shifts the displayed
        // hour away from what was actually booked/saved.
        time: new Date(a.datetime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
        name: a.leads?.name ?? t("dashboard.unknown"),
        service: a.service_name ?? t("dashboard.defaultService"),
        status: a.status,
      }))
    );

    // Round M5 FIX 7: Recent Activity timeline -- a real, timestamp-sorted
    // merge of the two event feeds already fetched above (conversations by
    // last_message_at, appointments by created_at = when the booking was
    // actually made, not its future scheduled slot). No new queries.
    const convActivity: ActivityItem[] = rawConvs
      .filter((c) => !!c.last_message_at)
      .map((c) => ({
        id: `conv-${c.id}`,
        type: "conversation" as const,
        label: c.customer_name ?? t("dashboard.unknown"),
        sub: t("dashboard.activityNewMessage"),
        time: timeAgo(c.last_message_at, t),
        ts: new Date(c.last_message_at as string).getTime(),
      }));
    const apptActivity: ActivityItem[] = rawAppts
      .filter((a) => !!a.created_at)
      .map((a) => ({
        id: `appt-${a.id}`,
        type: "appointment" as const,
        label: a.leads?.name ?? t("dashboard.unknown"),
        sub: a.service_name ?? t("dashboard.defaultService"),
        time: timeAgo(a.created_at as string, t),
        ts: new Date(a.created_at as string).getTime(),
      }));
    setActivity([...convActivity, ...apptActivity].sort((x, y) => y.ts - x.ts).slice(0, 6));

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
    <>
      <ResumeLastAppRoute />
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
        aiResolutionRate={aiResolutionRate}
        needsHumanCount={needsHumanCount}
        leadPipeline={leadPipeline}
        activity={activity}
      />
    </>
  );
}
