"use client";

import { useI18n } from "@/lib/i18n";
import AmbientGlow from "@/components/landing/AmbientGlow";

type Kind = "yes" | "no" | "partial";

// Nine honest, non-exaggerated comparison points. Every "Vela" cell reflects
// a real, currently-shipped capability (24/7 always-on AI, multilingual
// replies, follow-up automation, automatic conversation logging -- all real
// features in src/lib/pricing.ts / src/lib/plan-config.ts). "Human Staff"
// gets fair credit where genuinely true (real judgment, in-person rapport)
// and a fair, defensible downside where true -- nothing invented.
// "Basic AI Bots" column removed entirely (bug-fix + polish round #3) --
// same rows/copy for the remaining two columns, untouched.
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

const ROW_KINDS: Record<(typeof ROW_KEYS)[number], { humanStaff: Kind; vela: Kind }> = {
  answering:    { humanStaff: "partial", vela: "yes" },
  availability: { humanStaff: "no",      vela: "yes" },
  speed:        { humanStaff: "partial", vela: "yes" },
  languages:    { humanStaff: "partial", vela: "yes" },
  consistency:  { humanStaff: "no",      vela: "yes" },
  scale:        { humanStaff: "no",      vela: "yes" },
  followup:     { humanStaff: "partial", vela: "yes" },
  records:      { humanStaff: "partial", vela: "yes" },
  scalingCost:  { humanStaff: "no",      vela: "yes" },
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
    <section className="relative py-12 md:py-16 bg-white overflow-hidden">
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

        {/* Desktop: 2-equal-column table (Basic AI Bots column dropped,
            bug-fix + polish round #3), md+ only. */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse rounded-2xl overflow-hidden" style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.06)" }}>
            <thead>
              <tr>
                <th className="text-start bg-white border border-[#E5E7EB] px-4 py-4 w-[36%]" />
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

        {/* Mobile: stacked per-row card, now 2 options per row (Basic AI
            Bots dropped, bug-fix + polish round #3) -- row label as a
            header, then Human Staff / Vela listed vertically each with its
            own icon + full-width label/value. Same data/copy as desktop, no
            new locale keys. */}
        <div className="md:hidden flex flex-col gap-3">
          {ROW_KEYS.map((key) => {
            const kinds = ROW_KINDS[key];
            return (
              <div key={key} className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <p className="text-sm font-bold text-[#111111] px-4 pt-4 pb-3">
                  {t(`landing.comparison.rows.${key}.label`)}
                </p>
                <div className="flex flex-col divide-y divide-[#F3F4F6] border-t border-[#F3F4F6]">
                  <div className="flex items-start gap-2.5 px-4 py-3">
                    <CellIcon kind={kinds.humanStaff} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">{t("landing.comparison.columns.humanStaff")}</p>
                      <p className="text-sm text-[#374151] mt-0.5">{t(`landing.comparison.rows.${key}.humanStaff`)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 px-4 py-3" style={{ background: "#FFFBF9" }}>
                    <CellIcon kind={kinds.vela} accent />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#C2410C]">{t("landing.comparison.columns.vela")}</p>
                      <p className="text-sm font-semibold text-[#111111] mt-0.5">{t(`landing.comparison.rows.${key}.vela`)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
