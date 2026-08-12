import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getEmployeeDetail, type EmployeeDetail } from "@/lib/mission-control/queries";
import { AnalyzePanel } from "./AnalyzePanel";
import { SecurityAuditPanel } from "./SecurityAuditPanel";

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
  card:    { background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 },
  cardHead:{ padding: "14px 20px", background: T.bg3, borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: T.dim },
  kv:      { display: "grid", gridTemplateColumns: "200px 1fr", gap: "0", borderTop: `1px solid ${T.border}` },
  kvKey:   { padding: "12px 20px", fontSize: 12, color: T.dim, background: T.bg3 },
  kvVal:   { padding: "12px 20px", fontSize: 13, color: T.text },
  th:      { padding: "10px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: T.dim, textAlign: "left" as const, background: T.bg3 },
  td:      { padding: "12px 16px", fontSize: 13, color: T.text, borderTop: `1px solid ${T.border}` },
  tdMuted: { padding: "12px 16px", fontSize: 13, color: T.muted, borderTop: `1px solid ${T.border}` },
  tdSmall: { padding: "12px 16px", fontSize: 12, color: T.dim, borderTop: `1px solid ${T.border}` },
  empty:   { padding: "32px 20px", fontSize: 13, color: T.dim },
};

function StatusBadge({ status }: { status: string }) {
  const color = status === "active"  ? T.green
              : status === "blocked" ? T.red
              : status === "error"   ? T.red
              : status === "dormant" ? T.dim
              : T.muted;
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

function OutcomeBadge({ outcome }: { outcome: string }) {
  const color = outcome === "success" ? T.green : outcome === "failure" ? T.red : T.muted;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 600, color, background: `${color}1a`,
      border: `1px solid ${color}33`,
    }}>
      {outcome}
    </span>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatSignalValue(name: string, value: number | null): string {
  if (value == null) return "—";
  const isRate = name.endsWith("_rate") || name.endsWith("_success_rate");
  return isRate ? `${value}%` : String(value);
}

async function fetchDetail(employeeId: string): Promise<EmployeeDetail | null | "error"> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    return await getEmployeeDetail(admin, employeeId);
  } catch (err) {
    console.error("[MC employees/[id] page]", err);
    return "error";
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await fetchDetail(params.id);

  if (result === null) notFound();

  if (result === "error") {
    return (
      <div style={S.page}>
        <div style={S.nav}>
          <Link href="/mission-control/employees" style={{ color: T.muted, textDecoration: "none" }}>← Employees</Link>
        </div>
        <p style={{ color: T.amber }}>
          Could not load employee. Run <code>supabase/migration_v15.sql</code> first.
        </p>
      </div>
    );
  }

  const { employee: emp, signalHistory, learningLog } = result;

  // Deduplicate to latest per signal_name (history is ordered DESC by computed_at)
  const latestSignals: Record<string, typeof signalHistory[0]> = {};
  for (const s of signalHistory) {
    if (!latestSignals[s.signalName]) latestSignals[s.signalName] = s;
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <div style={S.nav}>
        <Link href="/mission-control" style={{ color: T.muted, textDecoration: "none" }}>Overview</Link>
        <span style={{ color: T.dim }}>/</span>
        <Link href="/mission-control/employees" style={{ color: T.muted, textDecoration: "none" }}>Employees</Link>
        <span style={{ color: T.dim }}>/</span>
        <span style={{ color: T.text }}>{emp.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0 }}>{emp.name}</h1>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            {emp.department?.name ?? "No department"} · <StatusBadge status={emp.status} />
          </div>
        </div>
      </div>

      {/* Identity card */}
      <div style={S.card}>
        <div style={S.cardHead}>Identity</div>
        <div style={S.kv}>
          <div style={S.kvKey}>Role</div>
          <div style={S.kvVal}>{emp.roleDescription}</div>
        </div>
        <div style={S.kv}>
          <div style={S.kvKey}>Domain</div>
          <div style={S.kvVal}>{emp.domainDescription}</div>
        </div>
        <div style={S.kv}>
          <div style={S.kvKey}>Safe default</div>
          <div style={{ ...S.kvVal, color: T.muted }}>{emp.safeDefaultAction ?? "—"}</div>
        </div>
        <div style={S.kv}>
          <div style={S.kvKey}>Created</div>
          <div style={{ ...S.kvVal, color: T.muted }}>{fmtDate(emp.createdAt)}</div>
        </div>
      </div>

      {/* Current signals */}
      <div style={S.card}>
        <div style={S.cardHead}>Current Signals: latest value per signal name</div>
        {Object.keys(latestSignals).length === 0 ? (
          <div style={S.empty}>No signals yet. Run the seed script.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Signal</th>
                <th style={S.th}>Value</th>
                <th style={S.th}>Source</th>
                <th style={S.th}>Computed</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(latestSignals).map((s) => (
                <tr key={s.signalName}>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{s.signalName}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: T.accent }}>
                    {formatSignalValue(s.signalName, s.value)}
                  </td>
                  <td style={S.tdMuted}>{s.realDescription}</td>
                  <td style={S.tdSmall}>{fmtDate(s.computedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Signal history (if more than one compute run) */}
      {signalHistory.length > Object.keys(latestSignals).length && (
        <div style={S.card}>
          <div style={S.cardHead}>Signal history (last {signalHistory.length} entries)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Signal</th>
                <th style={S.th}>Value</th>
                <th style={S.th}>Computed</th>
              </tr>
            </thead>
            <tbody>
              {signalHistory.map((s, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{s.signalName}</td>
                  <td style={S.td}>{formatSignalValue(s.signalName, s.value)}</td>
                  <td style={S.tdSmall}>{fmtDate(s.computedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Learning log */}
      <div style={S.card}>
        <div style={S.cardHead}>Learning Log</div>
        {learningLog.length === 0 ? (
          <div style={S.empty}>No learning entries yet. Entries are written after task completions.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Outcome</th>
                <th style={S.th}>Conclusion</th>
                <th style={S.th}>Task ref</th>
                <th style={S.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {learningLog.map((l) => (
                <tr key={l.id}>
                  <td style={{ ...S.td, paddingTop: 14 }}>
                    <OutcomeBadge outcome={l.outcome} />
                  </td>
                  <td style={S.td}>{l.conclusion}</td>
                  <td style={S.tdMuted}>{l.taskRef ?? "—"}</td>
                  <td style={S.tdSmall}>{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Security Agent gets its own audit panel; all others get the analysis panel */}
      {emp.name === "Security Agent" ? (
        <SecurityAuditPanel employeeId={params.id} />
      ) : (
        <AnalyzePanel employeeId={params.id} />
      )}

      <p style={{ fontSize: 12, color: T.dim, marginTop: 24 }}>
        Hard Rule 22: every signal must map to a named, queryable real signal in the database.
        Every insight must cite real signal row UUIDs. Recommendations require ≥3 corroborating readings.
      </p>
    </div>
  );
}
