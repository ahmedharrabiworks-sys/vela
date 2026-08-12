"use client";

import { useState } from "react";
import type { AnalyzeEmployeeResult, EmployeeInsight } from "@/lib/mission-control/analysis";

const T = {
  bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222",
  text: "#f5f5f5", muted: "#a3a3a3", dim: "#666666",
  accent: "#f97316",
  green: "#4ade80", amber: "#f59e0b", red: "#f87171",
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = confidence === "high" ? T.green : confidence === "medium" ? T.amber : T.dim;
  return (
    <span style={{
      display: "inline-block", padding: "1px 6px", borderRadius: 3,
      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.04em", color, background: `${color}1a`,
      border: `1px solid ${color}33`,
    }}>
      {confidence}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const isRec = kind === "recommendation";
  const color = isRec ? T.accent : T.muted;
  return (
    <span style={{
      display: "inline-block", padding: "2px 6px", borderRadius: 3,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.06em", color,
      background: `${color}15`, border: `1px solid ${color}40`,
    }}>
      {kind}
    </span>
  );
}

function InsightCard({ item }: { item: EmployeeInsight }) {
  return (
    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <KindBadge kind={item.kind} />
        <ConfidenceBadge confidence={item.confidence} />
      </div>
      <p style={{ fontSize: 13, color: T.text, margin: "0 0 8px", lineHeight: 1.55 }}>
        {item.content}
      </p>
      <div style={{ fontSize: 11, color: T.dim, fontFamily: "monospace" }}>
        {item.supportingSignalIds.length} corroborating signal reading(s)
      </div>
    </div>
  );
}

export function AnalyzePanel({ employeeId }: { employeeId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeEmployeeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/mission-control/employees/${employeeId}/analyze`, {
        method: "POST",
      });
      const data = await res.json() as AnalyzeEmployeeResult | { error: string };
      if (!res.ok) {
        setError(("error" in data ? data.error : null) ?? "Analysis failed");
        return;
      }
      setResult(data as AnalyzeEmployeeResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const allItems: EmployeeInsight[] = result
    ? [...(result.insights ?? []), ...(result.recommendations ?? [])]
    : [];

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
            fontSize: 12, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.05em", color: T.dim,
          }}>
            Analysis: on-demand
          </span>
          <button
            onClick={runAnalysis}
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
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {/* Pre-run */}
        {!result && !error && !loading && (
          <div style={{ padding: "24px 20px", fontSize: 13, color: T.dim }}>
            Click Analyze to run on-demand analysis against the real signal history.
            Requires at least 2 compute runs to detect patterns.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: "24px 20px", fontSize: 13, color: T.dim }}>
            Querying signal history and running analysis…
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "16px 20px", fontSize: 13, color: T.red }}>
            {error}
          </div>
        )}

        {/* Insufficient history */}
        {result?.status === "insufficient_history" && (
          <div style={{ padding: "20px" }}>
            <p style={{ fontSize: 13, color: T.amber, margin: 0 }}>
              Not enough history yet. {result.distinctRuns} compute run(s) on record.
            </p>
            <p style={{ fontSize: 12, color: T.dim, margin: "8px 0 0" }}>
              {result.message}
            </p>
          </div>
        )}

        {/* No patterns */}
        {result?.status === "no_patterns" && (
          <div style={{ padding: "20px" }}>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
              No patterns detected across {result.distinctRuns} compute run(s).
            </p>
            <p style={{ fontSize: 12, color: T.dim, margin: "8px 0 0" }}>
              {result.message}
            </p>
          </div>
        )}

        {/* Error from analysis */}
        {result?.status === "error" && (
          <div style={{ padding: "20px" }}>
            <p style={{ fontSize: 13, color: T.red, margin: 0 }}>{result.message}</p>
          </div>
        )}

        {/* Results */}
        {result?.status === "ok" && (
          <>
            <div style={{
              padding: "10px 20px", borderBottom: `1px solid ${T.border}`,
              fontSize: 12, color: T.muted,
            }}>
              {result.distinctRuns} compute runs analyzed · {result.insights.length} insight(s) · {result.recommendations.length} recommendation(s)
            </div>
            {allItems.length === 0 ? (
              <div style={{ padding: "20px", fontSize: 13, color: T.dim }}>No entries generated.</div>
            ) : (
              allItems.map((item, i) => <InsightCard key={i} item={item} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
