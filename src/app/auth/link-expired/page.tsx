"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  AuthPageShell,
  AuthSplitCard,
  authInputCls,
  InputIcon,
  MailIcon,
} from "@/components/auth/AuthChrome";

// Reached from /auth/callback when a confirmation link's code exchange
// fails -- either a genuinely expired/already-used link, or the PKCE
// cross-device case (link opened on a different browser/device than the
// one signup started on). Both look identical from here, so both get the
// same friendly retry instead of a raw error.
export default function LinkExpiredPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Intentionally silent -- the response is generic either way (see
      // the route itself), so there's nothing meaningfully different to
      // show on a network hiccup here.
    }
    setSending(false);
    setSent(true);
  };

  return (
    <AuthPageShell>
      <AuthSplitCard
        panelHeadline={t("landing.auth.linkExpired.panelHeadline")}
        panelBody={t("landing.auth.linkExpired.panelBody")}
      >
        <div className="text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 bg-red-50 border border-red-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5m0 3.5v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9.5" stroke="#EF4444" strokeWidth="2" />
            </svg>
          </div>
          <h1 className="vela-heading text-xl text-[#111111] mb-2">{t("landing.auth.linkExpired.title")}</h1>
          <p className="text-[#6B7280] text-sm mb-6">{t("landing.auth.linkExpired.subtitle")}</p>

          {!sent ? (
            <form onSubmit={handleResend} className="space-y-3 text-start">
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
                disabled={sending}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70"
                style={{ background: "var(--vela-gradient)" }}
              >
                {sending ? t("landing.auth.checkEmail.sending") : t("landing.auth.linkExpired.sendNewLink")}
              </button>
            </form>
          ) : (
            <p className="text-sm text-[#374151] px-4 py-3 rounded-xl bg-green-50 border border-green-200">
              {t("landing.auth.linkExpired.sentConfirmation")}
            </p>
          )}

          <p className="text-center text-sm text-[#6B7280] mt-6">
            <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">
              {t("landing.auth.login.backToSignIn")}
            </Link>
          </p>
        </div>
      </AuthSplitCard>
    </AuthPageShell>
  );
}
