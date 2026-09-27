"use client";

import { useEffect, useRef, useState } from "react";
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
  GoogleButton,
} from "@/components/auth/AuthChrome";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { suggestEmailTypoFix } from "@/lib/auth/email";
import type { ForgotPasswordStatus } from "@/app/api/auth/forgot-password/route";

const RESEND_COOLDOWN_S = 60;

/* "oussama@gmail.com" -> "o***a@gmail.com" */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const masked = local.length <= 2
    ? `${local[0]}*`
    : `${local[0]}${"*".repeat(Math.min(local.length - 2, 3))}${local[local.length - 1]}`;
  return `${masked}${domain}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineStatus, setInlineStatus] = useState<Extract<ForgotPasswordStatus, "none" | "google_only"> | null>(null);
  const [authError, setAuthError] = useState("");

  const [step, setStep] = useState<"email" | "code">("email");
  const [codeType, setCodeType] = useState<"signup" | "recovery">("recovery");
  const [codeValue, setCodeValue] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailTypoFix = suggestEmailTypoFix(email);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const requestCode = async (): Promise<ForgotPasswordStatus> => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({ status: "generic" }));
    return (body.status ?? "generic") as ForgotPasswordStatus;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInlineStatus(null);
    setAuthError("");
    try {
      const status = await requestCode();
      setLoading(false);

      if (status === "none" || status === "google_only") {
        setInlineStatus(status);
        return;
      }
      if (status === "unconfirmed") {
        setCodeType("signup");
      } else {
        // "password" or "generic"
        setCodeType("recovery");
      }
      setCodeValue("");
      setCodeError("");
      setStep("code");
      startCooldown();
    } catch {
      setLoading(false);
      setAuthError(t("landing.auth.signup.somethingWentWrong"));
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await requestCode();
    } catch { /* generic response either way, nothing to show differently */ }
    setResending(false);
    startCooldown();
  };

  const handleVerifyCode = async (code: string) => {
    setVerifyingCode(true);
    setCodeError("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, type: codeType }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.error === "too_many_attempts") {
          setCodeError(`${t("landing.auth.checkEmail.tooManyAttempts")} ${body.minutes} ${t("landing.auth.checkEmail.minutes")}`);
        } else if (body.error === "wrong_code") {
          setCodeError(`${t("landing.auth.checkEmail.wrongCode")} ${body.remaining} ${t("landing.auth.checkEmail.triesLeft")}`);
        } else {
          setCodeError(t("landing.auth.signup.somethingWentWrong"));
        }
        setCodeValue("");
        setVerifyingCode(false);
        return;
      }

      // Session cookies are now set (verifyOtp via the Route Handler client).
      setVerifyingCode(false);
      if (codeType === "signup") {
        router.push("/auth/signup?onboarding=1");
      } else {
        router.push("/auth/reset-password");
      }
    } catch {
      setCodeError(t("landing.auth.signup.somethingWentWrong"));
      setCodeValue("");
      setVerifyingCode(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    const supabase = getSupabase();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    if (oauthError) {
      console.error("[Google sign-in] signInWithOAuth failed:", oauthError.message);
      setAuthError(t("landing.auth.common.couldNotStartGoogle"));
    }
  };

  return (
    <AuthPageShell>
      <AuthSplitCard
        panelHeadline={t("landing.auth.forgotPassword.panelHeadline")}
        panelBody={t("landing.auth.forgotPassword.panelBody")}
      >
        {step === "email" && (
          <>
            <h1 className="vela-heading text-2xl text-[#111111] mb-1">{t("landing.auth.forgotPassword.title")}</h1>
            <p className="text-[#6B7280] text-sm mb-4">{t("landing.auth.forgotPassword.subtitle")}</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                  {t("landing.auth.login.email")}
                </label>
                <div className="relative">
                  <InputIcon><MailIcon /></InputIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setInlineStatus(null); }}
                    placeholder={t("landing.auth.login.emailPlaceholder")}
                    required
                    className={authInputCls}
                  />
                </div>
                {emailTypoFix && (
                  <button
                    type="button"
                    onClick={() => setEmail(emailTypoFix)}
                    className="text-[11px] text-[#FF6B35] font-medium mt-1.5 hover:underline"
                  >
                    {t("landing.auth.signup.didYouMean")} {emailTypoFix}?
                  </button>
                )}
              </div>

              {inlineStatus === "none" && (
                <div className="px-4 py-3 rounded-xl text-sm text-[#374151] border border-[#FDE68A] bg-[#FFFBEB]">
                  {t("landing.auth.forgotPassword.noAccount")}{" "}
                  <Link href="/auth/signup" className="text-[#FF6B35] font-semibold hover:underline">
                    {t("landing.auth.forgotPassword.createAccount")}
                  </Link>
                </div>
              )}

              {inlineStatus === "google_only" && (
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-xl text-sm text-[#374151] border border-[#E5E7EB] bg-[#F9FAFB]">
                    {t("landing.auth.forgotPassword.googleOnly")}
                  </div>
                  <GoogleButton onClick={handleGoogleSignIn} label={t("landing.auth.common.continueWithGoogle")} />
                </div>
              )}

              {authError && (
                <div className="px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70"
                style={{ background: "var(--vela-gradient)" }}
              >
                {loading ? t("landing.auth.login.sending") : t("landing.auth.login.sendResetLink")}
              </button>
            </form>

            <p className="text-center text-sm text-[#6B7280] mt-4">
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">
                {t("landing.auth.login.backToSignIn")}
              </Link>
            </p>
          </>
        )}

        {step === "code" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "var(--vela-gradient)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M4 6.5l8 6.5 8-6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="vela-heading text-xl text-[#111111] mb-2">{t("landing.auth.checkEmail.title")}</h1>
            <p className="text-[#6B7280] text-sm mb-6">
              {t("landing.auth.checkEmail.sentTo")} <span className="text-[#111111] font-semibold">{maskEmail(email)}</span>
            </p>

            <OtpCodeInput
              value={codeValue}
              onChange={(v) => { setCodeValue(v); setCodeError(""); }}
              onComplete={handleVerifyCode}
              disabled={verifyingCode}
              error={!!codeError}
            />

            {codeError && <p className="text-sm text-red-600 mt-3">{codeError}</p>}
            {verifyingCode && <p className="text-sm text-[#6B7280] mt-3">{t("landing.auth.checkEmail.verifying")}</p>}

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-sm font-semibold text-[#FF6B35] disabled:text-[#9CA3AF] transition-colors mt-5"
            >
              {cooldown > 0
                ? `${t("landing.auth.checkEmail.resendIn")} ${cooldown}s`
                : resending ? t("landing.auth.checkEmail.sending") : t("landing.auth.checkEmail.resend")}
            </button>

            <p className="text-sm text-[#6B7280] mt-5">
              <button
                type="button"
                onClick={() => { setStep("email"); setCodeValue(""); setCodeError(""); }}
                className="text-[#6B7280] hover:underline"
              >
                {t("landing.auth.checkEmail.wrongEmail")}
              </button>
            </p>
          </div>
        )}
      </AuthSplitCard>
    </AuthPageShell>
  );
}
