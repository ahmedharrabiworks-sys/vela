"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { saveProfile } from "@/lib/business-profile";

const INDUSTRIES = [
  { name: "Dental Clinic",       desc: "Cleanings, implants, cosmetic dentistry" },
  { name: "Medical Clinic",      desc: "General practice & specialist care" },
  { name: "Cosmetic Clinic",     desc: "Botox, fillers, aesthetic procedures" },
  { name: "Hair Salon",          desc: "Cuts, color, styling & treatments" },
  { name: "Barbershop",          desc: "Haircuts, beard trims, shaving" },
  { name: "Nail Salon",          desc: "Manicures, pedicures, nail art" },
  { name: "Spa & Wellness",      desc: "Massages, facials, relaxation" },
  { name: "Gym & Fitness",       desc: "Memberships, training, group classes" },
  { name: "Personal Trainer",    desc: "One-on-one coaching & programs" },
  { name: "Yoga Studio",         desc: "Group classes & private sessions" },
  { name: "Physiotherapy",       desc: "Rehab, sports injuries, pain relief" },
  { name: "Dermatology",         desc: "Skin treatments, laser, acne care" },
  { name: "Eye Clinic",          desc: "Eye exams, glasses, LASIK" },
  { name: "Veterinary Clinic",   desc: "Pet care, vaccines, surgery" },
  { name: "Pharmacy",            desc: "Medications & health products" },
  { name: "Real Estate Agency",  desc: "Property sales, rentals & investment" },
  { name: "Property Management", desc: "Tenant management & maintenance" },
  { name: "Car Dealership",      desc: "New & used vehicle sales" },
  { name: "Auto Repair",         desc: "Servicing, repairs & diagnostics" },
  { name: "Law Firm",            desc: "Legal advice & case management" },
  { name: "Accounting Firm",     desc: "Tax, bookkeeping & financial reports" },
  { name: "Consulting",          desc: "Business strategy & advisory" },
  { name: "Architecture Studio", desc: "Design, planning & project management" },
  { name: "Interior Design",     desc: "Residential & commercial spaces" },
  { name: "Photography Studio",  desc: "Portraits, events & commercial" },
  { name: "Videography",         desc: "Events, corporate & social content" },
  { name: "Wedding Planner",     desc: "Full-service wedding coordination" },
  { name: "Event Planning",      desc: "Corporate events & celebrations" },
  { name: "Restaurant",          desc: "Dine-in, reservations & takeaway" },
  { name: "Cafe",                desc: "Coffee, food & loyalty programs" },
  { name: "Bakery",              desc: "Custom cakes, pastries & catering" },
  { name: "Catering",            desc: "Events, corporate & private dining" },
  { name: "Hotel",               desc: "Room bookings & guest services" },
  { name: "Travel Agency",       desc: "Holiday packages & visa services" },
  { name: "Language School",     desc: "English, Arabic, French & more" },
  { name: "Tutoring Center",     desc: "Academic coaching & exam prep" },
  { name: "Driving School",      desc: "Lessons & license preparation" },
  { name: "Cleaning Service",    desc: "Home & commercial cleaning" },
  { name: "Plumbing",            desc: "Repairs, installations & emergency" },
  { name: "Electrician",         desc: "Wiring, repairs & installations" },
  { name: "Landscaping",         desc: "Garden design & maintenance" },
  { name: "Moving Company",      desc: "Home & office relocations" },
  { name: "Security Services",   desc: "Guards, CCTV & alarm systems" },
  { name: "Insurance Agency",    desc: "Life, health, vehicle & property" },
  { name: "Financial Advisor",   desc: "Investments & wealth management" },
  { name: "Marketing Agency",    desc: "Digital marketing & social media" },
  { name: "Graphic Design",      desc: "Branding, logos & print design" },
  { name: "Web Development",     desc: "Websites, apps & e-commerce" },
  { name: "IT Support",          desc: "Tech help, networks & software" },
  { name: "E-commerce",          desc: "Online store & product sales" },
  { name: "Jewelry Store",       desc: "Fine jewelry, repairs & custom" },
  { name: "Clothing Boutique",   desc: "Fashion, styling & shopping" },
  { name: "Furniture Store",     desc: "Home & office furniture" },
  { name: "Electronics Shop",    desc: "Devices, repairs & accessories" },
  { name: "Florist",             desc: "Arrangements, events & delivery" },
  { name: "Pet Grooming",        desc: "Bathing, haircuts & nail care" },
  { name: "Childcare",           desc: "Nursery, daycare & early education" },
  { name: "Elderly Care",        desc: "Home care & assisted living" },
  { name: "Life Coach",          desc: "Personal development & goal setting" },
  { name: "Nutritionist",        desc: "Diet plans & health coaching" },
  { name: "Psychologist",        desc: "Therapy & mental wellness" },
];

const PLANS = [
  { id: "starter", name: "Starter", price: 79,  desc: "1 channel · 50 bookings/mo · Basic CRM" },
  { id: "pro",     name: "Pro",     price: 159, desc: "All 3 channels · Unlimited · Full CRM", popular: true },
  { id: "premium", name: "Premium", price: 299, desc: "Everything + dedicated account manager" },
];

const COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Egypt", "United Kingdom", "United States", "Other"];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            n < step ? "bg-[#FF6B35] text-white" : n === step ? "bg-[#FF6B35] text-white" : "bg-white/10 text-white/30"
          }`}>
            {n < step ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l2.5 2.5 5.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : n}
          </div>
          {n < 4 && <div className={`w-10 h-px mx-1 ${n < step ? "bg-[#FF6B35]" : "bg-white/10"}`} />}
        </div>
      ))}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/60 transition-colors";
const labelCls = "text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5";

export default function SignupPage() {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 fields — industry picker
  const [industrySearch, setIndustrySearch] = useState("");
  const [businessType, setBusinessType] = useState("");

  // Step 3 fields
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("United Arab Emirates");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  // Step 4 fields
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  const filteredIndustries = useMemo(() => {
    const q = industrySearch.toLowerCase().trim();
    if (!q) return INDUSTRIES;
    return INDUSTRIES.filter((i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  }, [industrySearch]);

  const handleStart = () => {
    setLoading(true);
    saveProfile({ ownerName: fullName, email, businessName, businessType, country, city, phone, plan });
    setTimeout(() => { setLoading(false); setStep(5); }, 1400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#0F0907" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,107,53,0.14), transparent)" }} />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo showText light /></Link>
        </div>

        {step <= 4 && <StepBar step={step} />}

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-white/40 text-sm mb-7">7-day free trial · No credit card required</p>
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmed Al-Rashid" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} className={inputCls} />
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl font-semibold text-white text-sm mt-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Continue →
              </button>
            </form>
            <p className="text-center text-sm text-white/30 mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Industry Picker ── */}
        {step === 2 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h1 className="text-xl font-bold text-white mb-1">What type of business do you run?</h1>
            <p className="text-white/40 text-sm mb-5">We&apos;ll personalise Vela for your industry</p>

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                placeholder="Search industries…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,107,53,0.3) transparent" }}>
              {filteredIndustries.map((ind) => {
                const selected = businessType === ind.name;
                return (
                  <button
                    key={ind.name}
                    onClick={() => setBusinessType(ind.name)}
                    className={`relative text-left p-3 rounded-xl border transition-all ${
                      selected
                        ? "border-[#FF6B35] bg-[#FF6B35]/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF6B35] flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l1.5 1.5 3.5-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    <p className={`text-xs font-bold leading-tight mb-0.5 ${selected ? "text-[#FF6B35]" : "text-white/80"}`}>{ind.name}</p>
                    <p className="text-[10px] text-white/30 leading-tight">{ind.desc}</p>
                  </button>
                );
              })}
              {filteredIndustries.length === 0 && (
                <div className="col-span-3 py-8 text-center text-white/30 text-sm">No results for &ldquo;{industrySearch}&rdquo;</div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">Back</button>
              <button onClick={() => setStep(3)} disabled={!businessType}
                className="flex-[2] py-3 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Business Details ── */}
        {step === 3 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Tell us about your business</h1>
            <p className="text-white/40 text-sm mb-7">{businessType} · We&apos;ll use this to personalise your dashboard</p>
            <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-4">
              <div>
                <label className={labelCls}>Business Name</label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={`e.g. Ahmed ${businessType}`} required className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls + " appearance-none cursor-pointer text-white"}>
                    {COUNTRIES.map((c) => <option key={c} value={c} style={{ color: "#111", background: "#fff" }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dubai" required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 000 0000" required className={inputCls} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">Back</button>
                <button type="submit" className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>Continue →</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 4: Plan ── */}
        {step === 4 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Choose your plan</h1>
            <p className="text-white/40 text-sm mb-7">7 days free, then billed monthly. Cancel anytime.</p>
            <div className="space-y-2.5 mb-6">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${plan === p.id ? "border-[#FF6B35] bg-[#FF6B35]/8" : "border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${plan === p.id ? "border-[#FF6B35]" : "border-white/20"}`}>
                      {plan === p.id && <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        {p.popular && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>BEST</span>}
                      </div>
                      <p className="text-[11px] text-white/35 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#FF6B35] shrink-0 ml-3">${p.price}/mo</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">Back</button>
              <button onClick={handleStart} disabled={loading}
                className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {loading ? "Setting up…" : "Start Free Trial"}
              </button>
            </div>
            <p className="text-center text-[10px] text-white/25 mt-3">No credit card required for trial</p>
          </div>
        )}

        {/* ── Step 5: Success ── */}
        {step === 5 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Welcome, {fullName.split(" ")[0] || "there"}!</h1>
            <p className="text-white/40 text-sm mb-2">{businessName || "Your business"} is ready on Vela.</p>
            <p className="text-white/25 text-xs mb-8">
              Your 7-day free trial has started. No charges until{" "}
              {new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.
            </p>
            <Link href="/app" className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm text-center hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Go to Dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
