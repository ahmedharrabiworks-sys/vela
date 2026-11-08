"use client";

import { useState, useEffect } from "react";
import { useAgentTheme } from "../layout";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/lib/plans";
import PlanSwitchModal from "@/components/dashboard/PlanSwitchModal";

interface PhoneState {
  phoneNumber:   string | null;
  phoneNumberId: string | null;
  assistantId:   string | null;
}

// "+12533239602" -> "+1 253 323 9602" (North American numbers); anything
// else is shown exactly as stored.
function formatNumber(n: string): string {
  const m = n.replace(/[^\d+]/g, "").match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `+1 ${m[1]} ${m[2]} ${m[3]}` : n;
}

export default function PhonePage() {
  const { isDark } = useAgentTheme();
  const { t } = useI18n();
  const [state, setState]               = useState<PhoneState>({ phoneNumber: null, phoneNumberId: null, assistantId: null });
  const [loading, setLoading]           = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [synced, setSynced]             = useState(false);
  const [showTech, setShowTech]         = useState(false);
  // Connected = an assistant exists AND the number is attached to it. A
  // number linked without an assistant (e.g. an imported bridge number not
  // synced yet) is shown honestly as "not connected", never as active.
  const { config: planConfig, planLoaded } = usePlan();
  // Starter: voice is PAUSED, not removed. The number stays linked; it
  // answers again as soon as the plan includes the voice agent (live, via
  // the plan-changed event; the server enforces the same rule).
  const paused = planLoaded && !planConfig.voiceAgent;
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const connected = !!(state.phoneNumber && state.assistantId) && !paused;

  const bg          = "transparent";
  const cardBg      = isDark ? "var(--dm-card)" : "#FFFFFF";
  const border      = isDark ? "var(--dm-border)" : "#E5E7EB";
  const textPrimary = isDark ? "var(--dm-text)" : "#0F172A";
  const textMuted   = isDark ? "var(--dm-muted)" : "#9CA3AF";
  const textSub     = isDark ? "var(--dm-text2)" : "#475569";
  const inputBg     = isDark ? "var(--dm-bg)" : "#F9FAFB";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai-agent/phone");
        if (res.ok) {
          const data = await res.json() as PhoneState;
          setState(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const provision = async () => {
    setProvisioning(true);
    setError(null);
    try {
      const res  = await fetch("/api/ai-agent/phone", { method: "POST" });
      const data = await res.json() as PhoneState & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? t("aiAgent.phone.syncFailed"));
      } else {
        setState(data);
        setSynced(true);
        setTimeout(() => setSynced(false), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setProvisioning(false);
  };

  const copyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-center" style={{ minHeight: 280 }}>
          <div className="w-6 h-6 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, margin: "-20px -16px -32px", padding: "20px 16px 32px" }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: textPrimary }}>{t("aiAgent.phone.pageTitle")}</h1>
          <p className="text-sm" style={{ color: textMuted }}>{t("aiAgent.phone.subtitle")}</p>
        </div>

        {paused && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">{t("aiAgent.phone.pausedTitle")}</p>
              <p className="text-xs text-amber-800 mt-0.5">{t("aiAgent.phone.pausedDesc")}</p>
            </div>
            <button onClick={() => setPlanModalOpen(true)} className="btn-primary px-4 py-2 text-sm shrink-0 w-full sm:w-auto">
              {t("sidebar.changePlan")}
            </button>
          </div>
        )}
        <PlanSwitchModal open={planModalOpen} onClose={() => setPlanModalOpen(false)} />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left, Active number OR provision card, 3/5 */}
          <div className="lg:col-span-3">

            {/* Active number */}
            {state.phoneNumber && (
              <div
                className="rounded-2xl border p-5 h-full"
                style={{
                  background:  isDark ? "linear-gradient(135deg, var(--dm-card), var(--dm-card2))" : "linear-gradient(135deg,#FFFAF8,#FFF5F0)",
                  borderColor: "rgba(255,107,53,0.3)",
                  boxShadow:   isDark ? "0 0 24px rgba(255,107,53,0.08)" : "0 0 16px rgba(255,107,53,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  {connected ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
                      <span className="text-xs font-semibold text-green-500">{t("aiAgent.phone.active")}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-amber-600">{paused ? t("aiAgent.phone.paused") : t("aiAgent.phone.notConnected")}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="white"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: textMuted }}>{t("aiAgent.phone.yourNumber")}</p>
                    <p dir="ltr" className="text-xl sm:text-2xl font-bold tracking-wide [overflow-wrap:anywhere] text-start" style={{ color: textPrimary }}>{formatNumber(state.phoneNumber)}</p>
                  </div>
                  <button
                    onClick={() => copyNumber(state.phoneNumber!)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0"
                    style={{
                      background:  copied ? (isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4") : inputBg,
                      border:      `1px solid ${copied ? "rgba(34,197,94,0.3)" : border}`,
                      color:       copied ? "#22C55E" : textMuted,
                    }}
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l2.5 2.5 5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t("aiAgent.phone.copied")}
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-5A1.5 1.5 0 000 2.5v5A1.5 1.5 0 001.5 9H3" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        {t("aiAgent.phone.copy")}
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm mb-4" style={{ color: textSub }}>{t("aiAgent.phone.forwardHint")}</p>

                {error && (
                  <div className="rounded-xl border p-3 mb-4" style={{ background: "#FFF5F5", borderColor: "rgba(239,68,68,0.2)" }}>
                    <p className="text-xs font-semibold mb-0.5 text-red-500">{t("aiAgent.phone.syncFailed")}</p>
                    <p className="text-xs break-words" style={{ color: textMuted }}>{error}</p>
                  </div>
                )}

                <button
                  onClick={provision}
                  disabled={provisioning || paused}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 mb-5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={connected
                    ? { background: inputBg, border: `1px solid ${border}`, color: textSub }
                    : { background: "var(--btn-gradient)", color: "#fff", boxShadow: "0 4px 20px rgba(255,107,53,0.30)" }}
                >
                  {provisioning ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      {t("aiAgent.phone.provisioning")}
                    </>
                  ) : synced ? t("aiAgent.phone.synced") : connected ? t("aiAgent.phone.resyncBtn") : t("aiAgent.phone.connectBtn")}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("agentUi.phone.tileAnswers"), value: t("agentUi.phone.tileAnswersValue") },
                    { label: t("agentUi.phone.tileLanguages"), value: t("agentUi.phone.tileLanguagesValue") },
                    { label: t("agentUi.phone.tileInterruption"), value: t("agentUi.phone.tileInterruptionValue") },
                    { label: t("agentUi.phone.tileTranscription"), value: t("agentUi.phone.tileTranscriptionValue") },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>{item.label}</p>
                      <p className="text-xs font-semibold" style={{ color: textSub }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provision card */}
            {!state.phoneNumber && (
              <div className="rounded-2xl border p-6 h-full" style={{ background: cardBg, borderColor: border }}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: isDark ? "rgba(255,107,53,0.1)" : "#FFF5F0" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7.7 12.6c1.63 3.27 4.43 5.97 7.7 7.7l2.57-2.57c.35-.35.82-.47 1.17-.23 1.28.47 2.68.7 4.2.7.7 0 1.17.47 1.17 1.17v3.97c0 .7-.47 1.17-1.17 1.17C12.37 24.5 3.5 15.63 3.5 4.67c0-.7.47-1.17 1.17-1.17H8.63c.7 0 1.17.47 1.17 1.17 0 1.52.23 2.92.7 4.2.12.35.08.82-.23 1.17L7.7 12.6z" fill="#FF6B35"/>
                      <path d="M18.67 3.5v3.5M16.33 5.83h4.67" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 className="text-base font-bold mb-2" style={{ color: textPrimary }}>{t("aiAgent.phone.getTitle")}</h2>
                  <p className="text-sm mb-5 max-w-xs" style={{ color: textMuted }}>{t("aiAgent.phone.getDesc")}</p>

                  <div className="grid grid-cols-2 gap-2 mb-5 text-start w-full max-w-xs">
                    {[
                      t("agentUi.phone.feat1"),
                      t("agentUi.phone.feat2"),
                      t("agentUi.phone.feat3"),
                      t("agentUi.phone.feat4"),
                      t("agentUi.phone.feat5"),
                      t("agentUi.phone.feat6"),
                    ].map((feat) => (
                      <div key={feat} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,107,53,0.15)" }}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4l1.5 1.5 3.5-3.5" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-xs" style={{ color: textSub }}>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="rounded-xl border p-3 mb-4 text-start w-full" style={{ background: isDark ? "rgba(239,68,68,0.07)" : "#FFF5F5", borderColor: "rgba(239,68,68,0.2)" }}>
                      <p className="text-xs font-semibold mb-0.5 text-red-400">{t("aiAgent.phone.syncFailed")}</p>
                      <p className="text-xs" style={{ color: textMuted }}>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={provision}
                    disabled={provisioning || paused}
                    className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)", boxShadow: "0 6px 24px rgba(255,107,53,0.35)" }}
                  >
                    {provisioning ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        {t("aiAgent.phone.provisioning")}
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M4.4 7.2c.93 1.87 2.53 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67V13.33c0 .4-.27.67-.67.67C4.4 14 2 7.6 2 2.67c0-.4.27-.67.67-.67H5.33c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L4.4 7.2z" fill="white"/>
                          <path d="M10 2v2.5M8.67 3.33h2.67" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {t("aiAgent.phone.getBtn")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right, How it works, 2/5 */}
          <div className="lg:col-span-2 rounded-2xl border p-5" style={{ background: cardBg, borderColor: border }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: textPrimary }}>{t("agentUi.phone.howTitle")}</h2>
            <div className="space-y-4">
              {[
                { step: "1", title: t("agentUi.phone.step1"), desc: t("agentUi.phone.step1Desc") },
                { step: "2", title: t("agentUi.phone.step2"), desc: t("agentUi.phone.step2Desc") },
                { step: "3", title: t("agentUi.phone.step3"), desc: t("agentUi.phone.step3Desc") },
                { step: "4", title: t("agentUi.phone.step4"), desc: t("agentUi.phone.step4Desc") },
                { step: "5", title: t("agentUi.phone.step5"), desc: t("agentUi.phone.step5Desc") },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: textPrimary }}>{item.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical details, full-width, conditional */}
        {state.assistantId && (
          <div>
            <button type="button" aria-expanded={showTech} onClick={() => setShowTech((v) => !v)} className="text-xs min-h-[32px]" style={{ color: textMuted }}>
              {showTech ? t("agentUi.phone.hideTech") : t("agentUi.phone.showTech")}
            </button>
            {showTech && (
              <div className="rounded-xl border px-4 mt-1 divide-y" style={{ background: cardBg, borderColor: border }}>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-xs" style={{ color: textMuted }}>{t("agentUi.phone.assistantId")}</span>
                  <span dir="ltr" className="text-xs font-mono truncate" style={{ color: textSub }}>{state.assistantId.slice(0, 18)}…</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-xs" style={{ color: textMuted }}>{t("agentUi.phone.numberId")}</span>
                  <span dir="ltr" className="text-xs font-mono truncate" style={{ color: textSub }}>{state.phoneNumberId?.slice(0, 18)}…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
