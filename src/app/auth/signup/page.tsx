"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { saveProfile } from "@/lib/business-profile";
import { getSupabase } from "@/lib/supabase";
import { PLANS } from "@/lib/pricing";

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

/* Detect industry from plain-text business description */
function detectBusinessType(desc: string): string {
  const d = desc.toLowerCase();
  if (/ecommerce|e-commerce|online store|dropshipping|sell online/.test(d)) return "E-Commerce";
  if (/coffee|cafe|brew|espresso|latte/.test(d)) return "Coffee Shop";
  if (/restaurant|food|dining|cuisine|burger|pizza|takeaway/.test(d)) return "Restaurant";
  if (/hotel|accommodation|resort|inn|motel/.test(d)) return "Hotel";
  if (/dental|teeth|orthodont|dentist/.test(d)) return "Dental Clinic";
  if (/medical|clinic|doctor|hospital|physician|healthcare/.test(d)) return "Medical Clinic";
  if (/barber|barbershop|men.*hair/.test(d)) return "Barbershop";
  if (/spa|massage|wellbeing/.test(d)) return "Spa & Massage";
  if (/hair|salon|beauty|nail/.test(d)) return "Hair Salon";
  if (/gym|fitness|sport|yoga|pilates|workout|crossfit/.test(d)) return "Gym & Fitness";
  if (/real estate|property|villa|realtor|realty/.test(d)) return "Real Estate";
  if (/law|legal|attorney|lawyer|solicitor/.test(d)) return "Law Firm";
  if (/tutor|tutoring|school|education|academy|learning|lesson|class|course/.test(d)) return "Education & Tutoring";
  if (/car dealer|dealership|vehicle sales/.test(d)) return "Car Dealership";
  if (/auto repair|garage|mechanic|car service/.test(d)) return "Auto Repair";
  if (/interior design|interior decor|home design/.test(d)) return "Interior Design";
  if (/photo|photographer|photography/.test(d)) return "Photography Studio";
  if (/marketing agency|digital marketing|advertising agency/.test(d)) return "Marketing Agency";
  if (/cleaning|maid|janitorial|housekeeping/.test(d)) return "Cleaning Services";
  if (/travel agency|travel agent|tour operator/.test(d)) return "Travel Agency";
  if (/event|wedding planner|event planning/.test(d)) return "Event Planning";
  if (/pet|veterinary|vet|grooming/.test(d)) return "Pet Services";
  if (/construction|contracting|builder|renovation/.test(d)) return "Construction";
  if (/accounting|accountant|bookkeeping|audit|tax/.test(d)) return "Accounting & Finance";
  if (/recruitment|staffing|headhunt|hr agency/.test(d)) return "Recruitment";
  return "Other";
}

const BUSINESS_CATEGORIES = [
  "Dental Clinic", "Medical Clinic", "Hair Salon", "Barbershop", "Spa & Massage",
  "Beauty & Wellness", "Gym & Fitness", "Real Estate", "Restaurant", "Coffee Shop",
  "Hotel", "Law Firm", "Education & Tutoring", "E-Commerce", "Car Dealership",
  "Auto Repair", "Interior Design", "Photography Studio", "Marketing Agency",
  "Cleaning Services", "Travel Agency", "Event Planning", "Pet Services",
  "Construction", "Accounting & Finance", "Recruitment",
];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            n <= step ? "bg-[#FF6B35] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
          }`}>
            {n < step ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l2.5 2.5 5.5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : n}
          </div>
          {n < 3 && <div className={`w-10 h-px mx-1 ${n < step ? "bg-[#FF6B35]" : "bg-[#E5E7EB]"}`} />}
        </div>
      ))}
    </div>
  );
}

const inputCls = "w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all";
const labelCls = "text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5";

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
    () => COUNTRIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query)),
    [query]
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(!open); setQuery(""); }}
        className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111111] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all flex items-center justify-between text-left">
        <span className="truncate">{value.name}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[#9CA3AF] text-xs font-mono">{value.dial}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-[#9CA3AF] transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl overflow-hidden border border-[#E5E7EB] shadow-card-hover bg-white">
          <div className="p-2 border-b border-[#E5E7EB]">
            <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF6B35] transition-colors" />
          </div>
          <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,107,53,0.3) transparent" }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[#9CA3AF] text-center">No results</div>
            ) : (
              filtered.map((c) => (
                <button key={c.name + c.dial} type="button"
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-[#F9FAFB] ${value.name === c.name ? "text-[#FF6B35] font-medium" : "text-[#374151]"}`}>
                  <span>{c.name}</span>
                  <span className="text-[#9CA3AF] text-xs font-mono">{c.dial}</span>
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
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [authError, setAuthError] = useState("");

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
  const [aiDetecting, setAiDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Step 3 */
  const [plan, setPlan] = useState("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
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

  const handleStart = async () => {
    setLoading(true);
    setAuthError("");

    const supabase = getSupabase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_type: detectedType,
          country: country.name,
          city,
          phone: country.dial + " " + phone,
          plan,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }

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
    if (detectedType) localStorage.setItem("vela_business_type", detectedType);

    if (data.user) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("tenants").insert({
          owner_id: data.user.id,
          business_name: businessDesc || detectedType,
          plan: plan as "starter" | "pro" | "premium",
        });
      } catch {
        // Table may not exist yet — auth still works, proceed to dashboard
      }
    }

    setLoading(false);
    setStep(4);
    setTimeout(() => router.push("/app/welcome"), 1800);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* V logo top-left */}
      <div className="absolute top-0 left-0 p-6 z-10">
        <Link href="/">
          <Logo showText />
        </Link>
      </div>

      <div className={`relative z-10 w-full transition-all duration-300 ${step === 3 ? "max-w-5xl" : "max-w-lg"}`}>

        {step <= 3 && <StepBar step={step} />}

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card">
            <h1 className="text-xl font-bold text-[#111111] mb-1">Create your account</h1>
            <p className="text-[#6B7280] text-sm mb-7">Get your AI receptionist set up in minutes.</p>
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required className={inputCls} />
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
            <p className="text-center text-sm text-[#6B7280] mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── Step 2: Business Info ── */}
        {step === 2 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card">
            <h1 className="text-xl font-bold text-[#111111] mb-1">Tell us about your business</h1>
            <p className="text-[#6B7280] text-sm mb-7">Vela will personalise everything for you automatically</p>
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className={labelCls}>What&apos;s your business?</label>
                <textarea
                  value={businessDesc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBusinessDesc(val);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    if (!val.trim()) { setDetectedType(""); return; }
                    debounceRef.current = setTimeout(async () => {
                      setAiDetecting(true);
                      try {
                        const res = await fetch("/api/detect-business", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ description: val }),
                        });
                        const data = await res.json();
                        if (data.type) {
                          setDetectedType(data.type);
                          localStorage.setItem("vela_business_type", data.type);
                        }
                      } catch { /* ignore */ } finally {
                        setAiDetecting(false);
                      }
                    }, 1000);
                  }}
                  placeholder="e.g. Dental clinic in Dubai, Real estate agency, Hair salon…"
                  required
                  rows={3}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] text-sm focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 transition-all resize-none"
                />
                {aiDetecting && (
                  <div className="flex items-center gap-2 mt-2">
                    <svg className="animate-spin w-3 h-3 text-[#FF6B35]" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="rgba(255,107,53,0.3)" strokeWidth="2"/>
                      <path d="M14 8a6 6 0 0 0-6-6" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[11px] text-[#6B7280]">Detecting business type…</span>
                  </div>
                )}
                {detectedType && detectedType !== "Other" && !aiDetecting && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-[#FF6B35]/20 w-fit" style={{ background: "rgba(255,107,53,0.06)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-[11px] text-[#6B7280]">Detected: <span className="text-[#111111] font-semibold">{detectedType}</span></span>
                    <button type="button" onClick={() => setDetectedType("")} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-xs ml-0.5">✕</button>
                  </div>
                )}
                {!aiDetecting && detectedType === "Other" && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#9CA3AF] mb-1.5">AI couldn&apos;t auto-detect — please select your business type:</p>
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) setDetectedType(e.target.value); }}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111111] text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                    >
                      <option value="" disabled>Select your business type…</option>
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!aiDetecting && !detectedType && (
                  <p className="text-[10px] text-[#9CA3AF] mt-1.5">Vela AI will auto-detect your industry from this description</p>
                )}
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
                    <div className="flex items-center justify-center bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 text-[#6B7280] text-xs font-mono whitespace-nowrap shrink-0">
                      {country.dial}
                    </div>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="50 000 0000" required className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors">
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
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-10 shadow-card">
            <div className="text-center mb-7">
              <h1 className="text-2xl md:text-3xl font-bold text-[#111111] mb-2">Choose your plan</h1>
              <p className="text-[#6B7280] text-sm md:text-base mb-5">Cancel anytime</p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[#E5E7EB] bg-white shadow-sm">
                <button type="button" onClick={() => setBilling("monthly")}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${billing === "monthly" ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"}`}>
                  Monthly
                </button>
                <button type="button" onClick={() => setBilling("annual")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${billing === "annual" ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#6B7280] hover:text-[#374151]"}`}>
                  Annual
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF6B35] text-white">−20%</span>
                </button>
              </div>
            </div>

            {detectedType && (
              <div className="flex items-center justify-center gap-2.5 px-4 py-3 mb-7 rounded-xl border border-[#FF6B35]/20 max-w-md mx-auto" style={{ background: "rgba(255,107,53,0.06)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#FF6B35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="text-sm text-[#6B7280]">
                  Vela AI detected: <span className="text-[#111111] font-semibold">{detectedType}</span>
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-5 mb-8 items-start">
              {PLANS.map((p) => {
                const isSelected = plan === p.id;
                const price = billing === "annual" ? p.annual : p.monthly;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`relative flex flex-col text-left rounded-2xl p-6 md:p-7 transition-all duration-200 w-full ${
                      p.popular ? "md:scale-[1.03]" : ""
                    } ${
                      isSelected ? "bg-[#FFF8F5]" : "bg-white hover:bg-[#F9FAFB]"
                    }`}
                    style={{
                      border: isSelected ? "2px solid #FF6B35" : p.popular ? "2px solid rgba(255,107,53,0.3)" : "2px solid #E5E7EB",
                      boxShadow: isSelected
                        ? "0 0 0 4px rgba(255,107,53,0.08), 0 8px 24px rgba(255,107,53,0.15)"
                        : p.popular
                        ? "0 4px 24px rgba(255,107,53,0.08)"
                        : "none",
                    }}
                  >
                    {p.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                          style={{ background: "linear-gradient(135deg, #FF6B35, #FF3366)" }}>
                          Most Popular
                        </span>
                      </div>
                    )}

                    {/* Plan name + radio */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-[#FF6B35]" : "border-[#D1D5DB]"}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />}
                      </div>
                      <span className={`text-sm font-semibold uppercase tracking-widest ${p.popular ? "text-[#FF6B35]" : "text-[#9CA3AF]"}`}>{p.name}</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-extrabold text-[#111111]">${price}</span>
                      <span className="text-sm text-[#9CA3AF] mb-2">/mo</span>
                    </div>
                    {billing === "annual" ? (
                      <p className="text-xs text-[#FF6B35] mb-3">Billed ${price * 12}/yr · Save ${(p.monthly - p.annual) * 12}/yr</p>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] mb-3">Billed monthly</p>
                    )}

                    <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{p.description}</p>

                    {/* Feature list */}
                    <ul className="flex flex-col gap-2.5">
                      {p.features.map((feat) => (
                        <li key={feat.text} className="flex items-start gap-2.5">
                          {feat.included ? (
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                              <circle cx="8" cy="8" r="7" fill="rgba(255,107,53,0.12)" />
                              <path d="M5 8l2 2 4-4" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                              <circle cx="8" cy="8" r="7" fill="rgba(0,0,0,0.04)" />
                              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          )}
                          <span className={`text-xs leading-relaxed ${feat.included ? "text-[#374151]" : "text-[#D1D5DB] line-through"}`}>
                            {feat.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {authError && (
              <div className="mb-4 max-w-md mx-auto px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                {authError}
              </div>
            )}
            <div className="flex gap-3 max-w-md mx-auto">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors">Back</button>
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
                ) : "Subscribe Now"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-card text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#111111] mb-2">Welcome, {fullName.split(" ")[0] || "there"}!</h1>
            <p className="text-[#6B7280] text-sm mb-2">Your business is ready on Vela.</p>
            <p className="text-[#9CA3AF] text-xs mb-8">
              Your {PLANS.find((p) => p.id === plan)?.name} plan is active. Billed {billing === "annual" ? "annually" : "monthly"}, cancel anytime.
            </p>
            <Link href="/app/welcome" className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm text-center hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg,#FF6B35,#FF3366)" }}>
              Set up your account →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
