"use client";

import { useEffect, useState } from "react";
import { WEEK_STARTS, type WeekStart } from "@/lib/week-start";

const DAY_KEY: Record<WeekStart, string> = { 0: "sunday", 1: "monday", 6: "saturday" };

/** "Week starts on": saved on change, used by the Week view, mini month and date pickers. */
export default function WeekStartSetting({ t }: { t: (key: string) => string }) {
  const [value, setValue] = useState<WeekStart | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch("/api/settings/week-start").then((r) => (r.ok ? r.json() : null)).then((d: { weekStart?: WeekStart } | null) => { if (d?.weekStart !== undefined) setValue(d.weekStart); }).catch(() => {});
  }, []);

  const choose = async (next: WeekStart) => {
    const before = value;
    setValue(next);
    setState("saving");
    try {
      const res = await fetch("/api/settings/week-start", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart: next }), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("save");
      setState("saved");
    } catch {
      setValue(before);
      setState("error");
    }
  };

  return (
    <div data-testid="week-start-setting">
      <p className="text-xs font-medium text-[#6B7280] mb-1.5">{t("settings.businessInfo.weekStart")}</p>
      <div role="radiogroup" aria-label={t("settings.businessInfo.weekStart")} className="inline-flex flex-wrap gap-1.5">
        {WEEK_STARTS.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={value === d} disabled={value === null || state === "saving"} onClick={() => value !== d && choose(d)}
            className={`min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 ${value === d ? "border-[#FF6B35] bg-[#FFF5F0] text-[#C2410C]" : "border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35]/50"}`}>
            {t(`settings.businessInfo.days.${DAY_KEY[d]}`)}
          </button>
        ))}
      </div>
      <p className={`text-xs mt-1.5 ${state === "error" ? "text-red-600" : "text-[#9CA3AF]"}`} aria-live="polite">
        {state === "saved" ? t("settings.businessInfo.weekStartSaved") : state === "error" ? t("settings.businessInfo.weekStartError") : t("settings.businessInfo.weekStartHint")}
      </p>
    </div>
  );
}
