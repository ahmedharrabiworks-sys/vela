"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/plans";
import { track } from "@/lib/track";
import { useI18n } from "@/lib/i18n";

type Tool = "social" | "broadcast" | "video";

const TONE_OPTIONS     = ["Professional", "Friendly", "Urgent", "Educational", "Promotional"];
const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "Twitter/X", "TikTok"];

type HistoryItem = {
  id: string;
  type: Tool;
  prompt: string;
  result: string;
  metadata: Record<string, string>;
  created_at: string;
};

/* ── Generation history ── */
function HistorySection({ refresh }: { refresh: number }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/marketing")
      .then((r) => r.json())
      .then((d: { history?: HistoryItem[] }) => setHistory(d.history ?? []))
      .catch(() => null);
  }, [refresh]);

  if (history.length === 0) return null;

  const typeColors: Record<Tool, string> = { social: "#E1306C", video: "#7C3AED", broadcast: "#25D366" };
  const typeLabels: Record<Tool, string> = { social: "Social Post", video: "Video Script", broadcast: "Broadcast" };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Generation History</p>
      <div className="space-y-2">
        {history.map((item) => (
          <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ background: typeColors[item.type] }}>
                  {typeLabels[item.type]}
                </span>
                <p className="text-xs text-[#374151] truncate">{item.prompt.replace(/^Write a.*?about: /, "")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] text-[#9CA3AF]">
                  {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                  className={`text-[#9CA3AF] transition-transform ${expanded === item.id ? "rotate-180" : ""}`}>
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            {expanded === item.id && (
              <div className="px-4 pb-4 border-t border-[#F3F4F6]">
                <pre className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed mt-3 font-sans">{item.result}</pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.result);
                    setCopied(item.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className={`mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    copied === item.id
                      ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]"
                      : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                  }`}>
                  {copied === item.id ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Social tool ── */
function SocialTool({ onGenerate }: { onGenerate: () => void }) {
  const [prompt, setPrompt]   = useState("");
  const [tone, setTone]       = useState("Professional");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState("");
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  const examples = [
    "Promote our summer offer",
    "Announce new time slots",
    "Share a customer success story",
  ];

  const generate = async (overridePrompt?: string) => {
    const p = overridePrompt ?? prompt;
    if (!p.trim()) return;
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "social", prompt: p, tone, platform }),
      });
      const data = await res.json() as { result?: string; error?: string };
      if (!res.ok || data.error) setError(data.error ?? "Generation failed");
      else { setResult(data.result ?? ""); onGenerate(); }
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">What do you want to post about?</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Promote our summer offer, announce new services…"
            rows={4}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {examples.map((ex) => (
              <button key={ex} onClick={() => { setPrompt(ex); generate(ex); }}
                className="text-[10px] px-2.5 py-1 bg-[#F3F4F6] text-[#6B7280] rounded-full hover:bg-[#FF6B35]/10 hover:text-[#FF6B35] transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] bg-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors appearance-none cursor-pointer">
              {PLATFORM_OPTIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] bg-white focus:outline-none focus:border-[#FF6B35]/50 transition-colors appearance-none cursor-pointer">
              {TONE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button onClick={() => generate()} disabled={loading || !prompt.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: "var(--vp-color)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </span>
          ) : "Generate Post"}
        </button>
      </div>

      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 min-h-[240px] flex flex-col">
        {!result && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#9CA3AF] text-center">Your generated post will appear here</p>
          </div>
        )}
        {loading && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6B7280]">Writing your post…</p>
          </div>
        )}
        {result && (
          <>
            <p className="text-sm text-[#111827] whitespace-pre-wrap flex-1 leading-relaxed">{result}</p>
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB] mt-4">
              <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-[#ECFDF5] text-[#059669]" : "bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}>
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button onClick={() => generate()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Broadcast tool ── */
function BroadcastTool({ onGenerate }: { onGenerate: () => void }) {
  const [audience, setAudience] = useState("leads");
  const [message, setMessage]   = useState("");
  const [channel, setChannel]   = useState("WhatsApp");
  const [aiLoading, setAiLoading] = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const audienceOptions = [
    { id: "all",      label: "All Contacts",        hint: "Everyone in your database" },
    { id: "leads",    label: "Unbooked Leads",       hint: "Leads who haven't booked yet" },
    { id: "booked",   label: "Past Customers",       hint: "People who have booked before" },
    { id: "inactive", label: "Inactive (30+ days)",  hint: "Haven't engaged in a month" },
  ];

  const generateAI = async () => {
    setAiLoading(true);
    setError("");
    try {
      const label = audienceOptions.find((a) => a.id === audience)?.label ?? audience;
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "broadcast", audience: label, channel, prompt: `Re-engagement for ${label}` }),
      });
      const data = await res.json() as { result?: string; error?: string };
      if (!res.ok || data.error) setError(data.error ?? "Generation failed");
      else { setMessage(data.result ?? ""); onGenerate(); }
    } catch { setError("Network error. Please try again."); }
    setAiLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Target Audience</label>
          <div className="space-y-2">
            {audienceOptions.map((a) => (
              <button key={a.id} onClick={() => setAudience(a.id)}
                className={`w-full flex items-start justify-between px-4 py-3 rounded-xl border text-left transition-all ${audience === a.id ? "border-[#FF6B35] bg-[#FFF8F5]" : "border-[#E5E7EB] hover:border-[#9CA3AF]"}`}>
                <div>
                  <span className="text-sm font-medium text-[#111827] block">{a.label}</span>
                  <span className="text-[11px] text-[#9CA3AF]">{a.hint}</span>
                </div>
                {audience === a.id && (
                  <div className="w-4 h-4 rounded-full bg-[#FF6B35] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.5 1.5 3.5-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Channel</label>
            <div className="flex gap-2">
              {["WhatsApp", "Instagram"].map((ch) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${channel === ch ? "border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Message</label>
              <button onClick={generateAI} disabled={aiLoading}
                className="text-[11px] font-semibold text-[#FF6B35] hover:underline disabled:opacity-50 flex items-center gap-1">
                {aiLoading
                  ? <><span className="w-3 h-3 border border-[#FF6B35] border-t-transparent rounded-full animate-spin" /> Writing…</>
                  : "✦ Generate with AI"}
              </button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your broadcast message or click Generate with AI…"
              rows={6}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
            <p className="text-[10px] text-[#9CA3AF] mt-1">{message.length}/1000 characters</p>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {!sent ? (
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">
            Sending to <span className="font-bold text-[#111827]">{audienceOptions.find((a) => a.id === audience)?.label}</span> via {channel}
          </p>
          <button onClick={() => setSent(true)} disabled={!message.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: "var(--vp-color)" }}>
            Send Broadcast
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#059669"/>
            <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#065F46]">Broadcast queued</p>
            <p className="text-xs text-[#059669]">Message ready to send via {channel}</p>
          </div>
          <button onClick={() => { setSent(false); setMessage(""); }} className="ml-auto text-xs text-[#6B7280] hover:text-[#111827] underline">
            Send another
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Video tool ── */
function VideoTool({ onGenerate }: { onGenerate: () => void }) {
  const [topic, setTopic]     = useState("");
  const [duration, setDuration] = useState("60s");
  const [loading, setLoading] = useState(false);
  const [script, setScript]   = useState("");
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  const generate = async (overrideTopic?: string) => {
    const t = overrideTopic ?? topic;
    if (!t.trim()) return;
    setLoading(true);
    setScript("");
    setError("");
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "video", prompt: t, duration }),
      });
      const data = await res.json() as { result?: string; error?: string };
      if (!res.ok || data.error) setError(data.error ?? "Generation failed");
      else { setScript(data.result ?? ""); onGenerate(); }
    } catch { setError("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Video Topic</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Why customers love us, how to use our service…"
            rows={4}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Target Duration</label>
          <div className="flex gap-2">
            {["30s", "60s", "90s", "3min"].map((d) => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${duration === d ? "border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button onClick={() => generate()} disabled={loading || !topic.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: "var(--vp-color)" }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Writing Script…
            </span>
          ) : "Generate Script"}
        </button>
      </div>

      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 min-h-[280px] flex flex-col">
        {!script && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[#9CA3AF] text-center">Your video script will appear here with scene-by-scene breakdown</p>
          </div>
        )}
        {loading && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6B7280]">Writing your script…</p>
          </div>
        )}
        {script && (
          <>
            <p className="text-xs text-[#111827] whitespace-pre-wrap flex-1 leading-relaxed font-mono">{script}</p>
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB] mt-4">
              <button onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-[#ECFDF5] text-[#059669]" : "bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}>
                {copied ? "Copied!" : "Copy Script"}
              </button>
              <button onClick={() => generate()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: "var(--vp-color)" }}>
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function MarketingPage() {
  const [active, setActive]         = useState<Tool>("social");
  const [historyKey, setHistoryKey] = useState(0);
  const { isPro } = usePlan();
  const { t } = useI18n();

  const TOOLS_I18N: { id: Tool; label: string; desc: string }[] = [
    { id: "social",    label: t("marketing.tools.social"),    desc: t("marketing.tools.socialDesc") },
    { id: "broadcast", label: t("marketing.tools.broadcast"), desc: t("marketing.tools.broadcastDesc") },
    { id: "video",     label: t("marketing.tools.video"),     desc: t("marketing.tools.videoDesc") },
  ];

  const onGenerate = () => setHistoryKey((k) => k + 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">

      <div>
        <h1 className="text-xl font-bold text-[#111827]">{t("marketing.title")}</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">{t("marketing.subtitle")}</p>
      </div>

      {/* Gated content */}
      <div className="relative">
        <div className={`space-y-6 ${!isPro ? "blur-sm pointer-events-none select-none" : ""}`}>

          {/* Tool selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOOLS_I18N.map((tool) => (
              <button key={tool.id} onClick={() => setActive(tool.id)}
                className={`p-4 rounded-xl border text-left transition-all ${active === tool.id ? "border-[#FF6B35] bg-[#FFF8F5]" : "bg-white border-[#E5E7EB] hover:border-[#9CA3AF]"}`}>
                <p className={`text-sm font-bold mb-0.5 ${active === tool.id ? "text-[#FF6B35]" : "text-[#111827]"}`}>{tool.label}</p>
                <p className="text-[11px] text-[#6B7280]">{tool.desc}</p>
              </button>
            ))}
          </div>

          {/* Active tool */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            {active === "social"    && <SocialTool    onGenerate={onGenerate} />}
            {active === "broadcast" && <BroadcastTool onGenerate={onGenerate} />}
            {active === "video"     && <VideoTool     onGenerate={onGenerate} />}
          </div>

          {/* History */}
          <HistorySection refresh={historyKey} />
        </div>

        {/* Upgrade overlay for Starter */}
        {!isPro && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
            <div className="max-w-sm text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl mx-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--vela-gradient-tint)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#FF6B35" strokeWidth="1.8"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#FF6B35" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#111111] mb-2">{t("marketing.upgradeCta")}</h3>
              <p className="text-sm text-[#6B7280] mb-5">{t("marketing.upgradeDesc")}</p>
              <Link
                href="/auth/signup"
                onClick={() => track("upgrade_clicked", { source: "marketing" })}
                className="inline-block px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
                style={{ background: "var(--vela-gradient)" }}
              >
                Upgrade to Pro →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
