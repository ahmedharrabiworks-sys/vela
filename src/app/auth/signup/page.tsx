"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const BUSINESS_TYPES = [
  "Dental Clinic",
  "Hair & Beauty Salon",
  "Gym & Fitness Studio",
  "Spa & Wellness Centre",
  "Medical Clinic",
  "Restaurant & Cafe",
  "Law Firm",
  "Real Estate Agency",
  "Retail Shop",
  "Other",
];

const COUNTRIES = [
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Jordan",
  "Egypt",
  "United Kingdom",
  "United States",
  "Other",
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 79,
    desc: "1 channel · Basic CRM · 50 bookings/mo",
    features: ["1 AI channel", "50 bookings/month", "Basic CRM", "1 domain", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 159,
    desc: "All 3 channels · Unlimited bookings · Full CRM",
    popular: true,
    features: ["All 3 channels", "Unlimited bookings", "Full CRM", "2 domains", "Live chat support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 299,
    desc: "Everything + dedicated account manager",
    features: ["All 3 channels + priority", "Advanced AI", "Revenue reports", "3 domains", "Dedicated manager"],
  },
];

function StepDot({ n, current }: { n: number; current: number }) {
  const done = n < current;
  const active = n === current;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done ? "bg-[#FF6B35] text-white" : active ? "bg-[#FF6B35] text-white" : "bg-white/10 text-white/30"
    }`}>
      {done ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : n}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/60 transition-colors";
const labelCls = "text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5";

export default function SignupPage() {
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  // Step 3
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleStart = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(4); }, 1400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#0F0907" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,107,53,0.14), transparent)" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo showText light /></Link>
        </div>

        {/* Step progress */}
        {step <= 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center">
                <StepDot n={n} current={step} />
                {n < 3 && (
                  <div className={`w-12 h-px mx-1 transition-all ${n < step ? "bg-[#FF6B35]" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-white/40 text-sm mb-7">7-day free trial · No credit card required</p>

            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmed Al-Rashid" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8} className={inputCls} />
              </div>
              <button type="submit"
                className="w-full py-3.5 rounded-xl font-semibold text-white text-sm mt-2 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Continue →
              </button>
            </form>

            <p className="text-center text-sm text-white/30 mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Business Info ── */}
        {step === 2 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Tell us about your business</h1>
            <p className="text-white/40 text-sm mb-7">We&apos;ll personalise Vela for your industry</p>

            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className={labelCls}>Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Ahmed Dental Clinic" required className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Business Type</label>
                <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required
                  className={inputCls + " appearance-none cursor-pointer"} style={{ color: businessType ? "white" : "rgba(255,255,255,0.25)" }}>
                  <option value="" disabled style={{ color: "#666" }}>Select your industry</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t} style={{ color: "#111", background: "#fff" }}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className={inputCls + " appearance-none cursor-pointer text-white"}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} style={{ color: "#111", background: "#fff" }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="Dubai" required className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 000 0000" required className={inputCls} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white/40 text-sm border border-white/10 hover:border-white/20 transition-colors">
                  Back
                </button>
                <button type="submit"
                  className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Choose Plan ── */}
        {step === 3 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Choose your plan</h1>
            <p className="text-white/40 text-sm mb-7">7 days free, then billed monthly. Cancel anytime.</p>

            <div className="space-y-2.5 mb-6">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className={`w-full flex items-start justify-between p-4 rounded-xl border transition-all text-left ${
                    plan === p.id ? "border-[#FF6B35] bg-[#FF6B35]/8" : "border-white/10 hover:border-white/20"
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${plan === p.id ? "border-[#FF6B35]" : "border-white/20"}`}>
                      {plan === p.id && <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        {p.popular && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>BEST</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#FF6B35] shrink-0 ml-3">${p.price}/mo</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-white/40 text-sm border border-white/10 hover:border-white/20 transition-colors">
                Back
              </button>
              <button onClick={handleStart} disabled={loading}
                className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {loading ? "Setting up…" : "Start Free Trial"}
              </button>
            </div>
            <p className="text-center text-[10px] text-white/25 mt-3">No credit card required for trial</p>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              Welcome, {fullName.split(" ")[0] || "there"}!
            </h1>
            <p className="text-white/40 text-sm mb-2">
              {businessName || "Your business"} is ready on Vela.
            </p>
            <p className="text-white/30 text-xs mb-8">Your 7-day free trial has started. No charges until {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</p>
            <Link href="/app"
              className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm text-center hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Go to Dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
