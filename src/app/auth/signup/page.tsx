"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveProfile } from "@/lib/business-profile";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { PLANS } from "@/lib/pricing";
import { type CurrencyCode } from "@/lib/currency";
import {
  PhoneInput,
  DEFAULT_PHONE_COUNTRY,
  findPhoneCountryByName,
  type PhoneCountry,
} from "@/components/ui/PhoneInput";
import {
  AuthPageShell,
  AuthSplitCard,
  authInputCls,
  authPlainInputCls,
  InputIcon,
  PersonIcon,
  MailIcon,
  LockIcon,
  GoogleButton,
} from "@/components/auth/AuthChrome";
import PlanPickerStep from "@/components/auth/PlanPickerStep";

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

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.name === "Qatar")!;

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


const inputCls = authPlainInputCls;
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
        className="input-glass w-full rounded-xl px-4 py-3 text-sm text-[#111111] transition-all flex items-center justify-between text-left">
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

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  // Arrived here from /auth/callback after a first-time Google sign-in with
  // no tenant yet -- skip the email/password step entirely (they already
  // have a real Supabase auth account) and go straight to business info.
  const isGoogleOnboarding = searchParams.get("onboarding") === "google";
  const [step, setStep] = useState(isGoogleOnboarding ? 2 : 1);
  const [googleFlow, setGoogleFlow] = useState(isGoogleOnboarding);
  const [authError, setAuthError] = useState("");

  /* Step 1 */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!isGoogleOnboarding) return;
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Stale/bogus link with no real session behind it -- fall back to
        // normal email/password signup instead of a dead-end step 2.
        setGoogleFlow(false);
        setStep(1);
        return;
      }
      setFullName((user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "");
      setEmail(user.email || "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Step 2 */
  const [businessDesc, setBusinessDesc] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [phoneCountryTouched, setPhoneCountryTouched] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneSubmitAttempted, setPhoneSubmitAttempted] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedType, setDetectedType] = useState("");
  const [aiDetecting, setAiDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default the phone country to whatever business country was picked above,
  // reducing friction since most owners' phone numbers match their business
  // country. Stops once the owner explicitly picks a different phone country.
  useEffect(() => {
    if (phoneCountryTouched) return;
    const match = findPhoneCountryByName(country.name);
    if (match) setPhoneCountry(match);
  }, [country, phoneCountryTouched]);

  /* Step 3 */
  const [plan, setPlan] = useState("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [currency, setCurrency] = useState<CurrencyCode>("QAR");
  const [loading, setLoading] = useState(false);

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) {
      setPhoneSubmitAttempted(true);
      return;
    }
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

    try {
      if (googleFlow) {
        // Already authenticated via Google (session created in /auth/callback) --
        // no auth user to create, just finish onboarding by creating the tenant.
        const res = await fetch("/api/auth/complete-google-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName,
            businessDesc,
            detectedType,
            country: country.name,
            city,
            phone: phoneE164 ?? "",
            plan,
          }),
        });

        if (!res.ok) {
          setAuthError(t("landing.auth.signup.couldNotCreateAccount"));
          setLoading(false);
          return;
        }

        saveProfile({
          ownerName: fullName,
          email,
          businessName: companyName || businessDesc,
          businessType: detectedType,
          country: country.name,
          city,
          phone: phoneE164 ?? "",
          plan,
        });
        if (detectedType) localStorage.setItem("vela_business_type", detectedType);

        setLoading(false);
        setStep(4);
        setTimeout(() => router.push("/app/welcome"), 1800);
        return;
      }

      // Server-side creation, uses admin client with email_confirm:true to bypass
      // the Supabase free-tier email rate limit (2/hour) that breaks client signUp.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          companyName,
          businessDesc,
          detectedType,
          country: country.name,
          city,
          phone: phoneE164 ?? "",
          plan,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "already_exists") {
          setAuthError(t("landing.auth.signup.emailAlreadyRegistered"));
        } else {
          setAuthError(t("landing.auth.signup.couldNotCreateAccount"));
        }
        setLoading(false);
        return;
      }

      // Account created, sign in immediately (email is already confirmed)
      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setAuthError("Account created but sign-in failed. Try logging in manually.");
        setLoading(false);
        return;
      }

      saveProfile({
        ownerName: fullName,
        email,
        businessName: companyName || businessDesc,
        businessType: detectedType,
        country: country.name,
        city,
        phone: phoneE164 ?? "",
        plan,
      });
      if (detectedType) localStorage.setItem("vela_business_type", detectedType);

      setLoading(false);
      setStep(4);
      setTimeout(() => router.push("/app/welcome"), 1800);
    } catch {
      setAuthError(t("landing.auth.signup.somethingWentWrong"));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Same signInWithOAuth pattern as /auth/login. The existing /auth/callback
    // route + the isGoogleOnboarding handling above take it from here --
    // Google returns to /auth/callback, which redirects to
    // /auth/signup?onboarding=google for a first-time user (no tenant yet),
    // landing back on this exact component with step 2 pre-selected.
    setAuthError("");
    const supabase = getSupabase();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    if (oauthError) {
      console.error("[Google sign-in] signInWithOAuth failed:", oauthError.message);
      setAuthError(t("landing.auth.common.couldNotStartGoogle"));
    }
  };

  return (
    <AuthPageShell>
      {/* ── Step 1: Account ── */}
      {step === 1 && (
        <AuthSplitCard>
          <h1 className="vela-heading text-2xl text-[#111111] mb-1">{t("landing.auth.signup.createAccount")}</h1>
          <p className="text-[#6B7280] text-sm mb-4">{t("landing.auth.signup.subtitle")}</p>

          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-3">
            <div>
              <label className={labelCls}>{t("landing.auth.signup.fullName")}</label>
              <div className="relative">
                <InputIcon><PersonIcon /></InputIcon>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("landing.auth.signup.fullNamePlaceholder")} required className={authInputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("landing.auth.signup.emailAddress")}</label>
              <div className="relative">
                <InputIcon><MailIcon /></InputIcon>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("landing.auth.login.emailPlaceholder")} required className={authInputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("landing.auth.login.password")}</label>
              <div className="relative">
                <InputIcon><LockIcon /></InputIcon>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("landing.auth.signup.passwordMin")}
                  required
                  minLength={8}
                  className={`${authInputCls} pe-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  aria-label={showPassword ? t("landing.auth.common.hidePassword") : t("landing.auth.common.showPassword")}
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

            {authError && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-600 border border-red-200 bg-red-50">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm mt-2 transition-all duration-200"
              style={{ background: "var(--vela-gradient)" }}
            >
              {t("landing.auth.signup.continue")} →
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#E5E7EB]" />
            <span className="text-xs text-[#9CA3AF] font-medium">{t("landing.auth.common.orContinueWith")}</span>
            <div className="flex-1 h-px bg-[#E5E7EB]" />
          </div>

          <GoogleButton onClick={handleGoogleSignIn} label={t("landing.auth.common.continueWithGoogle")} />

          <p className="text-center text-sm text-[#6B7280] mt-4 mb-3">
            {t("landing.auth.signup.alreadyHaveAccount")}{" "}
            <Link href="/auth/login" className="text-[#FF6B35] font-semibold hover:underline">{t("landing.auth.signup.signIn")}</Link>
          </p>

          <p className="text-center text-xs text-[#9CA3AF]">
            {t("landing.auth.signup.termsAgree")}{" "}
            <Link href="/terms" className="hover:underline" style={{ color: "var(--vp-color)" }} target="_blank">{t("landing.auth.signup.terms")}</Link>{" "}
            {t("landing.auth.signup.and")}{" "}
            <Link href="/privacy" className="hover:underline" style={{ color: "var(--vp-color)" }} target="_blank">{t("landing.auth.signup.privacy")}</Link>
          </p>
        </AuthSplitCard>
      )}

      {/* ── Step 2: Business Info ── */}
        {step === 2 && (
          <AuthSplitCard
            panelHeadline={t("landing.auth.signup.step2.panelHeadline")}
            panelBody={t("landing.auth.signup.step2.panelBody")}
            stepLabel={t("landing.auth.signup.step2.stepIndicator")}
          >
            <h1 className="vela-heading text-xl text-[#111111] mb-1">{t("landing.auth.signup.step2.title")}</h1>
            <p className="text-[#6B7280] text-sm mb-4 sm:mb-5">{t("landing.auth.signup.step2.subtitle")}</p>
            <form onSubmit={handleStep2} className="space-y-3">
              <div>
                <label className={labelCls}>{t("landing.auth.signup.step2.companyName")}</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("landing.auth.signup.step2.companyNamePlaceholder")} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t("landing.auth.signup.step2.businessQuestion")}</label>
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
                  placeholder={t("landing.auth.signup.step2.businessPlaceholder")}
                  required
                  rows={2}
                  className="input-glass w-full px-4 py-3 text-[#111111] placeholder:text-[#9CA3AF] transition-all resize-none sm:min-h-[84px]"
                />
                {aiDetecting && (
                  <div className="flex items-center gap-2 mt-2">
                    <svg className="animate-spin w-3 h-3 text-[#FF6B35]" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="rgba(255,107,53,0.3)" strokeWidth="2"/>
                      <path d="M14 8a6 6 0 0 0-6-6" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[11px] text-[#6B7280]">{t("landing.auth.signup.step2.detecting")}</span>
                  </div>
                )}
                {detectedType && detectedType !== "Other" && !aiDetecting && (
                  <div className="input-glass flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full w-fit">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                      <circle cx="7" cy="7" r="7" fill="#FF6B35" />
                      <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[11px] text-[#6B7280]">{t("landing.auth.signup.step2.detected")} <span className="text-[#111111] font-semibold">{detectedType}</span></span>
                    <button type="button" onClick={() => setDetectedType("")} className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-xs ml-0.5">✕</button>
                  </div>
                )}
                {!aiDetecting && detectedType === "Other" && (
                  <div className="mt-2">
                    <p className="text-[10px] text-[#9CA3AF] mb-1.5">{t("landing.auth.signup.step2.aiCouldNotDetect")}</p>
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) setDetectedType(e.target.value); }}
                      className="input-glass w-full rounded-xl px-4 py-3 text-[#111111] transition-colors"
                    >
                      <option value="" disabled>{t("landing.auth.signup.step2.selectBusinessType")}</option>
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!aiDetecting && !detectedType && (
                  <p className="text-[10px] text-[#9CA3AF] mt-1.5">{t("landing.auth.signup.step2.autoDetectHint")}</p>
                )}
              </div>

              {/* Country + City side by side at every width (FIX 7): saves
                  vertical space on mobile, still comfortable on desktop. */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("landing.auth.signup.step2.country")}</label>
                  <CountrySelect value={country} onChange={(c) => setCountry(c)} />
                </div>
                <div>
                  <label className={labelCls}>{t("landing.auth.signup.step2.city")}</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("landing.auth.signup.step2.cityPlaceholder")} required className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>{t("landing.auth.signup.step2.phoneNumber")}</label>
                <PhoneInput
                  country={phoneCountry}
                  onCountryChange={(c) => { setPhoneCountry(c); setPhoneCountryTouched(true); }}
                  value={phone}
                  onChange={setPhone}
                  onValidityChange={(valid, e164) => { setPhoneValid(valid); setPhoneE164(e164); }}
                  forceShowError={phoneSubmitAttempted}
                  placeholder={t("landing.auth.signup.step2.phonePlaceholder")}
                  required
                  glass
                />
              </div>

              <div className="flex gap-3 pt-1">
                {/* Google onboarding skips step 1 entirely (already authenticated) -- nothing to go back to. */}
                {!googleFlow && (
                  <button type="button" onClick={() => setStep(1)} className="input-glass flex-1 py-3.5 rounded-xl text-sm text-[#6B7280] transition-colors">
                    {t("landing.auth.signup.step2.back")}
                  </button>
                )}
                <button type="submit" disabled={detecting}
                  className={`py-3.5 rounded-xl font-semibold text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-60 ${googleFlow ? "w-full" : "flex-[2]"}`}
                  style={{ background: "var(--vela-gradient)" }}>
                  {detecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                        <path d="M14 8a6 6 0 0 0-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {t("landing.auth.signup.step2.analysing")}
                    </span>
                  ) : <>{t("landing.auth.signup.step2.continue")} →</>}
                </button>
              </div>
            </form>
          </AuthSplitCard>
        )}

        {/* ── Step 3: Plan (compact redesign, see PlanPickerStep.tsx) ── */}
        {step === 3 && (
          <PlanPickerStep
            plan={plan}
            setPlan={setPlan}
            billing={billing}
            setBilling={setBilling}
            currency={currency}
            setCurrency={setCurrency}
            loading={loading}
            authError={authError}
            onBack={() => setStep(2)}
            onSubmit={handleStart}
            panelHeadline={t("landing.auth.signup.step3.panelHeadline")}
            panelBody={t("landing.auth.signup.step3.panelBody")}
            stepLabel={t("landing.auth.signup.step3.stepIndicator")}
          />
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <AuthSplitCard
            panelHeadline={t("landing.auth.signup.step4.panelHeadline")}
            panelBody={t("landing.auth.signup.step4.panelBody")}
            stepLabel={t("landing.auth.signup.step4.stepIndicator")}
          >
            <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "var(--vela-gradient)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 14l6 6 12-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="vela-heading text-xl text-[#111111] mb-2">{t("landing.auth.signup.step4.welcome")}, {fullName.split(" ")[0] || t("landing.auth.signup.step4.there")}!</h1>
            <p className="text-[#6B7280] text-sm mb-2">{t("landing.auth.signup.step4.businessReady")}</p>
            <p className="text-[#9CA3AF] text-xs mb-8">
              {t("landing.auth.signup.step4.planActive1")} {PLANS.find((p) => p.id === plan)?.name} {t("landing.auth.signup.step4.planActive2")} {billing === "annual" ? t("landing.auth.signup.step4.billingAnnual") : t("landing.auth.signup.step4.billingMonthly")}, {t("landing.auth.signup.step4.planActive3")}
            </p>
            <Link href="/app/welcome" className="block w-full py-3.5 rounded-xl font-semibold text-white text-sm text-center hover:opacity-90 transition-opacity" style={{ background: "var(--vela-gradient)" }}>
              {t("landing.auth.signup.step4.setUpAccount")} →
            </Link>
            </div>
          </AuthSplitCard>
        )}
    </AuthPageShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
