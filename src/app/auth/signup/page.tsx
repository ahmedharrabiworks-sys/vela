"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { saveProfile } from "@/lib/business-profile";

/* ── All countries with dial codes ── */
const COUNTRIES = [
  { name: "Afghanistan",           dial: "+93"  },
  { name: "Albania",               dial: "+355" },
  { name: "Algeria",               dial: "+213" },
  { name: "Angola",                dial: "+244" },
  { name: "Argentina",             dial: "+54"  },
  { name: "Armenia",               dial: "+374" },
  { name: "Australia",             dial: "+61"  },
  { name: "Austria",               dial: "+43"  },
  { name: "Azerbaijan",            dial: "+994" },
  { name: "Bahrain",               dial: "+973" },
  { name: "Bangladesh",            dial: "+880" },
  { name: "Belarus",               dial: "+375" },
  { name: "Belgium",               dial: "+32"  },
  { name: "Bolivia",               dial: "+591" },
  { name: "Bosnia & Herzegovina",  dial: "+387" },
  { name: "Brazil",                dial: "+55"  },
  { name: "Bulgaria",              dial: "+359" },
  { name: "Cambodia",              dial: "+855" },
  { name: "Cameroon",              dial: "+237" },
  { name: "Canada",                dial: "+1"   },
  { name: "Chile",                 dial: "+56"  },
  { name: "China",                 dial: "+86"  },
  { name: "Colombia",              dial: "+57"  },
  { name: "Congo (DRC)",           dial: "+243" },
  { name: "Costa Rica",            dial: "+506" },
  { name: "Croatia",               dial: "+385" },
  { name: "Cuba",                  dial: "+53"  },
  { name: "Cyprus",                dial: "+357" },
  { name: "Czech Republic",        dial: "+420" },
  { name: "Denmark",               dial: "+45"  },
  { name: "Dominican Republic",    dial: "+1"   },
  { name: "Ecuador",               dial: "+593" },
  { name: "Egypt",                 dial: "+20"  },
  { name: "El Salvador",           dial: "+503" },
  { name: "Estonia",               dial: "+372" },
  { name: "Ethiopia",              dial: "+251" },
  { name: "Finland",               dial: "+358" },
  { name: "France",                dial: "+33"  },
  { name: "Georgia",               dial: "+995" },
  { name: "Germany",               dial: "+49"  },
  { name: "Ghana",                 dial: "+233" },
  { name: "Greece",                dial: "+30"  },
  { name: "Guatemala",             dial: "+502" },
  { name: "Hong Kong",             dial: "+852" },
  { name: "Hungary",               dial: "+36"  },
  { name: "Iceland",               dial: "+354" },
  { name: "India",                 dial: "+91"  },
  { name: "Indonesia",             dial: "+62"  },
  { name: "Iran",                  dial: "+98"  },
  { name: "Iraq",                  dial: "+964" },
  { name: "Ireland",               dial: "+353" },
  { name: "Israel",                dial: "+972" },
  { name: "Italy",                 dial: "+39"  },
  { name: "Ivory Coast",           dial: "+225" },
  { name: "Jamaica",               dial: "+1"   },
  { name: "Japan",                 dial: "+81"  },
  { name: "Jordan",                dial: "+962" },
  { name: "Kazakhstan",            dial: "+7"   },
  { name: "Kenya",                 dial: "+254" },
  { name: "Kuwait",                dial: "+965" },
  { name: "Kyrgyzstan",            dial: "+996" },
  { name: "Latvia",                dial: "+371" },
  { name: "Lebanon",               dial: "+961" },
  { name: "Libya",                 dial: "+218" },
  { name: "Lithuania",             dial: "+370" },
  { name: "Luxembourg",            dial: "+352" },
  { name: "Macau",                 dial: "+853" },
  { name: "Malaysia",              dial: "+60"  },
  { name: "Maldives",              dial: "+960" },
  { name: "Mexico",                dial: "+52"  },
  { name: "Moldova",               dial: "+373" },
  { name: "Mongolia",              dial: "+976" },
  { name: "Morocco",               dial: "+212" },
  { name: "Mozambique",            dial: "+258" },
  { name: "Myanmar",               dial: "+95"  },
  { name: "Nepal",                 dial: "+977" },
  { name: "Netherlands",           dial: "+31"  },
  { name: "New Zealand",           dial: "+64"  },
  { name: "Nicaragua",             dial: "+505" },
  { name: "Nigeria",               dial: "+234" },
  { name: "Norway",                dial: "+47"  },
  { name: "Oman",                  dial: "+968" },
  { name: "Pakistan",              dial: "+92"  },
  { name: "Palestine",             dial: "+970" },
  { name: "Panama",                dial: "+507" },
  { name: "Paraguay",              dial: "+595" },
  { name: "Peru",                  dial: "+51"  },
  { name: "Philippines",           dial: "+63"  },
  { name: "Poland",                dial: "+48"  },
  { name: "Portugal",              dial: "+351" },
  { name: "Qatar",                 dial: "+974" },
  { name: "Romania",               dial: "+40"  },
  { name: "Russia",                dial: "+7"   },
  { name: "Rwanda",                dial: "+250" },
  { name: "Saudi Arabia",          dial: "+966" },
  { name: "Senegal",               dial: "+221" },
  { name: "Serbia",                dial: "+381" },
  { name: "Singapore",             dial: "+65"  },
  { name: "Slovakia",              dial: "+421" },
  { name: "Slovenia",              dial: "+386" },
  { name: "Somalia",               dial: "+252" },
  { name: "South Africa",          dial: "+27"  },
  { name: "South Korea",           dial: "+82"  },
  { name: "South Sudan",           dial: "+211" },
  { name: "Spain",                 dial: "+34"  },
  { name: "Sri Lanka",             dial: "+94"  },
  { name: "Sudan",                 dial: "+249" },
  { name: "Sweden",                dial: "+46"  },
  { name: "Switzerland",           dial: "+41"  },
  { name: "Syria",                 dial: "+963" },
  { name: "Taiwan",                dial: "+886" },
  { name: "Tajikistan",            dial: "+992" },
  { name: "Tanzania",              dial: "+255" },
  { name: "Thailand",              dial: "+66"  },
  { name: "Tunisia",               dial: "+216" },
  { name: "Turkey",                dial: "+90"  },
  { name: "Turkmenistan",          dial: "+993" },
  { name: "Uganda",                dial: "+256" },
  { name: "Ukraine",               dial: "+380" },
  { name: "United Arab Emirates",  dial: "+971" },
  { name: "United Kingdom",        dial: "+44"  },
  { name: "United States",         dial: "+1"   },
  { name: "Uruguay",               dial: "+598" },
  { name: "Uzbekistan",            dial: "+998" },
  { name: "Venezuela",             dial: "+58"  },
  { name: "Vietnam",               dial: "+84"  },
  { name: "Yemen",                 dial: "+967" },
  { name: "Zambia",                dial: "+260" },
  { name: "Zimbabwe",              dial: "+263" },
];

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.name === "United Arab Emirates")!;

const PLANS = [
  { id: "starter", name: "Starter", price: 79,  desc: "1 channel · 50 bookings/mo · Basic CRM" },
  { id: "pro",     name: "Pro",     price: 159, desc: "All 3 channels · Unlimited · Full CRM", popular: true },
  { id: "premium", name: "Premium", price: 299, desc: "Everything + dedicated account manager" },
];

/* Detect industry from plain-text business description */
function detectBusinessType(desc: string): string {
  const d = desc.toLowerCase();
  if (/dental|teeth|orthodont|tooth|dentist/.test(d)) return "Dental Clinic";
  if (/medical|clinic|doctor|hospital|physician|healthcare/.test(d)) return "Medical Clinic";
  if (/cosmetic|botox|filler|aesthetic|plastic surgery/.test(d)) return "Cosmetic Clinic";
  if (/hair salon|hair cut|barber|barbershop/.test(d)) return "Hair Salon";
  if (/nail salon|nail/.test(d)) return "Nail Salon";
  if (/spa|massage|wellness|relax/.test(d)) return "Spa & Wellness";
  if (/gym|fitness|crossfit|workout/.test(d)) return "Gym & Fitness";
  if (/yoga|pilates/.test(d)) return "Yoga Studio";
  if (/physio|rehab|physiotherapy/.test(d)) return "Physiotherapy";
  if (/eye|optom|optic|lasik/.test(d)) return "Eye Clinic";
  if (/vet|veterinary|animal|pet clinic/.test(d)) return "Veterinary Clinic";
  if (/real estate|property|realtor|realty/.test(d)) return "Real Estate Agency";
  if (/restaurant|dining|cuisine/.test(d)) return "Restaurant";
  if (/cafe|coffee/.test(d)) return "Cafe";
  if (/bakery|pastry|cake/.test(d)) return "Bakery";
  if (/catering/.test(d)) return "Catering";
  if (/hotel|resort|accommodation/.test(d)) return "Hotel";
  if (/travel|tourism|visa|holiday/.test(d)) return "Travel Agency";
  if (/law|legal|attorney|lawyer|solicitor/.test(d)) return "Law Firm";
  if (/account|tax|bookkeep|audit/.test(d)) return "Accounting Firm";
  if (/marketing|digital|social media|ads/.test(d)) return "Marketing Agency";
  if (/web|software|app|tech|it support/.test(d)) return "Web Development";
  if (/school|tutor|education|lesson|class/.test(d)) return "Language School";
  if (/cleaning|maid|housekeep/.test(d)) return "Cleaning Service";
  if (/car|auto|vehicle|mechanic|repair shop/.test(d)) return "Auto Repair";
  if (/plumb|electric|handyman|hvac/.test(d)) return "Plumbing";
  if (/photo|portrait|studio/.test(d)) return "Photography Studio";
  if (/ecommerce|online store|shop/.test(d)) return "E-commerce";
  if (/insurance/.test(d)) return "Insurance Agency";
  if (/financial|invest|wealth/.test(d)) return "Financial Advisor";
  return "Consulting";
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
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
          {n < 3 && <div className={`w-10 h-px mx-1 ${n < step ? "bg-[#FF6B35]" : "bg-white/10"}`} />}
        </div>
      ))}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/60 transition-colors";
const labelCls = "text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5";

/* Searchable country dropdown */
function CountrySelect({ value, onChange }: { value: typeof COUNTRIES[0]; onChange: (c: typeof COUNTRIES[0]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(
    () => COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(!open); setQuery(""); }}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF6B35]/60 transition-colors flex items-center justify-between text-left">
        <span className="truncate">{value.name}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-white/30 text-xs font-mono">{value.dial}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-white/30 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: "#1A1008" }}>
          <div className="p-2 border-b border-white/5">
            <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors" />
          </div>
          <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,107,53,0.3) transparent" }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-white/30 text-center">No results</div>
            ) : (
              filtered.map((c) => (
                <button key={c.name + c.dial} type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5 ${value.name === c.name ? "text-[#FF6B35]" : "text-white/70"}`}>
                  <span>{c.name}</span>
                  <span className="text-white/25 text-xs font-mono">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState(1);

  /* Step 1 */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* Step 2 */
  const [businessDesc, setBusinessDesc] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectedType, setDetectedType] = useState("");

  /* Step 3 */
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setDetecting(true);
    setTimeout(() => {
      const detected = detectBusinessType(businessDesc);
      setDetectedType(detected);
      setDetecting(false);
      setStep(3);
    }, 900);
  };

  const handleStart = () => {
    setLoading(true);
    saveProfile({
      ownerName: fullName,
      email,
      businessName: businessDesc,
      businessType: detectedType,
      country: country.name,
      city,
      phone: country.dial + " " + phone,
      plan,
    });
    setTimeout(() => { setLoading(false); setStep(4); }, 1400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#0F0907" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,107,53,0.14), transparent)" }} />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo showText light /></Link>
        </div>

        {step <= 3 && <StepBar step={step} />}

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

        {/* ── Step 2: Business Info ── */}
        {step === 2 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Tell us about your business</h1>
            <p className="text-white/40 text-sm mb-7">Vela will personalise everything for you automatically</p>
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className={labelCls}>What&apos;s your business?</label>
                <textarea
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  placeholder="e.g. Dental clinic in Dubai, Real estate agency, Hair salon…"
                  required
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FF6B35]/60 transition-colors resize-none"
                />
                <p className="text-[10px] text-white/20 mt-1.5">Vela AI will auto-detect your industry from this description</p>
              </div>

              <div>
                <label className={labelCls}>Country</label>
                <CountrySelect value={country} onChange={(c) => setCountry(c)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dubai" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-3 text-white/50 text-xs font-mono whitespace-nowrap shrink-0">
                      {country.dial}
                    </div>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50 000 0000" required className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={detecting}
                  className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                  {detecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                        <path d="M14 8a6 6 0 0 0-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Analysing…
                    </span>
                  ) : "Continue →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Plan ── */}
        {step === 3 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-xl font-bold text-white mb-1">Choose your plan</h1>
            <p className="text-white/40 text-sm mb-5">7 days free, then billed monthly. Cancel anytime.</p>

            {detectedType && (
              <div className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-xl border border-[#FF6B35]/25" style={{ background: "rgba(255,107,53,0.08)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="text-sm text-white/50">
                  Vela AI detected: <span className="text-white font-semibold">{detectedType}</span>
                </p>
              </div>
            )}

            <div className="space-y-2.5 mb-6">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                    plan === p.id ? "border-[#FF6B35] bg-[#FF6B35]/8" : "border-white/10 hover:border-white/20"
                  }`}>
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
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">Back</button>
              <button onClick={handleStart} disabled={loading}
                className="flex-[2] py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                      <path d="M14 8a6 6 0 0 0-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Setting up…
                  </span>
                ) : "Start Free Trial"}
              </button>
            </div>
            <p className="text-center text-[10px] text-white/25 mt-3">No credit card required for trial</p>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Welcome, {fullName.split(" ")[0] || "there"}!</h1>
            <p className="text-white/40 text-sm mb-2">Your business is ready on Vela.</p>
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
