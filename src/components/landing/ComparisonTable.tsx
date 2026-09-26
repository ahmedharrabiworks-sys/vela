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

function CellIcon({ kind, accent, small }: { kind: Kind; accent?: boolean; small?: boolean }) {
  const color = accent ? "#FF6B35" : kind === "yes" ? "#9CA3AF" : kind === "no" ? "#D1D5DB" : "#B4BAC4";
  const s = small ? 11 : 16;
  const mt = small ? "mt-[3px]" : "";
  if (kind === "yes") {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" className={`shrink-0 ${mt}`}>
        <circle cx="8" cy="8" r="8" fill={accent ? color : "#F3F4F6"} />
        <path d="M5 8l2 2 4-4" stroke={accent ? "white" : "#6B7280"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "no") {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" className={`shrink-0 ${mt}`}>
        <circle cx="8" cy="8" r="8" fill="#F9FAFB" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" className={`shrink-0 ${mt}`}>
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

        {/* Mobile: a real compact table (bug-fix + polish round #4),
            matching comparison-table-reference.png's pattern -- label +
            both value columns side by side in one row, small text, tight
            padding, wrapping to multiple lines instead of truncating (same
            approach the reference itself uses for its longer phrases).
            Replaces the stacked-card layout from last session, which
            wasn't the actual requirement. Same data/copy as desktop, no
            new locale keys. table-fixed keeps column widths predictable;
            overflow-x-auto on the wrapper is a contained safety net only --
            in practice the content wraps and fits without needing it. */}
        <div className="md:hidden overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse rounded-xl overflow-hidden table-fixed" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <colgroup>
              <col style={{ width: "32%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "36%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="bg-white border border-[#E5E7EB] px-1.5 py-2.5" />
                <th className="text-start bg-white border border-[#E5E7EB] px-1.5 py-2.5">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide">{t("landing.comparison.columns.humanStaff")}</span>
                </th>
                <th className="text-start border border-[#FF6B35] px-1.5 py-2.5" style={{ background: "#FFF8F5" }}>
                  <span className="text-[10px] font-bold text-[#C2410C] uppercase tracking-wide">{t("landing.comparison.columns.vela")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROW_KEYS.map((key) => {
                const kinds = ROW_KINDS[key];
                return (
                  <tr key={key}>
                    <td className="align-top bg-white border border-[#E5E7EB] px-1.5 py-2.5">
                      <span className="text-[11px] font-semibold text-[#111111] leading-snug">{t(`landing.comparison.rows.${key}.label`)}</span>
                    </td>
                    <td className="align-top bg-white border border-[#E5E7EB] px-1.5 py-2.5">
                      <span className="flex items-start gap-1 text-[11px] text-[#6B7280] leading-snug">
                        <CellIcon kind={kinds.humanStaff} small />
                        {t(`landing.comparison.rows.${key}.humanStaff`)}
                      </span>
                    </td>
                    <td className="align-top border border-[#FF6B35] px-1.5 py-2.5" style={{ background: "#FFFBF9" }}>
                      <span className="flex items-start gap-1 text-[11px] font-semibold text-[#111111] leading-snug">
                        <CellIcon kind={kinds.vela} accent small />
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
