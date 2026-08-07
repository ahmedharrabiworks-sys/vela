"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { getSupabase } from "@/lib/supabase";

const PLATFORM_LANGS = ["English", "Arabic", "French", "German", "Spanish", "Portuguese"];

export default function LoginPage() {
  const router = useRouter();

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

  // ── Language selection (stored, not yet wired to i18n) ──
  const [platformLang, setPlatformLang] = useState("English");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    // Requires Google OAuth to be enabled in Supabase dashboard:
    // Authentication > Providers > Google > enable + add client ID/secret
    const supabase = getSupabase();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/app` },
    });
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
      setResetError("Could not send reset email. Please try again.");
      return;
    }

    setResetSent(true);
  };

  const inputCls =
    "w-full bg-white border border-[#E5E7EB] px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">

      {/* Logo top-left — icon mark only on auth pages */}
      <div className="absolute top-0 left-0 p-6 z-10">
        <Link href="/">
          <Logo showText={false} />
        </Link>
      </div>

      {/* Platform language selector — top right */}
      <div className="absolute top-0 right-0 p-6 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#6B7280] whitespace-nowrap">Platform Language:</span>
          <div className="relative">
          <select
            value={platformLang}
            onChange={(e) => setPlatformLang(e.target.value)}
            className="appearance-none bg-white border border-[#E5E7EB] rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-[#374151] focus:outline-none focus:border-[#FF6B35] transition-colors cursor-pointer"
          >
            {PLATFORM_LANGS.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5l3 3 3-3" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card">

          {/* ── Sign-in form ── */}
          {!forgotMode && (
            <>
              <h1 className="vela-heading text-2xl text-[#111111] mb-2">Welcome back</h1>
              <p className="text-[#6B7280] text-sm mb-8">Log in to your Vela dashboard.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setResetError(""); setResetSent(false); }}
                      className="text-xs text-[#FF6B35] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[#E5E7EB]" />
                <span className="text-xs text-[#9CA3AF] font-medium">Or continue with</span>
                <div className="flex-1 h-px bg-[#E5E7EB]" />
              </div>

              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] transition-all duration-200"
              >
                {/* Google "G" icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-sm text-[#6B7280] mt-6">
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="text-[#FF6B35] font-semibold hover:underline">
                  Sign up
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
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to sign in
              </button>

              <h1 className="vela-heading text-2xl text-[#111111] mb-2">Reset password</h1>
              <p className="text-[#6B7280] text-sm mb-8">
                Enter the email linked to your account and we&apos;ll send a reset link.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    className={inputCls}
                  />
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
                  {resetLoading ? "Sending..." : "Send reset link"}
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
              <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">Check your email</h2>
              <p className="text-[#6B7280] text-sm text-center mb-6">
                We&apos;ve sent a password reset link to <span className="font-semibold text-[#374151]">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-xs text-[#9CA3AF] text-center mb-6">
                Didn&apos;t receive it? Check your spam folder, or{" "}
                <button
                  type="button"
                  className="text-[#FF6B35] hover:underline"
                  onClick={() => setResetSent(false)}
                >
                  try again
                </button>.
              </p>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setResetSent(false); }}
                className="w-full py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all"
              >
                Back to sign in
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
