"use client";

import { useState } from "react";
import type { SecurityAuditResult, AuditCategory, SecurityFinding } from "@/lib/mission-control/security-checks";

const T = {
  bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222",
  text: "#f5f5f5", muted: "#a3a3a3", dim: "#666666",
  accent: "#f97316",
  green: "#4ade80", amber: "#f59e0b", red: "#f87171",
};

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === "critical" ? T.red : severity === "warning" ? T.amber : T.dim;
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 3,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
      letterSpacing: "0.06em", color,
      background: `${color}18`, border: `1px solid ${color}40`,
    }}>
      {severity}
    </span>
  );
}

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const borderColor =
    finding.severity === "critical" ? `${T.red}30` :
    finding.severity === "warning"  ? `${T.amber}25` :
    T.border;

  return (
    <div style={{
      padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
      borderLeft: `3px solid ${borderColor}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <SeverityBadge severity={finding.severity} />
      </div>
      <p style={{ fontSize: 13, color: T.text, margin: "0 0 8px", lineHeight: 1.55, fontWeight: 500 }}>
        {finding.finding}
      </p>
      <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5 }}>
        {finding.evidence}
      </p>
    </div>
  );
}

function CategorySection({ cat }: { cat: AuditCategory }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        padding: "10px 20px", background: T.bg3,
        fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
        letterSpacing: "0.04em", color: T.dim,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>{cat.name.replace(/_/g, " ")}</span>
        <span style={{ color: cat.findings.length === 0 ? T.green : T.muted }}>
          {cat.findings.length === 0 ? "✓ clean" : `${cat.findings.length} finding(s)`}
        </span>
      </div>
      {cat.findings.length > 0 && cat.findings.map((f, i) => (
        <FindingRow key={i} finding={f} />
      ))}
    </div>
  );
}

export function SecurityAuditPanel({ employeeId }: { employeeId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SecurityAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/mission-control/employees/${employeeId}/security-audit`, {
        method: "POST",
      });
      const data = await res.json() as SecurityAuditResult | { error: string };
      if (!res.ok) {
        setError(("error" in data ? data.error : null) ?? "Audit failed");
        return;
      }
      setResult(data as SecurityAuditResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      <div style={{
        background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", background: T.bg3, borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const,
            letterSpacing: "0.05em", color: T.dim,
          }}>
            Security Audit: On-demand · Report-only · Zero execution authority
          </span>
          <button
            onClick={runAudit}
            disabled={loading}
            style={{
              background: loading ? T.bg3 : T.accent,
              border: `1px solid ${loading ? T.border : T.accent}`,
              borderRadius: 5, padding: "6px 14px",
              fontSize: 12, fontWeight: 500,
              color: loading ? T.dim : "#fff",
              cursor: loading ? "default" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Running audit…" : "Run Security Audit"}
          </button>
        </div>

        {/* Pre-run */}
        {!result && !error && !loading && (
          <div style={{ padding: "24px 20px", fontSize: 13, color: T.dim }}>
            Runs 4 real-time checks: RLS policies · Webhook secret coverage · Client-side env var exposure · Schema vs known migrations.
            Findings are evidence-linked. No changes made.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: "24px 20px", fontSize: 13, color: T.dim }}>
            Running 4 check categories against production…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "16px 20px", fontSize: 13, color: T.red }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <div style={{
              padding: "10px 20px", borderBottom: `1px solid ${T.border}`,
              fontSize: 12, color: T.muted,
              display: "flex", gap: 20,
            }}>
              <span>
                {result.totalFindings === 0
                  ? <span style={{ color: T.green }}>✓ No findings</span>
                  : <span style={{ color: result.criticalCount > 0 ? T.red : T.amber }}>
                      {result.totalFindings} finding(s)
                    </span>
                }
              </span>
              {result.criticalCount > 0 && (
                <span style={{ color: T.red }}>{result.criticalCount} critical</span>
              )}
              {result.warningCount > 0 && (
                <span style={{ color: T.amber }}>{result.warningCount} warning</span>
              )}
              {result.infoCount > 0 && (
                <span style={{ color: T.dim }}>{result.infoCount} info</span>
              )}
              <span style={{ marginLeft: "auto" }}>
                {new Date(result.runAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            {result.categories.map((cat) => (
              <CategorySection key={cat.name} cat={cat} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
