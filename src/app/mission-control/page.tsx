import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import {
  MC_SESSION_COOKIE,
  verifyMcSessionCookie,
} from "@/lib/mission-control-auth";
import {
  getTenantRoster,
  getTheoreticalMRR,
  getVoiceMarginSummary,
  getPlatformActivitySummary,
  getAtRiskTenants,
} from "@/lib/mission-control/queries";

// ── Design tokens (dark, matching layout.tsx) ─────────────────────────────────
const T = {
  card:         "#141414",
  border:       "#222",
  row:          "#1a1a1a",
  muted:        "#888",
  accent:       "#FF6B35",
  amber:        "#fbbf24",
  amberBg:      "rgba(251,191,36,0.07)",
  amberBorder:  "rgba(251,191,36,0.22)",
  amberRowBorder: "rgba(251,191,36,0.08)",
};

function n(v: number) {
  return v.toLocaleString("en-US");
}

// ── Sub-components (Server Components — no state/effects) ─────────────────────

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

function RiskTag({ factor }: { factor: string }) {
  const labels: Record<string, string> = {
    no_recent_login:  "no login 14d+",
    kb_never_trained: "KB untrained",
    no_recent_calls:  "no calls 30d",
  };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 7px",
      borderRadius: "3px",
      fontSize: "0.68rem",
      fontWeight: 600,
      background: "rgba(251,191,36,0.14)",
      color: T.amber,
      marginRight: "4px",
      whiteSpace: "nowrap",
    }}>
      {labels[factor] ?? factor}
    </span>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 16px", fontSize: "0.85rem", fontWeight: 600, color: "#f5f5f5" }}>
      {children}
    </p>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MissionControlHome() {
  // Defense-in-depth: re-verify even though middleware already checked every request.
  const cookieStore = cookies();
  const sessionValue = cookieStore.get(MC_SESSION_COOKIE)?.value ?? "";
  const email = sessionValue ? await verifyMcSessionCookie(sessionValue) : null;
  if (!email) redirect("/mission-control/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Fetch all sections in parallel; a single failed query doesn't break the page.
  const [rosterR, mrrR, voiceR, activityR, atRiskR] = await Promise.allSettled([
    getTenantRoster(admin),
    getTheoreticalMRR(admin),
    getVoiceMarginSummary(admin),
    getPlatformActivitySummary(admin),
    getAtRiskTenants(admin),
  ]);

  const roster   = rosterR.status   === "fulfilled" ? rosterR.value   : null;
  const mrr      = mrrR.status      === "fulfilled" ? mrrR.value      : null;
  const voice    = voiceR.status    === "fulfilled" ? voiceR.value    : null;
  const activity = activityR.status === "fulfilled" ? activityR.value : null;
  const atRisk   = atRiskR.status   === "fulfilled" ? atRiskR.value   : null;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const voiceActive = voice?.tenants.filter(t => t.voiceMinutesUsed > 0) ?? [];

  return (
    <main style={{ padding: "32px 40px", maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "28px",
        paddingBottom: "20px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Mission Control
          </p>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Overview</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: T.muted }}>{dateStr}</p>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: T.muted }}>{email}</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "28px",
      }}>

        {/* Theoretical MRR */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Theoretical MRR
          </p>
          <p style={{ margin: "0 0 6px", fontSize: "1.875rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {mrr ? `$${n(mrr.theoreticalMRR)}` : "—"}
          </p>
          <p style={{ margin: 0, fontSize: "0.68rem", color: T.muted }}>
            Plan price × tenants. Not actual billing
          </p>
        </div>

        {/* Tenant count */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Total Tenants
          </p>
          <p style={{ margin: "0 0 6px", fontSize: "1.875rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {roster ? n(roster.totalCount) : "—"}
          </p>
          <p style={{ margin: 0, fontSize: "0.68rem", color: T.muted }}>Active accounts</p>
        </div>

        {/* This-month activity */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Activity This Month
          </p>
          {activity ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {(
                [
                  ["Conversations", activity.conversations],
                  ["Leads",         activity.leads],
                  ["Appointments",  activity.appointments],
                  ["Calls",         activity.calls],
                ] as [string, number][]
              ).map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: T.muted }}>{label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{n(val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.85rem", color: T.muted }}>Error</p>
          )}
        </div>

        {/* At-risk */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "0.68rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            At-Risk (behavioral)
          </p>
          <p style={{
            margin: "0 0 6px",
            fontSize: "1.875rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: atRisk && atRisk.length > 0 ? T.amber : "#f5f5f5",
          }}>
            {atRisk ? n(atRisk.length) : "—"}
          </p>
          <p style={{ margin: 0, fontSize: "0.68rem", color: T.muted }}>Proxy signals. Never "churned"</p>
        </div>
      </div>

      {/* ── Plan breakdown + Voice margin ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>

        {/* Plan breakdown */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <SectionHead>Plan Breakdown</SectionHead>
          {mrr ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                    <Th>Plan</Th>
                    <Th right>Tenants</Th>
                    <Th right>Unit / mo</Th>
                    <Th right>Subtotal / mo</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...mrr.byPlan]
                    .sort((a, b) => b.subtotal - a.subtotal)
                    .map(row => (
                    <tr key={row.plan} style={{ borderBottom: `1px solid ${T.row}` }}>
                      <td style={{ padding: "9px 8px" }}><PlanBadge plan={row.plan} /></td>
                      <td style={{ padding: "9px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.875rem" }}>{row.count}</td>
                      <td style={{ padding: "9px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.875rem", color: T.muted }}>${n(row.pricePerTenant)}</td>
                      <td style={{ padding: "9px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.875rem", fontWeight: 600 }}>${n(row.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ padding: "10px 8px", textAlign: "right", fontSize: "0.72rem", color: T.muted }}>
                      Theoretical Total
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: T.accent }}>
                      ${n(mrr.theoreticalMRR)}/mo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p style={{ color: T.muted, fontSize: "0.85rem", margin: 0 }}>Error loading plan data</p>
          )}
        </div>

        {/* Voice margin */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
          <SectionHead>Voice Margin: This Month</SectionHead>
          {voice ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {(
                  [
                    ["Voice Minutes",    `${n(voice.aggregate.totalVoiceMinutes)} min`],
                    ["Voice Cost",       `$${voice.aggregate.totalVoiceCostUSD.toFixed(2)}`],
                    ["Theoretical MRR",  `$${n(voice.aggregate.totalTheoreticalMRR)}`],
                  ] as [string, string][]
                ).map(([label, val]) => (
                  <div key={label} style={{
                    padding: "12px",
                    background: "#0a0a0a",
                    borderRadius: "6px",
                    border: `1px solid ${T.row}`,
                  }}>
                    <p style={{ margin: "0 0 3px", fontSize: "0.63rem", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{val}</p>
                  </div>
                ))}
              </div>

              {voiceActive.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                        <Th>Business</Th>
                        <Th>Plan</Th>
                        <Th right>Minutes</Th>
                        <Th right>Cost</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...voiceActive]
                        .sort((a, b) => b.voiceMinutesUsed - a.voiceMinutesUsed)
                        .map(t => (
                        <tr key={t.tenantId} style={{ borderBottom: `1px solid ${T.row}` }}>
                          <td style={{ padding: "7px 8px", fontSize: "0.8rem" }}>{t.businessName}</td>
                          <td style={{ padding: "7px 8px" }}><PlanBadge plan={t.plan} /></td>
                          <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" }}>{n(t.voiceMinutesUsed)}</td>
                          <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.8rem" }}>${t.voiceCostUSD.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: "0.78rem", color: T.muted, margin: 0 }}>
                  No voice usage this month.{" "}
                  <span style={{ color: "#555" }}>
                    VAPI_WEBHOOK_SECRET credential pending (Hard Rule 20. Add on final integration day).
                  </span>
                </p>
              )}
            </>
          ) : (
            <p style={{ color: T.muted, fontSize: "0.85rem", margin: 0 }}>Error loading voice data</p>
          )}
        </div>
      </div>

      {/* ── At-risk tenants ── */}
      {atRisk !== null && (
        <div style={{
          background: atRisk.length > 0 ? T.amberBg : T.card,
          border: `1px solid ${atRisk.length > 0 ? T.amberBorder : T.border}`,
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
            {atRisk.length > 0 && (
              <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>⚠</span>
            )}
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: atRisk.length > 0 ? T.amber : "#f5f5f5" }}>
              At-Risk (behavioral){atRisk.length > 0 ? `: ${n(atRisk.length)} tenant${atRisk.length !== 1 ? "s" : ""}` : ": none"}
            </p>
            <span style={{
              marginLeft: "auto",
              fontSize: "0.68rem",
              color: T.muted,
              fontStyle: "italic",
            }}>
              Proxy signals only. Never labeled as churned. Signals: no login 14d+ / KB untrained / no calls 30d.
            </span>
          </div>

          {atRisk.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.amberBorder}` }}>
                    <Th>Business Name</Th>
                    <Th>Plan</Th>
                    <Th>Risk Factors</Th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map(t => (
                    <tr key={t.tenantId} style={{ borderBottom: `1px solid ${T.amberRowBorder}` }}>
                      <td style={{ padding: "9px 8px", fontSize: "0.8rem" }}>
                        <a
                          href={`/mission-control/tenants/${t.tenantId}`}
                          style={{ color: "#f5f5f5", textDecoration: "none" }}
                        >
                          {t.businessName}
                        </a>
                      </td>
                      <td style={{ padding: "9px 8px" }}><PlanBadge plan={t.plan} /></td>
                      <td style={{ padding: "9px 8px" }}>
                        {t.riskFactors.map((f: string) => (
                          <RiskTag key={f} factor={f} />
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tenant roster ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "20px" }}>
        <SectionHead>
          Tenant Roster: {roster ? n(roster.totalCount) : "?"} accounts
        </SectionHead>
        {roster ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.row}` }}>
                  <Th>Business Name</Th>
                  <Th>Plan</Th>
                  <Th>Industry</Th>
                  <Th>City</Th>
                  <Th>Created</Th>
                  <Th right>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {roster.tenants.map(t => (
                  <tr
                    key={t.id}
                    style={{ borderBottom: `1px solid ${T.row}` }}
                  >
                    <td style={{ padding: "10px 8px", fontSize: "0.875rem", fontWeight: 500 }}>
                      {t.business_name}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <PlanBadge plan={t.plan} />
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: "0.8rem", color: T.muted }}>
                      {t.industry ?? "—"}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: "0.8rem", color: T.muted }}>
                      {t.city ?? "—"}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: "0.8rem", color: T.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {new Date(t.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>
                      <a
                        href={`/mission-control/tenants/${t.id}`}
                        style={{ color: T.accent, textDecoration: "none", fontSize: "0.8rem", fontWeight: 500 }}
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: T.muted, fontSize: "0.85rem", margin: 0 }}>Error loading roster</p>
        )}
      </div>

    </main>
  );
}
