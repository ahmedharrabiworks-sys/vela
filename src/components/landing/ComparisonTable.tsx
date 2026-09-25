"use client";

import { useI18n } from "@/lib/i18n";
import AmbientGlow from "@/components/landing/AmbientGlow";

type Kind = "yes" | "no" | "partial";

// Nine honest, non-exaggerated comparison points. Every "Vela" cell reflects
// a real, currently-shipped capability (24/7 always-on AI, multilingual
// replies, follow-up automation, automatic conversation logging -- all real
// features in src/lib/pricing.ts / src/lib/plan-config.ts). "Basic AI Bots"
// and "Human Staff" get fair credit where genuinely true (bots are cheap,
// instant, always-on; humans bring real judgment and rapport) and a fair,
// defensible downside where true -- nothing invented for either column.
const ROW_KEYS = [
  "answering",
  "availability",
  "speed",
  "languages",
  "consistency",
  "scale",
  "followup",
  "records",
  "scalingCost",
] as const;

const ROW_KINDS: Record<(typeof ROW_KEYS)[number], { basicBots: Kind; humanStaff: Kind; vela: Kind }> = {
  answering:    { basicBots: "partial", humanStaff: "partial", vela: "yes" },
  availability: { basicBots: "yes",     humanStaff: "no",      vela: "yes" },
  speed:        { basicBots: "yes",     humanStaff: "partial", vela: "yes" },
  languages:    { basicBots: "no",      humanStaff: "partial", vela: "yes" },
  consistency:  { basicBots: "partial", humanStaff: "no",      vela: "yes" },
  scale:        { basicBots: "partial", humanStaff: "no",      vela: "yes" },
  followup:     { basicBots: "no",      humanStaff: "partial", vela: "yes" },
  records:      { basicBots: "no",      humanStaff: "partial", vela: "yes" },
  scalingCost:  { basicBots: "yes",     humanStaff: "no",      vela: "yes" },
};

function CellIcon({ kind, accent }: { kind: Kind; accent?: boolean }) {
  const color = accent ? "#FF6B35" : kind === "yes" ? "#9CA3AF" : kind === "no" ? "#D1D5DB" : "#B4BAC4";
  if (kind === "yes") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="8" fill={accent ? color : "#F3F4F6"} />
        <path d="M5 8l2 2 4-4" stroke={accent ? "white" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "no") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="8" fill="#F9FAFB" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="8" fill="#F9FAFB" />
      <path d="M5 8h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function ComparisonTable() {
  const { t } = useI18n();

  return (
    <section className="relative py-14 md:py-20 bg-white overflow-hidden">
      <AmbientGlow pos="start" />
      <div className="relative max-w-5xl mx-auto px-5 md:px-6" style={{ zIndex: 1 }}>
        <div className="text-center mb-8 md:mb-10">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border mb-4"
            style={{ background: "#FFF3EE", borderColor: "rgba(255,107,53,0.25)", color: "#C2410C" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
            {t("landing.comparison.eyebrow")}
          </span>
          <h2 className="font-display font-extrabold text-[26px] sm:text-[32px] md:text-[38px] text-[#111111] leading-tight">
            {t("landing.comparison.headline1")}{" "}
            <span className="vela-gradient-text">{t("landing.comparison.headline2")}</span>
          </h2>
          <p className="text-[#6B7280] text-base mt-3 max-w-[480px] mx-auto">
            {t("landing.comparison.intro")}
          </p>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] border-collapse rounded-2xl overflow-hidden" style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.06)" }}>
            <thead>
              <tr>
                <th className="text-start bg-white border border-[#E5E7EB] px-4 py-4 w-[30%]" />
                <th className="text-start bg-white border border-[#E5E7EB] px-4 py-4">
                  <span className="text-sm font-bold text-[#6B7280]">{t("landing.comparison.columns.basicBots")}</span>
                </th>
                <th className="text-start bg-white border border-[#E5E7EB] px-4 py-4">
                  <span className="text-sm font-bold text-[#6B7280]">{t("landing.comparison.columns.humanStaff")}</span>
                </th>
                <th className="text-start border border-[#FF6B35] px-4 py-4" style={{ background: "#FFF8F5" }}>
                  <span className="text-sm font-bold text-[#C2410C]">{t("landing.comparison.columns.vela")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROW_KEYS.map((key) => {
                const kinds = ROW_KINDS[key];
                return (
                  <tr key={key}>
                    <td className="bg-white border border-[#E5E7EB] px-4 py-4">
                      <span className="text-sm font-semibold text-[#111111]">{t(`landing.comparison.rows.${key}.label`)}</span>
                    </td>
                    <td className="bg-white border border-[#E5E7EB] px-4 py-4">
                      <span className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <CellIcon kind={kinds.basicBots} />
                        {t(`landing.comparison.rows.${key}.basicBots`)}
                      </span>
                    </td>
                    <td className="bg-white border border-[#E5E7EB] px-4 py-4">
                      <span className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <CellIcon kind={kinds.humanStaff} />
                        {t(`landing.comparison.rows.${key}.humanStaff`)}
                      </span>
                    </td>
                    <td className="border border-[#FF6B35] px-4 py-4" style={{ background: "#FFFBF9" }}>
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#111111]">
                        <CellIcon kind={kinds.vela} accent />
                        {t(`landing.comparison.rows.${key}.vela`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
