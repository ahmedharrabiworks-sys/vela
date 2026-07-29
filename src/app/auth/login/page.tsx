"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  // ── Login state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Forgot-password state ──
  const [forgotMode, setForgotMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
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
      setResetError("Could not send reset email — please try again.");
      return;
    }

    setResetSent(true);
  };

  const inputCls =
    "w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* V logo top-left */}
      <div className="absolute top-0 left-0 p-6 z-10">
        <Link href="/">
          <Logo showText />
        </Link>
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
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={inputCls}
                  />
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
