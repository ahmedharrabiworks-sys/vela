"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const COL_KEYS = ["starter", "pro", "premium"] as const;
const PRO_COL = 1;

type Cell = { included: boolean };

// Every row/cell here is a real, currently-shipped limit or capability from
// src/lib/pricing.ts / src/lib/plan-config.ts -- nothing invented. Websites,
// CRM, Analytics and multi-location are intentionally absent: those
// features are flagged off for this MVP phase (src/config/features.ts) and
// were already excluded from the flat table this replaces. "Follow-up
// automation" is new here vs. the old flat table -- it's a real per-plan
// gate (plan-config.ts `followUps`), not a new claim.
const CATEGORIES = [
  {
    key: "channels",
    rows: [
      { key: "channels",     cells: { starter: { included: true }, pro: { included: true }, premium: { included: true } } },
      { key: "textMessages", cells: { starter: { included: true }, pro: { included: true }, premium: { included: true } } },
    ],
  },
  {
    key: "voice",
    rows: [
      { key: "voiceMinutes", cells: { starter: { included: false }, pro: { included: true }, premium: { included: true } } },
      { key: "voiceAgent",   cells: { starter: { included: false }, pro: { included: true }, premium: { included: true } } },
      { key: "languages",    cells: { starter: { included: true },  pro: { included: true }, premium: { included: true } } },
    ],
  },
  {
    key: "team",
    rows: [
      { key: "teamMembers", cells: { starter: { included: true },  pro: { included: true }, premium: { included: true } } },
      { key: "aiTraining",  cells: { starter: { included: true },  pro: { included: true }, premium: { included: true } } },
      { key: "followUps",   cells: { starter: { included: false }, pro: { included: true }, premium: { included: true } } },
    ],
  },
  {
    key: "support",
    rows: [
      { key: "support",    cells: { starter: { included: true }, pro: { included: true }, premium: { included: true } } },
      { key: "onboarding", cells: { starter: { included: true }, pro: { included: true }, premium: { included: true } } },
    ],
  },
] as const;

function CellIcon({ included }: { included: boolean }) {
  if (included) {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="mt-0.5 shrink-0">
        <circle cx="7.5" cy="7.5" r="7" fill="rgba(255,107,53,0.12)" />
        <path d="M4.5 7.5l2 2 3.5-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="mt-0.5 shrink-0">
      <circle cx="7.5" cy="7.5" r="7" fill="rgba(0,0,0,0.04)" />
      <path d="M5 5l5 5M10 5l-5 5" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function PlanComparisonDetailed() {
  const { t } = useI18n();

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-[#111111]">
          {t("landing.planCompare.title1")}{" "}
          <span className="vela-gradient-text">{t("landing.planCompare.titleAccent")}</span>
        </h1>
        <p className="text-[#6B7280] mt-2">{t("landing.planCompare.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-start py-4 px-5 font-semibold text-[#9CA3AF] text-xs uppercase tracking-wider w-[38%]" />
              {COL_KEYS.map((key, i) => (
                <th
                  key={key}
                  className={`py-4 px-4 text-start font-bold text-xs uppercase tracking-wider ${
                    i === PRO_COL ? "text-[#FF6B35] bg-[#FF6B35]/5" : "text-[#374151]"
                  }`}
                >
                  {t(`landing.pricing.plans.${key}.name`)}
                  {i === PRO_COL && (
                    <span className="block text-[9px] font-semibold normal-case tracking-normal text-[#FF6B35]/70 mt-0.5">
                      {t("landing.planCompare.mostPopular")}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <Fragment key={cat.key}>
                <tr className="bg-[#F9FAFB]">
                  <td colSpan={4} className="py-2.5 px-5 text-xs font-bold uppercase tracking-widest text-[#6B7280] border-b border-[#E5E7EB]">
                    {t(`landing.planCompare.categories.${cat.key}`)}
                  </td>
                </tr>
                {cat.rows.map((row) => (
                  <tr key={row.key} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-4 px-5 align-top">
                      <p className="font-semibold text-[#111111]">{t(`landing.planCompare.rows.${row.key}.label`)}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5 leading-snug">{t(`landing.planCompare.rows.${row.key}.sublabel`)}</p>
                    </td>
                    {COL_KEYS.map((colKey, ci) => {
                      const cell: Cell = row.cells[colKey];
                      return (
                        <td key={colKey} className={`py-4 px-4 align-top ${ci === PRO_COL ? "bg-[#FF6B35]/5" : ""}`}>
                          <span className="flex items-start gap-2">
                            <CellIcon included={cell.included} />
                            <span className={`leading-snug ${ci === PRO_COL ? "font-semibold text-[#111111]" : "text-[#374151]"}`}>
                              {cell.included
                                ? t(`landing.planCompare.rows.${row.key}.${colKey}`)
                                : t("landing.planCompare.notIncluded")}
                            </span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <p className="text-center text-sm text-[#9CA3AF] mt-8">
        {t("landing.planCompare.cancelNote")}
        {" · "}
        <Link href="/auth/signup" className="text-[#FF6B35] hover:underline font-medium">
          {t("landing.planCompare.startFree")} <span className="rtl:-scale-x-100 inline-block">→</span>
        </Link>
      </p>
    </>
  );
}
