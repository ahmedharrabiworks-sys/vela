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

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Set when Supabase's own sign-in rejects the attempt specifically
  // because the account's email was never confirmed -- shown as a
  // dedicated "confirm your email first" state with a resend action,
  // instead of the generic invalid-credentials message.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnconfirmed(false);
    setResent(false);

    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      const msg = authError.message?.toLowerCase() ?? "";
      if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
        setUnconfirmed(true);
        return;
      }
      setError(t("landing.auth.login.invalidCredentials"));
      return;
    }

    router.push("/app");
    router.refresh();
  };

  const handleResendConfirmation = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* generic response either way, nothing to show differently */ }
    setResending(false);
    setResent(true);
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

  return (
    <AuthPageShell>
      <AuthSplitCard>
        {!unconfirmed ? (
          <>
            <h1 className="vela-heading text-2xl text-[#111111] mb-1">{t("landing.auth.login.welcomeBack")}</h1>
            <p className="text-[#6B7280] text-sm mb-4">{t("landing.auth.login.subtitle")}</p>

            <form onSubmit={handleLogin} className="space-y-3">
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
                  <Link href="/auth/forgot-password" className="text-xs text-[#FF6B35] hover:underline">
                    {t("landing.auth.login.forgotPassword")}
                  </Link>
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
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">{t("landing.auth.common.orContinueWith")}</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <GoogleButton onClick={handleGoogleSignIn} label={t("landing.auth.common.continueWithGoogle")} />

            <p className="text-center text-sm text-[#6B7280] mt-4">
              {t("landing.auth.login.noAccount")}{" "}
              <Link href="/auth/signup" className="text-[#FF6B35] font-semibold hover:underline">
                {t("landing.auth.login.signUp")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200 mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 7v5m0 3.5v.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="9" stroke="#F59E0B" strokeWidth="2"/>
              </svg>
            </div>
            <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">{t("landing.auth.login.unconfirmedTitle")}</h2>
            <p className="text-[#6B7280] text-sm text-center mb-6">
              {t("landing.auth.login.unconfirmedBody")}
            </p>

            {resent ? (
              <p className="text-sm text-[#374151] px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-center mb-4">
                {t("landing.auth.linkExpired.sentConfirmation")}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="input-glass w-full py-3 rounded-xl font-semibold text-sm text-[#374151] transition-all mb-4 disabled:opacity-60"
              >
                {resending ? t("landing.auth.checkEmail.sending") : t("landing.auth.checkEmail.resend")}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setUnconfirmed(false); setResent(false); }}
              className="text-center text-sm text-[#6B7280] hover:underline w-full"
            >
              {t("landing.auth.login.backToSignIn")}
            </button>
          </>
        )}
      </AuthSplitCard>
    </AuthPageShell>
  );
}
