"use client";

import { useState } from "react";

type Tool = "social" | "broadcast" | "video";

const TONE_OPTIONS = ["Professional", "Friendly", "Urgent", "Educational", "Promotional"];
const PLATFORM_OPTIONS = ["Instagram", "Facebook", "LinkedIn", "Twitter/X", "TikTok"];

function SocialTool() {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const examples = [
    "Promote our summer teeth whitening offer",
    "Remind patients about annual check-up",
    "Announce our new late evening appointment slots",
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult("");
    setTimeout(() => {
      setResult(`${platform === "Instagram" ? "📲 " : ""}**${tone} post for ${platform}**\n\n${
        prompt.toLowerCase().includes("whitening")
          ? `Your brightest smile is just one appointment away. This summer, we're offering 20% off our professional teeth whitening treatment — the same results you see on celebrities, available right here in Dubai.\n\nBook before July 31st and get a free check-up included.\n\n📞 Call or WhatsApp us now to secure your slot.\n\n#TeethWhitening #DubaiDentist #SmileGoals #SummerOffer`
          : `Great oral health starts with consistency. Our team at the clinic is here to make your dental experience comfortable, efficient, and professional.\n\nBook your appointment today and take the first step toward a healthier smile.\n\n📅 Evening slots now available.\n\n#DentalCare #HealthySmile #DubaiClinic #BookNow`
      }`);
      setLoading(false);
    }, 1600);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Input */}
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">What do you want to post about?</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Promote our summer teeth whitening offer..."
            rows={4}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {examples.map((ex) => (
              <button key={ex} onClick={() => setPrompt(ex)}
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

        <button onClick={handleGenerate} disabled={loading || !prompt.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: "#FF6B35" }}>
          {loading ? "Generating…" : "Generate Post"}
        </button>
      </div>

      {/* Output */}
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 min-h-[240px]">
        {!result && !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#9CA3AF] text-center">Your generated post will appear here</p>
          </div>
        )}
        {loading && (
          <div className="h-full flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
            <p className="text-sm text-[#6B7280]">Writing your post…</p>
          </div>
        )}
        {result && (
          <div className="h-full flex flex-col">
            <p className="text-sm text-[#111827] whitespace-pre-wrap flex-1 leading-relaxed">{result}</p>
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB] mt-4">
              <button onClick={handleCopy}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-[#ECFDF5] text-[#059669]" : "bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}>
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button onClick={handleGenerate}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BroadcastTool() {
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [channel, setChannel] = useState("WhatsApp");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const audiences = [
    { id: "all", label: "All Contacts", count: 184 },
    { id: "leads", label: "Unbooked Leads", count: 97 },
    { id: "booked", label: "Past Customers", count: 67 },
    { id: "inactive", label: "Inactive (30+ days)", count: 43 },
  ];

  const templates = [
    "We have new appointment slots available this week. Book now and receive a complimentary consultation.",
    "It's been a while! Come back for your annual check-up. Book online or reply to this message.",
    "Exclusive offer for our valued patients: 15% off any treatment booked before end of month.",
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  const selectedAudience = audiences.find((a) => a.id === audience);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Audience */}
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Target Audience</label>
          <div className="space-y-2">
            {audiences.map((a) => (
              <button key={a.id} onClick={() => setAudience(a.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${audience === a.id ? "border-[#FF6B35] bg-[#FFF8F5]" : "border-[#E5E7EB] hover:border-[#9CA3AF]"}`}>
                <span className="text-sm font-medium text-[#111827]">{a.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${audience === a.id ? "bg-[#FF6B35] text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{a.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
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
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your broadcast message…"
              rows={5}
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
            <p className="text-[10px] text-[#9CA3AF] mt-1">{message.length}/1000 characters</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Quick Templates</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {templates.map((t, i) => (
            <button key={i} onClick={() => setMessage(t)}
              className="text-left p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-xs text-[#6B7280] hover:border-[#FF6B35] hover:text-[#374151] transition-all line-clamp-3">
              {t}
            </button>
          ))}
        </div>
      </div>

      {!sent ? (
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">
            Sending to <span className="font-bold text-[#111827]">{selectedAudience?.count}</span> {selectedAudience?.label.toLowerCase()} via {channel}
          </p>
          <button onClick={handleSend} disabled={loading || !message.trim()}
            className="px-6 py-2.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: "#FF6B35" }}>
            {loading ? "Sending…" : "Send Broadcast"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#059669"/>
            <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#065F46]">Broadcast sent successfully</p>
            <p className="text-xs text-[#059669]">{selectedAudience?.count} messages queued for delivery via {channel}</p>
          </div>
          <button onClick={() => { setSent(false); setMessage(""); }}
            className="ml-auto text-xs text-[#6B7280] hover:text-[#111827] underline">Send another</button>
        </div>
      )}
    </div>
  );
}

function VideoTool() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60s");
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState("");
  const [copied, setCopied] = useState(false);

  const durations = ["30s", "60s", "90s", "3min"];

  const handleGenerate = () => {
    if (!topic.trim()) return;
    setLoading(true);
    setScript("");
    setTimeout(() => {
      setScript(`[HOOK — 0:00–0:08]\n"Did you know most people only brush 60% of their teeth properly? Here's what you're missing..."\n\n[PROBLEM — 0:08–0:20]\nShow close-up of common dental issues. Voiceover: "Poor brushing technique leads to hidden plaque buildup — and that leads to cavities and gum disease."\n\n[SOLUTION — 0:20–0:40]\n"At our clinic, we teach every patient a 3-step brushing technique that takes just 2 minutes and removes 40% more plaque. We show you in your first visit — no extra charge."\n\n[SOCIAL PROOF — 0:40–0:52]\n"Over 200 patients have switched to this method. The results speak for themselves." — Cut to before/after.\n\n[CTA — 0:52–1:00]\n"Book your appointment today. Link in bio. First-time visit includes a free technique assessment."`);
      setLoading(false);
    }, 1800);
  };

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Video Topic</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Why regular dental check-ups matter, or how to brush properly..."
            rows={4}
            className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35]/50 transition-colors resize-none" />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Target Duration</label>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${duration === d ? "border-[#FF6B35] bg-[#FFF8F5] text-[#FF6B35]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading || !topic.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: "#FF6B35" }}>
          {loading ? "Writing Script…" : "Generate Script"}
        </button>
      </div>

      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 min-h-[280px]">
        {!script && !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-[#9CA3AF] text-center">Your video script will appear here with scene-by-scene breakdown</p>
          </div>
        )}
        {loading && (
          <div className="h-full flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
            <p className="text-sm text-[#6B7280]">Writing your script…</p>
          </div>
        )}
        {script && (
          <div className="flex flex-col h-full">
            <p className="text-xs text-[#111827] whitespace-pre-wrap flex-1 leading-relaxed font-mono">{script}</p>
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB] mt-4">
              <button onClick={handleCopy}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-[#ECFDF5] text-[#059669]" : "bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35]"}`}>
                {copied ? "Copied!" : "Copy Script"}
              </button>
              <button onClick={handleGenerate}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: "#FF6B35" }}>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TOOLS: { id: Tool; label: string; desc: string }[] = [
  { id: "social", label: "Social Media Posts", desc: "AI-written posts for any platform" },
  { id: "broadcast", label: "Broadcast Message", desc: "Bulk message to leads or customers" },
  { id: "video", label: "Video Script", desc: "Scene-by-scene scripts for Reels & TikTok" },
];

export default function MarketingPage() {
  const [active, setActive] = useState<Tool>("social");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">

      <div>
        <h1 className="text-xl font-bold text-[#111827]">Marketing</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">AI tools to grow your business</p>
      </div>

      {/* Tool selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`p-4 rounded-xl border text-left transition-all ${active === t.id ? "border-[#FF6B35] bg-[#FFF8F5]" : "bg-white border-[#E5E7EB] hover:border-[#9CA3AF]"}`}>
            <p className={`text-sm font-bold mb-0.5 ${active === t.id ? "text-[#FF6B35]" : "text-[#111827]"}`}>{t.label}</p>
            <p className="text-[11px] text-[#6B7280]">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Active tool */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        {active === "social" && <SocialTool />}
        {active === "broadcast" && <BroadcastTool />}
        {active === "video" && <VideoTool />}
      </div>
    </div>
  );
}
