"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import {
  AuthPageShell,
  AuthSplitCard,
  authInputCls,
  InputIcon,
  MailIcon,
  LockIcon,
  GoogleButton,
} from "@/components/auth/AuthChrome";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  // ── Login state ──
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // ── Forgot-password state ──
  const [forgotMode, setForgotMode]   = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent]     = useState(false);
  const [resetError, setResetError]   = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(t("landing.auth.login.invalidCredentials"));
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    // Requires Google OAuth to be enabled in Supabase dashboard:
    // Authentication > Providers > Google > enable + add client ID/secret
    setError("");
    const supabase = getSupabase();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    // Must point at the callback route (which exchanges the OAuth code for a
    // session), not directly at /app -- /app has no code-exchange logic, so
    // middleware would see no session yet and bounce back to /auth/login.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    if (oauthError) {
      console.error("[Google sign-in] signInWithOAuth failed:", oauthError.message);
      setError(t("landing.auth.common.couldNotStartGoogle"));
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const redirectTo = `${appUrl}/auth/reset-password`;

    const supabase = getSupabase();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setResetLoading(false);

    if (resetErr) {
      setResetError(t("landing.auth.login.couldNotSendReset"));
      return;
    }

    setResetSent(true);
  };

  return (
    <AuthPageShell>
      <AuthSplitCard>
        {/* ── Sign-in form ── */}
        {!forgotMode && (
          <>
            <h1 className="vela-heading text-2xl text-[#111111] mb-2">{t("landing.auth.login.welcomeBack")}</h1>
            <p className="text-[#6B7280] text-sm mb-7">{t("landing.auth.login.subtitle")}</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                  {t("landing.auth.login.email")}
                </label>
                <div className="relative">
                  <InputIcon><MailIcon /></InputIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("landing.auth.login.emailPlaceholder")}
                    required
                    className={authInputCls}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    {t("landing.auth.login.password")}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setResetError(""); setResetSent(false); }}
                    className="text-xs text-[#FF6B35] hover:underline"
                  >
                    {t("landing.auth.login.forgotPassword")}
                  </button>
                </div>
                <div className="relative">
                  <InputIcon><LockIcon /></InputIcon>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("landing.auth.login.passwordPlaceholder")}
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
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70"
                style={{ background: "var(--vela-gradient)" }}
              >
                {loading ? t("landing.auth.login.signingIn") : t("landing.auth.login.signIn")}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">{t("landing.auth.common.orContinueWith")}</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <GoogleButton onClick={handleGoogleSignIn} label={t("landing.auth.common.continueWithGoogle")} />

            <p className="text-center text-sm text-[#6B7280] mt-6">
              {t("landing.auth.login.noAccount")}{" "}
              <Link href="/auth/signup" className="text-[#FF6B35] font-semibold hover:underline">
                {t("landing.auth.login.signUp")}
              </Link>
            </p>
          </>
        )}

        {/* ── Forgot password form ── */}
        {forgotMode && !resetSent && (
          <>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setResetError(""); }}
              className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111111] mb-6 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rtl:-scale-x-100">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("landing.auth.login.backToSignIn")}
            </button>

            <h1 className="vela-heading text-2xl text-[#111111] mb-2">{t("landing.auth.login.resetPassword")}</h1>
            <p className="text-[#6B7280] text-sm mb-7">
              {t("landing.auth.login.resetSubtitle")}
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                  {t("landing.auth.login.email")}
                </label>
                <div className="relative">
                  <InputIcon><MailIcon /></InputIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("landing.auth.login.emailPlaceholder")}
                    required
                    className={authInputCls}
                  />
                </div>
              </div>

              {resetError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70"
                style={{ background: "var(--vela-gradient)" }}
              >
                {resetLoading ? t("landing.auth.login.sending") : t("landing.auth.login.sendResetLink")}
              </button>
            </form>
          </>
        )}

        {/* ── Reset link sent confirmation ── */}
        {forgotMode && resetSent && (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 border border-green-200 mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 11l5 5 9-9" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">{t("landing.auth.login.checkEmail")}</h2>
            <p className="text-[#6B7280] text-sm text-center mb-6">
              {t("landing.auth.login.resetSentTo")} <span className="font-semibold text-[#374151]">{email}</span>.{" "}
              {t("landing.auth.login.resetSentInstructions")}
            </p>
            <p className="text-xs text-[#9CA3AF] text-center mb-6">
              {t("landing.auth.login.didntReceive")}{" "}
              <button
                type="button"
                className="text-[#FF6B35] hover:underline"
                onClick={() => setResetSent(false)}
              >
                {t("landing.auth.login.tryAgain")}
              </button>.
            </p>
            <button
              type="button"
              onClick={() => { setForgotMode(false); setResetSent(false); }}
              className="w-full py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all"
            >
              {t("landing.auth.login.backToSignIn")}
            </button>
          </>
        )}
      </AuthSplitCard>
    </AuthPageShell>
  );
}
