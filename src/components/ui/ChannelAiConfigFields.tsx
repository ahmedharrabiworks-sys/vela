"use client";

// Real per-channel AI-behavior config -- reuses the exact tone/language
// vocabulary from Settings -> AI Configuration, scoped to one channel via
// tenant_config.channel_ai_config (see /api/channels/ai-config). Originally
// built inline inside Channels' Instagram/WhatsApp "Manage" modal (round F);
// extracted here (round H) so Website Builder's Analytics panel can reuse
// the identical control for the Website channel instead of duplicating it.
export const CHANNEL_AI_TONES = ["professional", "friendly", "formal", "casual"];
export const CHANNEL_AI_LANGUAGES = ["English", "Arabic", "Auto-detect"];

export type ChannelAiConfigProps = {
  loading: boolean;
  tone: string;
  language: string;
  saving: boolean;
  saved: boolean;
  onToneChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onSave: () => void;
};

export default function ChannelAiConfigFields({
  loading, tone, language, saving, saved, onToneChange, onLanguageChange, onSave,
}: ChannelAiConfigProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-2">AI response tone for this channel</p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_AI_TONES.map((v) => (
            <button key={v} type="button" onClick={() => onToneChange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${tone === v ? "text-white" : "bg-[#F9FAFB] dark:bg-[#1E1E24] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/40"}`}
              style={tone === v ? { background: "var(--vela-gradient)" } : {}}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#374151] dark:text-[#D1D5DB] mb-2">Reply language for this channel</p>
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_AI_LANGUAGES.map((v) => (
            <button key={v} type="button" onClick={() => onLanguageChange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === v ? "text-white" : "bg-[#F9FAFB] dark:bg-[#1E1E24] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A32] hover:border-[#FF6B35]/40"}`}
              style={language === v ? { background: "var(--vela-gradient)" } : {}}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Saved</span>}
        <button onClick={onSave} disabled={saving}
          className="text-xs font-bold px-4 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ background: "var(--vela-gradient)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
