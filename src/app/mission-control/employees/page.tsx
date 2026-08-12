import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getEmployeeRoster, type EmployeeRow } from "@/lib/mission-control/queries";

// Design tokens — match overview/tenants pages
const T = {
  bg: "#0a0a0a", bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222", border2: "#2d2d2d",
  text: "#f5f5f5", muted: "#a3a3a3", dim: "#666666",
  accent: "#f97316",
  green: "#4ade80", amber: "#f59e0b", red: "#f87171",
};

const S: Record<string, React.CSSProperties> = {
  page:    { maxWidth: 960, margin: "0 auto", padding: "40px 20px" },
  nav:     { display: "flex", alignItems: "center", gap: 16, marginBottom: 32, fontSize: 13, color: T.muted },
  h1:      { fontSize: 22, fontWeight: 600, color: T.text, margin: 0 },
  sub:     { fontSize: 13, color: T.muted, marginTop: 4 },
  card:    { background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginTop: 24 },
  tHead:   { background: T.bg3 },
  th:      { padding: "10px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: T.dim, textAlign: "left" as const },
  td:      { padding: "14px 16px", fontSize: 13, color: T.text, borderTop: `1px solid ${T.border}`, verticalAlign: "top" as const },
  tdMuted: { padding: "14px 16px", fontSize: 13, color: T.muted, borderTop: `1px solid ${T.border}`, verticalAlign: "top" as const },
  emptyBox:{ padding: "48px 24px", textAlign: "center" as const, color: T.dim, fontSize: 14 },
};

function StatusBadge({ status }: { status: string }) {
  const color = status === "active"  ? T.green
              : status === "blocked" ? T.red
              : status === "error"   ? T.red
              : status === "dormant" ? T.dim
              : T.muted; // idle
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.04em", color, background: `${color}1a`,
      border: `1px solid ${color}33`,
    }}>
      {status}
    </span>
  );
}

function SignalPill({ name, value }: { name: string; value: number | null }) {
  const isRate = name.endsWith("_rate") || name.endsWith("_success_rate");
  const display = value == null ? "—" : isRate ? `${value}%` : String(value);
  const dimColor = value == null ? T.dim : T.muted;
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", marginRight: 8 }}>
      <span style={{ fontSize: 11, color: T.dim }}>{name}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: dimColor }}>{display}</span>
    </span>
  );
}

async function fetchRoster(): Promise<EmployeeRow[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    return await getEmployeeRoster(admin);
  } catch (err) {
    console.error("[MC employees page]", err);
    return null;
  }
}

export default async function EmployeesPage() {
  const employees = await fetchRoster();

  return (
    <div style={S.page}>
      {/* Nav */}
      <div style={S.nav}>
        <Link href="/mission-control" style={{ color: T.muted, textDecoration: "none" }}>
          ← Overview
        </Link>
        <span style={{ color: T.dim }}>/</span>
        <span style={{ color: T.text }}>AI Employees</span>
      </div>

      {/* Header */}
      <h1 style={S.h1}>AI Employees</h1>
      <p style={S.sub}>
        Each employee observes real signals from the database. No synthetic traits. No decorative scores.
      </p>

      {/* Error state */}
      {employees === null && (
        <div style={{ ...S.card, ...S.emptyBox }}>
          <p style={{ color: T.amber, margin: 0 }}>
            Could not load employees. Run <code>supabase/migration_v15.sql</code> first.
          </p>
        </div>
      )}

      {/* Empty state */}
      {employees !== null && employees.length === 0 && (
        <div style={{ ...S.card, ...S.emptyBox }}>
          <p style={{ margin: 0 }}>No employees yet. Run the seed script to create the Website Agent.</p>
          <code style={{ display: "block", marginTop: 8, fontSize: 12, color: T.dim }}>
            node src/scripts/seed-website-agent.mjs
          </code>
        </div>
      )}

      {/* Roster table */}
      {employees !== null && employees.length > 0 && (
        <div style={S.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={S.tHead}>
              <tr>
                <th style={S.th}>Employee</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Signals</th>
                <th style={S.th}>Last computed</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const signalKeys = Object.keys(emp.latestSignals);
                const latestTs = signalKeys.length > 0
                  ? signalKeys
                      .map((k) => emp.latestSignals[k].computedAt)
                      .sort()
                      .at(-1)
                  : null;
                const latestRelative = latestTs
                  ? new Date(latestTs).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "—";

                return (
                  <tr key={emp.id}>
                    <td style={S.td}>
                      <Link
                        href={`/mission-control/employees/${emp.id}`}
                        style={{ color: T.accent, textDecoration: "none", fontWeight: 500 }}
                      >
                        {emp.name}
                      </Link>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                        {emp.roleDescription}
                      </div>
                    </td>
                    <td style={S.tdMuted}>
                      {emp.department?.name ?? "—"}
                    </td>
                    <td style={{ ...S.td, paddingTop: 16 }}>
                      <StatusBadge status={emp.status} />
                    </td>
                    <td style={S.td}>
                      {signalKeys.length === 0
                        ? <span style={{ color: T.dim }}>none</span>
                        : signalKeys.map((k) => (
                            <SignalPill key={k} name={k} value={emp.latestSignals[k].value} />
                          ))
                      }
                    </td>
                    <td style={S.tdMuted}>{latestRelative}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer note */}
      <p style={{ fontSize: 12, color: T.dim, marginTop: 24 }}>
        Signals derive from live database queries (Hard Rule 22). Displayed values are current as of page load.
      </p>
    </div>
  );
}
