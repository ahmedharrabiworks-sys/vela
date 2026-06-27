"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const PLANS = [
  { id: "starter", name: "Starter", price: "$100/mo", desc: "1 channel · Basic CRM" },
  { id: "pro", name: "Pro", price: "$159/mo", desc: "All channels · Full CRM · Analytics", popular: true },
  { id: "premium", name: "Premium", price: "$199/mo", desc: "3 businesses · AI training" },
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#1A0A00] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_20%,rgba(255,107,53,0.15),transparent)]" />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#FF6B35 1px,transparent 1px),linear-gradient(90deg,#FF6B35 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo showText light /></Link>
        </div>

        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="vela-heading text-2xl text-white mb-2">Start your free trial</h1>
            <p className="text-white/50 text-sm mb-8">7 days free. No credit card required.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ahmed Dental Clinic" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70 mt-2"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {loading ? "Creating account..." : "Continue"}
              </button>
            </form>

            <p className="text-center text-sm text-white/40 mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="vela-heading text-2xl text-white mb-2">Choose your plan</h1>
            <p className="text-white/50 text-sm mb-8">Start free for 7 days, then pay monthly. Cancel anytime.</p>

            <div className="space-y-3 mb-6">
              {PLANS.map((plan) => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    selectedPlan === plan.id
                      ? "border-[#FF6B35] bg-[#FF6B35]/10"
                      : "border-white/10 bg-white/3 hover:border-white/20"
                  }`}>
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? "border-[#FF6B35]" : "border-white/20"}`}>
                      {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        {plan.popular && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>BEST</span>}
                      </div>
                      <p className="text-[10px] text-white/40">{plan.desc}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#FF6B35]">{plan.price}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Start Free Trial
            </button>
            <p className="text-center text-[10px] text-white/30 mt-3">No credit card required for trial</p>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7 13-13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="vela-heading text-2xl text-white mb-3">You're in! 🎉</h1>
            <p className="text-white/50 text-sm mb-8">Your 7-day free trial has started. Check your email for setup instructions.</p>
            <Link href="/app"
              className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm text-center transition-all duration-200"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
