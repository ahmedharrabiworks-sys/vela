"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import {
  AuthPageShell,
  AuthSplitCard,
  authInputCls,
  InputIcon,
  LockIcon,
} from "@/components/auth/AuthChrome";
import { PasswordChecklist, usePasswordCheck } from "@/components/auth/PasswordChecklist";

type PageState = "loading" | "ready" | "success" | "expired";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const passwordCheck = usePasswordCheck(password);

  useEffect(() => {
    // Supabase picks up the recovery code/token from the URL automatically
    // when the client is initialised (detectSessionInUrl), establishing a
    // one-time session. getSession() confirms whether that exchange
    // succeeded -- a missing session here means an expired/already-used
    // link, same failure class /auth/callback's own exchange can hit.
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPageState(session ? "ready" : "expired");
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError("");

    if (!passwordCheck.valid) {
      setError(t(`landing.auth.password.error.${passwordCheck.firstError}`));
      return;
    }
    if (password !== confirm) {
      setError(t("landing.auth.resetPassword.mismatch"));
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setLoading(false);
      setError(t("landing.auth.resetPassword.updateFailed"));
      return;
    }

    // Sign out every OTHER session (a device/browser the account might
    // still be logged into) now that the password just changed, while
    // keeping THIS session active so the redirect below actually lands
    // the user in the app instead of bouncing them back to login.
    await supabase.auth.signOut({ scope: "others" });

    setLoading(false);
    setPageState("success");
    setTimeout(() => router.push("/app"), 2000);
  };

  return (
    <AuthPageShell>
      <AuthSplitCard
        panelHeadline={t("landing.auth.resetPassword.panelHeadline")}
        panelBody={t("landing.auth.resetPassword.panelBody")}
      >
        {/* ── Loading ── */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin mb-4" />
            <p className="text-sm text-[#6B7280]">{t("landing.auth.resetPassword.verifying")}</p>
          </div>
        )}

        {/* ── Expired / invalid link ── */}
        {pageState === "expired" && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-200 mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 7v5m0 3.5v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="9" stroke="#EF4444" strokeWidth="2"/>
              </svg>
            </div>
            <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">{t("landing.auth.resetPassword.linkExpiredTitle")}</h2>
            <p className="text-[#6B7280] text-sm text-center mb-6">
              {t("landing.auth.resetPassword.linkExpiredBody")}
            </p>
            <Link
              href="/auth/forgot-password"
              className="input-glass block w-full py-3 rounded-xl font-semibold text-sm text-center text-[#374151] transition-all"
            >
              {t("landing.auth.linkExpired.sendNewLink")}
            </Link>
          </>
        )}

        {/* ── New password form ── */}
        {pageState === "ready" && (
          <>
            <h1 className="vela-heading text-2xl text-[#111111] mb-1">{t("landing.auth.resetPassword.title")}</h1>
            <p className="text-[#6B7280] text-sm mb-4">{t("landing.auth.resetPassword.subtitle")}</p>

            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                  {t("landing.auth.resetPassword.newPassword")}
                </label>
                <div className="relative">
                  <InputIcon><LockIcon /></InputIcon>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("landing.auth.signup.passwordMin")}
                    required
                    className={`${authInputCls} pe-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    aria-label={showPassword ? t("landing.auth.common.hidePassword") : t("landing.auth.common.showPassword")}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                <PasswordChecklist result={passwordCheck} password={password} />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                  {t("landing.auth.resetPassword.confirmPassword")}
                </label>
                <div className="relative">
                  <InputIcon><LockIcon /></InputIcon>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t("landing.auth.resetPassword.confirmPlaceholder")}
                    required
                    className={`${authInputCls} pe-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    aria-label={showConfirm ? t("landing.auth.common.hidePassword") : t("landing.auth.common.showPassword")}
                  >
                    {showConfirm ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (touched && !passwordCheck.valid)}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60"
                style={{ background: "var(--vela-gradient)" }}
              >
                {loading ? t("landing.auth.resetPassword.updating") : t("landing.auth.resetPassword.updateBtn")}
              </button>
            </form>
          </>
        )}

        {/* ── Success ── */}
        {pageState === "success" && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 border border-green-200 mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 11l5 5 9-9" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">{t("landing.auth.resetPassword.successTitle")}</h2>
            <p className="text-[#6B7280] text-sm text-center">
              {t("landing.auth.resetPassword.successBody")}
            </p>
          </>
        )}
      </AuthSplitCard>
    </AuthPageShell>
  );
}
