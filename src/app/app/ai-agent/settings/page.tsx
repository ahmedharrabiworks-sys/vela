"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { VOICES } from "@/lib/vapi-agent-config";
import { DEFAULT_PHONE_SPEED, DEFAULT_PHONE_VOICE_ID, buildGreeting, resolveAgentName } from "@/lib/vapi-phone-assistant";
import { Chips, PageHead, SaveButton, Section, areaCls, fieldCls, labelCls, quietBtnCls } from "@/components/dashboard/AgentUI";

interface Settings {
  agentName?: string;
  voiceId?: string;
  speed?: number;
  personality?: string;
  customInstructions?: string;
  greetingStyle?: string;
  customGreeting?: string;
  language?: string;
  greetingLanguage?: string;
  spokenBusinessName?: string;
}

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
];

export default function SettingsPage() {
  const { t } = useI18n();
  const [s, setS] = useState<Settings>({
    agentName: "Vela",
    voiceId: DEFAULT_PHONE_VOICE_ID,
    speed: DEFAULT_PHONE_SPEED,
    personality: "professional",
    customInstructions: "",
    greetingStyle: "warm",
    customGreeting: "",
    language: "",
    greetingLanguage: "ar_en",
    spokenBusinessName: "",
  });
  const [businessName, setBusinessName] = useState("");
  const [assistant, setAssistant] = useState({ conversationStyle: "warm", preferredLanguage: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<"idle" | "loading" | "playing">("idle");
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai-agent/settings").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/api/ai-agent/assistant-settings").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([{ businessName: savedName, ...agent }, owner]: [Settings & { businessName?: string }, { conversationStyle?: string; preferredLanguage?: string }]) => {
      setS((p) => ({ ...p, ...agent }));
      setBusinessName(savedName ?? "");
      setAssistant((p) => ({ conversationStyle: owner.conversationStyle ?? p.conversationStyle, preferredLanguage: owner.preferredLanguage ?? p.preferredLanguage }));
      setLoading(false);
    });
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const touched = () => { setDirty(true); setSaved(false); };
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => { setS((p) => ({ ...p, [key]: val })); touched(); };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const [a, b] = await Promise.all([post("/api/ai-agent/settings", s), post("/api/ai-agent/assistant-settings", assistant)]);
      if (!a.ok || !b.ok) throw new Error("save");
      setDirty(false);
      setSaved(true);
    } catch {
      setError(t("agentUi.common.saveError"));
    }
    setSaving(false);
  };

  const speed = s.speed ?? DEFAULT_PHONE_SPEED;
  const voiceId = s.voiceId ?? DEFAULT_PHONE_VOICE_ID;
  const custom = s.greetingStyle === "custom";
  // A custom greeting that never says the business name usually names another business.
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "");
  const namesOtherBusiness = !!(s.customGreeting ?? "").trim() && !!businessName && ![businessName, s.spokenBusinessName ?? ""].some((n) => squash(n) && squash(s.customGreeting ?? "").includes(squash(n)));
  const greeting = buildGreeting(businessName || "your business", s, resolveAgentName(s));

  const togglePreview = async () => {
    if (preview !== "idle") {
      audioRef.current?.pause();
      setPreview("idle");
      return;
    }
    setPreview("loading");
    setPreviewNote(null);
    try {
      const res = await fetch("/api/ai-agent/tts-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, speed }),
      });
      if (!res.ok) throw new Error("preview");
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPreview("idle"); URL.revokeObjectURL(url); };
      audio.onerror = () => setPreview("idle");
      setPreview("playing");
      await audio.play();
    } catch {
      setPreview("idle");
      setPreviewNote(t("agentUi.settings.previewFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 240 }}>
        <div className="w-5 h-5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }

  const sectionLabel = (v: "female" | "male") => t(v === "female" ? "agentUi.settings.female" : "agentUi.settings.male");

  return (
    <div className="max-w-4xl mx-auto pb-16 2xl:pb-0">
      <PageHead title={t("agentUi.settings.title")} subtitle={t("agentUi.settings.subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <Section title={t("agentUi.settings.identity")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="agent-name" className={labelCls}>{t("agentUi.settings.name")}</label>
                <input id="agent-name" dir="auto" maxLength={40} value={s.agentName ?? ""} onChange={(e) => set("agentName", e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="agent-language" className={labelCls}>{t("agentUi.settings.language")}</label>
                <select id="agent-language" value={s.language ?? ""} onChange={(e) => set("language", e.target.value)} className={fieldCls}>
                  <option value="">{t("agentUi.settings.autoDetect")}</option>
                  {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </Section>

          <Section title={t("agentUi.settings.personality")}>
            <Chips
              label={t("agentUi.settings.personality")}
              value={s.personality ?? "professional"}
              onChange={(v) => set("personality", v)}
              options={[
                { value: "friendly", label: t("agentUi.settings.friendly") },
                { value: "professional", label: t("agentUi.settings.professional") },
                { value: "persuasive", label: t("agentUi.settings.persuasive") },
                { value: "concise", label: t("agentUi.settings.concise") },
              ]}
            />
          </Section>

          <Section title={t("agentUi.settings.greeting")}>
            <div className="space-y-3">
              <div>
                <label htmlFor="greeting-language" className={labelCls}>{t("agentUi.settings.greetingLanguage")}</label>
                <select id="greeting-language" value={s.greetingLanguage || "ar_en"} onChange={(e) => set("greetingLanguage", e.target.value)} className={fieldCls}>
                  <option value="ar_en">العربية + English</option>
                  {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2.5 min-h-[44px] text-sm text-[#374151] cursor-pointer">
                <input type="checkbox" checked={custom} onChange={(e) => set("greetingStyle", e.target.checked ? "custom" : "warm")} className="w-5 h-5 accent-[#FF6B35]" />
                {t("agentUi.settings.writeGreeting")}
              </label>
              {custom && (
                <textarea aria-label={t("agentUi.settings.writeGreeting")} rows={2} maxLength={300} value={s.customGreeting ?? ""} onChange={(e) => set("customGreeting", e.target.value)} placeholder={t("agentUi.settings.greetingPlaceholder")} className={areaCls} />
              )}
              <div>
                <label htmlFor="spoken-name" className={labelCls}>{t("agentUi.settings.spokenName")}</label>
                <input id="spoken-name" dir="auto" maxLength={100} value={s.spokenBusinessName ?? ""} onChange={(e) => set("spokenBusinessName", e.target.value)} placeholder={businessName} className={fieldCls} />
                <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{t("agentUi.settings.spokenNameHint")}</p>
              </div>
              <div className="rounded-lg bg-[#FAFAFA] border border-[#F3F4F6] px-3 py-2.5">
                <p className="text-[11px] font-medium text-[#9CA3AF] mb-1">{t("agentUi.settings.greetingPreview")}</p>
                <p data-testid="greeting-preview" dir="auto" className="text-sm text-[#111111] leading-relaxed [overflow-wrap:anywhere]">{greeting}</p>
              </div>
              {custom && namesOtherBusiness && (
                <p data-testid="greeting-name-warning" className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">{t("agentUi.settings.greetingNameWarning").replace("{name}", businessName)}</p>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title={t("agentUi.settings.voice")}>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select aria-label={t("agentUi.settings.voice")} value={voiceId} onChange={(e) => { audioRef.current?.pause(); setPreview("idle"); set("voiceId", e.target.value); }} className={`${fieldCls} min-w-0 flex-1`}>
                  {(["male", "female"] as const).map((g) => (
                    <optgroup key={g} label={sectionLabel(g)}>
                      {VOICES.filter((v) => v.gender === g).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button type="button" onClick={togglePreview} className={`${quietBtnCls} shrink-0 gap-2`}>
                  {preview === "loading" ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      {preview === "playing"
                        ? <path d="M2 2h2.5v6H2zM5.5 2H8v6H5.5z" fill="currentColor"/>
                        : <path d="M3 2l5 3-5 3V2z" fill="currentColor"/>}
                    </svg>
                  )}
                  {preview === "playing" ? t("agentUi.settings.stop") : t("agentUi.settings.preview")}
                </button>
              </div>
              {previewNote && <p className="text-xs text-red-600">{previewNote}</p>}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="agent-speed" className="text-xs font-medium text-[#6B7280]">{t("agentUi.settings.speed")}</label>
                  <span dir="ltr" className="text-xs font-medium text-[#111111] tabular-nums">{speed.toFixed(2)}×</span>
                </div>
                <input
                  id="agent-speed"
                  dir="ltr"
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.05}
                  value={speed}
                  onChange={(e) => set("speed", parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF6B35] [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#FF6B35]"
                  style={{ background: `linear-gradient(to right, #FF6B35 ${((speed - 0.7) / 0.5) * 100}%, #E5E7EB ${((speed - 0.7) / 0.5) * 100}%)` }}
                />
              </div>
            </div>
          </Section>

          <Section title={t("agentUi.settings.customInstructions")}>
            <textarea aria-label={t("agentUi.settings.customInstructions")} rows={3} maxLength={1000} value={s.customInstructions ?? ""} onChange={(e) => set("customInstructions", e.target.value)} placeholder={t("agentUi.settings.instructionsPlaceholder")} className={areaCls} />
          </Section>

          <Section title={t("agentUi.settings.ownerAssistant")} hint={t("agentUi.settings.ownerAssistantHint")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="owner-style" className={labelCls}>{t("agentUi.settings.replyStyle")}</label>
                <select id="owner-style" value={assistant.conversationStyle} onChange={(e) => { setAssistant((p) => ({ ...p, conversationStyle: e.target.value })); touched(); }} className={fieldCls}>
                  <option value="warm">{t("agentUi.settings.styleWarm")}</option>
                  <option value="direct">{t("agentUi.settings.styleDirect")}</option>
                  <option value="thorough">{t("agentUi.settings.styleThorough")}</option>
                  <option value="brief">{t("agentUi.settings.styleBrief")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="owner-language" className={labelCls}>{t("agentUi.settings.language")}</label>
                <select id="owner-language" value={assistant.preferredLanguage} onChange={(e) => { setAssistant((p) => ({ ...p, preferredLanguage: e.target.value })); touched(); }} className={fieldCls}>
                  <option value="">{t("agentUi.settings.autoDetect")}</option>
                  {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <SaveButton
        saving={saving}
        dirty={dirty}
        justSaved={saved}
        error={error}
        onSave={save}
        label={t("agentUi.common.save")}
        savingLabel={t("agentUi.common.saving")}
        savedLabel={t("agentUi.common.saved")}
      />
    </div>
  );
}
