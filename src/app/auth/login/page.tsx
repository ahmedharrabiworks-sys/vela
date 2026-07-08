"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* V logo top-left */}
      <div className="absolute top-0 left-0 p-6 z-10">
        <Link href="/">
          <Logo showText />
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card">
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
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs text-[#FF6B35] hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
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
        </div>
      </div>
    </div>
  );
}
