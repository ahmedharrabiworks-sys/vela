"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { getSupabase } from "@/lib/supabase";

type PageState = "loading" | "ready" | "success" | "expired";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase picks up the recovery token from the URL hash automatically
    // when the client is initialised, establishing a one-time session.
    // getSession() confirms whether that exchange succeeded.
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState("ready");
      } else {
        // No session — link is expired or was already used
        setPageState("expired");
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError("Failed to update password. Please try again or request a new reset link.");
      return;
    }

    setPageState("success");
    setTimeout(() => router.push("/app"), 2500);
  };

  const inputCls =
    "w-full bg-white border border-[#E5E7EB] px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 p-6 z-10">
        <Link href="/">
          <Logo showText />
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card">

          {/* ── Loading ── */}
          {pageState === "loading" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-[#6B7280]">Verifying reset link…</p>
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
              <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">Link expired</h2>
              <p className="text-[#6B7280] text-sm text-center mb-6">
                This reset link has expired or already been used. Request a new one from the login page.
              </p>
              <Link
                href="/auth/login"
                className="block w-full py-3 rounded-xl font-semibold text-sm text-center border border-[#E5E7EB] text-[#374151] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all"
              >
                Back to sign in
              </Link>
            </>
          )}

          {/* ── New password form ── */}
          {pageState === "ready" && (
            <>
              <h1 className="vela-heading text-2xl text-[#111111] mb-2">Set new password</h1>
              <p className="text-[#6B7280] text-sm mb-8">Choose a strong password for your Vela account.</p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
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

                <div>
                  <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
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
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70"
                  style={{ background: "var(--vela-gradient)" }}
                >
                  {loading ? "Updating…" : "Update password"}
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
              <h2 className="vela-heading text-xl text-[#111111] text-center mb-3">Password updated</h2>
              <p className="text-[#6B7280] text-sm text-center">
                Your password has been changed. Signing you in…
              </p>
            </>
          )}

        </div>

        {/* Resend note — reset email delivery requires Resend to be configured in Supabase.
            Until the Resend integration is active (Phase D item 23), Supabase's built-in
            email provider is used, which may have deliverability issues in production. */}
        {pageState === "ready" && (
          <p className="text-center text-xs text-[#9CA3AF] mt-4">
            Changed your mind?{" "}
            <Link href="/auth/login" className="text-[#FF6B35] hover:underline">Sign in instead</Link>
          </p>
        )}
      </div>
    </div>
  );
}
