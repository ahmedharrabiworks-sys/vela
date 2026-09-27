"use client";

import { useI18n } from "@/lib/i18n";
import { checkPasswordRules, type PasswordCheckResult } from "@/lib/auth/password";

/**
 * Live checklist + 4-segment strength bar for a password field, shared by
 * signup step 1 and /auth/reset-password so the exact same rules (and
 * exact same visual language) show in both places. The result itself is
 * computed once by the caller (checkPasswordRules) and passed in, so this
 * component is pure presentation -- it never re-derives validity, which
 * keeps it impossible for the UI's idea of "valid" to drift from the
 * value actually used to enable/disable the Continue button.
 */
export function usePasswordCheck(
  password: string,
  opts?: { email?: string; fullName?: string }
): PasswordCheckResult {
  return checkPasswordRules(password, opts);
}

const RULE_ORDER: { key: keyof PasswordCheckResult["rules"]; labelKey: string }[] = [
  { key: "minLength", labelKey: "ruleLength" },
  { key: "hasUpper", labelKey: "ruleUpper" },
  { key: "hasLower", labelKey: "ruleLower" },
  { key: "hasDigit", labelKey: "ruleDigit" },
  { key: "hasSymbol", labelKey: "ruleSymbol" },
];

export function PasswordChecklist({ result, password }: { result: PasswordCheckResult; password: string }) {
  const { t } = useI18n();
  if (!password) return null;

  const barColors = ["#E5E7EB", "#EF4444", "#F59E0B", "#F59E0B", "#22C55E"];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: result.score >= seg ? barColors[result.score] : "#E5E7EB" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULE_ORDER.map(({ key, labelKey }) => {
          const met = result.rules[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: met ? "#FF6B35" : "rgba(20,20,30,0.08)" }}
              >
                {met && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.8 1.8L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-[11px] ${met ? "text-[#374151]" : "text-[#9CA3AF]"}`}>
                {t(`landing.auth.password.${labelKey}`)}
              </span>
            </div>
          );
        })}
      </div>
      {!result.valid && result.firstError && password.length > 0 && (
        <p className="text-[11px] text-red-600 mt-2">
          {t(`landing.auth.password.error.${result.firstError}`)}
        </p>
      )}
    </div>
  );
}
