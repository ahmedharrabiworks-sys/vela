import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  MC_SESSION_COOKIE,
  verifyMcSessionCookie,
} from "@/lib/mission-control-auth";
import {
  getTenantEngagement,
  getTenantActivity,
  getVoiceMarginSummary,
} from "@/lib/mission-control/queries";

// ── Design tokens (identical to overview page) ────────────────────────────────
const T = {
  card:          "#141414",
  border:        "#222",
  row:           "#1a1a1a",
  muted:         "#888",
  accent:        "#FF6B35",
  amber:         "#fbbf24",
  amberBg:       "rgba(251,191,36,0.07)",
  amberBorder:   "rgba(251,191,36,0.22)",
  green:         "#22c55e",
  greenBg:       "rgba(34,197,94,0.1)",
  redBg:         "rgba(239,68,68,0.1)",
  red:           "#ef4444",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function rel(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, [string, string]> = {
    pro:     ["rgba(255,107,53,0.13)", "#FF6B35"],
    premium: ["rgba(168,85,247,0.13)", "#a855f7"],
    starter: ["rgba(120,120,120,0.14)", "#aaa"],
    custom:  ["rgba(34,197,94,0.13)",  "#22c55e"],
  };
  const [bg, color] = map[plan] ?? map.starter;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "0.72rem",
      fontWeight: 600,
      background: bg,
      color,
      textTransform: "capitalize",
    }}>
      {plan}
    </span>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: "4px 8px 10px",
      fontSize: "0.68rem",
      color: T.muted,
      textAlign: right ? "right" : "left",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: on ? T.green : T.red,
      marginRight: "6px",
      verticalAlign: "middle",
    }} />
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 600, color: "#f5f5f5" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p style={{ margin: 0, fontSize: "0.78rem", color: T.muted }}>
      No recent {label}.
    </p>
  );
}

// ── Not-found state ───────────────────────────────────────────────────────────

function NotFound({ id }: { id: string }) {
  return (
    <main style={{ padding: "32px 40px", maxWidth: "1440px", margin: "0 auto" }}>
      <a
        href="/mission-control"
        style={{ fontSize: "0.8rem", color: T.muted, textDecoration: "none", display: "inline-block", marginBottom: "24px" }}
      >
        ← Back to overview
      </a>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "40px", textAlign: "center" }}>
        <p style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600 }}>Tenant not found</p>
        <p style={{ margin: 0, fontSize: "0.8rem", color: T.muted, fontFamily: "monospace" }}>{id}</p>
      </div>
    </main>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TenantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Defense-in-depth: re-verify even though middleware already checked.
  const cookieStore = cookies();
  const sessionValue = cookieStore.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;
  if (!email) redirect("/mission-control/login");

  const tenantId = params.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Fetch the tenant row first — if not found, bail early with a clean UI state.
  const { data: tenantRow } = await admin
    .from("tenants")
    .select("id, business_name, plan, created_at, industry, city")
    .eq("id", tenantId)
    .single();

  if (!tenantRow) return <NotFound id={tenantId} />;

  // Fetch all per-tenant data in parallel; failures degrade gracefully.
  const [engagementR, activityR, voiceAllR] = await Promise.allSettled([
    getTenantEngagement(admin, tenantId),
    getTenantActivity(admin, tenantId, 20),
    getVoiceMarginSummary(admin),
  ]);

  const eng      = engagementR.status  === "fulfilled" ? engagementR.value  : null;
  const activity = activityR.status    === "fulfilled" ? activityR.value    : null;
  const voiceAll = voiceAllR.status    === "fulfilled" ? voiceAllR.value    : null;
  const voiceRow = voiceAll?.tenants.find(t => t.tenantId === tenantId) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convs  = (activity?.recentConversations  ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads  = (activity?.recentLeads          ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appts  = (activity?.recentAppointments   ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls  = (activity?.recentCalls          ?? []) as any[];

  return (
    <main style={{ padding: "32px 40px", maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{
        marginBottom: "28px",
        paddingBottom: "20px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <a
          href="/mission-control"
          style={{ fontSize: "0.78rem", color: T.muted, textDecoration: "none", display: "inline-block", marginBottom: "12px" }}
        >
          ← Back to overview
        </a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Mission Control / Tenant
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                {tenantRow.business_name}
              </h1>
              <PlanBadge plan={tenantRow.plan} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: T.muted }}>
              {[tenantRow.industry, tenantRow.city].filter(Boolean).join(" · ") || "—"}
              {" · Created "}
              {fmtDate(tenantRow.created_at)}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.muted, textAlign: "right" }}>{email}</p>
        </div>
      </div>

      {/* ── Row 1: Engagement + Voice ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* Engagement */}
        <SectionCard title="Engagement">
          {eng ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {(
                [
                  {
                    label: "Last Sign-In",
                    value: eng.lastSignInAt
                      ? `${rel(eng.lastSignInAt)} (${fmtDate(eng.lastSignInAt)})`
                      : "Never",
                    warn: !eng.lastSignInAt || (eng.daysSinceLastSignIn ?? 0) >= 14,
                  },
                  {
                    label: "Website",
                    value: eng.websitePublished ? "Published" : "Not published",
                    ok: eng.websitePublished,
                  },
                  {
                    label: "Instagram",
                    value: eng.instagramConnected ? "Connected" : "Not connected",
                    ok: eng.instagramConnected,
                  },
                  {
                    label: "WhatsApp",
                    value: eng.whatsappConnected ? "Connected" : "Not connected",
                    ok: eng.whatsappConnected,
                  },
                  {
                    label: "KB Last Updated",
                    value: eng.kbLastUpdatedAt
                      ? `${rel(eng.kbLastUpdatedAt)} (${fmtDate(eng.kbLastUpdatedAt)})`
                      : "Never trained",
                    warn: !eng.kbLastUpdatedAt,
                  },
                ] as Array<{ label: string; value: string; ok?: boolean; warn?: boolean }>
              ).map(({ label, value, ok, warn }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: `1px solid ${T.row}`,
                  }}
                >
                  <span style={{ fontSize: "0.78rem", color: T.muted }}>{label}</span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: warn ? T.amber : ok === true ? T.green : ok === false ? T.red : "#f5f5f5",
                    textAlign: "right",
                  }}>
                    {ok !== undefined && <StatusDot on={ok} />}
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.8rem", color: T.muted }}>Error loading engagement data</p>
          )}
        </SectionCard>

        {/* Voice margin for this tenant */}
        <SectionCard title="Voice: This Month">
          <p style={{ margin: "0 0 14px", fontSize: "0.68rem", color: T.muted, fontStyle: "italic" }}>
            Voice cost ($0.12/min) vs. theoretical plan revenue. Not actual profit margin.
          </p>
          {voiceRow ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {(
                [
                  ["Voice Minutes",             `${voiceRow.voiceMinutesUsed} min`],
                  ["Voice Cost",                `$${voiceRow.voiceCostUSD.toFixed(2)}`],
                  ["Theoretical Plan Revenue",  `$${voiceRow.theoreticalMRR}/mo`],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label} style={{
                  padding: "12px",
                  background: "#0a0a0a",
                  borderRadius: "6px",
                  border: `1px solid ${T.row}`,
                }}>
                  <p style={{ margin: "0 0 3px", fontSize: "0.63rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {val}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.8rem", color: T.muted }}>
              No voice data available for this tenant.
            </p>
          )}
        </SectionCard>
      </div>

      {/* ── Row 2: Conversations + Leads ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* Recent conversations */}
        <SectionCard title={`Recent Conversations (${convs.length})`}>
          {convs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                    <Th>Channel</Th>
                    <Th right>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {convs.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.row}` }}>
                      <td style={{ padding: "8px 8px", fontSize: "0.8rem", textTransform: "capitalize" }}>
                        {c.channel ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontSize: "0.75rem", color: T.muted, whiteSpace: "nowrap" }}>
                        {fmtDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="conversations" />
          )}
        </SectionCard>

        {/* Recent leads */}
        <SectionCard title={`Recent Leads (${leads.length})`}>
          {leads.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                    <Th>Name</Th>
                    <Th>Channel</Th>
                    <Th>Status</Th>
                    <Th right>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} style={{ borderBottom: `1px solid ${T.row}` }}>
                      <td style={{ padding: "8px 8px", fontSize: "0.8rem" }}>{l.name ?? "—"}</td>
                      <td style={{ padding: "8px 8px", fontSize: "0.75rem", color: T.muted, textTransform: "capitalize" }}>
                        {l.channel ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", fontSize: "0.75rem", textTransform: "capitalize" }}>
                        {l.status ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontSize: "0.75rem", color: T.muted, whiteSpace: "nowrap" }}>
                        {fmtDate(l.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="leads" />
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Appointments + Calls ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Recent appointments */}
        <SectionCard title={`Recent Appointments (${appts.length})`}>
          {appts.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                    <Th>Contact</Th>
                    <Th>Service</Th>
                    <Th>Status</Th>
                    <Th right>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {appts.map((a, i) => (
                    <tr key={a.id ?? i} style={{ borderBottom: `1px solid ${T.row}` }}>
                      <td style={{ padding: "8px 8px", fontSize: "0.8rem" }}>
                        {a.contact_name ?? a.name ?? a.lead_name ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", fontSize: "0.75rem", color: T.muted }}>
                        {a.service_name ?? a.service ?? a.type ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", fontSize: "0.75rem", textTransform: "capitalize" }}>
                        {a.status ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontSize: "0.75rem", color: T.muted, whiteSpace: "nowrap" }}>
                        {fmtDate(a.scheduled_at ?? a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="appointments" />
          )}
        </SectionCard>

        {/* Recent calls */}
        <SectionCard title={`Recent Calls (${calls.length})`}>
          {calls.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                    <Th>Type</Th>
                    <Th>Outcome</Th>
                    <Th right>Duration</Th>
                    <Th right>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.row}` }}>
                      <td style={{ padding: "8px 8px", fontSize: "0.8rem", textTransform: "capitalize" }}>
                        {c.call_type ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", fontSize: "0.75rem", color: T.muted, textTransform: "capitalize" }}>
                        {c.outcome ?? "—"}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" }}>
                        {fmtDuration(c.duration_seconds)}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontSize: "0.75rem", color: T.muted, whiteSpace: "nowrap" }}>
                        {fmtDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="calls" />
          )}
        </SectionCard>
      </div>

    </main>
  );
}
