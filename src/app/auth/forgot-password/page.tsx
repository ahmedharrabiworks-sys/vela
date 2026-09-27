"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  AuthPageShell,
  AuthSplitCard,
  authInputCls,
  InputIcon,
  MailIcon,
} from "@/components/auth/AuthChrome";

const RESEND_COOLDOWN_S = 60;

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const requestReset = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Response is generic regardless (see the route) -- nothing
      // meaningfully different to show on a network hiccup.
    }
    setLoading(false);
    setSent(true);
    startCooldown();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestReset();
  };

  return (
    <AuthPageShell>
      <AuthSplitCard
        panelHeadline={t("landing.auth.forgotPassword.panelHeadline")}
        panelBody={t("landing.auth.forgotPassword.panelBody")}
      >
        {!sent ? (
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("landing.auth.login.emailPlaceholder")}
                    required
                    className={authInputCls}
                  />
                </div>
              </div>

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
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 border border-green-200 mx-auto mb-6">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M4 11l5 5 9-9" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">{t("landing.auth.forgotPassword.checkEmailTitle")}</h2>
            <p className="text-[#6B7280] text-sm text-center mb-6">
              {t("landing.auth.forgotPassword.genericSent")}
            </p>

            <button
              type="button"
              onClick={requestReset}
              disabled={cooldown > 0 || loading}
              className="input-glass w-full py-3 rounded-xl font-semibold text-sm text-[#374151] transition-all disabled:opacity-60"
            >
              {cooldown > 0
                ? `${t("landing.auth.checkEmail.resendIn")} ${cooldown}s`
                : t("landing.auth.checkEmail.resend")}
            </button>

            <p className="text-center text-sm text-[#6B7280] mt-4">
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">
                {t("landing.auth.login.backToSignIn")}
              </Link>
            </p>
          </>
        )}
      </AuthSplitCard>
    </AuthPageShell>
  );
}
